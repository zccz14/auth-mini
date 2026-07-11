# Change Review：Passkey Discoverable Credential 契约

## Findings

### Blocking findings

**无。** 未发现 Critical、High、Medium 或 Low 级 blocking code finding。

### Non-blocking notes

#### Low — RC-N01：SDK 单测没有直接执行浏览器原生 `getClientExtensionResults()` 分支

- 生产实现会优先调用 `credential.getClientExtensionResults()`，并保留属性 fallback（`src/sdk/browser-runtime.ts:1038-1060`）；调用形式保留了方法 receiver，静态审查未发现实现错误。
- 当前 fixture 只提供 `clientExtensionResults` 属性，没有提供原生方法（`tests/helpers/sdk.ts:320-346`）。因此新增断言虽然证明了 required options 被原样交给 `navigator.credentials.create()`，也证明了 fallback payload 的序列化，但不能单独防止原生方法分支未来回归（`tests/unit/sdk-webauthn.test.ts:232-276`）。
- 影响仅限自动化回归强度；Firefox/Bitwarden 外部门禁会走真实浏览器对象，且当前生产分支本身正确，因此不阻塞本次实现。后续最小增强是让 fixture 实现 receiver-sensitive `getClientExtensionResults()` 并返回真实 `{ credProps: { rk: true } }`。

#### Baseline note（不是本次 finding）

`cargo fmt --all -- --check` 的唯一失败仍是与 `origin/main` blob 相同的 `rust-backend/src/session.rs:183`；本次 Rust diff 只有 `webauthn.rs` 与 `http.rs`，两者 scoped rustfmt 已通过（`docs/test-report.md:52-62,123-125`）。该 repo baseline 不计入本次代码结论，也不伪装成本次 finding。

## External release gate

### EXTERNAL-01 — Firefox/Bitwarden 实机 discoverability 未验证

这是 **external release gate**，不是 blocking code finding。自动化 helper 显式选择测试 key，只证明无 `allowCredentials` 的服务端 ceremony 可完成，不能证明 Firefox/Bitwarden chooser 会主动发现凭据（`rust-e2e/rust-server.test.ts:445-514`；`docs/test-report.md:127-142`）。

在允许 merge/release 前，必须记录目标 OS、Firefox 与 Bitwarden 精确版本、RP ID/origin，并证明：

1. 浏览器收到 configured RP、`residentKey="required"`、`requireResidentKey=true` 和 exact `{ "credProps": true }`；
2. Bitwarden 创建凭据后，真实 `getClientExtensionResults()` 产生 JSON boolean `credProps.rk=true`；
3. 无用户名且 options 无 `allowCredentials` 时，chooser 主动列出该凭据并成功登录；
4. 既有 credential 列表和持久化行未被自动迁移、改写或删除。

任一步失败都不得放宽 strict gate；应停止交付并回到 `spec-rfc` 重新判断兼容性。合并到 `main` 会立即触发 Rust release，成功后继续触发部署（`.github/workflows/release.yml:3-7,29-34`；`.github/workflows/deploy-auth-mini.yml:3-10,25-30`），因此该外部门禁同时阻塞当前 merge，而不只是事后发布。

## Security lens

**已展开安全视角。** 本变更涉及认证、协议边界、用户控制输入和 credential 持久化。

| 审查面                         | 判定与证据                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registration options           | 先 typed mutation `require_resident_key=true`、`extensions=None`，再进入唯一 JSON projection；helper 校验 RP ID、拒绝残留 extensions，并返回 exact `{credProps:true}`，无 panic/fallback 透传路径（`rust-backend/src/webauthn.rs:185-217,285-341`）。最终响应只取该 exact extension object（`:218-282`），不会 outbound `credentialProtectionPolicy`、`enforceCredentialProtectionPolicy` 或 `uvm`。                                                                                                      |
| 0.5.5 wire/state 差异          | manifest/lockfile 未改，也未新增 core/proto 直接依赖（`rust-backend/Cargo.toml:7-19`）。原始 `PasskeyRegistration` state 保持 server-side；锁定 core 0.5.5 仍忽略 resident flag，但继续执行 challenge、origin、RP hash、UP、UV、algorithm 与 attestation 验证。有效 packed-attestation e2e 在该精确版本下通过（`rust-e2e/rust-server.test.ts:242-312`；`docs/test-report.md:39-50,91-99`）。                                                                                                              |
| Strict `rk` gate               | 只接受 JSON bool `true`（`rust-backend/src/webauthn.rs:488-495`）；顺序为有效 challenge precheck、owner 校验、strict gate、state 恢复、完整 `finish_passkey_registration`、最后 transaction（`:419-483,622-655`）。该 unsigned 值没有替代 finish，也没有新增授权、迁移或可信查询用途。                                                                                                                                                                                                                    |
| 失败与原子性                   | false/missing/错误结构在 transaction 前失败；有效 duplicate 在同一 transaction 中先 CAS consume、后 INSERT，INSERT/commit 错误由 rollback 保持 challenge 与旧行（`rust-backend/src/webauthn.rs:453-483`）。HTTP 与有效 ceremony e2e 分别覆盖错误分类、未消费、旧行六字段、append-only 与 duplicate rollback（`rust-backend/src/http.rs:2507-2636`；`rust-e2e/rust-server.test.ts:314-443`）。并发 verify 仍由 `consumed_at IS NULL` 的单行 CAS 封闭；失败路径没有 registration credential UPDATE/DELETE。 |
| Authentication 回归            | authentication 生产路径未变：同一配置 RP ID、无 `allowCredentials`，只在完整 assertion 成功后更新实际使用 credential（`rust-backend/src/webauthn.rs:344-392,497-568,691-710`）。e2e 成功登录第一枚 credential，并证明第二枚行保持不变（`rust-e2e/rust-server.test.ts:445-514`）。                                                                                                                                                                                                                         |
| SDK/API 契约                   | SDK spread/decode 保留 selection/extensions 并传给浏览器，序列化代码优先读取真实 extension method（`src/sdk/browser-runtime.ts:1008-1060`）。OpenAPI 将 outbound fields 和 inbound `rk` 设为 required/const，extensions closed，runtime 仍把 false/missing 归类为 generic ceremony 400；虚假 409 已从 OpenAPI 和生成 error union 删除（`openapi.yaml:596-619,1312-1449`；`src/generated/api/types.gen.ts:180-230,963-978`）。                                                                             |
| 测试置信度                     | helper 默认 `rk=true` 不单独构成证明，但同一 e2e 先锁定 exact outbound options，再用显式 false/omit 构造密码学有效 response；duplicate 对新 challenge 重签；旧行比较覆盖六字段。normalized `Unsigned(CredProps)` 与 raw sentinel 边界也有结构/静态路径证据（`tests/helpers/webauthn.ts:58-131`；`rust-e2e/rust-server.test.ts:242-443,549-682`）。真实 chooser 边界已隔离为 EXTERNAL-01。                                                                                                                 |
| 文档、安全语义与旧数据         | 两份文档明确 unsigned、完整 finish、generic 400、normalized metadata、无 `allowCredentials`，以及旧 non-discoverable credential 只保留供显式管理且可能无法 username-less 登录；没有把自动化称为实机发现证明（`docs/integration/webauthn.md:42-105`；`docs/reference/http-api.md:187-300`）。                                                                                                                                                                                                              |
| Scope / privacy / dependencies | 11 个生产、测试、OpenAPI、生成类型和文档 diff 均在 RFC implementation boundary 内；无 schema、Cargo manifest/lock、SDK production、认证日志或无关文件变更。应用未新增 credential、attestation、clientData 或 raw extension 日志；原始 extension 没有独立持久化路径。                                                                                                                                                                                                                                      |

## Readiness decision

- **唯一实现结论：PASS**
- **允许进入 walkthrough/wiki：是。**
- **允许发布：否。** EXTERNAL-01 未满足。
- **允许 merge：否。** 当前 `main` push 会自动 release/deploy，必须先满足 EXTERNAL-01。
- **阶段回退：** 当前没有 blocking finding，无需回退 `engineer` 或 `spec-rfc`；仅当实机门禁失败时回到 `spec-rfc`，不得在 release 阶段临时放宽契约。
