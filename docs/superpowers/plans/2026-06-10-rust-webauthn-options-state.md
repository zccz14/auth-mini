# Rust WebAuthn options/state 与注册验证迁移实施计划

## 目标

继 PR #80 的 `/webauthn/register/verify` 迁移之后，把 Rust `/webauthn/authenticate/verify` 迁移到 `webauthn-rs`，消费已保存的 `DiscoverableAuthentication` state，验证 stored `Passkey`，更新凭据状态并签发 `webauthn` session。

## 文件

- 修改 `rust-backend/src/webauthn.rs`
- 修改 `rust-backend/src/http.rs`
- 修改 `docs/superpowers/specs/2026-06-10-rust-webauthn-options-state-design.md`
- 修改 `docs/superpowers/plans/2026-06-10-rust-webauthn-options-state.md`

## 步骤

- [x] 检查最近 git 历史、既有 WebAuthn spec/plan、Rust WebAuthn 代码、schema 与 TS 测试。
- [x] 决定注册 user handle 使用 `users.id` 确定性派生 UUID，不保留旧 `base64url(user_id)` fallback。
- [x] 用 `WebauthnBuilder` 和 `start_passkey_registration()` 生成注册 options 和库状态。
- [x] 把 `PasskeyRegistration` 库状态序列化写入 `webauthn_challenges.state_json`。
- [x] 将库输出最小归一化回现有 `publicKey` HTTP 形状；仅 `publicKey.user.id` 改为 UUID handle 字节的 base64url 表示。
- [x] 保持 register verify 为 precheck/501，不扩大到完整验证。
- [x] 增加 Rust 单元测试覆盖 registration state 可反序列化、旧 challenge JSON 不再写入、user handle 不再是旧 `base64url(user_id)`。
- [x] 运行 Rust fmt/test/build；因 HTTP 响应字段有意变更额外执行 `npm run typecheck`，当前依赖未安装导致 `tsc: command not found`。
- [x] 检查 PR #77/#78/#79 后最近 git 历史、既有 spec/plan、Rust WebAuthn 代码/测试、schema 与 TS 合同。
- [x] 更新本 spec/plan，明确本切片迁移 `/webauthn/register/verify`，不迁移 authentication verify。
- [x] 将 HTTP register verify 从 precheck/501 切到库验证成功返回 `{ "ok": true }`。
- [x] 从 `webauthn_challenges.state_json` 反序列化 `PasskeyRegistration`，不支持旧 `{ "challenge": ... }` fallback。
- [x] 使用 `finish_passkey_registration()` 验证 credential，成功后写入 `credential_id` 与序列化 `Passkey` 到 `webauthn_credentials`。
- [x] 成功后消费 challenge；保留 challenge 类型、过期、消费、用户归属、Origin allowlist 与 Origin 匹配校验。
- [x] 增加/调整 Rust 单元测试覆盖旧 state 拒绝、challenge 不被错误消费与 HTTP 边界错误响应；成功路径依赖真实 WebAuthn attestation，由库调用与 Rust build/test 覆盖编译路径。
- [x] 运行 Rust fmt/test/build；未改 TS/schema/contracts，额外尝试 `npm run typecheck`，当前依赖未安装导致 `tsc: command not found`。
- [x] 检查 PR #77/#78/#79/#80 后最近 git 历史、既有 spec/plan、Rust WebAuthn 代码/测试、session 签发、schema 与 TS 合同。
- [x] 更新本 spec/plan，明确本切片迁移 `/webauthn/authenticate/verify`，不增加旧 Node/challenge/passkey JSON fallback。
- [x] 将 HTTP authenticate verify 从 precheck/501 切到库验证成功后签发 `webauthn` session。
- [x] 从 `webauthn_challenges.state_json` 反序列化 `DiscoverableAuthentication`，从 `webauthn_credentials.passkey_json` 反序列化 `Passkey`。
- [x] 使用 `finish_discoverable_authentication()` 验证 credential，成功后调用 `Passkey::update_credential()`。
- [x] 成功后在同一事务中消费 authentication challenge、更新 `passkey_json` 与 `last_used_at`；保留 challenge 类型、过期、消费、Origin allowlist、Origin 匹配与 RP ID scoped credential 校验。
- [x] 调整 Rust 单元测试覆盖旧 state/旧 passkey 失败不产生副作用，以及 HTTP 边界返回 `invalid_webauthn_authentication`。
- [ ] 提交、fetch、rebase、push 并创建 PR。
- [ ] 跟进 PR checks / mergeability；若可合并则合并并清理 worktree。

## 清洁代码约束

- 不添加旧 `{ "challenge": ... }` state fallback。
- 不添加 Node 兼容路径。
- 不添加旧 `base64url(user_id)` user handle fallback。
- 不添加旧 `passkey_json` 写入形状兼容路径。
- 不添加旧 `passkey_json` 读取兼容路径。
- 新增错误路径只映射真实失败：challenge 不存在/过期/已消费、Origin 不匹配或不再允许、RP ID scoped credential 不存在、state/passkey 反序列化失败、WebAuthn 配置无效、库验证失败、Passkey 更新 credential id 不匹配、Passkey 序列化失败、credential 更新失败、challenge 消费竞争失败、session 签发失败。
