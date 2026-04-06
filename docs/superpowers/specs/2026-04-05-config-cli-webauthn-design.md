# 配置持久化与 CLI 资源化设计

## 背景

- `auth-mini` 现已迁移到 `oclif` 命令结构，CLI 更适合继续向 topic / resource 风格演进，而不是把更多长期配置塞进 `start` flags。
- 现状里 SMTP 仍主要通过 `create --smtp-config` 做一次性 JSON 导入，缺少后续运维所需的增删改查。
- `--origin` 目前仍是 `start` 时的可重复 flag，但它本质上是实例级 allowlist 资源，而不是短生命周期进程参数。
- WebAuthn 的 `rp-id` 与页面 `Origin` 有强关系，但当前做成全局启动参数并不适合一个 auth server 服务多个前端域名的场景。
- `issuer` 主要服务 JWT 验证链路；它和 `origin` / `rp-id` 的约束不同，不应在这轮为了统一而强行入库。

## 目标

- 将 SMTP 配置改造成数据库中的长期资源，并提供完整 CLI CRUD。
- 将 allowed origins 入库，并提供完整 CLI CRUD。
- 去掉 `create --smtp-config` 与 `start --origin`，不保留兼容模式。
- 让 WebAuthn 的 `rp_id` 不再作为全局配置，而是作为每次交互最终选定的事实值写入 challenge / credential。
- 让 CLI 命令面提前对齐“instance”语义：当前实例定位值仍是 dbPath，但未来可以平滑演进成 alias 或其他 locator。

## 非目标

- 本轮不实现 SDK 对 `rp_id` 的自动父域链优雅降级。
- 本轮不将 `issuer` 入库，也不引入 `server_config` 单例表。
- 本轮不兼容现有数据库 schema；允许直接做 breaking schema 调整。
- 本轮不实现 alias 系统，只在命令语义上预留 `instance` 概念。

## 决策

- 删除 `create --smtp-config`，初始化命令只负责建库和初始化基础数据。
- 删除 `start --origin`；allowed origins 统一从数据库读取。
- SMTP 配置继续保存在 `smtp_configs`，但新增独立 CLI CRUD，而不是只支持初始化导入。
- 新增 `allowed_origins` 表，并提供独立 CLI CRUD。
- `issuer` 暂时继续保留为 `start` 的必需 CLI 参数，不入库。
- `rp_id` 不做全局配置，不单独建表，只新增到 `webauthn_challenges` 和 `webauthn_credentials`。
- `register/options` 与 `authenticate/options` 接受可选 `rp_id`；未传时默认使用规范化后的当前请求 `Origin.hostname`。
- 命令面的第一个位置参数统一命名为 `instance`；当前阶段它的实际含义仍是 SQLite 路径。

## CLI 风格

`oclif` 已启用 topic separator，后续 CLI 应继续采用“生命周期命令 + 资源 topic”风格。

推荐命令面：

```bash
auth-mini init <instance>
auth-mini start <instance> --issuer https://auth.zccz14.com
auth-mini rotate jwks <instance>

auth-mini smtp list <instance>
auth-mini smtp add <instance> --host smtp.example.com --port 587 --username mailer --password secret --from-email noreply@example.com
auth-mini smtp update <instance> --id 1 --weight 10
auth-mini smtp delete <instance> --id 1

auth-mini origin list <instance>
auth-mini origin add <instance> --value https://a.com
auth-mini origin update <instance> --id 1 --value https://b.com
auth-mini origin delete <instance> --id 1
```

这里的 `<instance>` 当前解释为“SQLite database path”，但命令语义上代表 auth-mini 实例。后续若引入 alias，可在解析层把 `<instance>` 从“路径”扩展为“alias 或路径”，而不必再次重做命令面。

## 数据模型

### `allowed_origins`

新增表：

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `origin TEXT NOT NULL UNIQUE`
- `created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP`

该表只表示允许的前端页面 origin，不承担 `rp_id` 配置职责。

持久化 canonical form 固定为：

- 仅接受 `http` / `https`
- 存完整 origin 字符串，不含 path / query / fragment
- scheme 小写
- hostname 规范化规则固定为：
  - 使用 WHATWG `URL` 解析输入
  - 取解析后的 `url.hostname`
  - 全部转成小写
  - 去掉尾部 `.`
  - 若为 IPv6，则按 WHATWG `URL.origin` 的标准 bracket 形式落库
  - `localhost` 原样允许
  - IPv4 / IPv6 原样允许
  - IDNA 以 WHATWG `URL` 产出的 ASCII hostname 为落库值
- 默认端口省略；非默认端口保留
- 不接受 `null` origin

CLI 写入、运行时匹配与测试断言都以这份 canonical form 为唯一标准，避免 `TEXT UNIQUE` 与请求匹配发生漂移。

示例：

- `HTTPS://Example.COM` -> `https://example.com`
- `https://example.com:443` -> `https://example.com`
- `https://example.com:8443` -> `https://example.com:8443`
- `https://localhost:3000/path` -> 拒绝
- `https://[::1]:443` -> `https://[::1]`
- `https://xn--fsqu00a.xn--0zwm56d` -> `https://xn--fsqu00a.xn--0zwm56d`

### `webauthn_challenges`

新增列：

- `rp_id TEXT NOT NULL`
- `origin TEXT NOT NULL`

这两个字段分别记录本次 ceremony 实际采用的 RP ID 与页面 origin，是后续 verify 的权威来源。

### `webauthn_credentials`

新增列：

- `rp_id TEXT NOT NULL`

该字段记录该 credential 注册时所属的 RP 命名空间，作为历史事实保留，便于后续认证验证和排障。

## WebAuthn 请求与校验规则

### `rp_id` 输入

- `POST /webauthn/register/options` 接受可选 `rp_id`
- `POST /webauthn/authenticate/options` 接受可选 `rp_id`
- 如果客户端未传 `rp_id`，服务端默认使用规范化后的当前请求 `Origin.hostname`
- `verify` 阶段不再信任客户端重复传值，而是读取 challenge 中保存的 `rp_id`

### 合法性校验

服务端在 options 阶段必须同时校验：

- 请求头 `Origin` 必须命中 `allowed_origins`
- `Origin` 必须能被解析为 `http` 或 `https` URL
- `Origin` 必须是 origin-only 值；带 path / query / fragment 的输入不得进入 `allowed_origins`
- 本次选定的 `rp_id` 必须满足：
  - 先经过统一规范化流程
  - 默认值为 `Origin.hostname`
  - 显式值必须是 `Origin.hostname` 本身或其合法父域
  - 不接受 public suffix、非法 host、`null` origin，以及无法按 WebAuthn 要求解释的值

实现上不要只做简单字符串后缀判断；应按统一的 URL / host 规范化与域名边界规则处理大小写、默认端口、尾点、IDNA、localhost / IP 等边界。

非法时直接返回客户端错误；不要默默修正为其他值。

### verify 一致性约束

`register/verify` 与 `authenticate/verify` 都必须继续绑定具体 origin，而不是只绑定 `rp_id`：

- `webauthn_challenges.origin` 必须等于 options 阶段记录的请求 `Origin`
- verify 阶段请求头 `Origin` 必须存在，且再次命中 `allowed_origins`
- verify 阶段请求头 `Origin` 必须等于 `webauthn_challenges.origin`
- verify 阶段 `clientDataJSON.origin` 必须等于 `webauthn_challenges.origin`
- verify 阶段使用的 RP ID 必须等于 `webauthn_challenges.rp_id`

这样多 origin 共享同一父域 `rp_id` 时，系统仍然能区分这次 ceremony 到底来自哪个页面 origin。

### 默认行为

- SDK / API 调用 `register` / `authenticate` 时，`rp_id` 作为可选参数暴露
- 默认值为当前页面 `window.location.hostname`
- 本轮不做 SDK 自动父域链降级
- 将“按 `sub.example.com -> example.com` 逐级优雅降级”记录为后续 TODO

### `credential.rp_id` 的认证约束

- 注册成功后写入 `webauthn_credentials.rp_id`
- 认证时只接受属于 `challenge.rp_id` 命名空间的 credential
- authenticate verify 阶段必须显式检查 `credential.rp_id == challenge.rp_id`

该字段不是审计备注，而是认证约束的一部分。

## 运行时行为

### `init`

- 创建数据库文件
- 建表
- 初始化 JWKS
- 不再导入 SMTP JSON

### `start`

- 继续要求显式 `--issuer`
- 启动时从数据库读取：
  - SMTP 配置
  - `allowed_origins`
- 不再接受 `--origin`
- running server 不保证自动感知数据库中的 origin / SMTP 变更；修改后需重启生效

### SMTP 与 origin 资源管理

- SMTP 与 origin 均通过独立 CLI 子命令管理
- 这两类数据都属于实例级长期状态，而不是一次性启动参数

## 关于 `issuer`

- `issuer` 继续保留在 CLI，而不是入库
- 原因不是它不重要，而是它目前更像“当前 auth server 进程对外声明的 JWT 发行者身份”
- 当前 `<instance>` 只承载数据库中的持久化资源状态；`issuer` 仍属于部署时进程配置，不属于库内状态
- `issuer` 不具备像 WebAuthn `rp_id` 那样由浏览器强制执行的域归属校验
- 实际安全约束来自后端 verifier 是否把以下三者绑定到同一信任边界：
  - token 的 `iss`
  - verifier 的 `issuer` 配置
  - verifier 获取公钥的 `jwks` 来源
- 因此本轮不为了“所有配置都入库”而引入一个仅包含 `issuer` 的单例表

## 设计理由

- SMTP 与 origin 都是典型的长期资源，适合做数据库管理项和 CLI CRUD。
- `rp_id` 在多前端域名共享一个 auth server 的场景下，不适合作为单值全局配置。
- 把 `rp_id` 写入 challenge / credential，可以让系统保留“这次交互到底用了哪个 RP”的真实历史，而不是依赖运行时猜测。
- 在 challenge 中同时持久化 `origin` 与 `rp_id`，可以避免 verify 阶段退化成“只看 RP，不看页面来源”。
- `instance` 语义先行、解析实现后续再扩展，可以兼顾当前低成本实现与未来 alias 演进。
- `oclif` topic 风格更适合 `smtp` / `origin` 这类资源命令，而不是继续扩大 `start` flags 的职责。

## 风险

- 这是一次明确的 breaking change：旧 CLI 用法和旧数据库都不再兼容。
- README、demo 和测试都要同步移除 `--smtp-config` 与 `--origin` 旧用法。
- WebAuthn options 请求新增可选 `rp_id` 后，SDK、HTTP schema 和服务端验证逻辑要同步更新，否则容易出现契约不一致。
- 由于本轮暂不做 SDK 自动降级，跨子域共享 passkey 的产品体验先保持“显式传 `rp_id`”模式。
- `allowed_origins` 的输入规范化必须明确，否则 CLI 与运行时请求校验可能出现一边接受、一边拒绝的漂移。

## 发布、升级与回滚

- 本 RFC 明确允许 breaking change，不兼容旧库 schema。
- 升级前必须先备份数据库。
- 发布实现时，旧实例处理策略固定为：
  - 不做原地自动迁移
  - 不做兼容读写
  - 检测到旧 schema 时直接失败，并提示用户重建实例或自行执行离线迁移脚本
- 本轮成功标准只覆盖“新建实例按新 schema 工作正常”；旧库升级脚本若需要，另起单独任务设计。
- 回滚策略固定为：
  - 回滚到旧版本时，使用旧版本重新创建/恢复对应数据库备份
  - 不承诺新 schema 数据库可直接被旧版本读取

这样可以把本轮复杂度收敛在“新模型从零初始化”，避免半兼容状态。

## 测试

- CLI 集成测试：
  - `init` 不再接受 `--smtp-config`
  - `start` 不再接受 `--origin`
  - `smtp` 与 `origin` CRUD 命令的 help、成功路径与错误路径
- 数据层测试：
  - `allowed_origins` 的增删改查
  - `webauthn_challenges.rp_id` 与 `webauthn_credentials.rp_id` 的写入与读取
- WebAuthn 行为测试：
  - 默认 `rp_id = Origin.hostname`
  - 显式 `rp_id` 为父域时通过
  - 非法 `rp_id` 被拒绝
  - verify 要求 `request Origin == challenge.origin == clientDataJSON.origin`
  - authenticate verify 要求 `credential.rp_id == challenge.rp_id`
- 最终验证：
  - 相关定向测试
  - `npm test`
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`

## 成功标准

- CLI 已移除 `--smtp-config` 和 `start --origin` 旧路径。
- SMTP 与 origin 都能通过独立 topic 命令完成 CRUD。
- WebAuthn 不再依赖全局 `rp-id` 启动参数。
- 服务端能够为每次 challenge / credential 正确持久化 `rp_id`。
- 默认 CLI 语义已转向 `<instance>`，为未来 alias 演进预留空间。
