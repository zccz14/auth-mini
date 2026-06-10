# Rust WebAuthn options/state 迁移实施计划

## 目标

把 Rust `/webauthn/register/options` 的 challenge/state 生成迁移到 `webauthn-rs`，明确注册 user handle 设计，并让 verify 端点继续停留在 precheck/501。

## 文件

- 修改 `rust-backend/src/webauthn.rs`
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
- [ ] 提交、fetch、rebase、push 并创建 PR。
- [ ] 跟进 PR checks / mergeability；若可合并则合并并清理 worktree。

## 清洁代码约束

- 不添加旧 `{ "challenge": ... }` state fallback。
- 不添加 Node 兼容路径。
- 不添加旧 `base64url(user_id)` user handle fallback。
- 新增错误路径只映射真实失败：WebAuthn 配置无效、库生成失败、序列化失败或库输出缺少必须返回的 publicKey 字段。
