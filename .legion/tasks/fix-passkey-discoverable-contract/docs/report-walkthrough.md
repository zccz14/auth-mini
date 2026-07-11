# Passkey Discoverable Credential 修复 Walkthrough

> **Mode：implementation**  
> 本文只整理已有实现、验证与评审证据；本阶段未补跑测试，也未把未完成的实机互操作验证写成已通过。

## 1. 问题与复现路径

已有静态调查复现了注册与登录之间的契约错位：

1. `origin/main` 上的注册路径调用 `webauthn-rs 0.5.5` 高层 Passkey API；该版本默认产生 `residentKey="discouraged"`、`requireResidentKey=false`，应用的响应投影又丢弃了 library 生成的 extension inputs。
2. 登录路径却一直使用 username-less discoverable authentication，并省略 `allowCredentials`。
3. 因而服务端可能保存不满足 discoverable 要求的新凭据，而登录端又没有 credential ID 提示或 username-first fallback。任务报告中的现象是 Bitwarden 保存后 Firefox chooser 无法列出该凭据。

代码与锁定依赖足以证明上述契约错位；它们**不能**替代目标 Firefox/Bitwarden 组合的真实 chooser 复现或修复后互操作证据。详见 [research](research.md#L10-L56) 与 [task contract](../plan.md#L3-L32)。

## 2. 设计决策

采用 RFC 方案 A，保留 `webauthn-rs 0.5.5` 高层注册/完成 API、现有 `Passkey` 存储格式和 discoverable authentication 路径：

- **Typed-first + 单一 fail-closed projection**：先将 typed `require_resident_key` 设为 `true`，并清空 typed extensions；再在一个受限 JSON helper 中设置 `residentKey="required"`，只加入 exact `{ "credProps": true }`。RP ID、字段类型或 extension key set 不符时直接失败，不透传 library 的 `credProtect`、`uvm` 或未来成员。
- **接受并约束 0.5.5 的 wire/state 差异**：浏览器收到 required/true/credProps-only；server-side library state 仍记录 resident=false 及原默认 extension requests。该结论仅适用于锁定的 0.5.5，manifest/lockfile 未变，依赖升级必须重新审计。
- **严格但不提升信任级别**：注册 verify 只接受 JSON boolean `clientExtensionResults.credProps.rk === true`，随后仍执行完整 `finish_passkey_registration`。`credProps.rk` 未签名、可被客户端修改，只是 strict client policy signal，不是 resident storage 的密码学证明。
- **保持错误与数据模型**：不新增 schema、可信 `rk` 列、登录 fallback 或专用错误。Duplicate credential 继续走现有 generic `400 invalid_webauthn_registration`，不实现 409。

完整取舍与边界见 [RFC](rfc.md#L112-L201)；设计审查最终结论为 [review-rfc PASS](review-rfc.md#L86-L164)。

## 3. 关键数据流

### 3.1 Registration options

1. HTTP 层继续要求有效 access token 和允许管理 Passkey 的 AMR。
2. 服务端从 `app_meta` 解析并规范化 RP ID/origin/RP name，调用高层 `start_passkey_registration`。
3. `register_options` 先设置 typed `requireResidentKey=true`、清空 outbound typed extensions，再调用 `project_registration_public_key`。
4. projection 校验 configured RP ID、拒绝残留 extensions，并输出：
   - `residentKey: "required"`
   - `requireResidentKey: true`
   - `userVerification: "required"`
   - exact `extensions: { "credProps": true }`
5. 原始 library state 与 RP/origin snapshot 仍保存到 challenge；响应交给 SDK。SDK 解码二进制字段时通过 object spread 保留 selection/extensions，再传给 `navigator.credentials.create()`。

主要路径：[`rust-backend/src/webauthn.rs:185-341`](../../../../rust-backend/src/webauthn.rs#L185-L341)、[`rust-backend/src/http.rs:698-723`](../../../../rust-backend/src/http.rs#L698-L723)、[`src/sdk/browser-runtime.ts:734-760`](../../../../src/sdk/browser-runtime.ts#L734-L760)、[`src/sdk/browser-runtime.ts:1008-1023`](../../../../src/sdk/browser-runtime.ts#L1008-L1023)。

### 3.2 Registration verify

1. SDK 优先调用浏览器原生 `getClientExtensionResults()`，否则使用兼容属性，并把结果随 credential 发往 `/webauthn/register/verify`。
2. HTTP 层维持现有认证、AMR、请求解析和错误分类。
3. 服务端先读取有效 registration challenge、校验 owner，再严格检查 `credProps.rk` 是否为 JSON boolean `true`；false、缺失、null、字符串、数字或错误结构均返回 generic registration 400。
4. strict signal 通过后，服务端恢复 challenge 中的 state/RP/origin，并执行完整 `finish_passkey_registration`；strict signal 不替代 challenge、origin、RP hash、UP/UV、算法或 attestation 验证。
5. 只有两者都通过后才序列化 `Passkey`，进入单一 transaction：CAS 消费 challenge，然后 `INSERT` 新 credential，最后 commit。

主要路径：[`src/sdk/browser-runtime.ts:1038-1060`](../../../../src/sdk/browser-runtime.ts#L1038-L1060)、[`rust-backend/src/http.rs:725-746`](../../../../rust-backend/src/http.rs#L725-L746)、[`rust-backend/src/webauthn.rs:419-495`](../../../../rust-backend/src/webauthn.rs#L419-L495)。

### 3.3 Authentication

Authentication 生产逻辑未改：

1. `/webauthn/authenticate/options` 使用与注册相同配置来源的 RP ID，调用 discoverable authentication，并有意省略 `allowCredentials`。
2. 浏览器/密码管理器需要自行发现并返回 credential；服务端再按 credential ID + RP ID 读取行并完成 assertion 验证。
3. 成功后只更新实际使用的 credential 的 library state/counter 与 `last_used_at`，并建立 WebAuthn session；这不是对旧 credential 的迁移。

主要路径：[`rust-backend/src/webauthn.rs:344-392`](../../../../rust-backend/src/webauthn.rs#L344-L392)、[`rust-backend/src/webauthn.rs:497-568`](../../../../rust-backend/src/webauthn.rs#L497-L568)、[`src/sdk/browser-runtime.ts:709-732`](../../../../src/sdk/browser-runtime.ts#L709-L732)。

## 4. Strict / unsigned 边界

- `rk=true` 是**接受新注册的严格客户端协议条件**；false 或缺失不会被宽松接受。
- 该字段未签名，页面 JavaScript 或非可信客户端可以修改，因此不能用作授权、认证强度或 authenticator 实际 resident 状态的证明。
- 完整 WebAuthn finish 始终独立执行。
- 对成功注册，0.5.5 会把报告归一化为 `Unsigned(CredProps)` 并随 `Passkey` 写入新行的 `passkey_json`。应用不独立保存原始完整 extension payload，也不复制到可信列。

## 5. Existing credential 与失败原子性

- Registration 路径只在成功 transaction 中追加一条 `INSERT`；不会自动删除、迁移、替换或重写旧 credential。
- strict false/missing、state/完整 ceremony 失败发生在写 transaction 前，challenge 保持未消费，旧行不变。
- `credential_id` 是全局主键。密码学有效的 duplicate 在 transaction 内先 CAS challenge、后因 `INSERT` 冲突失败；整个 transaction 回滚，返回 generic `400 invalid_webauthn_registration`，challenge 与旧行六个字段保持不变。
- 成功追加第二枚 credential 后第一枚仍保留；authentication 只更新实际使用的那一枚。
- 旧的 non-discoverable credential 继续保留供显式管理，但因为没有 `allowCredentials` fallback，仍可能无法用于 username-less chooser。

实现与 schema：[`rust-backend/src/webauthn.rs:453-483`](../../../../rust-backend/src/webauthn.rs#L453-L483)、[`sql/schema.sql:64-71`](../../../../sql/schema.sql#L64-L71)。数据证据：[`rust-e2e/rust-server.test.ts:314-443`](../../../../rust-e2e/rust-server.test.ts#L314-L443)。

## 6. OpenAPI、生成类型与文档

- Creation options 现在要求并固定 `residentKey: "required"`、`requireResidentKey: true`、`userVerification: "required"`，且 outbound extensions 是 closed object，只允许 `credProps: true`。
- Registration verify 的公开接受契约要求 `clientExtensionResults.credProps.rk: true`，description 明确其 unsigned 限制。
- 删除 `/webauthn/register/verify` 虚假的 duplicate 409；runtime 继续返回一直存在的 generic 400。生成的 `VerifyWebauthnRegistrationErrors` 同步移除 409。
- 生成类型把上述字段收紧为 required literal types。集成文档与 HTTP 参考补充 strict rejection、无 `allowCredentials`、normalized unsigned metadata、旧 credential 保留和 duplicate rollback，并修正 registration UV 与 Rust library 说明。

这包含 source-level breaking correction：旧客户端若不提交 `rk=true` 将不再满足 schema/生成类型并会在 runtime 被拒绝；依赖生成 409 error union 的调用方也需要移除该分支。证据见 [`openapi.yaml:582-619`](../../../../openapi.yaml#L582-L619)、[`openapi.yaml:1312-1449`](../../../../openapi.yaml#L1312-L1449)、[`src/generated/api/types.gen.ts:180-235`](../../../../src/generated/api/types.gen.ts#L180-L235)、[`src/generated/api/types.gen.ts:963-976`](../../../../src/generated/api/types.gen.ts#L963-L976)。

## 7. 验证证据

**自动化 change verification：PASS。** 已有 [test report](test-report.md#L35-L63) 记录：

| 验证                                                                                      | 已有结果                                                       |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `cargo test --locked`                                                                     | PASS；141 passed，0 failed                                     |
| `cargo build --locked --manifest-path rust-backend/Cargo.toml && npx vitest run rust-e2e` | PASS；2 tests passed                                           |
| `npm test`                                                                                | PASS；19 files / 119 unit tests，3 files / 9 integration tests |
| `npm run typecheck`、`npm run lint`                                                       | PASS                                                           |
| `npm run check:generated:api`                                                             | PASS；无生成 drift                                             |
| 变更文件 Prettier、`git diff --check`、Cargo dependency boundary                          | PASS                                                           |

Rust/Node e2e 使用 Node `crypto` 生成有效 packed attestation 与 assertion，覆盖 true success、false/missing rejection、append-only、normalized unsigned metadata、duplicate rollback，以及无 `allowCredentials` 的服务端 authentication ceremony。测试 helper **显式选择测试 key**；它不是 Firefox/Bitwarden，也不构成真实 browser discovery 证据。

`cargo fmt --all -- --check` 仍报告 `rust-backend/src/session.rs:183` 差异；该文件 blob 与 `origin/main` 完全相同，且不在本次 diff 中，因此是既有 repo baseline。变更的两个 Rust 文件 `rust-backend/src/webauthn.rs` 与 `rust-backend/src/http.rs` scoped rustfmt **PASS**。现有 PR workflows 也没有 cargo fmt gate。不得把全仓命令改写为 PASS，但它不属于本次 change failure。

## 8. Review 结论与剩余项

**`review-change`：PASS。** 未发现 blocking code finding，允许进入 walkthrough/wiki；见 [review-change](review-change.md#L3-L58)。

非阻塞 note `RC-N01`：SDK 单测覆盖了 fallback extension 属性序列化，但没有直接执行浏览器原生 `getClientExtensionResults()` 方法分支；静态审查未发现该生产分支错误，真实浏览器门禁会覆盖它。

### EXTERNAL-01 — 当前阻塞 merge/release

Firefox/Bitwarden chooser **尚未验证**。必须在目标 OS、Firefox 与 Bitwarden 精确版本上记录 configured RP/options、真实 `credProps.rk=true`、无用户名且无 `allowCredentials` 时 chooser 主动列出新凭据、成功登录，以及旧 credential 未变化。

`main` push 会自动触发 Rust release；release 成功后又自动触发 EC2 deploy（[release workflow](../../../../.github/workflows/release.yml#L3-L7)、[deploy workflow](../../../../.github/workflows/deploy-auth-mini.yml#L3-L10)）。因此 EXTERNAL-01 在完成前同时阻塞 **merge 与 release**，不能把它留到合并后的发布阶段。

## 9. 回滚

1. 回滚到上一应用二进制/发布制品；不执行 SQL。
2. 保留发布期间成功新增的 credential；其 `Passkey` 格式与旧版本兼容，不做自动清理。
3. 保留所有旧 credential 与 challenge，让 challenge 按现有 TTL/后续 options 规则处理。
4. 验证旧版本 registration options/verify 与 authentication endpoint 恢复，并记录回滚原因。

回滚会重新开放“保存 non-discoverable credential”的原风险，只是应急手段，不是长期兼容模式。

## 10. Reviewer 建议阅读顺序

1. **核心 options 与 projection**：[`rust-backend/src/webauthn.rs:185-341`](../../../../rust-backend/src/webauthn.rs#L185-L341)
2. **strict gate、完整 finish、transaction**：[`rust-backend/src/webauthn.rs:419-495`](../../../../rust-backend/src/webauthn.rs#L419-L495)
3. **authentication 不变边界**：[`rust-backend/src/webauthn.rs:344-392,497-568`](../../../../rust-backend/src/webauthn.rs#L344-L392)
4. **HTTP options/失败无副作用测试**：[`rust-backend/src/http.rs:2359-2382`](../../../../rust-backend/src/http.rs#L2359-L2382)、[`rust-backend/src/http.rs:2507-2636`](../../../../rust-backend/src/http.rs#L2507-L2636)
5. **有效 ceremony、保留与 rollback 证据**：[`rust-e2e/rust-server.test.ts:242-514`](../../../../rust-e2e/rust-server.test.ts#L242-L514)
6. **OpenAPI 与 contract test**：[`openapi.yaml:1312-1449`](../../../../openapi.yaml#L1312-L1449)、[`tests/integration/openapi-contract.test.ts:141-203`](../../../../tests/integration/openapi-contract.test.ts#L141-L203)
7. **SDK wire 交接**：[`src/sdk/browser-runtime.ts:734-760`](../../../../src/sdk/browser-runtime.ts#L734-L760)、[`tests/unit/sdk-webauthn.test.ts:232-273`](../../../../tests/unit/sdk-webauthn.test.ts#L232-L273)
8. **验证与最终评审**：[test-report](test-report.md)、[review-change](review-change.md)
