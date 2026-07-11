## Summary

修复 Passkey 注册与 username-less 登录之间的 discoverable credential 契约错位：注册现在要求 resident credential 并请求 `credProps`，verify 只在完整 WebAuthn ceremony 成功且客户端报告严格 JSON boolean `credProps.rk=true` 后追加保存。

自动化 change verification **PASS**，`review-change` **PASS**。Firefox/Bitwarden 真实 chooser 仍未验证；见下方阻塞门禁。

## Risk (High)

- 变更触及 WebAuthn 注册协议、认证输入、challenge transaction 与公开 API schema。
- `credProps.rk` **未签名且可被客户端修改**；这里只把它作为 strict client policy signal，绝不作为 resident storage 的密码学证明，也不替代完整 WebAuthn finish。
- 不返回 `credProps` 的旧客户端将从“可能保存不可发现凭据”变为明确收到 generic registration 400。
- 实现依赖锁定的 `webauthn-rs{,-core,-proto} 0.5.5` 语义；本 PR 未修改 Cargo manifest/lockfile，也未新增 core/proto 直接依赖。

## What changed

- Registration options 使用配置的 RP ID，并输出：
  - `residentKey: "required"`
  - `requireResidentKey: true`
  - `userVerification: "required"`
  - exact `extensions: { "credProps": true }`
- 先 typed mutation/清空 library extensions，再经单一 fail-closed JSON projection；拒绝错误 RP、残留 extension 或非预期 shape，避免 outbound `credProtect`、`uvm` 或未来 library member。
- Registration verify 仅接受 `clientExtensionResults.credProps.rk === true`，然后继续执行完整 `finish_passkey_registration`，最后在单 transaction 中消费 challenge 并 `INSERT` credential。
- Authentication 保持同一 RP ID 的 discoverable flow，继续省略 `allowCredentials`。
- 新增 Rust unit/HTTP、有效密码学 Rust e2e、SDK 与 OpenAPI contract 覆盖；同步 OpenAPI、生成类型和两份 WebAuthn 文档。

## Verification

自动化 change verification：**PASS**。

- `cargo test --locked` — PASS，141 passed / 0 failed。
- `cargo build --locked --manifest-path rust-backend/Cargo.toml && npx vitest run rust-e2e` — PASS，2 tests passed。
- `npm test` — PASS，19 files / 119 unit tests；3 files / 9 integration tests。
- `npm run typecheck` — PASS。
- `npm run lint` — PASS。
- `npm run check:generated:api` — PASS，无 drift。
- 变更文件 Prettier、`git diff --check`、Cargo dependency boundary — PASS。

Rust e2e 使用 Node `crypto` 生成有效 packed attestation/assertion，覆盖 strict true/false/missing、append-only、normalized unsigned metadata、duplicate rollback 和无 `allowCredentials` 的**服务端 ceremony**。Helper 显式选择测试 key；该测试不是、也不声称是 Firefox/Bitwarden 的真实 browser discovery。

`cargo fmt --all -- --check` 的唯一差异是 `rust-backend/src/session.rs:183`。该文件与 `origin/main` blob 完全相同且不在本 PR diff；这是既有 baseline，不是本次 change failure。本次变更的 `rust-backend/src/webauthn.rs` 与 `rust-backend/src/http.rs` scoped rustfmt **PASS**；现有 PR workflows 没有 cargo fmt gate。

## Breaking/API notes

- `PublicKeyCredentialCreationOptionsJson` 现在要求 literal required/true selection fields 和 closed `{ credProps: true }` extensions。
- `RegistrationCredentialJson.clientExtensionResults.credProps.rk` 在公开接受契约与生成类型中变为 required literal `true`；runtime 对 false/missing/错误类型继续返回 `400 invalid_webauthn_registration`。
- 删除 OpenAPI/生成 `VerifyWebauthnRegistrationErrors` 中从未由 Rust runtime 返回的 duplicate `409`。密码学有效 duplicate 继续返回 generic 400；这是文档/类型向既有 runtime 收敛，但依赖 409 union branch 的调用方需要更新。
- 部署前已签发的旧 registration challenge 可能因缺少 `rk=true` 被新版 verify 拒绝；用户需重新发起注册。

## Data safety

- 无 schema/data migration，无 backfill，无可信 `rk` 列。
- 不自动删除、迁移、替换或重写任何旧 credential；成功注册只追加新行。
- strict failure 不消费 challenge、不写 credential。密码学有效 duplicate 在主键 `INSERT` 失败时回滚同一 transaction，保留 challenge 与旧行六个字段，并返回 generic `400 invalid_webauthn_registration`。
- 成功注册的 library-normalized `Unsigned(CredProps)` 会随现有 `Passkey` 结构进入新行 `passkey_json`；原始完整 extension payload 不独立持久化，也不复制到可信列或用于授权。
- Authentication 只更新实际使用 credential 的正常 counter/state/`last_used_at`；不是旧数据迁移。

## Manual gate

### EXTERNAL-01 — BLOCKS MERGE AND RELEASE

Firefox/Bitwarden chooser **当前未验证**。合并前必须记录目标 OS、Firefox/Bitwarden 精确版本、RP ID/origin，并证明：

- [ ] 浏览器收到 configured RP、`residentKey="required"`、`requireResidentKey=true` 和 exact `{ "credProps": true }`。
- [ ] Bitwarden 创建凭据后，真实 `getClientExtensionResults()` 返回 JSON boolean `credProps.rk=true`。
- [ ] 无用户名且服务端 options 无 `allowCredentials` 时，Firefox/Bitwarden chooser 主动列出新凭据并成功登录。
- [ ] 既有 credential 列表和持久化行没有被自动迁移、改写或删除，并记录截图/Network evidence 位置。

`main` push 会自动触发 [Rust release](https://github.com/Thrimbda/auth-mini/blob/legion/fix-passkey-discoverable-contract-webauthn/.github/workflows/release.yml#L3-L7)，成功后继续触发 [EC2 deploy](https://github.com/Thrimbda/auth-mini/blob/legion/fix-passkey-discoverable-contract-webauthn/.github/workflows/deploy-auth-mini.yml#L3-L10)。因此 EXTERNAL-01 完成前不得 merge，也不得 release。若门禁失败，不得临时放宽 strict gate；应停止交付并回到设计阶段判断兼容性。

## Rollback

1. 回滚到上一应用二进制/发布制品；不执行 SQL。
2. 保留本版本成功新增的 credential；其 `Passkey` 格式兼容，不做自动清理。
3. 保留所有旧 credential 与 challenge，让 challenge 按现有 TTL/后续 options 规则处理。
4. 验证旧版 registration options/verify 与 authentication endpoint 恢复并记录原因。

回滚会重新开放保存 non-discoverable credential 的原风险，仅作为应急手段。

## Legion evidence links

- [Task plan](https://github.com/Thrimbda/auth-mini/blob/legion/fix-passkey-discoverable-contract-webauthn/.legion/tasks/fix-passkey-discoverable-contract/plan.md)
- [Research](https://github.com/Thrimbda/auth-mini/blob/legion/fix-passkey-discoverable-contract-webauthn/.legion/tasks/fix-passkey-discoverable-contract/docs/research.md)
- [RFC](https://github.com/Thrimbda/auth-mini/blob/legion/fix-passkey-discoverable-contract-webauthn/.legion/tasks/fix-passkey-discoverable-contract/docs/rfc.md)
- [RFC review — PASS](https://github.com/Thrimbda/auth-mini/blob/legion/fix-passkey-discoverable-contract-webauthn/.legion/tasks/fix-passkey-discoverable-contract/docs/review-rfc.md)
- [Test report — automated change verification PASS](https://github.com/Thrimbda/auth-mini/blob/legion/fix-passkey-discoverable-contract-webauthn/.legion/tasks/fix-passkey-discoverable-contract/docs/test-report.md)
- [Change review — PASS](https://github.com/Thrimbda/auth-mini/blob/legion/fix-passkey-discoverable-contract-webauthn/.legion/tasks/fix-passkey-discoverable-contract/docs/review-change.md)
- [Reviewer walkthrough](https://github.com/Thrimbda/auth-mini/blob/legion/fix-passkey-discoverable-contract-webauthn/.legion/tasks/fix-passkey-discoverable-contract/docs/report-walkthrough.md)
