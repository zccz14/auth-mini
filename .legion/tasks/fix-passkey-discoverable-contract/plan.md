# 修复 Passkey Discoverable Credential 契约

## 目标

让 Passkey 注册与无用户名登录共享 discoverable credential 契约，并在不破坏既有凭据的前提下阻止保存不满足契约的新凭据。

## 问题陈述

注册实际返回 residentKey=discouraged、requireResidentKey=false，且响应丢弃 credProps 扩展；登录却使用无 allowCredentials 的 discoverable authentication。Bitwarden 因而保存非 discoverable 凭据，Firefox 登录时无法列出。文档与测试未反映真实行为。

## 验收标准

- [ ] 注册响应使用配置的 RP ID，并返回 residentKey=required、requireResidentKey=true、extensions.credProps=true。
- [ ] 无用户名登录继续使用同一 rpId 且省略 allowCredentials，新注册凭据可由 Firefox/Bitwarden 发现并登录。
- [ ] 注册 verify 仅接受 clientExtensionResults.credProps.rk=true，false 或缺失均拒绝且不持久化新凭据。
- [ ] 回归测试覆盖真实注册参数、严格 discoverable 验证、成功登录及失败注册保留既有凭据。
- [ ] OpenAPI 与文档准确描述实际行为和 credProps 未签名限制。
- [ ] 现有凭据不被自动删除、迁移或改写；新凭据验证前后均只允许显式管理。

## 假设 / 约束 / 风险

- **假设**: Firefox 与 Bitwarden 遵循 required resident key 并返回 credProps.rk=true。
- **假设**: credProps.rk 仅是客户端报告的协议一致性信号，不是签名安全属性。
- **假设**: 注册与登录继续读取同一 app_meta RP ID。
- **约束**: 严格要求 rk=true，false 或缺失均拒绝。
- **约束**: 不增加用户名优先登录或 allowCredentials 回退。
- **约束**: 不得自动删除、替换、迁移或修改已有 webauthn_credentials。
- **约束**: 保持现有认证边界、challenge 生命周期和错误契约，除非 RFC 证明必须调整。
- **风险**: 省略可选 credProps 的旧客户端会被严格拒绝。
- **风险**: webauthn-rs 高层 API 默认不要求 resident key，finish 也不执行该检查。
- **风险**: 既有非 discoverable 凭据保留但仍无法被无用户名发现。
- **风险**: 该变更涉及认证协议与公开 wire format，必须进行安全审查。

## 要点

- 注册与无用户名登录契约一致。
- 完整验证且 rk=true 后才追加保存。
- 失败注册不影响已有凭据。
- 代码、测试、OpenAPI 与文档保持一致。

## 范围

- rust-backend/src/webauthn.rs 及相关 HTTP 测试
- tests/helpers/webauthn.ts 与 rust-e2e/rust-server.test.ts
- openapi.yaml、生成 API 类型及生成校验
- WebAuthn 集成与 HTTP API 文档
- 当前 Legion task 文档与收口 wiki

## 非目标 (Non-goals)

- 不为既有非 discoverable 凭据增加用户名优先或 `allowCredentials` 登录回退。
- 不自动迁移、替换、删除或重写任何既有 Passkey 凭据。
- 不更改 RP ID 配置模型，也不针对单一密码管理器增加专用协议分支。
- 不把未签名的 `credProps.rk` 当作密码学安全证明；它只用于严格执行本次注册的协议契约。

## 设计索引 (Design Index)

> **Design Source of Truth**: .legion/tasks/fix-passkey-discoverable-contract/docs/rfc.md（待设计门禁完成）

**摘要**:

- 注册 options 强制 discoverable credential 并请求 credProps；verify 仅在 WebAuthn 校验与 rk=true 均成立后追加保存。
- 现有凭据原样保留，不做自动迁移或删除。
- Rust 单元、HTTP 与 e2e 测试锁定 wire 参数、拒绝分支、登录和数据保留。

## 阶段概览

1. **契约与设计门禁** - 物化并回读 task contract
2. **隔离实现** - 实现 discoverable 注册 options 与严格 verify
3. **验证与评审** - 执行验证并生成 test-report
4. **交付与收口** - 生成 walkthrough 与 wiki writeback

---

_创建于: 2026-07-11 | 最后更新: 2026-07-11_
