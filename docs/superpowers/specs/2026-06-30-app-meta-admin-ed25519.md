# app_meta 与 Ed25519 管理员初始化设计

## 背景

当前运行时配置把 issuer 放在 CLI 参数中，管理员初始化流程仍围绕 origin 与 SMTP 配置展开。这样会让首次创建管理员账户依赖 SMTP 或邮箱验证，也让 app 级配置分散在命令行和数据库之间。目标是把 app 级配置收敛到数据库，并允许本地 loopback setup 直接用 Ed25519 public key 创建或绑定管理员用户。

## 目标

1. SQLite 增加单行 `app_meta` 表，保存 app 级配置：
   - `id TEXT PRIMARY KEY CHECK (id = 'APP')`
   - `issuer TEXT NOT NULL`
   - `admin_user_id TEXT`
   - `created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP`
   - `updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP`
   - `admin_user_id` 外键引用 `users(id)`
2. `app_meta` 只能有 `APP` 一行。runtime 初始化新库和既有库时，都必须保证表存在且 `APP` 行可用。
3. issuer 以 `app_meta.issuer` 为权威来源。JWT issuer、admin setup state、OpenAPI/demo 展示等需要 issuer 的位置，都从数据库读取。
4. CLI 移除 `--issuer`，只保留运行服务必需参数，例如 host、port、db。非运行必需的 schema/bootstrap 类参数不再保留在常规启动命令中。
5. `users.email` 允许 `NULL`，账户可以没有邮箱。非 `NULL` email 仍保持唯一性，允许多个无邮箱账户共存。
6. 本地 loopback `/admin/setup` 可用 Ed25519 public key 创建或绑定管理员用户，并写入 `app_meta.admin_user_id`，不需要 SMTP、email OTP 或其他验证方式。
7. 远程 `/admin/setup` 仍不可用，必须保持 loopback-only 限制。
8. SMTP 与 allowed origin 仍可通过 setup 配置，但 SMTP 不是管理员初始化必填项。
9. `GET /admin/setup` 返回 issuer、admin_user_id、管理员凭据摘要、origin 摘要与 SMTP 摘要，不返回 SMTP password。
10. Ed25519 管理员凭据可通过现有 Ed25519 登录流程创建 session。
11. `/me` 等用户响应支持 `email: null`，不能因无邮箱账户失败。
12. 更新 OpenAPI、README、docs、demo 和 tests，确保新初始化流程、nullable email 和 CLI 变更都有文档与验证覆盖。

## 数据模型

`app_meta` 表表示整个 app 的持久化配置，不设计为通用 key-value 表。本次只保存：

- `issuer`：app 的 issuer 权威值。
- `admin_user_id`：当前管理员用户 id，可为空，直到 setup 创建或绑定管理员。

`users.email` 改为 nullable 后，唯一约束必须只约束非空 email。SQLite 允许 unique index 中多个 `NULL` 值，因此保留现有唯一索引或迁移为等价的非空唯一索引均可，但行为必须明确覆盖测试。

## Admin Setup API

### PUT /admin/setup

仅本地 loopback 请求可调用。请求体包含：

- `issuer`：必填，规范化后写入 `app_meta.issuer`。
- `origin` 或 origins 配置：仍写入 allowed origins。
- `admin_ed25519`：可选；提供时包含凭据名称与 Ed25519 public key。
- `smtp`：可选；提供时写入或更新 SMTP 配置。

当 `admin_ed25519` 存在时，runtime 必须创建或复用管理员用户：

- 如果 `app_meta.admin_user_id` 为空，则创建无邮箱用户，绑定 Ed25519 凭据，并把该用户 id 写入 `app_meta.admin_user_id`。
- 如果 `app_meta.admin_user_id` 已存在，则为该用户创建或更新本次提交的管理员 Ed25519 凭据。
- 该路径不要求 SMTP、邮箱、已有 session 或 email OTP。

响应返回更新后的 setup state。SMTP password 永不出现在响应中。

### GET /admin/setup

仅本地 loopback 请求可调用。响应返回：

- `issuer`
- `admin_user_id`
- admin credential summary，例如凭据 id、名称、创建时间、最近使用时间或等价摘要字段
- allowed origin summary
- SMTP summary

响应不得返回 SMTP password，也不得返回 Ed25519 private key。

## 兼容与迁移

runtime 初始化是唯一兼容旧库的 owner，负责在启动时完成必要迁移：

1. 新库：创建 `app_meta` 表和 `APP` 行。
2. 既有库：如果缺少 `app_meta`，创建表并补齐 `APP` 行。
3. 既有库：如果 `users.email` 仍是 `NOT NULL`，迁移为 nullable email，并保留已有用户、凭据、session 和非空 email 唯一性。

兼容对象是旧版本创建的 SQLite 文件。移除条件是项目明确停止支持旧 SQLite 文件自动升级；届时可删除旧 schema 迁移路径及其迁移测试。

## 非目标

1. 不引入通用 app config key-value 表。
2. 不新增远程无认证 admin bootstrap 能力。
3. 不让 SMTP 成为 admin 初始化必需条件。
4. 不改变 email OTP 登录语义。
5. 不绕过现有 Ed25519 challenge/verify 登录路径。
6. 不在 API 中暴露 SMTP password 或任何私钥材料。
