# Rust WebAuthn options/state 迁移切片设计

## 背景

- PR #77 已把 Rust WebAuthn 存储模型推进到 Rust-first：`webauthn_credentials.credential_id` 表示浏览器凭据句柄，`webauthn_credentials.passkey_json` 保存库凭据状态，`webauthn_challenges.state_json` 用于保存库 challenge 状态。
- PR #78 已把 `/webauthn/authenticate/options` 迁移到 `webauthn-rs` discoverable authentication，并把认证状态写入 `state_json`。
- 注册 options 之前被跳过，因为旧合同返回 `publicKey.user.id = base64url(user_id)`，但 `webauthn-rs` 的 passkey registration 需要 UUID 用户唯一标识。
- verify 端点当前仍处于 precheck 后返回 501 的阶段，本切片不扩大到完整验证。

## 目标

- 选择注册用户 handle 设计，解除 `/webauthn/register/options` 迁移阻塞。
- 将 `/webauthn/register/options` 切到 `webauthn-rs` 生成。
- 将 `webauthn-rs` 生成的 `PasskeyRegistration` 状态序列化保存到 `webauthn_challenges.state_json`。
- 尽量保持现有 HTTP 响应合同：`request_id` 加 `publicKey`，其中 `challenge`、`rp`、`user`、`pubKeyCredParams`、`timeout`、`authenticatorSelection` 保持现有字段形状；唯一有意变化是 `publicKey.user.id` 不再是旧 `base64url(user_id)`。
- verify 端点继续保持 precheck/501，不在本切片实现完整 WebAuthn 验证。

## 非目标

- 不实现 registration verify 或 authentication verify。
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

## 行为要求

- 请求校验、access token/passkey management 权限、origin/RP ID 归一化和 allowlist 规则沿用现有 Rust 逻辑。
- 成功时仍创建一条 `type = 'register'` 的 `webauthn_challenges` 记录，`user_id` 为当前用户。
- 同一用户新的注册 options 仍会消费旧的未使用注册 challenge。
- `state_json` 必须是可反序列化的 `webauthn-rs` `PasskeyRegistration` state，不再是手工 `{ "challenge": ... }`。
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
- 因 verify 仍未迁移，本切片只保证 options 输出和 state 持久化为后续 verify 做准备。
- 不为旧 challenge JSON 或旧 `base64url(user_id)` user handle 添加 fallback；旧未使用 challenge 可自然失效。

## 验收标准

- Rust 单元测试证明 registration options 保持除 `publicKey.user.id` 外的 HTTP 合同，并持久化可反序列化的 `webauthn-rs` `PasskeyRegistration` state。
- `cargo fmt --manifest-path rust-backend/Cargo.toml --check` 通过。
- `cargo test --manifest-path rust-backend/Cargo.toml` 通过。
- `cargo build --manifest-path rust-backend/Cargo.toml` 通过。
- 若 TypeScript/schema 未变更，`npm run typecheck` 可作为无影响验证运行。
