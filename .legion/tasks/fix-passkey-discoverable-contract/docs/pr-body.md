旧版 Passkey 注册实际发送 `residentKey="discouraged"`、`requireResidentKey=false`，并丢弃 `credProps`；Bitwarden 因而保存 `discoverable=false` 的凭据。登录却使用无 `allowCredentials` 的无用户名流程，Firefox/Bitwarden chooser 无法获得凭据提示并列出它。

这会造成“注册成功但无法登录”的错误承诺，直接破坏现有 Passkey 登录主路径，因此必须让注册与登录共享同一 discoverable credential 契约。

**合并目标：** `zccz14/auth-mini:main`（head：`Thrimbda:legion/fix-passkey-discoverable-contract-webauthn`）

## 变更内容

- 注册 options 使用配置的 RP ID，并固定输出：
  - `residentKey: "required"`
  - `requireResidentKey: true`
  - `userVerification: "required"`
  - exact `extensions: { "credProps": true }`
- 先修改 typed options 并清空 library extensions，再通过单一 fail-closed projection 写入 required/credProps；错误 RP、残留 extension 或非预期结构直接失败，避免透传 `credProtect`、`uvm` 或未来 library member。
- 注册 verify 只接受 JSON boolean `clientExtensionResults.credProps.rk === true`，随后仍执行完整 `finish_passkey_registration`。只有 strict gate 和完整 WebAuthn 验证都成功，才在单一 transaction 中消费 challenge 并追加 credential。
- 登录继续使用同一 RP ID 的 discoverable authentication，并继续省略 `allowCredentials`。
- 注册保持 append-only：不自动删除、迁移、替换或重写旧 credential。
- OpenAPI、生成类型、SDK contract tests、集成文档和 HTTP API 文档同步更新。

## 风险（高）

- 变更触及 WebAuthn 注册协议、用户控制输入、challenge transaction 和公开 API schema。
- `credProps.rk` **未签名且可由客户端修改**。它只是 strict client policy signal，不是 authenticator resident storage 的密码学证明，也不替代 challenge、origin、RP、UP/UV、算法和 attestation 验证。
- 不返回 `credProps` 的旧客户端将由“可能保存不可发现凭据”变为明确收到 generic `400 invalid_webauthn_registration`。
- 设计依赖锁定的 `webauthn-rs{,-core,-proto} 0.5.5` 行为；本变更没有修改 Cargo manifest/lockfile，也没有新增 core/proto 直接依赖。

## 验证

### 自动化验证：通过

- `cargo test --locked`：141 passed，0 failed。
- locked Rust build + `npx vitest run rust-e2e`：2 tests passed。
- `npm test`：119 个单元测试、9 个集成测试通过。
- typecheck、lint、generated drift、变更文件 Prettier、`git diff --check` 和 dependency boundary 均通过。
- 覆盖 configured RP、required/true/exact credProps、strict true/false/missing/错误类型、密码学有效 ceremony、append-only、旧行六字段保留、normalized unsigned metadata、duplicate rollback，以及无 `allowCredentials` 的服务端 authentication ceremony。

Rust/Node e2e 通过 Node `crypto` 生成有效 attestation/assertion，但 helper 会显式选择测试 key；它只证明服务端 ceremony，**不冒充真实浏览器 discovery**。

`cargo fmt --all -- --check` 仍因 `rust-backend/src/session.rs:183` 失败；该文件与 `origin/main` blob 完全相同，属于既有 baseline。本次两个 Rust 变更文件 scoped rustfmt 通过，现有 PR workflows 也没有 cargo fmt gate。

### 评审：通过

- `review-rfc`：PASS。
- `review-change`：PASS，无 blocking code finding。

### acorn 部署与公网 OpenAPI：通过

- acorn active service 运行 feature commit `b4f6cf75459f4969cc126d5d1d65cb556a40e4bd` 对应路径 `/opt/auth-mini-manual/b4f6cf7/auth-mini`。
- loopback OpenAPI 与公网 Web UI 健康。
- 公网 `https://auth.0xc1.wang/openapi.json` 已核对：required/true/required、closed exact `credProps`、required/const `rk=true`，且 registration verify responses 不含 409。
- acorn deployed binary 由 acorn 侧另行构建，SHA-256 为 `3acdbeb57d42054f9db3c2dbcfff9ea7dd0e15646e944433ec3a56e4ca925a14`，与本地 validation artifact SHA 前缀 `f4a756...` 不同。这里**不声称** binary hash match，也**不声称** reproducible build；部署结论依据 feature commit、live contract 与用户实机行为。

### Firefox/Bitwarden 用户实机确认：通过

用户明确确认在 acorn 部署的新版本上使用 Firefox/Bitwarden 完成注册与无用户名登录，chooser 可发现新 credential，原 discoverability 问题已修复。

该证据是用户操作方确认，不是本代理直接执行的 GUI 记录；未提供具体浏览器/扩展/OS 版本、截图、HAR 或 Network export，因此不补写这些信息。Node helper 与用户真实 chooser 证据边界保持分离。

**EXTERNAL-01：SATISFIED。** 自动化、评审、acorn 公网 contract 与用户 Firefox/Bitwarden 实机确认均通过，允许 merge 到 `zccz14/auth-mini:main`，也允许随后自动 release/deploy。

## 兼容性与 API 注意事项

- `PublicKeyCredentialCreationOptionsJson` 现在要求 literal required/true selection fields 和 closed `{ credProps: true }` extensions。
- `RegistrationCredentialJson.clientExtensionResults.credProps.rk` 在公开接受契约和生成类型中变为 required literal `true`；runtime 对 false/missing/错误类型继续返回 generic 400。
- 删除 OpenAPI/生成 `VerifyWebauthnRegistrationErrors` 中从未由 Rust runtime 返回的 duplicate 409。密码学有效 duplicate 继续返回 `400 invalid_webauthn_registration`；依赖旧 409 union branch 的调用方需要更新。
- 部署前已签发、但缺少 `rk=true` 的旧 registration challenge 可能被新版 verify 拒绝；用户需要重新发起注册。

## 数据安全

- 无 schema/data migration、无 backfill、无可信 `rk` 列。
- 成功注册只追加新行；不会自动删除、迁移、替换或重写旧 credential。
- strict failure 不消费 challenge、不写 credential。
- 密码学有效 duplicate 在主键 `INSERT` 失败时回滚同一 transaction，保留 challenge 与旧行六个字段，并返回 generic 400。
- 成功注册的 library-normalized `Unsigned(CredProps)` 会随现有 `Passkey` 结构进入新行 `passkey_json`；原始完整 extension payload 不独立持久化，也不复制到可信列或用于授权。
- Authentication 只更新实际使用 credential 的正常 counter/state/`last_used_at`，不是旧数据迁移。

## 回滚

1. 回滚到上一应用二进制/发布制品；不执行 SQL。
2. 保留本版本成功新增的 credential；其 `Passkey` 格式兼容，不做自动清理。
3. 保留所有旧 credential 与 challenge，让 challenge 按现有 TTL/后续 options 规则处理。
4. 验证旧版 registration options/verify 与 authentication endpoint 恢复，并记录原因。

回滚会重新开放保存 non-discoverable credential 的原风险，只作为应急手段。

## Legion 证据

- [任务计划](https://github.com/Thrimbda/auth-mini/blob/legion/fix-passkey-discoverable-contract-webauthn/.legion/tasks/fix-passkey-discoverable-contract/plan.md)
- [调查](https://github.com/Thrimbda/auth-mini/blob/legion/fix-passkey-discoverable-contract-webauthn/.legion/tasks/fix-passkey-discoverable-contract/docs/research.md)
- [RFC](https://github.com/Thrimbda/auth-mini/blob/legion/fix-passkey-discoverable-contract-webauthn/.legion/tasks/fix-passkey-discoverable-contract/docs/rfc.md)
- [RFC 评审：PASS](https://github.com/Thrimbda/auth-mini/blob/legion/fix-passkey-discoverable-contract-webauthn/.legion/tasks/fix-passkey-discoverable-contract/docs/review-rfc.md)
- [验证报告：PASS，EXTERNAL-01 SATISFIED](https://github.com/Thrimbda/auth-mini/blob/legion/fix-passkey-discoverable-contract-webauthn/.legion/tasks/fix-passkey-discoverable-contract/docs/test-report.md)
- [变更评审：PASS](https://github.com/Thrimbda/auth-mini/blob/legion/fix-passkey-discoverable-contract-webauthn/.legion/tasks/fix-passkey-discoverable-contract/docs/review-change.md)
- [Reviewer walkthrough](https://github.com/Thrimbda/auth-mini/blob/legion/fix-passkey-discoverable-contract-webauthn/.legion/tasks/fix-passkey-discoverable-contract/docs/report-walkthrough.md)
