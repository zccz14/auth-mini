# Rust WebAuthn options/state 迁移实施计划

## 目标

把 Rust `/webauthn/authenticate/options` 的 challenge/state 生成迁移到 `webauthn-rs`，保持现有 HTTP 响应合同，并让 verify 端点继续停留在 precheck/501。

## 文件

- 修改 `rust-backend/Cargo.toml`
- 修改 `rust-backend/src/webauthn.rs`
- 新增 `docs/superpowers/specs/2026-06-10-rust-webauthn-options-state-design.md`
- 新增 `docs/superpowers/plans/2026-06-10-rust-webauthn-options-state.md`

## 步骤

- [x] 检查最近 git 历史、既有 WebAuthn spec/plan、Rust WebAuthn 代码、schema 与 TS 测试。
- [x] 明确本切片只迁移 authentication options，避免注册用户 handle 映射未定时引入不可验证状态。
- [x] 为 `webauthn-rs` 启用 discoverable authentication 所需 feature。
- [x] 用 `WebauthnBuilder` 和 `start_discoverable_authentication()` 生成认证 options 和库状态。
- [x] 把库状态序列化写入 `webauthn_challenges.state_json`。
- [x] 将库输出最小归一化回现有 `publicKey` HTTP 形状。
- [x] 增加 Rust 单元测试覆盖 state 可反序列化和 `allowCredentials` 仍被省略。
- [x] 运行 Rust fmt/test/build；TypeScript 未变更，额外执行 `npm run typecheck` 时因依赖未安装出现 `tsc: command not found`。
- [ ] 提交、fetch、rebase、push 并创建 PR。
- [ ] 跟进 PR checks / mergeability；若可合并则合并并清理 worktree。

## 清洁代码约束

- 不添加旧 `{ "challenge": ... }` state fallback。
- 不添加 Node 兼容路径。
- 新增错误路径只映射真实失败：WebAuthn 配置无效、库生成失败、序列化失败或库输出缺少 challenge。
