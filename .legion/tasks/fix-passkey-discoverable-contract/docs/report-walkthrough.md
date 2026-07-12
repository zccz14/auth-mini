# Passkey Discoverable Credential 修复 Walkthrough

> **Mode：implementation**
> 本文只整理已有实现、验证、部署静态核对与 operator attestation；不补设计或生产实现。

## 1. 交付结论

- **上游目标**：`zccz14/auth-mini:main`
- **推荐 PR 标题**：`fix(webauthn): 统一 Passkey discoverable credential 契约`
- **自动化 change verification**：PASS
- **`review-change`**：PASS，无 blocking code finding
- **acorn 公网 OpenAPI 静态核对**：PASS
- **Firefox/Bitwarden operator validation**：PASS
- **EXTERNAL-01**：SATISFIED，允许 merge 与 release

浏览器证据来自用户的 operator attestation：用户确认在 acorn 部署版本上完成 Firefox/Bitwarden 注册与无用户名登录，原 discoverability 问题已修复。本代理没有直接执行 GUI，也没有浏览器/扩展/OS 版本、截图、HAR 或 Network export；本文不补写不存在的证据。

## 2. 旧行为与问题复现

旧注册和登录契约彼此冲突：

1. 注册实际发送 `residentKey="discouraged"`、`requireResidentKey=false`，并在应用响应投影中丢弃 `credProps` extension。
2. Bitwarden 因而保存 `discoverable=false` 的 credential。
3. 登录使用 username-less discoverable authentication，且没有 `allowCredentials`，Firefox/Bitwarden chooser 无法获得 credential ID 提示，也就无法列出该 credential。

结果是“注册成功”却产生无法用于现有登录流程的 Passkey，直接破坏无用户名登录。静态代码与锁定依赖证明了契约错位；修复后的真实 chooser 结果由已通过的 operator validation 补足。详见 [research](research.md#L10-L56) 与 [task contract](../plan.md#L3-L32)。

## 3. 设计决策

采用 RFC 方案 A，保留 `webauthn-rs 0.5.5` 高层注册/完成 API、现有 `Passkey` 存储格式与 discoverable authentication 路径：

- **Typed-first + 单一 fail-closed projection**：先设置 typed `require_resident_key=true` 并清空 typed extensions；再在一个受限 helper 中设置 `residentKey="required"`，只加入 exact `{ "credProps": true }`。RP ID、字段类型或 extension key set 不符时直接失败，不透传 library 的 `credProtect`、`uvm` 或未来成员。
- **严格注册 gate**：verify 只接受 JSON boolean `clientExtensionResults.credProps.rk === true`，false、缺失、null、字符串、数字或错误结构均拒绝。
- **完整 WebAuthn finish 不变**：strict gate 之后仍执行 `finish_passkey_registration`；challenge、origin、RP hash、UP/UV、算法与 attestation 验证没有被替代或降级。
- **保持数据和错误模型**：无 schema migration、无可信 `rk` 列、无 username-first fallback。Duplicate credential 继续返回 generic `400 invalid_webauthn_registration`，不实现 409。
- **版本边界**：browser wire 是 required/true/credProps-only；0.5.5 server state 仍保留 resident=false 和原 library extension requests。manifest/lockfile 未变，依赖升级必须重新审计。

完整取舍见 [RFC](rfc.md#L112-L201)；设计审查最终结论为 [review-rfc PASS](review-rfc.md#L86-L164)。

## 4. 关键数据流

### 4.1 Registration options

1. HTTP 层继续要求有效 access token 和允许管理 Passkey 的 AMR。
2. 服务端从 `app_meta` 解析 RP ID/origin/RP name，调用 `start_passkey_registration`。
3. `register_options` 设置 typed `requireResidentKey=true`、清空 outbound typed extensions，再调用 `project_registration_public_key`。
4. projection 校验 configured RP ID、拒绝残留 extensions，并输出 `residentKey="required"`、`requireResidentKey=true`、`userVerification="required"` 与 exact `{ "credProps": true }`。
5. 原始 library state 与 RP/origin snapshot 保存到 challenge；SDK 解码二进制字段时保留 selection/extensions，并传给 `navigator.credentials.create()`。

主要路径：[`rust-backend/src/webauthn.rs:185-341`](../../../../rust-backend/src/webauthn.rs#L185-L341)、[`rust-backend/src/http.rs:698-723`](../../../../rust-backend/src/http.rs#L698-L723)、[`src/sdk/browser-runtime.ts:734-760`](../../../../src/sdk/browser-runtime.ts#L734-L760)。

### 4.2 Registration verify

1. SDK 优先调用浏览器原生 `getClientExtensionResults()`，否则使用兼容属性，并把结果随 credential 发往 `/webauthn/register/verify`。
2. 服务端读取有效 challenge、校验 owner，再执行 strict `rk===true` gate。
3. gate 通过后恢复 server state/RP/origin，并执行完整 `finish_passkey_registration`。
4. 只有 strict signal 和完整 finish 都通过，才序列化 `Passkey` 并进入单一 transaction：CAS 消费 challenge、`INSERT` 新 credential、commit。

主要路径：[`src/sdk/browser-runtime.ts:1038-1060`](../../../../src/sdk/browser-runtime.ts#L1038-L1060)、[`rust-backend/src/http.rs:725-746`](../../../../rust-backend/src/http.rs#L725-L746)、[`rust-backend/src/webauthn.rs:419-495`](../../../../rust-backend/src/webauthn.rs#L419-L495)。

### 4.3 Authentication

Authentication 生产逻辑未改：使用与注册相同配置来源的 RP ID，调用 discoverable authentication，并有意省略 `allowCredentials`。浏览器/密码管理器发现并返回 credential 后，服务端完成 assertion，只更新实际使用 credential 的 library state/counter 与 `last_used_at`，随后建立 WebAuthn session。

主要路径：[`rust-backend/src/webauthn.rs:344-392`](../../../../rust-backend/src/webauthn.rs#L344-L392)、[`rust-backend/src/webauthn.rs:497-568`](../../../../rust-backend/src/webauthn.rs#L497-L568)、[`src/sdk/browser-runtime.ts:709-732`](../../../../src/sdk/browser-runtime.ts#L709-L732)。

## 5. Strict / unsigned 边界

- `rk=true` 是接受新注册的严格 client policy signal；false 或缺失不会被宽松接受。
- `credProps.rk` 未签名，可被页面 JavaScript 或非可信客户端修改，因此不是 authenticator resident storage 的密码学证明，也不得用于授权或认证强度判断。
- 完整 WebAuthn finish 始终独立执行。
- 对成功注册，0.5.5 会把报告归一化为 `Unsigned(CredProps)` 并随 `Passkey` 写入新行的 `passkey_json`。应用不独立保存原始完整 extension payload，也不复制到可信列。

## 6. Existing credential 与失败原子性

- Registration 成功路径只追加一条 `INSERT`；不会自动删除、迁移、替换或重写旧 credential。
- strict false/missing、state 或完整 ceremony 失败发生在写 transaction 前，challenge 保持未消费，旧行不变。
- 密码学有效的 duplicate 在 transaction 中因主键 `INSERT` 冲突失败；CAS challenge consume 与 insert 一起回滚，返回 generic 400，challenge 和旧行六个字段不变。
- 成功追加第二枚 credential 后第一枚仍保留；authentication 只更新实际使用的那一枚。
- 旧 non-discoverable credential 继续保留供显式管理，但因为没有 `allowCredentials` fallback，仍可能无法用于 username-less chooser。

实现与 schema：[`rust-backend/src/webauthn.rs:453-483`](../../../../rust-backend/src/webauthn.rs#L453-L483)、[`sql/schema.sql:64-71`](../../../../sql/schema.sql#L64-L71)。数据证据：[`rust-e2e/rust-server.test.ts:314-443`](../../../../rust-e2e/rust-server.test.ts#L314-L443)。

## 7. OpenAPI、生成类型与文档

- Creation options 固定 `residentKey: "required"`、`requireResidentKey: true`、`userVerification: "required"`；outbound extensions 是 closed object，只允许 `credProps: true`。
- Registration verify 的公开接受契约要求 `clientExtensionResults.credProps.rk: true`，并明确其 unsigned 限制。
- 删除 `/webauthn/register/verify` 虚假的 duplicate 409；runtime 继续返回 generic 400，生成的 error union 同步移除 409。
- 生成类型收紧为 required literal types；集成与 HTTP 文档同步 strict rejection、无 `allowCredentials`、normalized unsigned metadata、旧 credential 保留和 duplicate rollback。

证据见 [`openapi.yaml:582-619`](../../../../openapi.yaml#L582-L619)、[`openapi.yaml:1312-1449`](../../../../openapi.yaml#L1312-L1449)、[`src/generated/api/types.gen.ts:180-235`](../../../../src/generated/api/types.gen.ts#L180-L235)、[`docs/integration/webauthn.md:12-105`](../../../../docs/integration/webauthn.md#L12-L105)。

## 8. 验证证据

### 8.1 自动化：PASS

| 验证                                                       | 已有结果                                  |
| ---------------------------------------------------------- | ----------------------------------------- |
| `cargo test --locked`                                      | PASS；141 passed，0 failed                |
| locked Rust build + `npx vitest run rust-e2e`              | PASS；2 tests passed                      |
| `npm test`                                                 | PASS；119 unit tests，9 integration tests |
| typecheck、lint、generated drift                           | PASS                                      |
| 变更文件 Prettier、`git diff --check`、dependency boundary | PASS                                      |

Rust/Node e2e 使用 Node `crypto` 生成有效 packed attestation 与 assertion，覆盖 true/false/missing、append-only、normalized unsigned metadata、duplicate rollback 和无 `allowCredentials` 的服务端 ceremony。Helper 显式选择测试 key，因此不把它称为真实 browser discovery；真实 chooser 由下面的 operator attestation 证明。

`cargo fmt --all -- --check` 仍因 `rust-backend/src/session.rs:183` 失败；该文件与 `origin/main` blob 相同，是既有 baseline。本次两个 Rust 变更文件 scoped rustfmt PASS，现有 PR workflows 也没有 cargo fmt gate。

### 8.2 acorn 部署与公网 OpenAPI：PASS

- acorn active service 运行 feature commit `b4f6cf75459f4969cc126d5d1d65cb556a40e4bd` 对应路径 `/opt/auth-mini-manual/b4f6cf7/auth-mini`。
- loopback OpenAPI 与公网 Web UI 健康。
- 公网 `https://auth.0xc1.wang/openapi.json` 已核对 required/true/required、closed exact `credProps`、required/const `rk=true`，且 registration verify responses 不含 409。
- acorn deployed binary 由 acorn 侧另行构建，SHA-256 为 `3acdbeb57d42054f9db3c2dbcfff9ea7dd0e15646e944433ec3a56e4ca925a14`，与本地 validation artifact SHA 前缀 `f4a756...` 不同。现有证据**不支持** binary hash match 或 reproducible build 声明；部署结论来自 feature commit、live contract 与 operator behavior，而不是 hash 等同。

### 8.3 Firefox/Bitwarden operator validation：PASS

用户明确确认：acorn 部署新版本后，已在 Firefox/Bitwarden 上完成实机注册与无用户名登录，chooser 可发现新 credential，原问题已修复。因此 **EXTERNAL-01 SATISFIED**。

这是 operator attestation，不是本代理直接执行的 GUI 记录。未提供具体浏览器/扩展/OS 版本或截图；既有 credential 的数据库级安全结论仍来自自动化 row snapshot，不归因于 operator 额外提供的数据证据。

## 9. Review 与发布结论

`review-change` 最终结论为 **PASS**，无 blocking finding。自动化、acorn 公网 contract 与 operator browser attestation 三层证据均通过；EXTERNAL-01 已满足，允许向 `zccz14/auth-mini:main` merge，并允许随后自动 release/deploy。详见 [test-report](test-report.md#L3-L13) 与 [review-change](review-change.md#L33-L69)。

保留的非阻塞 residual：SDK 单测尚未直接执行原生 `getClientExtensionResults()` 分支；browser/operator 版本元数据缺失；`credProps.rk` 固有 unsigned；部署制品与本地产物 hash 不同且未证明 reproducible build。

## 10. 回滚

1. 回滚到上一应用二进制/发布制品；不执行 SQL。
2. 保留本版本成功新增的 credential；其 `Passkey` 格式兼容，不做自动清理。
3. 保留所有旧 credential 与 challenge，让 challenge 按现有 TTL/后续 options 规则处理。
4. 验证旧版本 registration options/verify 与 authentication endpoint 恢复，并记录回滚原因。

回滚会重新开放“保存 non-discoverable credential”的原风险，只作为应急手段。

## 11. Reviewer 建议阅读顺序

1. **核心 options 与 projection**：[`rust-backend/src/webauthn.rs:185-341`](../../../../rust-backend/src/webauthn.rs#L185-L341)
2. **strict gate、完整 finish、transaction**：[`rust-backend/src/webauthn.rs:419-495`](../../../../rust-backend/src/webauthn.rs#L419-L495)
3. **authentication 不变边界**：[`rust-backend/src/webauthn.rs:344-392`](../../../../rust-backend/src/webauthn.rs#L344-L392)、[`rust-backend/src/webauthn.rs:497-568`](../../../../rust-backend/src/webauthn.rs#L497-L568)
4. **有效 ceremony、保留与 rollback**：[`rust-e2e/rust-server.test.ts:242-514`](../../../../rust-e2e/rust-server.test.ts#L242-L514)
5. **OpenAPI 与 contract test**：[`openapi.yaml:1312-1449`](../../../../openapi.yaml#L1312-L1449)、[`tests/integration/openapi-contract.test.ts:141-203`](../../../../tests/integration/openapi-contract.test.ts#L141-L203)
6. **完整验证与发布判定**：[test-report](test-report.md)、[review-change](review-change.md)
