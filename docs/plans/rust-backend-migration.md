# Rust 后端迁移实施计划

## 阶段 1：Rust 后端基础切片

实现内容：

- 新增 `rust-backend` crate。
- 实现标准库 HTTP 服务。
- 支持 `--host`、`--port` 参数。
- 实现 `GET /healthz`、`GET /openapi.yaml`、`GET /openapi.json`、未知路径响应；OpenAPI 文档由 Rust binary 内置。
- 增加 Rust 单元测试，覆盖参数解析、响应状态、内置 OpenAPI YAML 响应。

验证命令：

- `cargo test --manifest-path rust-backend/Cargo.toml`
- `cargo build --manifest-path rust-backend/Cargo.toml`
- `npm run typecheck`

## 阶段 2：数据库初始化与 schema 校验

实现内容：

- 在 Rust 中接入 SQLite。
- 新增显式 `--db` 与 `--schema` 参数；提供 `--db` 时启动前执行数据库初始化。
- 复用 `sql/schema.sql` 的 schema 合同，不新增或修改 schema。
- 校验后续认证迁移所需核心表和列：用户、会话、JWKS、allowed origins、WebAuthn 凭据、Ed25519 凭据。
- 增加 Rust 测试，覆盖数据库参数解析、schema 初始化、缺失 schema 拒绝。
- 不迁移 TypeScript 的旧数据库兼容修复路径；该兼容逻辑后续如需迁移，必须明确旧版本依赖和删除条件。

当前 Rust 发布二进制易用性补充：

- 将 Rust CLI 和服务启动的数据库打开路径收敛到一个内置 schema 初始化函数。
- `start`、裸 serve `--db`、`origin`、`smtp`、`rotate jwks` 在数据库文件缺失时自动创建父目录、schema 和 JWKS `CURRENT`/`STANDBY` key；显式 `init` 保持幂等可用。
- 使用数据库的 Rust 二进制命令在 stderr 输出一行当前 SQLite 路径，不写入管理命令 stdout。
- Rust E2E 不再依赖显式 `init` 准备主流程数据库，仍使用仓库内临时目录保证确定性。

验证命令：

- `cargo fmt --manifest-path rust-backend/Cargo.toml --check`
- `cargo test --manifest-path rust-backend/Cargo.toml`
- `cargo build --manifest-path rust-backend/Cargo.toml`
- `npm run typecheck`

## 阶段 3：认证 API 迁移

实现内容：

- 迁移邮件 OTP 登录。
- 迁移 JWT/JWKS 和会话刷新、登出。
- 迁移 Ed25519 登录和凭据管理。
- 迁移 WebAuthn 注册、登录和凭据管理。
- 每个路径迁移时对照 `openapi.yaml` 增加 API 测试。

当前 PR 的阶段 3 最小切片：

- 先迁移 `POST /email/verify` 的 Rust 请求边界，而不是完整邮件 OTP 登录链路。
- HTTP 请求读取 body，Rust 端按 OpenAPI 合同校验 JSON 对象、`email` 字段、6 位数字 `code` 字段，并拒绝额外字段。
- 有效请求返回 `501 not_implemented`，表示 OTP 消费、用户创建、session 创建和 token 签发尚未迁移；无效请求返回 `400 invalid_request`。
- 不切换 TypeScript 生产入口，不新增兼容路径，不迁移 SMTP、JWT/JWKS、WebAuthn、Ed25519 或 SDK。

验证命令：

- Rust API 集成测试。
- 现有 SDK 测试和 API drift 检查。
- 当前 PR 最小验证：`cargo fmt --manifest-path rust-backend/Cargo.toml --check`、`cargo test --manifest-path rust-backend/Cargo.toml`、`cargo build --manifest-path rust-backend/Cargo.toml`、`npm run typecheck`。

## 阶段 4：邮件 OTP 数据库校验切片

实现内容：

- 在 Rust `POST /email/verify` 已有请求边界之后，接入配置的 SQLite 数据库。
- 迁移 TypeScript `getEmailOtp`、`consumeEmailOtp`、`hashValue` 对应的最小行为：读取 `email_otps`、校验 SHA-256 code hash、过期时间和消费状态，并原子写入 `consumed_at`。
- OTP 无效返回 `401 invalid_email_otp`；OTP 成功消费后仍返回 `501 not_implemented`，因为用户创建、session 和 token 签发未迁移。
- 不切换 TypeScript 生产入口，不迁移 `/email/start`、SMTP、JWT/JWKS、用户 repo、session repo、WebAuthn、Ed25519 或 SDK。

验证命令：

- `cargo fmt --manifest-path rust-backend/Cargo.toml --check`
- `cargo test --manifest-path rust-backend/Cargo.toml`
- `cargo build --manifest-path rust-backend/Cargo.toml`
- `npm run typecheck`

## 阶段 5：邮件验证用户记录切片

实现内容：

- 在 Rust `POST /email/verify` 成功消费 OTP 后，迁移 TypeScript `getUserByEmail`、`createUser`、`markUserEmailVerified` 对应的最小数据库行为。
- 首次 email 创建用户并标记 `email_verified_at`；已有未验证用户写入验证时间；已有已验证用户不重复创建。
- 成功处理用户后仍返回 `501 not_implemented`，因为 session 创建和 token 签发未迁移。
- 不切换 TypeScript 生产入口，不迁移 `/email/start`、SMTP、JWT/JWKS、session token 签发、WebAuthn、Ed25519 或 SDK。

验证命令：

- `cargo fmt --manifest-path rust-backend/Cargo.toml --check`
- `cargo test --manifest-path rust-backend/Cargo.toml`
- `cargo build --manifest-path rust-backend/Cargo.toml`
- `npm run typecheck`

## 阶段 6：生产入口切换

实现内容：

- 切换 CLI/Docker 启动到 Rust 后端。
- 保留 npm SDK 构建，不改变 SDK 导出路径。
- 更新 Docker smoke test 和发布 workflow。
- 删除已被 Rust 覆盖且不再被 SDK/CLI 使用的 TypeScript 后端代码。

验证命令：

- `npm run build`
- `npm test`
- Docker image smoke test
- Rust build/test 全量命令

## 当前 PR 范围

本轮新增独立 Rust 目标 E2E PR workflow，让 PR 对 `npm run test:rust-e2e` 有单独可见的 CI 信号，但暂不并入现有 `pr-checks` 主门禁：

- 新增 `.github/workflows/rust-e2e.yml`，仅在面向 `main` 的 pull request 触发。
- workflow 使用 `permissions: contents: read`、PR 维度 concurrency cancel-in-progress、`ubuntu-latest` runner。
- workflow 复用现有 Node 24/npm cache 与 `dtolnay/rust-toolchain@stable` 约定，并缓存 Cargo registry/git 与 `rust-backend/target`。
- workflow 线性执行 checkout、Node/Rust setup、`npm ci`、`cargo build --manifest-path rust-backend/Cargo.toml`、`npm run test:rust-e2e`；显式 Rust build 用于更早暴露编译失败，测试脚本仍保持自构建能力。
- 本轮不修改 `.github/workflows/pr-checks.yml`，Rust E2E 尚未折入主 PR checks gate；是否提升为主门禁后续按耗时、稳定性和仓库保护策略单独决策。

验证命令：

- `ruby -e "require 'yaml'; YAML.load_file('.github/workflows/rust-e2e.yml')"`
- `npm ci`
- `npm run test:rust-e2e`
- `cargo fmt --manifest-path rust-backend/Cargo.toml --check`
- `cargo clippy --manifest-path rust-backend/Cargo.toml --all-targets -- -D warnings`
- `cargo test --manifest-path rust-backend/Cargo.toml`
- `cargo build --manifest-path rust-backend/Cargo.toml`
- `npm run typecheck`

## 上一轮 PR 范围

本轮改善 Rust release binary 的默认实例体验，减少下载后试用时必须反复输入 DB 路径的问题：

- `init`、`start`、`origin`、`smtp`、`rotate jwks` 的 DB/instance positional 参数改为可选。
- 未传 DB 路径时统一解析为 `~/.auth-mini/default.sqlite3`；解析失败时提示用户传显式 DB 路径。
- 数据库初始化/open 前创建父目录，确保默认 `~/.auth-mini` 首次使用可成功。
- 显式 DB 路径继续按用户输入执行；不新增多位置 fallback，不切换 npm/TypeScript CLI 入口。
- 文档说明 Rust binary 的 `openapi.yaml` 与 `sql/schema.sql` 均内置到 binary；下载到仓库外运行时不需要外部 OpenAPI 文件，且 Rust CLI 不提供 `--openapi` 参数。既有 `--schema` 参数仅作为兼容参数继续接受。

验证命令：

- `cargo fmt --manifest-path rust-backend/Cargo.toml --check`
- `cargo clippy --manifest-path rust-backend/Cargo.toml --all-targets -- -D warnings`
- `cargo test --manifest-path rust-backend/Cargo.toml`
- `cargo build --manifest-path rust-backend/Cargo.toml`
- `npm run typecheck`
- `npm run test:rust-e2e`

## 上一轮 PR 范围

本轮新增最小 Rust 目标 E2E harness，让 HTTP smoke 合同可对外部 Rust binary 执行，而不只覆盖 TypeScript in-process app：

- 新增 `npm run test:rust-e2e`，命令先构建 `rust-backend/target/debug/auth-mini`，再运行默认 `npm test` 不扫描的 `rust-e2e`。
- harness 在 `.tmp/rust-e2e` 下创建临时 SQLite DB，通过 Rust CLI `init` 初始化 schema/JWKS，直接写入固定 OTP 作为登录前置状态。
- harness 在随机可用端口启动 Rust server，覆盖 `GET /healthz`、未认证 `GET /me`、`/email/start` CORS preflight、`POST /email/verify` happy path、认证后 `/me`、Ed25519 credential/start/verify happy path 和 Ed25519 token `/me`。
- 本轮不改造现有 TypeScript integration tests，不把 Rust E2E 加入默认 `npm test`，不要求 release binary 构建，不实现 WebAuthn ceremony E2E。

验证命令：

- `cargo fmt --manifest-path rust-backend/Cargo.toml --check`
- `cargo clippy --manifest-path rust-backend/Cargo.toml --all-targets -- -D warnings`
- `cargo test --manifest-path rust-backend/Cargo.toml`
- `cargo build --manifest-path rust-backend/Cargo.toml`
- `npm run test:rust-e2e`
- `npm run typecheck`

## 上一轮 PR 范围

本轮继续推进 Rust release readiness，新增 tag 触发的 GitHub Release 二进制发布 workflow：

- 新增 `.github/workflows/release.yml`，仅在 `v*` tag push 时运行，并使用 `permissions: contents: write` 上传 GitHub Release assets。
- 采用 GitHub-hosted runner matrix 直接构建 `auth-mini` release binary：Linux x86_64、macOS x86_64、macOS aarch64、Windows x86_64。
- 每个目标产出平台命名 archive：Unix 使用 `.tar.gz`，Windows 使用 `.zip`；每个 archive 同时产出 `.sha256` checksum。
- workflow 使用各 runner 默认 shell 执行构建；打包逻辑移入 `scripts/package-rust-release.py`，避免 Windows 在 Git Bash 下构建 vendored OpenSSL 时选中缺少 `Locale::Maketext::Simple` 的 Git/MSYS Perl。
- 首轮不加入 Linux aarch64 或 musl，避免在未验证 linker/system dependency 前引入脆弱 cross toolchain。
- Rust release readiness 不包含 Docker publishing；不发布 Docker image、不推送 GHCR、不改动现有 Docker image release workflow。
- 不切换 npm 包 CLI，不迁移 `rotate jwks`、`init`、`start`，不删除 TypeScript CLI。

验证命令：

- `cargo fmt --manifest-path rust-backend/Cargo.toml --check`
- `cargo clippy --manifest-path rust-backend/Cargo.toml --all-targets -- -D warnings`
- `cargo test --manifest-path rust-backend/Cargo.toml`
- `cargo build --manifest-path rust-backend/Cargo.toml`
- `ruby -e "require 'yaml'; YAML.load_file('.github/workflows/release.yml')"`

## 上一轮 PR 范围

本轮继续迁移 CLI 管理命令，选择与 `origin` 同类、可完整闭环验证的 `smtp add/list/update/delete` Rust 切片：

- Rust 二进制新增 `smtp` 子命令组，覆盖 `smtp_configs` 的 add/list/update/delete。
- 迁移 TypeScript SMTP CLI 的核心数据库行为、必填字段、默认值、partial update、tab 分隔输出和找不到 id 失败路径。
- Rust 输出格式不包含 `password`，避免管理命令泄露 SMTP secret；密码只写入/读取数据库供邮件发送配置使用。
- 不切换 npm 包 CLI，不删除 TypeScript `src/commands/smtp/**` 或 `src/app/commands/smtp/**`，避免破坏现有 npm packaging。
- 不迁移 `rotate jwks`、`init`、`start`，这些仍留在 TypeScript CLI 范围。

验证命令：

- `CARGO_HOME=$PWD/.cargo-home cargo fmt --manifest-path rust-backend/Cargo.toml --check`
- `CARGO_HOME=$PWD/.cargo-home cargo test --manifest-path rust-backend/Cargo.toml`
- `CARGO_HOME=$PWD/.cargo-home cargo build --manifest-path rust-backend/Cargo.toml`
- `npm run typecheck`
- `npm run build`
- `mkdir -p .tmp/vitest && TMPDIR=$PWD/.tmp/vitest npx vitest run tests/integration/smtp-cli.test.ts tests/unit/smtp-mailer.test.ts tests/unit/cli.test.ts`

## 上一轮 PR 范围

本轮开始迁移 CLI 管理命令，选择最小可闭环的 `origin add/list/update/delete` Rust 切片：

- Rust 二进制新增 `origin` 子命令组，覆盖 `allowed_origins` 的 add/list/update/delete。
- 迁移 TypeScript origin CLI 的核心数据库行为、origin 规范化、tab 分隔输出和找不到 id 失败路径。
- 不切换 npm 包 CLI，不删除 TypeScript `src/commands/origin/**` 或 `src/app/commands/origin/**`，避免破坏现有 npm packaging。
- 不迁移 `smtp`、`rotate jwks`、`init`、`start`，这些仍留在 TypeScript CLI 范围。

验证命令：

- `CARGO_HOME=$PWD/.cargo-home cargo fmt --manifest-path rust-backend/Cargo.toml --check`
- `CARGO_HOME=$PWD/.cargo-home cargo test --manifest-path rust-backend/Cargo.toml`
- `CARGO_HOME=$PWD/.cargo-home cargo build --manifest-path rust-backend/Cargo.toml`
- `npm run typecheck`
- `npm run build`
- `mkdir -p .tmp/vitest && TMPDIR=$PWD/.tmp/vitest npx vitest run tests/unit/origin-repo.test.ts tests/integration/origin-cli.test.ts tests/unit/cli.test.ts tests/integration/oclif-cli.test.ts`

## 上一轮 PR 范围

本轮执行 PR #83 后的 Rust vs TypeScript 认证 / 会话 / 错误响应语义对齐审计，优先覆盖 session token 响应、bearer header、`/me` 数据形态、unauthorized/error JSON/status mapping 与 invalid request 校验风格。

- 对照最近 git 历史、迁移 spec/plan、TypeScript auth/session/error 代码、Rust auth/session/error 代码与现有测试。
- 审计结论：邮件 OTP、Ed25519、WebAuthn 完成登录的 session response body 均保持 `session_id`、`access_token`、`token_type: "Bearer"`、`expires_in: 900`、`refresh_token`；受保护端点继续要求 `Authorization: Bearer <access_token>`，不新增 cookie fallback。
- 审计结论：`GET /me` 两端均返回 user/email、WebAuthn credentials、Ed25519 credentials 与 active sessions；WebAuthn credential shape 继续遵循已决策的 Rust-first `credential_id` 方向，不回加 Node 兼容。
- 审计结论：unauthorized 与业务错误 JSON 基本对齐为 `{"error":"..."}`；本轮发现并修复最小明确 gap：Rust peer logout self-target 从 `400 session_peer_logout_self_target` 改为 TypeScript 对齐的 `400 invalid_request`，并补 Rust HTTP 边界测试。
- 审计结论：invalid request 校验继续以拒绝无效 JSON、字段缺失、字段类型错误和额外字段为边界；不新增兼容 fallback，不改变 OpenAPI、SDK、TypeScript 生产入口或旧数据兼容路径。
- 发布准备记录：Rust 不要求 Docker publishing；未来 Rust release readiness 应面向 cross-compilation、二进制产物校验和运行 smoke test。Docker runtime/publishing 不作为当前 Rust readiness 门禁。

验证命令：

- `CARGO_HOME=$PWD/.cargo-home cargo fmt --manifest-path rust-backend/Cargo.toml --check`
- `CARGO_HOME=$PWD/.cargo-home cargo test --manifest-path rust-backend/Cargo.toml`
- `CARGO_HOME=$PWD/.cargo-home cargo build --manifest-path rust-backend/Cargo.toml`
- `npm run typecheck`

## 上一轮 PR 范围

本轮按用户“不需要 Node 兼容，允许 public API changes”的决定执行第一个 WebAuthn Rust 迁移 spike：只落 Rust-first schema/docs、依赖和 serde persistence proof，不迁移完整 verify。

- `webauthn_credentials` 改为以 WebAuthn `credential_id` 为公开/主键句柄，存储 `passkey_json` 作为 `webauthn-rs` `Passkey` 状态，保留 `user_id`、`rp_id`、`last_used_at`、`created_at`，删除旧 Node 拆分列 `id`、`public_key`、`counter`、`transports`。
- `webauthn_challenges` 改为 `state_json` 存储 `webauthn-rs` registration/authentication state，保留 `request_id`、`type`、`user_id`、`rp_id`、`origin`、`expires_at`、`consumed_at`、`created_at` 和 register/authenticate 的 `user_id` check。
- 这是破坏性 schema/API 方向；旧 Node WebAuthn credential 不提供兼容迁移路径，可能要求用户重新注册 passkey。
- Rust 依赖接入 `webauthn-rs`，仅启用本轮 serde state proof 所需的 `danger-allow-state-serialisation` feature；不启用 credential internals 或降低 user verification 的危险 feature。
- Rust 测试用 `WebauthnBuilder::start_passkey_registration` 证明 `PasskeyRegistration` 可 JSON serialize/deserialize；不构造假的 `Passkey`，因为真实 `Passkey` 需要完整注册 ceremony 才能由库产出。
- 更新 Rust schema 校验和受影响测试/helper 至新 schema；不添加旧 schema 兼容分支。
- TypeScript WebAuthn repository 与测试 fixture 只改为读写新 schema，保持现有测试入口可运行；这不是旧 Node WebAuthn 数据兼容路径，后续 Rust verify 完成后应移除 TS WebAuthn 持久化写入。
- 不切换生产入口，不迁移真实 WebAuthn registration/authentication verify，不实现假成功路径。

## 上一轮 PR 范围

本轮按用户要求替换 Rust SMTP 发送实现：删除手写裸 SMTP 协议交互，改由 `lettre` 处理 SMTP 会话、认证、信封和邮件发送。

- Rust `POST /email/start` 保持原业务顺序：选 SMTP 配置、生成 OTP、写入 `email_otps`，发送失败时写入 `consumed_at` 失效本次 OTP。
- Rust SMTP 发送使用 `lettre`，不再维护 `AUTH LOGIN`、`MAIL FROM`、`RCPT TO`、`DATA`、SMTP 状态码读取或 base64 编码 helper。
- `smtp_configs.secure=0` 映射为 lettre 明文 SMTP transport；`secure=1` 映射为 lettre SMTPS/TLS transport，不再直接以未实现拒绝。
- 现有 schema 只有 `secure` boolean，无法区分 STARTTLS-required 和 SMTPS；本轮不新增复杂兼容配置，STARTTLS-required 留作后续 schema/配置设计。
- Rust 测试先迁移为 lettre stub/builder 边界：覆盖发送成功仍创建 OTP、发送失败仍失效 OTP、secure 配置不会假成功并使用 TLS transport。
- 不切换 TypeScript 生产入口、Docker/package scripts、SMTP CLI 或 TS nodemailer 行为。

验证命令：

- `CARGO_HOME=$PWD/.cargo-home cargo fmt --manifest-path rust-backend/Cargo.toml --check`
- `CARGO_HOME=$PWD/.cargo-home cargo test --manifest-path rust-backend/Cargo.toml`
- `CARGO_HOME=$PWD/.cargo-home cargo build --manifest-path rust-backend/Cargo.toml`
- `npm run typecheck`
- `npm run build`
- `npx vitest run tests/unit/smtp-mailer.test.ts tests/unit/shared.test.ts tests/integration/sessions.test.ts tests/integration/smtp-cli.test.ts`

## 上一轮 PR 范围

本轮继续迁移 WebAuthn verify，但不在 Rust 中实现假成功：由于当前 Rust 依赖尚未接入可信 WebAuthn assertion 验证库，本轮选择 `POST /webauthn/authenticate/verify` 的验证前置边界切片。

- Rust `POST /webauthn/authenticate/verify` 保持公开，不要求 bearer access token。
- Rust 按 OpenAPI 合同解析 authenticate verify 请求：`request_id` 必须是 UUID，credential 必须包含非空 `id`、`rawId`、`type: public-key`、`response.clientDataJSON`、`response.authenticatorData`、`response.signature`，额外字段返回 `400 invalid_request`。
- Rust 查询未消费、未过期、类型为 `authenticate` 的 challenge；challenge 不存在、已消费或过期返回 `400 invalid_webauthn_authentication`。
- Rust 校验请求 Origin 必须与存储 challenge origin 一致，且 origin 仍在 `allowed_origins`；失败返回 `400 invalid_webauthn_authentication`。
- Rust 按 credential id 与 challenge rp_id 查询已有 `webauthn_credentials`；不存在或 rp_id 不匹配返回 `400 invalid_webauthn_authentication`。
- 前置校验通过后返回 `501 not_implemented`，不消费 challenge、不更新 credential counter/last_used_at、不创建 session、不签发 token，避免 WebAuthn verify 假成功。
- 不删除 TypeScript WebAuthn 后端代码；真实 registration/authentication verify 仍由 TypeScript 的 `@simplewebauthn/server` 覆盖。

验证命令：

- `cargo fmt --manifest-path rust-backend/Cargo.toml --check`
- `cargo test --manifest-path rust-backend/Cargo.toml`
- `cargo build --manifest-path rust-backend/Cargo.toml`
- `npm run typecheck`
- `npm run build`

## 上一轮 PR 范围

本轮继续按 WebAuthn 迁移要求，调研后选择 WebAuthn 中下一个最小可测试闭环：迁移 `POST /webauthn/authenticate/options`。该切片只生成 authentication challenge/options 并持久化 challenge，不执行 authentication verify，因此不会在 Rust 未接入可信 WebAuthn 密码学验证库时产生假成功路径。

- Rust `POST /webauthn/authenticate/options` 不要求 bearer access token，按 OpenAPI 合同公开生成登录 challenge。
- Rust 解析仅包含 `rp_id` 的请求 body；无效 JSON、缺失/空 `rp_id` 或额外字段返回 `400 invalid_request`。
- Rust 复用 WebAuthn options 的核心 origin/rp_id 规则：请求 origin 必须在 `allowed_origins`，`rp_id` 必须是请求 origin host 本身或父域，并且被至少一个 allowlist origin 覆盖；失败返回 `400 invalid_webauthn_authentication`。
- 成功时 Rust 生成 `request_id`、base64url challenge、authentication `publicKey` options，写入 `webauthn_challenges` 的 `authenticate` challenge，且 `user_id` 为空。
- 不迁移 `/webauthn/authenticate/verify` 或 `/webauthn/register/verify`；这些仍依赖 TypeScript 的 `@simplewebauthn/server`。
- 不删除 TypeScript 后端代码；未迁移的 WebAuthn verify、CLI、TLS SMTP、Ed25519 verify/authenticate 完成链路仍由 TypeScript 覆盖。

验证命令：

- `cargo fmt --manifest-path rust-backend/Cargo.toml --check`
- `cargo test --manifest-path rust-backend/Cargo.toml`
- `cargo build --manifest-path rust-backend/Cargo.toml`
- `npm run typecheck`
- `npm run build`

## 上一轮 PR 范围

上一轮继续按 WebAuthn 迁移要求，调研后选择 WebAuthn 中下一个最小可测试闭环：迁移 `POST /webauthn/register/options`。该切片只生成 registration challenge/options 并持久化 challenge，不执行 registration verify，因此不会在 Rust 未接入可信 WebAuthn 密码学验证库时产生假成功路径。

- Rust `POST /webauthn/register/options` 要求 bearer access token 与 passkey-management 授权；缺失或无效 token 返回 `401 invalid_access_token`，`ed25519` session 返回 `403 insufficient_authentication_method`。
- Rust 解析仅包含 `rp_id` 的请求 body；无效 JSON、缺失/空 `rp_id` 或额外字段返回 `400 invalid_request`。
- Rust 复用 TypeScript 的核心 origin/rp_id 规则：请求 origin 必须在 `allowed_origins`，`rp_id` 必须是请求 origin host 本身或父域，并且被至少一个 allowlist origin 覆盖；失败返回 `400 invalid_webauthn_registration`。
- 成功时 Rust 生成 `request_id`、base64url challenge、registration `publicKey` options，写入 `webauthn_challenges`，并消费当前用户未使用的旧 register challenge。
- 不迁移 `/webauthn/register/verify`、`/webauthn/authenticate/options`、`/webauthn/authenticate/verify`；这些仍依赖 TypeScript 的 `@simplewebauthn/server`。
- 不删除 TypeScript 后端代码；未迁移的 WebAuthn 注册/登录、CLI、TLS SMTP、Ed25519 verify/authenticate 完成链路仍由 TypeScript 覆盖。

验证命令：

- `cargo fmt --manifest-path rust-backend/Cargo.toml --check`
- `cargo test --manifest-path rust-backend/Cargo.toml`
- `cargo build --manifest-path rust-backend/Cargo.toml`
- `npm run typecheck`
- `npm run build`

## 上一轮 PR 范围

上一轮按用户“优先完成 SMTP 和 WebAuthn”要求，调研后选择 SMTP 中最小可测试闭环：迁移 `POST /email/start` 的 OTP 创建与明文 SMTP 发送边界。WebAuthn 仍依赖 TypeScript 的 `@simplewebauthn/server` 完成注册/登录验证，本轮不拆出不可验证的局部占位。

- Rust `POST /email/start` 按 OpenAPI 请求合同校验 `email`，并复用 TypeScript 行为 trim + lowercase。
- 配置 `--db` 时读取 `smtp_configs` active 配置；无 active 配置返回 `503 smtp_not_configured`。
- 选中 SMTP 配置后生成 6 位 OTP，写入 `email_otps` 的 SHA-256 code hash、10 分钟过期时间，并清空旧 `consumed_at`。
- 明文 SMTP AUTH LOGIN 发送成功后返回 `200 {"ok":true}`；发送失败或 `secure=1` 不支持时返回 `503 smtp_temporarily_unavailable` 并失效本次 OTP，避免生产路径假成功。
- 增加本地 TCP SMTP 测试服务器覆盖成功与失败投递边界；测试不连接外部 SMTP 服务。
- 不迁移 TLS/SMTPS/STARTTLS、SMTP CLI、WebAuthn、Docker/package scripts、生产入口切换或 Ed25519 完成登录。
- 不删除 TypeScript 后端代码；未迁移的 CLI、WebAuthn、TLS SMTP、Ed25519 verify/authenticate 完成链路仍由 TypeScript 覆盖。

验证命令：

- `cargo fmt --manifest-path rust-backend/Cargo.toml --check`
- `cargo test --manifest-path rust-backend/Cargo.toml`
- `cargo build --manifest-path rust-backend/Cargo.toml`
- `npm run typecheck`
- `npm run build`

## 上一轮 PR 范围

上一轮 PR 已完成阶段 3/5 之后的会话、JWKS 公开结构、CORS 与 OpenAPI 端点基础行为。本 PR 选择剩余范围中最小且可完整闭环的 OpenAPI JSON YAML-to-JSON 切片：

- Rust `GET /openapi.json` 不再返回占位 JSON，而是读取配置的 `openapi.yaml` 并解析为 JSON 响应。
- Rust OpenAPI 解析沿用 TypeScript `parseOpenApiDocument` 的核心合同：有效 YAML 必须解析为对象文档；标量、数组或空文档等非对象结果视为无效 OpenAPI 文档。
- `GET /openapi.yaml` 和 `GET /openapi.json` 共享同一个配置文件来源，避免 JSON 与 YAML 合同漂移。
- 不迁移 JWKS/Ed25519 真实签名验签、WebAuthn、真实 SMTP、CLI 命令、Docker/package scripts 或生产入口切换。
- 不删除 TypeScript 后端代码；OpenAPI SDK 生成与未迁移后端范围仍由 TypeScript 覆盖。

上一轮 PR 的阶段 3/5 之后可验证切片：

- Rust `POST /email/verify` 在 OTP 成功消费、用户创建/验证后创建 `email_otp` session，并返回 `session_id`、JWT 形态 `access_token`、`Bearer`、`expires_in: 900`、`refresh_token`。
- Rust 迁移 session 公共 API：`POST /session/refresh`、`POST /session/logout`、`POST /session/:session_id/logout`、`GET /me`。
- Rust 迁移 `GET /jwks`、`GET /openapi.json` 与 CORS 通用响应/预检行为。
- Rust `POST /email/start` 仅迁移请求边界和无 SMTP 配置失败行为；真实 SMTP 发送、OTP 邮件投递边界仍保留在 TypeScript 后端，避免实现无法投递却返回成功的认证路径。
- 不切换生产入口，不删除 TypeScript 后端。WebAuthn、Ed25519、真实 SMTP、CLI 运行入口、Docker runtime 切换、Node SDK 构建入口仍由 TypeScript 覆盖。

剩余 TypeScript 后端范围盘点：

- 命令入口：`src/index.ts`、`src/commands/**` 仍负责 oclif CLI、init/start、origin/smtp/jwks 命令。
- HTTP server/app：`src/server/app.ts` 中 WebAuthn、Ed25519、真实 SMTP 邮件、日志边界、Hono 中间件仍未迁移。
- 认证模块：WebAuthn、Ed25519 challenge 验证完成登录、邮件 start 的真实 SMTP 发送未迁移；Ed25519 凭据管理和 start challenge 已由 Rust 覆盖。
- DB repo/bootstrap：TypeScript repo 仍覆盖 CLI 管理、WebAuthn/Ed25519、SMTP、origin 管理与旧路径。
- token/JWT/JWKS：Rust 已支持 access token Ed25519 真实签名/验签和 JWKS 公钥发布；JWKS 轮换 CLI 仍在 TypeScript。
- CORS/origin：Rust 迁移 HTTP CORS 通用行为；origin CLI 管理仍在 TypeScript。
- OpenAPI endpoints：Rust 迁移 yaml/json endpoints；OpenAPI SDK 生成仍使用 Node package scripts。
- Docker/package scripts：未切换，避免破坏仍依赖 TypeScript CLI/SDK 的发布与构建。
- 测试：Rust 增加本阶段后端行为测试；既有 TypeScript 测试继续保护未迁移范围。

验证命令：

- `cargo fmt --manifest-path rust-backend/Cargo.toml --check`
- `cargo test --manifest-path rust-backend/Cargo.toml`
- `cargo build --manifest-path rust-backend/Cargo.toml`
- `npm run typecheck`
- `npm run build`
