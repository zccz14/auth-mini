# Rust WebAuthn options/state 与注册验证迁移切片设计

## 背景

- PR #77 已把 Rust WebAuthn 存储模型推进到 Rust-first：`webauthn_credentials.credential_id` 表示浏览器凭据句柄，`webauthn_credentials.passkey_json` 保存库凭据状态，`webauthn_challenges.state_json` 用于保存库 challenge 状态。
- PR #78 已把 `/webauthn/authenticate/options` 迁移到 `webauthn-rs` discoverable authentication，并把认证状态写入 `state_json`。
- 注册 options 之前被跳过，因为旧合同返回 `publicKey.user.id = base64url(user_id)`，但 `webauthn-rs` 的 passkey registration 需要 UUID 用户唯一标识。
- PR #79 已按本设计完成 `/webauthn/register/options` 迁移，并使用确定性 UUID user handle 保存 `PasskeyRegistration` state。
- verify 端点当前仍处于 precheck 后返回 501 的阶段，下一切片迁移 `/webauthn/register/verify`，但不扩大到 authentication verify。

## 目标

- 保留已完成的注册用户 handle 设计与 `/webauthn/register/options` 的 `webauthn-rs` 生成行为。
- 使用 `webauthn_challenges.state_json` 中序列化的 `PasskeyRegistration` 完成 `/webauthn/register/verify`。
- 成功验证后将 `webauthn-rs` 返回的 `Passkey` 序列化保存到 `webauthn_credentials.passkey_json`，并将其 credential handle 保存到 `webauthn_credentials.credential_id`。
- 成功验证后消费对应 registration challenge。
- 尽量保持现有 HTTP 响应合同：`request_id` 加 `publicKey`，其中 `challenge`、`rp`、`user`、`pubKeyCredParams`、`timeout`、`authenticatorSelection` 保持现有字段形状；唯一有意变化是 `publicKey.user.id` 不再是旧 `base64url(user_id)`。
- verify 端点返回当前公开成功形状 `{ "ok": true }`。

## 非目标

- 不实现 authentication verify。
- 不增加旧 Node 数据兼容路径、dual-read、dual-write 或 credential id 旧语义。
- 不改变公开路由路径、错误码或 SDK 请求形状。

## 决策

本切片迁移 `/webauthn/register/options`。

用户 handle 选择：用稳定的 `users.id` 派生一个确定性 UUID，算法为 `SHA-256("auth-mini-webauthn-user-handle\0" || user_id)` 取前 16 字节，并设置 UUID version/variant 位。该 UUID 传给 `webauthn-rs start_passkey_registration`，并由库序列化成 `publicKey.user.id`。

原因：

- `webauthn-rs` 后续 registration verify 需要 options 阶段的 UUID 用户唯一标识与库状态一致。
- 旧 `base64url(user_id)` 不是 UUID 语义，继续保留会阻塞有效的 Rust verify。
- 当前允许破坏旧 Node WebAuthn 行为，且旧凭据兼容不是目标，因此不增加旧/新 user handle 双路径。
- 从 `users.id` 确定性派生避免新增 schema 字段或映射表；只要 `users.id` 作为主键保持稳定，handle 就稳定可重建。

下一切片迁移 `/webauthn/register/verify`。

注册验证决策：从未消费、未过期、`type = 'register'` 且属于当前用户的 challenge 读取 `state_json`、`rp_id`、`origin`；重新按存储的 `rp_id`/`origin` 构造 `Webauthn`；将请求中的 credential 交给 `finish_passkey_registration()` 与反序列化后的 `PasskeyRegistration` 验证；成功后用返回的 `Passkey` 作为唯一持久化凭据状态。

原因：

- WebAuthn 加密验证必须由库完成，Rust 端不手工验证签名或 client data。
- `state_json` 已是 Rust-first 状态，注册 verify 不需要旧 challenge JSON fallback。
- `Passkey` 是后续 Rust authentication verify 需要的库凭据状态，因此 `passkey_json` 不再保存旧 Node `{ publicKey, counter, transports }` 形状。
- `credential_id` 使用库返回的 credential handle，保持 schema 中 credential id 语义为 WebAuthn 凭据句柄。

## 行为要求

- 请求校验、access token/passkey management 权限、origin/RP ID 归一化和 allowlist 规则沿用现有 Rust 逻辑。
- 成功时仍创建一条 `type = 'register'` 的 `webauthn_challenges` 记录，`user_id` 为当前用户。
- 同一用户新的注册 options 仍会消费旧的未使用注册 challenge。
- `state_json` 必须是可反序列化的 `webauthn-rs` `PasskeyRegistration` state，不再是手工 `{ "challenge": ... }`。
- `/webauthn/register/verify` 必须校验 challenge 类型、未过期、未消费、归属当前用户、请求 Origin 与存储 Origin 一致、Origin 仍在 allowlist 中。
- `/webauthn/register/verify` 成功时必须插入 `webauthn_credentials`，其中 `credential_id` 为 `Passkey::cred_id()` 的 base64url 字符串，`passkey_json` 为序列化后的 `Passkey`，`rp_id` 为 challenge 中存储的 RP ID。
- `/webauthn/register/verify` 成功时必须消费 challenge 并返回 `{ "ok": true }`。
- 响应必须保持：
  - `request_id: string`
  - `publicKey.challenge: string`
  - `publicKey.rp.id: <normalized rp_id>`
  - `publicKey.rp.name = "auth-mini"`
  - `publicKey.user.name` 与 `publicKey.user.displayName` 为用户 email
  - `publicKey.user.id` 为确定性 UUID user handle 的 base64url 字节表示，不再是 `base64url(user_id)`
  - `publicKey.pubKeyCredParams` 由 `webauthn-rs` 输出，继续支持 ES256/RS256
  - `publicKey.timeout = 300000`
  - `publicKey.authenticatorSelection.residentKey = "required"`
  - `publicKey.authenticatorSelection.userVerification = "preferred"`

## 风险与约束

- 派生 UUID 依赖 `users.id` 稳定；该字段是用户主键，本切片不新增持久化 handle 字段。
- 不为旧 challenge JSON 或旧 `base64url(user_id)` user handle 添加 fallback；旧未使用 challenge 可自然失效。
- 不为旧 `passkey_json` 形状添加写入兼容路径；后续 authentication verify 迁移另行处理读取。

## 验收标准

- Rust 单元测试证明 registration options 保持除 `publicKey.user.id` 外的 HTTP 合同，并持久化可反序列化的 `webauthn-rs` `PasskeyRegistration` state。
- Rust 单元测试证明 registration verify 使用库状态、拒绝旧 challenge JSON、成功后写入可反序列化的 `Passkey` JSON、消费 challenge 并返回 `{ "ok": true }`。
- `cargo fmt --manifest-path rust-backend/Cargo.toml --check` 通过。
- `cargo test --manifest-path rust-backend/Cargo.toml` 通过。
- `cargo build --manifest-path rust-backend/Cargo.toml` 通过。
- 若 TypeScript/schema 未变更，`npm run typecheck` 可作为无影响验证运行。
