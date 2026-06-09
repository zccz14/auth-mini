# Rust 后端迁移规格

## 迁移目标

将 auth-mini 的后端运行时从 TypeScript/Node 逐步迁移到 Rust，并保持现有公开 HTTP API、SQLite 数据模型、OpenAPI 文档、部署入口和 SDK 消费方式可验证。

第一阶段只交付可提交、可构建、可测试的 Rust 后端切片：

- 提供 Rust 后端 crate，作为后续完整迁移的承载位置。
- 提供可运行 HTTP 服务，验证 Rust 运行时、配置读取、OpenAPI 文件读取和基础请求处理链路。
- 保留现有 TypeScript 后端作为生产 CLI 和 Docker 入口，直到 Rust 后端覆盖现有公开 API 与数据库语义。

第二阶段继续交付最小数据库切片：

- Rust 后端可按显式 `--db` 指定 SQLite 文件，并按显式或默认 `--schema` 执行 `sql/schema.sql`。
- Rust 后端必须校验核心认证表与列存在，确认 Rust 端已能承载后续只读查询和认证 API 迁移。
- 第二阶段不迁移旧版本数据库兼容修复，不写入认证业务数据，不替换 TypeScript 生产入口。

## 保留行为

完整迁移完成前，下列行为仍以现有 TypeScript 实现为准：

- 邮件 OTP 登录：`POST /email/start`、`POST /email/verify`。
- 会话管理：`GET /me`、`POST /session/refresh`、`POST /session/logout`、`POST /session/{session_id}/logout`。
- Ed25519 challenge 验证完成登录。
- WebAuthn 注册、登录和凭据管理。
- JWKS 轮换 CLI 与生产入口语义。
- SQLite schema 文件 `sql/schema.sql` 及现有迁移兼容行为。
- npm 包导出的 SDK、CLI 命令和现有 Docker 发布链路。

第一阶段 Rust 服务必须保留下列可验证行为：

- 默认监听 `127.0.0.1:7777`。
- 支持通过 `--host`、`--port`、`--openapi` 指定监听地址和 OpenAPI 文件路径。
- `GET /healthz` 返回 `200` 和 `ok`。
- `GET /openapi.yaml` 返回仓库 OpenAPI YAML 原文。
- `GET /openapi.json` 返回 `501 not_implemented`，表示 JSON 转换尚未迁移完成。
- 未知路径返回 `404 not_found`。

第二阶段 Rust 服务必须新增下列可验证行为：

- `--db <path>` 在启动监听前打开 SQLite 数据库、开启外键、应用 `sql/schema.sql`。
- `--schema <path>` 仅在同时提供 `--db` 时有效，用于指定 schema 文件。
- schema 校验覆盖 `users`、`sessions`、`jwks_keys`、`allowed_origins`、`webauthn_credentials`、`ed25519_credentials` 的后续迁移所需列。
- schema 缺失时启动失败；不得静默降级为无数据库模式。

第三阶段当前切片必须新增下列可验证行为：

- Rust 后端开始覆盖公开认证端点 `POST /email/verify` 的请求边界。
- `POST /email/verify` 必须读取 HTTP body，按 OpenAPI 合同解析 JSON 对象：只接受 `email` 与 `code` 字段，`email` 必须是非空本地部分和非空域名部分组成的邮箱字符串，`code` 必须是 6 位数字字符串。
- 请求 JSON 无效、字段缺失、字段类型错误、存在额外字段或字段值不满足上述规则时，返回 `400` 与 `{"error":"invalid_request"}`。
- 请求合同有效但 OTP 消费、用户创建、会话创建和 token 签发尚未迁移时，返回 `501` 与 `{"error":"not_implemented"}`，明确该 Rust 端点当前只覆盖请求边界。
- 第三阶段当前切片不得切换 TypeScript 生产入口，不得迁移 SMTP 发送、OTP 存取、JWT/JWKS 或 session token 签发。

第四阶段当前切片必须新增下列可验证行为：

- Rust 后端继续推进 `POST /email/verify`，在配置 `--db` 时按现有 `email_otps` 表执行 OTP 查询、校验和消费。
- OTP 校验必须复用 TypeScript 行为：按 email 查询一条记录，要求记录存在、`consumed_at` 为空、`expires_at` 晚于当前时间、`code_hash` 等于请求 code 的 SHA-256 hex；不满足时返回 `401` 与 `{"error":"invalid_email_otp"}`。
- OTP 消费必须复用 `UPDATE email_otps SET consumed_at = ? WHERE email = ? AND consumed_at IS NULL` 的原子消费语义；若更新 0 行，同样返回 `401 invalid_email_otp`。
- OTP 成功消费后，用户创建、邮箱验证标记、session 创建和 token 签发仍未迁移，必须返回 `501` 与 `{"error":"not_implemented"}`。
- 未配置 `--db` 时，Rust 端点仍只覆盖第三阶段请求边界：有效请求返回 `501 not_implemented`，不声明完整认证行为。

第五阶段当前切片必须新增下列可验证行为：

- Rust 后端继续推进 `POST /email/verify`，在 OTP 成功消费后按现有 `users` 表处理用户记录。
- 若 email 首次出现，必须创建一条用户记录，并写入 `email_verified_at`。
- 若 email 已有用户且 `email_verified_at` 为空，必须写入当前验证时间。
- 若 email 已有已验证用户，必须复用该用户，不得创建重复用户。
- 旧第五阶段只处理到用户记录；后续 PR 已继续迁移 session 创建和 token 签发。
- OTP 无效路径仍返回 `401 invalid_email_otp`，不得创建或更新用户。

本轮 Ed25519 JWT/JWKS 切片必须新增下列可验证行为：

- Rust 后端签发 access token 时必须使用 `jwks_keys.CURRENT.private_jwk` 中的 Ed25519 JWK 私钥执行 EdDSA 签名。
- `GET /jwks` 发布的公钥必须能够验证 Rust 签发的 access token 签名，且不得暴露私钥字段 `d`。
- Rust access token 验证必须拒绝 payload 或签名被篡改的 token。
- 本切片不迁移 JWKS 轮换 CLI，不切换生产入口，不补齐 Ed25519 challenge 验证完成登录。

本轮 SMTP plain transport 切片必须新增下列可验证行为：

- Rust 后端 `POST /email/start` 必须按 OpenAPI 合同解析 JSON 对象，只接受 `email` 字段，并将邮箱 trim 后小写化；无效 JSON、无效 email 或额外字段返回 `400 invalid_request`。
- 配置 `--db` 时，Rust 后端必须读取 `smtp_configs` 中的 active 配置；无 active 配置返回 `503 smtp_not_configured`。
- 选中 SMTP 配置后，Rust 后端必须创建 6 位 OTP，按 SHA-256 hex 写入 `email_otps`，设置 10 分钟过期时间，并清空旧 `consumed_at`。
- 本切片只迁移可测试的明文 SMTP AUTH LOGIN 发送边界；发送成功后返回 `200 {"ok":true}`，发送失败或配置为 `secure=1` 时返回 `503 smtp_temporarily_unavailable`，并立即写入 `consumed_at` 使本次 OTP 不可被验证。
- 本切片不得在无法完成 SMTP 投递时返回假成功；不得连接外部 SMTP 服务进行测试。

## API 兼容范围

第一阶段不替换生产 API。兼容范围限定为新增 Rust 切片自身的基础端点，不声明覆盖现有认证 API。

后续阶段必须在 Rust 中逐项实现并验证 `openapi.yaml` 中列出的公开路径；每个路径迁移完成前不得从 TypeScript 生产入口移除对应行为。

## 数据库边界

- SQLite 仍是唯一持久化数据库。
- `sql/schema.sql` 仍是 schema 事实来源。
- 第一阶段 Rust 切片不写入数据库，不执行迁移，不改变 schema。
- 第二阶段 Rust 切片只执行 `sql/schema.sql` 中的 `CREATE TABLE IF NOT EXISTS`，不新增 schema，不执行 TypeScript 中已有的旧库修复逻辑。
- 后续 Rust 数据库访问必须复用现有表名、列名、约束和时间/令牌语义；需要迁移兼容逻辑时必须有明确旧版本依赖和删除条件。
- 第三阶段当前切片不写入数据库；第四阶段当前切片只写入 `email_otps.consumed_at`；第五阶段当前切片在 OTP 成功消费后写入 `users`。Rust token 签发与验证必须复用 `jwks_keys` 中的 Ed25519 JWK 语义。Rust `POST /email/start` 必须复用 `smtp_configs` 与 `email_otps` 表；schema 初始化必须校验这些表的本轮所需列存在。

## 配置边界

- 第一阶段 Rust 服务只读取命令行参数，不读取或改变现有 Node 配置解析。
- 第二阶段新增 `--db` 与 `--schema` 命令行参数；数据库能力为 Rust 端显式启用，不读取或改变现有 Node 配置解析。
- 默认 host、port 与现有启动命令保持一致。
- issuer、dbPath、SMTP、allowed origins 等业务配置留到对应 API 迁移阶段实现。

## 构建与部署边界

- 第一阶段新增 Rust 构建与测试命令，不改变现有 `npm run build`、`npm test`、Dockerfile 和发布 workflow 的生产语义。
- Rust 后端成为可选构建产物；生产入口切换必须等到公开 API、数据库语义和部署 smoke test 覆盖完成。

## 非目标

- 不在第一阶段或第二阶段重写邮件发送、JWT/JWKS、WebAuthn、Ed25519 或 SDK。
- 不在第二阶段迁移 TypeScript 的旧数据库兼容修复路径。
- 不在第三阶段当前切片迁移邮件发送、OTP 消费、用户创建、session token 签发、WebAuthn、Ed25519 或 SDK。
- 不在第四阶段当前切片迁移邮件发送、用户创建、session token 签发、WebAuthn、Ed25519 或 SDK。
- 不在第五阶段当前切片迁移邮件发送、session token 签发、WebAuthn、Ed25519 或 SDK。
- 不在本轮 Ed25519 JWT/JWKS 切片迁移 JWKS 轮换 CLI、WebAuthn、真实 SMTP、生产入口或 Ed25519 完成登录。
- 不在本轮 SMTP plain transport 切片迁移 TLS/SMTPS/STARTTLS、SMTP CLI、SMTP 多 provider 生产可观测日志、WebAuthn 或生产入口切换。
- 不引入新的数据库、缓存、队列或配置格式。
- 不改变现有 OpenAPI 合同。
- 不增加 TypeScript 与 Rust 之间的代理兼容层。

## 验收标准

- `docs/specs/rust-backend-migration.md` 明确迁移范围和非目标。
- `docs/plans/rust-backend-migration.md` 明确阶段和验证命令。
- `cargo test --manifest-path rust-backend/Cargo.toml` 通过。
- `cargo build --manifest-path rust-backend/Cargo.toml` 通过。
- `npm run typecheck` 通过，证明现有 TypeScript 入口未被破坏。
- 第二阶段 Rust 测试覆盖数据库配置解析、schema 初始化和缺失 schema 拒绝。
- 第三阶段当前切片 Rust 测试覆盖 `POST /email/verify` 的有效请求、无效字段值和额外字段拒绝。
- 第四阶段当前切片 Rust 测试覆盖有效 OTP 消费、过期/已消费/缺失/错误 code 拒绝，以及 HTTP 层 `401 invalid_email_otp` 与成功消费后 `501 not_implemented`。
- 第五阶段当前切片 Rust 测试覆盖首次 email 创建用户、复用已有用户不重复创建、已有未验证用户写入 `email_verified_at`，以及 HTTP 层成功处理用户后仍返回 `501 not_implemented`。
- 本轮 Rust 测试覆盖 access token 可由 JWKS 公钥完成 Ed25519 验签，并覆盖篡改 token 被拒绝。
- 本轮 SMTP Rust 测试覆盖 email start 请求边界、无 active SMTP 配置、明文 SMTP 成功时 OTP 创建和邮件内容、SMTP 失败时 OTP 失效、secure SMTP 不返回假成功，以及 HTTP 层 invalid_request/smtp_not_configured 边界。
- 代码提交在对应迁移分支并通过 PR 合入流程推进。
