# Rust 后端迁移规格

## 迁移目标

将 auth-mini 的后端运行时从 TypeScript/Node 迁移到 Rust，并保持现有公开 HTTP API、SQLite 数据模型、OpenAPI 文档、部署入口和 SDK 消费方式可验证。当前清理后，TypeScript/Node 不再承载后端运行时或 oclif CLI；npm 包只保留 SDK 构建与发布能力。

第一阶段只交付可提交、可构建、可测试的 Rust 后端切片：

- 提供 Rust 后端 crate，作为后续完整迁移的承载位置。
- 提供可运行 HTTP 服务，验证 Rust 运行时、配置读取、OpenAPI 文件读取和基础请求处理链路。
- 历史第一阶段曾保留 TypeScript 后端作为生产 CLI 和 Docker 入口；当前 Rust 后端、Rust CLI 和 release binary 已基本可用，Node 后端/oclif 路径已移除。

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
- `rotate jwks`、`init`、`start` 的 npm CLI 语义；Rust 已开始覆盖 `origin` 与 `smtp` 管理命令能力，但本轮不切换 npm 包 CLI。
- SQLite schema 文件 `sql/schema.sql`；WebAuthn schema 在 Rust-first spike 后允许破坏旧 Node 凭据形态。
- npm 包导出的 SDK；npm 包不再导出 CLI 命令。现有 Docker 发布链路如仍引用 Node 后端，应在独立 Docker/runtime PR 中切换或删除。

## Node 后端清理边界

- 删除 TypeScript HTTP server/app、Node auth/session/webauthn/ed25519/email/jwks/users repos/services、Node SQLite/SMTP/origin infra、oclif command wrappers 与 `src/index.ts`。
- 不新增 Node 到 Rust wrapper、`npx` 兼容入口、旧运行时 fallback 或双后端选择开关。
- 保留 `src/sdk/**`、`src/generated/**`、OpenAPI SDK 生成脚本、SDK 类型/浏览器 runtime/device/api exports。
- 保留 SDK 和 Rust E2E 仍使用的测试 helper，例如 WebAuthn CBOR helper、Ed25519 helper 与 `shared/crypto`。
- Node 后端/CLI 专用 Vitest 覆盖删除；核心运行时覆盖以 Rust E2E 和 Rust cargo 测试为准。

第一阶段 Rust 服务必须保留下列可验证行为：

- 默认监听 `127.0.0.1:7777`。
- 支持通过 `--host`、`--port` 指定监听地址；OpenAPI 文档由 Rust binary 内置，不提供路径覆盖参数。
- `GET /healthz` 返回 `200` 和 `ok`。
- `GET /openapi.yaml` 返回仓库 OpenAPI YAML 原文。
- `GET /openapi.json` 返回由同一 `openapi.yaml` 转换得到的 JSON 文档。
- 未知路径返回 `404 not_found`。

第二阶段 Rust 服务必须新增下列可验证行为：

- `--db <path>` 在启动监听前打开 SQLite 数据库、开启外键、应用 `sql/schema.sql`。
- `--schema <path>` 仅在同时提供 `--db` 时有效，用于指定 schema 文件。
- schema 校验覆盖 `users`、`sessions`、`jwks_keys`、`allowed_origins`、`webauthn_credentials`、`ed25519_credentials` 的后续迁移所需列。
- schema 缺失时启动失败；不得静默降级为无数据库模式。

当前 Rust 发布二进制的数据库易用性必须满足：

- `init` 仍保留为幂等显式命令，但不再是首次运行前置步骤。
- `start`、裸 serve `--db`、`origin`、`smtp`、`rotate jwks` 在打开数据库前必须使用同一个 Rust 内置 schema 初始化路径；当 SQLite 文件不存在时创建父目录、创建 schema，并补齐 `CURRENT` 与 `STANDBY` JWKS key。
- 省略数据库路径时使用 `~/.auth-mini/default.sqlite3`；显式路径仍按用户传入路径使用。
- 使用数据库的 Rust CLI/运行时路径必须向 stderr 打印一行 `auth-mini SQLite database: <path>`；`origin list`、`smtp list` 等管理命令 stdout 仍只输出机器可读的制表符分隔行。
- 发布二进制不得依赖工作目录中的 `sql/schema.sql` 才能完成数据库初始化；schema 来源为 Rust 内置内容。既有 `--schema` 参数仅作为兼容参数继续接受，不参与运行时初始化。Rust `/openapi.yaml` 与 `/openapi.json` 使用编译进 binary 的仓库 `openapi.yaml`，不依赖工作目录或外部 OpenAPI 文件。

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

本轮 SMTP library transport 切片必须新增下列可验证行为：

- Rust 后端 `POST /email/start` 必须按 OpenAPI 合同解析 JSON 对象，只接受 `email` 字段，并将邮箱 trim 后小写化；无效 JSON、无效 email 或额外字段返回 `400 invalid_request`。
- 配置 `--db` 时，Rust 后端必须读取 `smtp_configs` 中的 active 配置；无 active 配置返回 `503 smtp_not_configured`。
- 选中 SMTP 配置后，Rust 后端必须创建 6 位 OTP，按 SHA-256 hex 写入 `email_otps`，设置 10 分钟过期时间，并清空旧 `consumed_at`。
- Rust SMTP 发送必须交给生态成熟库处理，不得继续维护手写 `AUTH LOGIN`、`MAIL FROM`、`RCPT TO`、`DATA` 等裸 SMTP 协议交互代码。
- 发送成功后返回 `200 {"ok":true}`；发送失败时返回 `503 smtp_temporarily_unavailable`，并立即写入 `consumed_at` 使本次 OTP 不可被验证。
- `smtp_configs.secure=0` 映射为 lettre 明文 SMTP transport；`secure=1` 映射为 lettre SMTPS/TLS transport。现有 schema 只有 boolean，无法表达 STARTTLS-required 与 SMTPS 的区别；本轮不发明额外兼容配置，STARTTLS-required 仍是剩余配置限制。
- 本切片不得在无法完成 SMTP 投递时返回假成功；不得连接外部 SMTP 服务进行测试。

本轮 WebAuthn register/options 切片必须新增下列可验证行为：

- Rust 后端覆盖 `POST /webauthn/register/options`，请求必须先通过 bearer access token 与 passkey-management 授权；缺失或无效 token 返回 `401 invalid_access_token`，认证方式不是 `email_otp` 或 `webauthn` 返回 `403 insufficient_authentication_method`。
- 请求 body 必须是仅包含非空 `rp_id` 的 JSON 对象；无效 body 返回 `400 invalid_request`。
- Rust 必须按已允许 origin 校验请求 origin 与 `rp_id`：请求 origin 必须存在于 `allowed_origins`，`rp_id` 必须是该 origin host 本身或父域，且必须被任一 allowlist origin 覆盖；不满足时返回 `400 invalid_webauthn_registration`。
- 成功时 Rust 生成 WebAuthn registration options，写入 `webauthn_challenges` 的 `register` challenge，并将该用户未消费的旧 register challenge 标记为 consumed；响应包含 `request_id` 与 `publicKey`，其中 rp/user/pubKeyCredParams/timeout/authenticatorSelection 复用 TypeScript 公开合同。
- 本切片不迁移 `/webauthn/register/verify`，不迁移登录 options/verify，不实现任何 WebAuthn 假验证成功路径。

本轮 WebAuthn authenticate/options 切片必须新增下列可验证行为：

- Rust 后端覆盖 `POST /webauthn/authenticate/options`，该端点保持公开，无需 bearer access token。
- 请求 body 必须是仅包含非空 `rp_id` 的 JSON 对象；无效 body 返回 `400 invalid_request`。
- Rust 必须按已允许 origin 校验请求 origin 与 `rp_id`：请求 origin 必须存在于 `allowed_origins`，`rp_id` 必须是该 origin host 本身或父域，且必须被任一 allowlist origin 覆盖；不满足时返回 `400 invalid_webauthn_authentication`。
- 成功时 Rust 生成 WebAuthn authentication options，写入 `webauthn_challenges` 的 `authenticate` challenge，`user_id` 必须为空；响应包含 `request_id` 与 `publicKey.challenge/rpId/timeout/userVerification`，且不得包含 `allowCredentials`。
- 本切片不迁移 `/webauthn/authenticate/verify`，不迁移 `/webauthn/register/verify`，不实现任何 WebAuthn 假验证成功路径。

本轮 WebAuthn register/verify 前置边界切片必须新增下列可验证行为：

- Rust 后端覆盖 `POST /webauthn/register/verify` 的请求边界和验证前置失败路径，请求必须先通过 bearer access token 与 passkey-management 授权；缺失或无效 token 返回 `401 invalid_access_token`，认证方式不是 `email_otp` 或 `webauthn` 返回 `403 insufficient_authentication_method`。
- 请求 body 必须符合 OpenAPI register verify 合同：顶层只接受 `request_id` 与 `credential`，`request_id` 必须是 UUID，credential 必须包含非空 `id`、`rawId`、`type: public-key`、`response.clientDataJSON`、`response.attestationObject`；无效 body 返回 `400 invalid_request`。
- Rust 必须查询 `webauthn_challenges` 中未消费、未过期、类型为 `register` 的 challenge；challenge 不存在、已消费、过期或不属于当前用户时返回 `400 invalid_webauthn_registration`。
- Rust 必须校验请求 Origin 与存储 challenge origin 一致，且该 origin 仍存在于 `allowed_origins`；不满足时返回 `400 invalid_webauthn_registration`。
- 前置校验通过后必须返回 `501 not_implemented`，不得消费 challenge、不得写入 `webauthn_credentials`、不得返回 `200 ok`。真实 attestation 验证仍未迁移前，禁止实现 WebAuthn verify 假成功。

本轮 WebAuthn authenticate/verify 前置边界切片必须新增下列可验证行为：

- Rust 后端覆盖 `POST /webauthn/authenticate/verify` 的请求边界和验证前置失败路径；该端点保持公开，不要求 bearer access token。
- 请求 body 必须符合 OpenAPI authenticate verify 合同：顶层只接受 `request_id` 与 `credential`，`request_id` 必须是 UUID，credential 必须包含非空 `id`、`rawId`、`type: public-key`、`response.clientDataJSON`、`response.authenticatorData`、`response.signature`，`response.userHandle` 可缺省或为 null；无效 body 返回 `400 invalid_request`。
- Rust 必须查询 `webauthn_challenges` 中未消费、未过期、类型为 `authenticate` 的 challenge；challenge 不存在、已消费或过期时返回 `400 invalid_webauthn_authentication`。
- Rust 必须校验请求 Origin 与存储 challenge origin 一致，且该 origin 仍存在于 `allowed_origins`；不满足时返回 `400 invalid_webauthn_authentication`。
- Rust 必须按 credential id 与 challenge rp_id 查询已有 `webauthn_credentials`；不存在或 rp_id 不匹配时返回 `400 invalid_webauthn_authentication`。
- 前置校验通过后必须返回 `501 not_implemented`，不得消费 challenge、不得更新 credential counter 或 last_used_at、不得创建 session 或签发 token、不得返回 `200`。真实 assertion 验证仍未迁移前，禁止实现 WebAuthn verify 假成功。

本轮 WebAuthn Rust-first schema spike 必须新增下列可验证行为：

- WebAuthn 持久化方向改为 Rust-first，公开/主键凭据句柄使用 WebAuthn `credential_id`，不再为 WebAuthn 凭据维护独立内部 `id`。
- `webauthn_credentials` 必须存储 `webauthn-rs` 序列化后的 `Passkey` 为 `passkey_json`，并保留 `user_id`、`rp_id`、`last_used_at`、`created_at`；不再持久化 Node/simplewebauthn 形态的 `public_key`、`counter`、`transports` 拆分列。
- `webauthn_challenges` 必须使用 `state_json` 存储 `webauthn-rs` 注册或认证状态，保留 `request_id`、`type`、`user_id`、`rp_id`、`origin`、`expires_at`、`consumed_at`、`created_at` 与 register/authenticate 的 `user_id` 约束；不再以独立 `challenge` 列作为持久化事实。
- 这是破坏性 schema/API 方向：旧 Node WebAuthn 凭据不提供兼容迁移路径，用户可能需要重新注册 passkey；本轮不设计 Node 兼容桥、不保留旧 schema 分支。
- 本轮仅证明 `webauthn-rs` 挑战状态可通过 serde JSON 持久化，并接入依赖；不迁移真实 registration/authentication verify，不伪造验证成功。
- `Passkey` 只能由真实注册 ceremony 完成后获得；本轮不构造假的 `Passkey`。`Passkey` 类型本身由 `webauthn-rs` 声明可安全序列化，后续完整 verify 迁移完成真实注册后再增加 `Passkey` 实例 roundtrip 覆盖。

本轮 Ed25519 verify 切片必须新增下列可验证行为：

- Rust 后端覆盖公开端点 `POST /ed25519/verify`；该端点保持公开，不要求 bearer access token。
- 请求 body 必须只包含 `request_id` 与 `signature`，`request_id` 必须是 UUID 形状，`signature` 必须是非空字符串；无效 body 返回 `400 invalid_request`。
- Rust 必须读取 `ed25519_challenges` 中对应 challenge，要求 challenge 存在、`consumed_at` 为空、`expires_at` 晚于当前时间；否则返回 `400 invalid_ed25519_authentication`。
- Rust 必须按 challenge 绑定的 `credential_id` 读取 `ed25519_credentials`，使用该凭据保存的 32-byte base64url Ed25519 public key 验证请求签名，签名对象为 challenge 原文 UTF-8 字节；凭据不存在、公钥或签名格式错误、签名不匹配均返回 `400 invalid_ed25519_authentication`。
- 验证成功后必须在同一 SQLite 事务中原子消费 challenge、更新 `ed25519_credentials.last_used_at`、创建 `auth_method = 'ed25519'` 的 session 并签发标准 token 响应；若 session/JWKS 签发失败，不得消费 challenge 或更新凭据。
- 不改变 `/ed25519/start`、Ed25519 credential management、OpenAPI 合同、TypeScript 生产入口或 SDK 行为，不新增旧数据兼容 fallback。

本轮 PR #82 后公开路由对齐审计结论：

- `openapi.yaml` 当前公开 HTTP API 共 20 个业务 method/path 对：`POST /email/start`、`POST /email/verify`、`GET /me`、`POST /session/refresh`、`POST /session/logout`、`POST /session/{session_id}/logout`、`POST /ed25519/start`、`POST /ed25519/verify`、`GET|POST /ed25519/credentials`、`PATCH|DELETE /ed25519/credentials/{id}`、`POST /webauthn/register/options`、`POST /webauthn/register/verify`、`POST /webauthn/authenticate/options`、`POST /webauthn/authenticate/verify`、`DELETE /webauthn/credentials/{id}`、`GET /jwks`、`GET /openapi.yaml`、`GET /openapi.json`。
- TypeScript `src/server/app.ts` 与 Rust `rust-backend/src/http.rs` 已对上述公开路由全部存在等价注册；本轮未发现仍需新增的公开 Rust route gap。
- `GET /healthz` 是 Rust 后端健康检查端点，不属于当前 OpenAPI 公开业务 API 对齐表；CORS `OPTIONS` 预检为跨路由通用行为，也不作为单独业务 route gap 统计。
- 后续迁移工作应继续收敛各路由的内部业务语义与生产入口切换，不再以“缺少公开路由注册”为当前阻塞项。

本轮 PR #83 后认证 / 会话 / 错误响应语义对齐审计结论：

- 会话 cookie/header 形态：TypeScript 与 Rust 当前公开认证端点均通过 JSON body 返回 `access_token`、`refresh_token`，受保护端点均要求 `Authorization: Bearer <access_token>`；未发现需要新增 cookie 兼容路径。
- session 响应 body 形态：邮件 OTP、Ed25519 与 WebAuthn 完成登录路径均返回 `session_id`、`access_token`、`token_type: "Bearer"`、`expires_in: 900`、`refresh_token`；Rust `token_json` 与 TypeScript `TokenPair` 对齐。
- `GET /me` auth method 数据形态：Rust 与 TypeScript 均返回 `user_id`、`email`、`webauthn_credentials`、`ed25519_credentials`、`active_sessions`；`active_sessions[].auth_method` 继续来自 session 表，WebAuthn 使用 Rust-first `credential_id` 方向。
- unauthorized/error 响应：受保护端点缺失或无效 bearer token 返回 `401 invalid_access_token`，passkey-management 授权不足返回 `403 insufficient_authentication_method`，OTP/session/WebAuthn/Ed25519 业务失败码整体对齐。本轮发现并修复 Rust peer logout self-target 错误码，将其从 `session_peer_logout_self_target` 改为 TypeScript 对齐的 `400 invalid_request`。
- invalid request validation style：两端均拒绝无效 JSON、字段缺失、字段类型错误和额外字段；Rust 以 serde `deny_unknown_fields` 加局部值校验保持当前切片的显式边界。Ed25519/WebAuthn 已知 Rust-first WebAuthn 破坏性方向不回加 Node 兼容。
- 仍需后续继续细查的非阻塞点：Ed25519 credential create 的无效请求错误码当前 Rust 已按既有迁移切片返回 `invalid_ed25519_credential`，如要收敛到 OpenAPI/TypeScript 的 `invalid_request`，应单独建小切片确认公开 API 决策后处理。

本轮 Rust CLI origin 管理切片必须新增下列可验证行为：

- Rust 二进制支持 `origin add <db> --value <origin>`、`origin list <db>`、`origin update <db> --id <id> --value <origin>`、`origin delete <db> --id <id>`。
- `<db>` 对 Rust 二进制管理命令可省略；省略时统一使用 `~/.auth-mini/default.sqlite3`，并在初始化/打开数据库前创建 `~/.auth-mini`。
- 四个命令必须按现有 schema 初始化 SQLite 数据库，并只读写 `allowed_origins`。
- add/update 必须复用 TypeScript origin 管理的核心规范化规则：只接受 `http`/`https` origin，拒绝 `null`、路径、查询、hash、用户名密码，规范化 scheme/host 大小写、尾随点与默认端口。
- add/list/update 输出继续使用 TypeScript CLI 当前的 tab 分隔格式：`id origin created_at`；delete 成功不输出。
- update/delete 找不到 id 时返回失败，不静默成功。
- 本切片不切换 npm 包 CLI，不删除 TypeScript origin CLI；npm 包、SDK、Docker 入口保持原状。

本轮 Rust CLI SMTP 管理切片必须新增下列可验证行为：

- Rust 二进制支持 `smtp add <db> --host <host> --port <port> --username <username> --password <password> --from-email <email> [--from-name <name>] [--secure] [--weight <weight>]`、`smtp list <db>`、`smtp update <db> --id <id> [字段 flags]`、`smtp delete <db> --id <id>`。
- `<db>` 对 Rust 二进制 SMTP 命令可省略；省略时复用同一个默认实例 `~/.auth-mini/default.sqlite3`。
- 四个命令必须按现有 schema 初始化 SQLite 数据库，并只读写 `smtp_configs`。
- add 必须复用 TypeScript SMTP CLI 的必填字段和默认值：`from_name` 默认为空字符串，`secure` 默认为 false，`weight` 默认为 1，新增配置默认 active。
- update 必须支持 partial update，未传字段保留原值；`--secure` 只接受 `true` 或 `false`。
- add/list/update 输出继续使用 tab 分隔格式：`id host port username from_email from_name secure is_active weight`；出于安全边界，本轮 Rust SMTP CLI 输出不得包含 `password`。
- update/delete 找不到 id 时返回失败，不静默成功。
- 本切片不切换 npm 包 CLI，不删除 TypeScript SMTP CLI；npm 包、SDK、Docker 入口保持原状。

本轮 Rust CLI 解析与 lint 准备切片必须新增下列可验证行为：

- Rust 二进制命令行解析改用 `clap` derive API 承载 `origin`、`smtp` 与服务启动参数，业务执行枚举和数据库读写逻辑保持不变。
- Rust CLI 必须保留现有命令名、flag 名、必填字段、默认值、tab 分隔输出和核心错误失败语义；`--help` 由 `clap` 提供标准帮助输出。
- Rust CLI `init`、`start`、`origin`、`smtp`、`rotate jwks` 的实例路径可省略，默认实例路径为 `~/.auth-mini/default.sqlite3`；显式路径仍按用户输入使用。
- Rust 验证路径新增 `cargo clippy --manifest-path rust-backend/Cargo.toml --all-targets -- -D warnings`，把 clippy 作为 Rust 迁移发布准备的最小 lint 门禁。
- 本切片不切换 npm 包 CLI，不迁移 JWKS/init/start CLI，不重构数据库或认证业务代码。

本轮 Rust 目标 E2E harness 切片必须新增下列可验证行为：

- 新增专用 `npm run test:rust-e2e`，先构建当前 Rust debug binary，再由 Vitest 启动外部 Rust 服务；该 harness 位于默认 `npm test` 不扫描的 `rust-e2e` 目录，命令不并入默认检查。
- E2E harness 必须只在仓库内 `.tmp/rust-e2e` 创建临时 SQLite 文件，并在测试结束后停止服务、删除临时目录。
- harness 必须通过 Rust CLI `init` 初始化数据库和 JWKS，直接写入测试 OTP 行来避免真实 SMTP 依赖。
- harness 必须在随机可用端口启动 Rust server，并覆盖 `GET /healthz`、未认证 `GET /me`、公开 auth endpoint CORS preflight、seeded email OTP verify happy path、认证后 `GET /me`、Ed25519 credential/start/verify happy path。
- 本切片不迁移生产入口，不把 release binary 构建加入默认 PR 检查，不新增 WebAuthn ceremony 测试；WebAuthn 需等待确定性测试 authenticator 后另行切片。

本轮 Rust E2E PR workflow 切片必须新增下列可验证行为：

- 新增独立 `.github/workflows/rust-e2e.yml`，仅在面向 `main` 的 pull request 触发，不修改现有 `.github/workflows/pr-checks.yml`。
- workflow 权限必须最小化为 `contents: read`，并按 PR 维度设置 concurrency 与 `cancel-in-progress: true`。
- workflow 必须在 `ubuntu-latest` 上线性执行 checkout、Node 24/npm cache、Rust stable setup、Cargo cache、`npm ci`、`cargo build --manifest-path rust-backend/Cargo.toml` 与 `npm run test:rust-e2e`。
- Rust E2E 暂时只作为独立 PR workflow 信号，不折入主 `PR checks` job；是否成为仓库保护主门禁需后续按稳定性和耗时单独决策。

## API 兼容范围

第一阶段不替换生产 API。兼容范围限定为新增 Rust 切片自身的基础端点，不声明覆盖现有认证 API。

后续阶段必须在 Rust 中逐项实现并验证 `openapi.yaml` 中列出的公开路径；每个路径迁移完成前不得从 TypeScript 生产入口移除对应行为。

## 数据库边界

- SQLite 仍是唯一持久化数据库。
- `sql/schema.sql` 仍是 schema 事实来源。
- 第一阶段 Rust 切片不写入数据库，不执行迁移，不改变 schema。
- 第二阶段 Rust 切片只执行 `sql/schema.sql` 中的 `CREATE TABLE IF NOT EXISTS`，不新增 schema，不执行 TypeScript 中已有的旧库修复逻辑。
- 后续 Rust 数据库访问必须复用现有表名、约束和时间/令牌语义；WebAuthn 凭据和 challenge 列以本轮 Rust-first schema 为准。需要迁移兼容逻辑时必须有明确旧版本依赖和删除条件。
- 第三阶段当前切片不写入数据库；第四阶段当前切片只写入 `email_otps.consumed_at`；第五阶段当前切片在 OTP 成功消费后写入 `users`。Rust token 签发与验证必须复用 `jwks_keys` 中的 Ed25519 JWK 语义。Rust `POST /email/start` 必须复用 `smtp_configs` 与 `email_otps` 表；Rust WebAuthn register/options 必须复用 `users`、`allowed_origins` 与 `webauthn_challenges` 表；Rust Ed25519 verify 必须复用 `ed25519_challenges`、`ed25519_credentials`、`sessions` 与 `jwks_keys` 表；schema 初始化必须校验这些表的本轮所需列存在。

## 配置边界

- 第一阶段 Rust 服务只读取命令行参数，不读取或改变现有 Node 配置解析。
- 第二阶段新增 `--db` 与 `--schema` 命令行参数；数据库能力为 Rust 端显式启用，不读取或改变现有 Node 配置解析。
- 默认 host、port 与现有启动命令保持一致。
- issuer、dbPath、SMTP、allowed origins 等业务配置留到对应 API 迁移阶段实现。

## 构建与部署边界

- 第一阶段新增 Rust 构建与测试命令，不改变现有 `npm run build`、`npm test`、Dockerfile 和发布 workflow 的生产语义。
- Rust 后端与 release binary 是当前正式运行时；TypeScript 构建只覆盖 npm SDK 产物。
- Rust 目标 E2E harness 先使用 debug binary 作为最小外部进程 smoke；是否在 CI 默认运行或改用 release binary 后续按耗时与发布策略单独决策。
- Rust 目标 E2E 已新增独立 PR workflow，但不并入现有 `pr-checks` 主 job；该 workflow 提供单独 CI 信号，不改变生产入口、发布 workflow 或默认 `npm test` 语义。
- Rust 发布准备不要求 Docker publishing；后续 release readiness 应聚焦 Rust 二进制跨平台 cross-compilation、产物校验和运行 smoke test。Docker runtime/publishing 仅在未来生产入口切换明确需要时另行立项。
- Rust 二进制发布 workflow 必须在 `v*` tag 上构建 `auth-mini` release binary，并直接上传平台命名 archive 与 SHA-256 checksum 到 GitHub Release。
- 初始 Rust release 目标限定为 GitHub-hosted runner 可直接验证的 `x86_64-unknown-linux-gnu`、`x86_64-apple-darwin`、`aarch64-apple-darwin`、`x86_64-pc-windows-msvc`；Linux aarch64 与 musl 目标暂不纳入首轮，后续需有稳定 linker/system dependency 验证后再加入。
- Rust 二进制发布 workflow 不得为所有平台强制使用 Git Bash；Windows 构建必须使用 runner 默认 shell，避免 vendored OpenSSL 构建时选中缺少 `Locale::Maketext::Simple` 的 Git/MSYS Perl。
- Rust release readiness 明确不包含 Docker publishing；现有 Docker image 发布链路保持独立，不作为 Rust 二进制发布门禁。
- Node 后端/oclif 删除不在本轮切换 Docker runtime；已删除仍假设 Node `dist/index.js` 的 Docker PR check 与 image release workflow，Docker runtime 若要继续发布应作为后续独立 PR 切换到 Rust binary。

## 非目标

- 不在第一阶段或第二阶段重写邮件发送、JWT/JWKS、WebAuthn、Ed25519 或 SDK。
- 不在第二阶段迁移 TypeScript 的旧数据库兼容修复路径。
- 不在第三阶段当前切片迁移邮件发送、OTP 消费、用户创建、session token 签发、WebAuthn、Ed25519 或 SDK。
- 不在第四阶段当前切片迁移邮件发送、用户创建、session token 签发、WebAuthn、Ed25519 或 SDK。
- 不在第五阶段当前切片迁移邮件发送、session token 签发、WebAuthn、Ed25519 或 SDK。
- 不在本轮 Ed25519 JWT/JWKS 切片迁移 JWKS 轮换 CLI、WebAuthn、真实 SMTP、生产入口或 Ed25519 完成登录。
- 不在本轮 SMTP library transport 切片迁移 STARTTLS-required 配置表达、SMTP CLI、SMTP 多 provider 生产可观测日志、WebAuthn 或生产入口切换。
- 不在本轮 WebAuthn register/options 切片迁移 WebAuthn register/verify、authenticate/options、authenticate/verify 或生产入口切换。
- 不在本轮 WebAuthn authenticate/options 切片迁移 WebAuthn register/verify、authenticate/verify 或生产入口切换。
- 不在本轮 WebAuthn register/verify 前置边界切片迁移真实 attestation 验证、credential 创建、challenge 消费、authenticate/verify 或生产入口切换。
- 不在本轮 WebAuthn authenticate/verify 前置边界切片迁移真实 assertion 验证、challenge 消费、credential counter 更新、session 创建、token 签发或生产入口切换。
- 不在本轮 WebAuthn Rust-first schema spike 中提供旧 Node WebAuthn 凭据兼容迁移，不保证旧 `public_key`/`counter`/`transports` 数据可继续登录。
- 不在本轮 Ed25519 verify 切片迁移 Ed25519 start、credential management、生产入口、SDK、OpenAPI 或旧数据兼容 fallback。
- 不在本轮 Rust CLI origin 管理切片迁移 SMTP/JWKS/init/start CLI，不切换 npm 包 CLI 或 Docker 入口，不删除 TypeScript CLI。
- 不在本轮 Rust CLI SMTP 管理切片迁移 JWKS/init/start CLI，不切换 npm 包 CLI 或 Docker 入口，不删除 TypeScript CLI。
- 不在 Rust 迁移发布准备中要求 Docker publishing；不把 Docker 镜像发布作为 Rust release readiness 门禁。
- 不在 Rust 二进制 release workflow 中发布 Docker image、推送 GHCR 或复用 Docker buildx 发布链路。
- 不引入新的数据库、缓存、队列或配置格式。
- 不改变现有 OpenAPI 合同。
- 不增加 TypeScript 与 Rust 之间的代理兼容层。

## 验收标准

- `docs/specs/rust-backend-migration.md` 明确迁移范围和非目标。
- `docs/plans/rust-backend-migration.md` 明确阶段和验证命令。
- `cargo test --manifest-path rust-backend/Cargo.toml` 通过。
- `cargo clippy --manifest-path rust-backend/Cargo.toml --all-targets -- -D warnings` 通过。
- `cargo build --manifest-path rust-backend/Cargo.toml` 通过。
- Rust release workflow YAML 可被本地 YAML 解析校验，并保持 tag 触发、`contents: write`、平台 archive、checksum、GitHub Release upload 行为，以及 Windows 不强制 Git Bash 的 OpenSSL/Perl 构建路径。
- Rust E2E workflow YAML 可被本地 YAML 解析校验，并保持 PR-to-`main` 触发、`contents: read`、PR concurrency、Node/Rust setup、Cargo cache、显式 Rust build 与 `npm run test:rust-e2e` 行为；该 workflow 独立于现有 `pr-checks` job。
- `npm run typecheck` 通过，证明现有 TypeScript 入口未被破坏。
- 第二阶段 Rust 测试覆盖数据库配置解析、schema 初始化和缺失 schema 拒绝。
- 第三阶段当前切片 Rust 测试覆盖 `POST /email/verify` 的有效请求、无效字段值和额外字段拒绝。
- 第四阶段当前切片 Rust 测试覆盖有效 OTP 消费、过期/已消费/缺失/错误 code 拒绝，以及 HTTP 层 `401 invalid_email_otp` 与成功消费后 `501 not_implemented`。
- 第五阶段当前切片 Rust 测试覆盖首次 email 创建用户、复用已有用户不重复创建、已有未验证用户写入 `email_verified_at`，以及 HTTP 层成功处理用户后仍返回 `501 not_implemented`。
- 本轮 Rust 测试覆盖 access token 可由 JWKS 公钥完成 Ed25519 验签，并覆盖篡改 token 被拒绝。
- 本轮 Rust CLI SMTP 测试覆盖 add/list/update/delete 参数解析、DB 写读、默认值、partial update、not found 错误路径，以及输出不包含 SMTP password。
- 本轮 Rust 目标 E2E harness 测试覆盖外部 Rust binary 的健康检查、未认证 `/me`、CORS preflight、seeded email OTP 登录后 `/me`、Ed25519 登录后 `/me`，且临时 DB 位于 `.tmp/rust-e2e` 并被清理。
- 本轮 SMTP Rust 测试覆盖 email start 请求边界、无 active SMTP 配置、lettre transport 成功时 OTP 创建和邮件内容、SMTP 失败时 OTP 失效、secure SMTP 使用 TLS transport 且不返回假成功，以及 HTTP 层 invalid_request/smtp_not_configured 边界。
- 本轮 WebAuthn 凭据删除切片必须新增下列可验证行为：Rust 后端覆盖 `DELETE /webauthn/credentials/{id}`，要求有效 access token 且认证方式为 `email_otp` 或 `webauthn`；只允许删除当前用户自己的 WebAuthn 凭据，成功返回 `200 {"ok":true}`，其他用户或不存在的凭据返回 `404 credential_not_found`，不满足管理凭据认证方式返回 `403 insufficient_authentication_method`。本切片不迁移 WebAuthn 注册/登录 options 或 verify，不实现任何 WebAuthn 假验证成功路径。
- 本轮 WebAuthn register/options Rust 测试覆盖成功生成 options 并持久化 challenge、父域 rp_id 规范化、二次 options 消费旧 challenge、sibling rp_id 拒绝、缺失 access token 拒绝、非 passkey-management 认证方式拒绝。
- 本轮 WebAuthn authenticate/options Rust 测试覆盖成功生成 options 并持久化匿名 challenge、父域 rp_id 规范化、`allowCredentials` 省略、未 allowlist origin 拒绝，以及 HTTP 层 `invalid_request`/`invalid_webauthn_authentication` 边界。
- 本轮 WebAuthn register/verify 前置边界 Rust 测试覆盖请求 schema 解析与额外字段拒绝、有效 challenge 前置校验后不消费 challenge、错误用户 challenge 拒绝，以及 HTTP 层缺失 token、invalid_request、缺失 challenge 和前置通过后 `501 not_implemented` 边界。
- 本轮 WebAuthn authenticate/verify 前置边界 Rust 测试覆盖请求 schema 解析与额外字段拒绝、有效 authenticate challenge 加 credential/rp_id 前置校验后不消费 challenge 且不更新 credential、credential rp_id 不匹配拒绝，以及 HTTP 层 invalid_request、缺失 challenge 和前置通过后 `501 not_implemented` 边界。
- 本轮 WebAuthn Rust-first schema spike 测试覆盖 `webauthn-rs` 注册状态 serde JSON roundtrip，并使 Rust schema 校验、当前用户凭据响应和 WebAuthn 前置测试使用 `credential_id`/`passkey_json`/`state_json` 新 schema。
- 本轮 Ed25519 verify Rust 测试覆盖请求 schema 解析与额外字段拒绝、有效签名消费 challenge/更新 `last_used_at`/签发 `ed25519` session、无效签名无副作用、已消费 challenge 拒绝，以及 HTTP 层 route 注册、`invalid_request` 与无数据库 `not_implemented` 边界。
- 本轮 PR #82 后公开路由对齐审计新增轻量 Rust route parity 测试，覆盖 OpenAPI 公开 method/path 对在 Rust HTTP router 中不会落入 `404 not_found`。
- 代码提交在对应迁移分支并通过 PR 合入流程推进。
