# Rust WebAuthn options/state 迁移切片设计

## 背景

- PR #77 已把 Rust WebAuthn 存储模型推进到 Rust-first：`webauthn_credentials.credential_id` 表示浏览器凭据句柄，`webauthn_challenges.state_json` 用于保存库状态。
- 现有 Rust WebAuthn options 端点仍手工生成 challenge，并把 `state_json` 写成 `{ "challenge": ... }`。
- verify 端点当前仍处于 precheck 后返回 501 的阶段，本切片不扩大到完整验证。

## 目标

- 选择最小可验证增量，把一个 WebAuthn options 端点切到 `webauthn-rs` 生成。
- 将 `webauthn-rs` 生成的认证状态序列化保存到 `webauthn_challenges.state_json`。
- 尽量保持现有 HTTP 响应合同：`request_id` 加 `publicKey`，其中 `challenge`、`rpId`、`timeout`、`userVerification` 保持现有字段形状，用户名无关认证流程继续不返回 `allowCredentials`。
- verify 端点继续保持 precheck/501，不在本切片实现完整 WebAuthn 验证。

## 非目标

- 不实现 registration verify 或 authentication verify。
- 不增加旧 Node 数据兼容路径、dual-read、dual-write 或 credential id 旧语义。
- 不改变公开路由路径、错误码或 SDK 请求形状。

## 决策

本切片先迁移 `/webauthn/authenticate/options`。

原因：用户名无关认证 options 不需要暴露用户 handle，能直接使用 `webauthn-rs` 的 discoverable authentication state。注册 options 在 `webauthn-rs` 中需要 UUID 型用户唯一标识，而当前冻结 HTTP 合同要求 `publicKey.user.id = base64url(<现有 user_id>)`。如果在未设计用户 handle 映射前强行迁移注册 options，可能生成与未来 registration verify 不匹配的库状态。

## 行为要求

- 请求校验、origin/RP ID 归一化和 allowlist 规则沿用现有 Rust 逻辑。
- 成功时仍创建一条 `type = 'authenticate'` 的 `webauthn_challenges` 记录，`user_id` 为 `NULL`。
- `state_json` 必须是可反序列化的 `webauthn-rs` discoverable authentication state，不再是手工 `{ "challenge": ... }`。
- 响应必须保持：
  - `request_id: string`
  - `publicKey.challenge: string`
  - `publicKey.rpId: <normalized rp_id>`
  - `publicKey.timeout = 300000`
  - `publicKey.userVerification = "preferred"`
  - 不返回 `publicKey.allowCredentials`

## 风险与约束

- `webauthn-rs` discoverable authentication 需要启用 `conditional-ui` feature；这是库能力开关，不是兼容分支。
- 因 verify 仍未迁移，本切片只保证 options 输出和 state 持久化为后续 verify 做准备。
- 不为旧 challenge JSON 添加 fallback；旧未使用 challenge 可自然失效。

## 验收标准

- Rust 单元测试证明 authentication options 仍保持 HTTP 合同并持久化可反序列化的 `webauthn-rs` state。
- `cargo fmt --manifest-path rust-backend/Cargo.toml --check` 通过。
- `cargo test --manifest-path rust-backend/Cargo.toml` 通过。
- `cargo build --manifest-path rust-backend/Cargo.toml` 通过。
- 若 TypeScript/schema 未变更，`npm run typecheck` 可作为无影响验证运行。
