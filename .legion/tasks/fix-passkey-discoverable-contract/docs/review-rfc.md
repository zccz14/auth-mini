# RFC 对抗审查：Passkey Discoverable Credential 契约

## 审查范围

- 任务契约：`../plan.md`
- 调查与设计：`research.md`、`rfc.md`
- 实现与公开契约：`rust-backend/src/webauthn.rs`、`rust-backend/src/http.rs`、`sql/schema.sql`、`openapi.yaml`、`src/generated/api/types.gen.ts`
- 验证架构：`tests/helpers/webauthn.ts`、`rust-e2e/rust-server.test.ts`、浏览器 SDK 测试
- 锁定依赖：本机 `webauthn-rs{,-core,-proto} 0.5.5` 源码

> 审查历史：下方 RRF-01/02/03 与首轮结论保留为历史记录；其中 RFC 行号指向 2026-07-11 修订前草案。当前有效判定见文末 re-review。

## 首轮 Blocking findings（历史）

### High — RRF-01：传递整个 library extensions map 会扩大实际浏览器协议行为，但范围与验证仍只覆盖 `credProps`

**证据**

- 推荐方案明确传递整个 map，并允许其他 library-owned key 随之出现（`rfc.md` §6.1，101-107；§7.2，213-217；§9.1，343-346）。
- 0.5.5 的 map 并非只有 `credProps`：`start_passkey_registration` 同时设置 `credProtect(UserVerificationRequired, enforce=false)`、`uvm=true`、`credProps=true`（`~/.cargo/registry/src/.../webauthn-rs-0.5.5/src/lib.rs:541-555`）。`credProtect` 还会通过 flatten 序列化为实际浏览器 extension inputs（`webauthn-rs-proto-0.5.5/src/extensions.rs:54-82`）。
- 这会把当前未发送的 credential-protection/UV-method 行为一并启用，和 RFC 的“不修改 UV 策略”边界存在冲突（`rfc.md` §3，56），也超出任务契约只要求 `extensions.credProps=true` 的稳定目标（`plan.md:13-18`）。
- 自动化矩阵只稳定断言 `credProps=true`，OpenAPI 又用 `additionalProperties: true` 主动放过其他 key；因此新增、删除或改变其他 extension 不会形成可靠 drift signal（`rfc.md` §10.1，378-395）。§17 甚至把确认实际成员留到实现后（574-576），但当前锁定源码已经能确定这些成员。
- `uvm` 若未来被客户端支持，还可能让浏览器产生本任务不使用的额外 client output；RFC 的“只处理 discoverability、最小化 extension 数据”边界没有覆盖这一行为。

**为什么阻塞**

按当前验收，实现在悄然启用 `credProtect`/`uvm` 或未来依赖增加新 extension 时仍可全部通过。对于 High Risk 认证 wire contract，这使推荐方案的真实行为范围不可由设计中的测试和 OpenAPI 验证，也构成隐藏 scope 扩张。

**必须修正**

RFC 必须二选一并明确验证：

1. **推荐**：outbound extension allowlist 只发送稳定的 `credProps=true`，明确接受 0.5.5 state 对其他 extension 仍记录“requested”但 finish 仅将缺失结果视为 ignored 的已审计差异；测试断言 outbound extension key 集合；或
2. 明确把 `credProtect`/`uvm` 纳入任务 scope，逐项说明浏览器、隐私、finish-state 与升级语义，并锁定精确 map 及兼容性测试，不能仅依赖 `additionalProperties: true`。

### High — RRF-02：RFC 的“不持久化 client extension report”不符合方案 A 的实际 0.5.5 数据路径

**证据**

- RFC 要求把包含 `clientExtensionResults.credProps.rk` 的 credential 原样交给 `finish_passkey_registration`，然后序列化返回的 `Passkey`（`rfc.md` §7.3，255-265）。当前应用也确实把 `Passkey` 序列化到 `passkey_json`（`rust-backend/src/webauthn.rs:355-373`）。
- core 在创建 credential 时接收 `reg.extensions`（`webauthn-rs-core-0.5.5/src/core.rs:635-647`），并把 `credProps` 保存为 `ExtnState::Unsigned`（`webauthn-rs-core-0.5.5/src/internals.rs:168-182`）。
- `Passkey` 派生 `Serialize` 并包含 core `Credential`（`webauthn-rs-0.5.5/src/interface.rs:55-59`）；该 `Credential` 的序列化字段包含 `RegisteredExtensions`（`webauthn-rs-core-0.5.5/src/interface.rs:246-290`）。因此 normalized `rk` report 会进入新行的 `passkey_json`。
- RFC 一方面正确说不得把该值持久化为“可信属性”（§3，55），另一方面又无条件声称“不持久化 client extension report”（§14.3，526-529）。后者在推荐流程下为假。这里不会保存任意原始 JSON，但会保存 library 归一化后的 unsigned extension metadata。

**为什么阻塞**

这是数据保留与安全语义的不变量冲突。实现者目前无法同时遵循“credential 原样交给 finish 并序列化 Passkey”和“不持久化 report”；评审也无法据此判断应接受 library metadata，还是在 finish 前构造净化副本。两种选择会产生不同的 persisted `Passkey` 与 extension state。

**必须修正**

RFC 需明确选择。按现有任务契约，最小方案是承认 `passkey_json` 会保存 **library 标记为 `Unsigned` 的归一化 credProps metadata**，同时继续禁止将其作为可信列、授权依据或密码学证明，并把“不会保存原始完整 extension payload”与“会保存 library credential metadata”区分开。若产品要求完全不持久化，则必须另行设计并审查传给 finish 的净化 credential，不能留给实现阶段临场决定。

### Medium — RRF-03：duplicate credential 的 runtime、RFC 与 OpenAPI 错误契约互相冲突

**证据**

- `credential_id` 是全局主键（`sql/schema.sql:64-71`）。duplicate 会在 verify transaction 的 `INSERT` 失败，当前代码把所有此类失败映射为 `InvalidWebauthnRegistration`，HTTP 层固定返回 `400 invalid_webauthn_registration`（`rust-backend/src/webauthn.rs:374-404`；`rust-backend/src/http.rs:725-745`）。
- RFC 也选择保持 generic registration error 和 transaction rollback（`rfc.md` §7.4，272-279；§8.1，318-322；§9.1，335-354）。
- 但当前 OpenAPI 仍声明 duplicate 为 `409 duplicate_credential`（`openapi.yaml:620-627`），生成类型也暴露 409（`src/generated/api/types.gen.ts:952-968`）。实际 Rust 路径没有该分支。
- RFC 同时要求“status/error body 不变”和“OpenAPI 准确”，却把该直接相关差异归入未处理的既有差异；自动化矩阵也只笼统写 insert failure，没有锁定 duplicate 的外部状态和旧行内容。

**为什么阻塞**

实现若保留 runtime 400 就无法满足公开契约准确性；若实现 409 又会违反冻结的错误契约并扩大生产改动。duplicate 正是本 RFC 声称覆盖的原子性分支，不能视为无关旧问题。

**必须修正**

推荐保持现有 runtime 语义：在本次 OpenAPI/生成类型更新中删除虚假的 409，并增加“密码学有效但 credential ID 已存在”的测试，断言 generic 400、challenge CAS 回滚、已有 row 全字段不变。若改为 409，则必须显式修改任务契约、错误模型和兼容性分析。

## 首轮 Non-blocking implementation notes（历史）

1. **方案 A 在精确 0.5.5 下可成立。** 浏览器只看到 outbound required/true；server-only state 的 false 不会影响创建。0.5.5 finish 明确忽略 resident flag（`webauthn-rs-core-0.5.5/src/core.rs:388-410`），且完整 challenge/origin/RP/UP/UV/算法/attestation 验证仍执行。应在 CI/release 使用 tracked lockfile（优先 `--locked`），并让有效 ceremony e2e 成为 drift gate。
2. **strict gate 的安全表述与顺序基本正确。** `rk` 只能作为可伪造的 client policy report；challenge owner/precheck 后、finish 前 fail-fast，不消费 challenge且统一映射 generic ceremony error，不会降低密码学验证。实现命名和文档不得使用“verified resident”一类措辞。
3. **优先 typed mutation。** 0.5.5 的 `options.public_key.authenticator_selection` 与 `extensions` 字段可直接访问（`webauthn-rs-proto-0.5.5/src/options.rs:299-325`、`extensions.rs:54-82`）。应先在 typed options 上做受限修改，再序列化/投影；若 `ResidentKeyRequirement` 未由高层 prelude 导出，只把受检查的 enum 转换封装在一个小边界内，不要为此直接接管 `webauthn-rs-core`。RFC 当前的 fail-closed JSON shape 检查可实现，但不是首选。
4. **自动化矩阵总体可执行。** TypeScript helper 只改变 unsigned `clientExtensionResults` 即可保持 attestation 完全有效；现有 e2e 持有 `dbPath`，可以比较旧 row 的 `passkey_json`、`last_used_at`、`created_at`。duplicate 是验证 insert rollback 的确定性故障注入方式。
5. **自动化登录不能证明浏览器 discoverability。** 当前 helper 直接选择测试 key，只能证明“无 `allowCredentials` 的 server ceremony 可验证该 key”。应把该用例如此命名；Firefox/Bitwarden chooser 与 `rk=true` 只能由 §10.3 的实机证据证明。
6. **OpenAPI 收紧与 runtime 分类可并存，但属于明确 breaking contract。** required/const 描述“可接受请求”，Rust 保留 optional `Value` 以把 false/missing 归类为 generic ceremony error是自洽的。发布说明应提示生成 API 类型的 source break，并协调 npm/第三方 SDK 更新；不得把 schema validation error误写成实际 runtime 响应。
7. **回滚与 in-flight 语义足够完整。** 旧 registration challenge 在升级后可能失败，新 challenge 在回滚后仍可由旧 0.5.5 finish 处理；新增 credential 格式兼容且不得清理。发布前仍需给实机门禁指定环境/责任人/证据文件，并为 generic 400 与 authentication success rate 定义可用观察窗口和阈值；这些是 release gate，不要求在核心实现中新增 telemetry。

## 首轮结论（历史，已由 re-review 取代）

FAIL

---

## Re-review（2026-07-11）

### 复审输入与方法

- 重新读取修订后的 `research.md` 与 `rfc.md`，并回读未变更的 `plan.md`。
- 重新核对应用的 options/verify/transaction 路径、SQLite schema、当前 OpenAPI/生成类型。
- 重新核对本机锁定源码：`webauthn-rs{,-core,-proto} 0.5.5`，以及 transaction rollback 所依赖的 `rusqlite 0.32.1`。
- 当前生产代码和 OpenAPI 尚未实施 RFC；下述 “CLOSED” 表示设计阻塞已被 RFC 形成明确、可实现、可验证的决策，不表示实现已经完成。

### Blocker 状态

#### RRF-01 — CLOSED：outbound extension 已收敛为 closed allowlist，typed-first 路径可实现且不需要直接依赖 core/proto

**修订关闭证据**

- RFC 把 outbound contract 冻结为 exact `{ "credProps": true }`，禁止透传 credProtect/uvm/future member（`rfc.md:13-14,50-55,84-98,224-289`）；OpenAPI 设计同步要求 `additionalProperties: false`（`rfc.md:398-405`）。
- 实现顺序先对 typed options 设置 `require_resident_key=true` 和 `extensions=None`，再仅为无法从高层 prelude 命名的 resident enum/exact object 进入一个集中、fail-closed JSON helper；返回前重验 extension exact key set（`rfc.md:114-130,229-244,657-674`）。RFC 明确禁止新增 `webauthn-rs-core`/`webauthn-rs-proto` 直接依赖（`rfc.md:69-71,195,359,672`）。
- 测试矩阵锁定 exact object、第二个 key 不得出现、projection 前 extensions 已清空、异常 shape fail closed，并让 SDK 断言浏览器实际收到同一 exact object（`rfc.md:440-462`）。

**actual dependency/code 核对**

- `CreationChallengeResponse.public_key`、`authenticator_selection` 和 `extensions` 均为 public fields；`extensions` 带 `skip_serializing_if = Option::is_none`（`webauthn-rs-proto-0.5.5/src/attest.rs:13-64`），selection 的 `require_resident_key` 也是 public bool（`src/options.rs:299-325`）。因此调用方可在不命名 nested proto type 的情况下执行 `as_mut()`、bool 赋值与 `extensions=None`。
- 高层 prelude 确实没有重导出 `ResidentKeyRequirement`/`RequestRegistrationExtensions`（`webauthn-rs-0.5.5/src/lib.rs:206-229`），所以仅在一个 JSON 边界写入 `residentKey="required"` 与 exact extension object 是有界而非绕过设计。
- 生成时 options 使用 extension clone，state 保存独立 extension value（`webauthn-rs-core-0.5.5/src/core.rs:276-360`）；事后清空 typed outbound options 不会改写 `PasskeyRegistration`。
- state 中 credProtect requested 而 authenticator output 缺失时，0.5.5 只记录 `ExtnState::Ignored`；credProps 缺失同理；uvm 不存在于 client-output/registered-extension 模型（`webauthn-rs-core-0.5.5/src/internals.rs:123-182`；`webauthn-rs-proto-0.5.5/src/extensions.rs:295-320,365-402`）。这些 bookkeeping 分支不返回错误。
- finish 仍执行 challenge、origin、RP ID hash、UP/UV、算法与 attestation 验证；resident flag 仅在 state 解构时被忽略（`webauthn-rs-core-0.5.5/src/core.rs:377-410,468-548,587-748`）。因此省略非目标 extension 没有降低现有 finish 验证。

该 finding 已从“无边界透传且不可验证”变为“精确 allowlist + 版本限定 state 差异 + 自动化 drift gate”，不再阻塞实现。

#### RRF-02 — CLOSED：normalized `Unsigned(CredProps)` 的持久化与禁止用途已经明确区分

**修订关闭证据**

- RFC 现在明确接受 normalized `ExtnState::Unsigned(CredProps)` 随 `Passkey` 进入 `passkey_json`，同时只禁止独立保存原始完整 extension JSON、新增可信列以及授权/认证强度/迁移用途（`rfc.md:15-16,61-70,84-92,291-311,376-381,592-598`）。
- 文档、测试和升级门禁都要求反映该事实，而非继续声称完全不持久化（`rfc.md:340-359,424-434,452-462`）。

**actual dependency/code 核对**

- 0.5.5 对 client `credProps` 的处理确实是无条件 `ExtnState::Unsigned`，随后写入 `Credential.extensions`（`webauthn-rs-core-0.5.5/src/internals.rs:168-208`）。
- `Passkey` 与 core `Credential` 均可序列化，后者包含 `RegisteredExtensions`（`webauthn-rs-0.5.5/src/interface.rs:55-59`；`webauthn-rs-core-0.5.5/src/interface.rs:246-296`）；应用随后 `serde_json::to_string(&passkey)` 并写入 `passkey_json`（`rust-backend/src/webauthn.rs:364-400`）。
- 应用当前没有读取 `cred_props` 作为独立 policy；认证路径只反序列化整个 `Passkey` 交给 library，并在成功认证后重序列化 credential state（`rust-backend/src/webauthn.rs:409-475`）。

RFC 现已选择接受 library-normalized metadata，并给出准确的安全与隐私边界；不存在“原样 finish”与“完全不持久化”之间的实现歧义。

#### RRF-03 — CLOSED：duplicate 的 runtime/OpenAPI 决策、rollback 机制与保留测试已闭合

**修订关闭证据**

- RFC 明确冻结 duplicate 为 `400 invalid_webauthn_registration`，禁止新增 409，并要求从 OpenAPI 与生成 error union 删除虚假 409（`rfc.md:19,50-59,75-83,392-420`）。
- duplicate case 必须使用密码学有效 response，在 library finish 后由主键冲突触发；断言 challenge 未消费，并逐字段比较旧行的 `credential_id`、`user_id`、`passkey_json`、`rp_id`、`last_used_at`、`created_at`（`rfc.md:313-325,365-374,452-470`）。

**actual dependency/code 核对**

- `credential_id` 是全局主键且 credential row 正好包含上述六个持久化字段（`sql/schema.sql:64-71`）。
- 当前 runtime 在 finish/序列化后开启 transaction，先 CAS challenge，再 INSERT；INSERT 错误统一映射为 registration error，HTTP 层只返回 generic 400（`rust-backend/src/webauthn.rs:344-404`；`rust-backend/src/http.rs:725-745`）。
- 锁定的 `rusqlite 0.32.1` transaction 默认 `DropBehavior::Rollback`，错误提前返回会执行 rollback（`rusqlite-0.32.1/src/transaction.rs:116-128,184-246`），所以主键失败会撤销先前 CAS。
- 当前 `openapi.yaml:620-627` 与生成类型中的 409 仍是待实现删除的已知 baseline；RFC 已把删除及 contract test 纳入同一里程碑，不再留下二义选择。

该 finding 已具备唯一 runtime 决策、确定性故障注入和完整数据/challenge 断言，不再阻塞实现。

### 新增阻塞项扫描

- strict `rk===true` 仍被准确表述为可伪造的 client policy report，且不能替代完整 finish；challenge precheck、错误分类和失败不消费语义明确。
- 自动化只证明无 `allowCredentials` 的服务端 ceremony；真实 chooser discovery 被明确保留为 Firefox/Bitwarden 独立发布门禁（`rfc.md:18,327-338,473-484`）。
- in-flight challenge、二进制回滚、旧 credential 保留与依赖升级重审均有可执行边界；未知的生产基线被保留为 release gate，而不是伪称已有 telemetry。
- 未发现新的 High/Medium 实现前阻塞项。

### 剩余非阻塞 implementation notes

1. Options helper 应保持单一职责：typed clear/boolean mutation 在前，JSON helper 只写 resident enum 与 exact credProps object；review-change 应确认 `Cargo.toml` 未新增 core/proto 直接依赖。
2. Dependency sentinel 若读取 serialized state 私有布局，应集中在一个 lock-version drift test；有效 ceremony e2e 才是“state requested/outbound omitted 仍可 finish”的主要行为证据。
3. Normalized persistence 测试应按 JSON 结构断言 `Unsigned`，并用唯一 sentinel 证明未知原始 client extension 没有被应用独立复制；不要对整段 `passkey_json` 做脆弱字符串快照。
4. Duplicate 测试必须读取同一 challenge 的 `consumed_at` 与冲突前后六字段 snapshot；不能仅以 credential count 未变替代 rollback 证明。
5. 实机验证报告需记录 Firefox、Bitwarden、OS、RP/origin、chooser 主动列出结果和证据位置；自动化成功不得解除该发布门禁。
6. 实现/CI 应尽可能使用 `cargo ... --locked`，并在发布说明中同时标注 strict credProps 与移除生成类型 409 分支的 source-level breaking change。

## 最终结论

PASS
