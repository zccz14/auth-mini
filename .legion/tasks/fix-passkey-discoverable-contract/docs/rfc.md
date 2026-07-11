# RFC：修复 Passkey Discoverable Credential 契约

> **Profile**：RFC Heavy / High Risk  
> **Status**：Approved — `review-rfc` PASS
> **Created / Updated**：2026-07-11  
> **Design source of truth**：本文；任务边界以 `../plan.md` 为准

---

## Executive Summary

- **问题**：注册 options 实际是 `residentKey=discouraged`、`requireResidentKey=false` 且不发送 `extensions`；登录却始终走无用户名 discoverable flow。
- **决策**：保留 `webauthn-rs 0.5.5` 高层 `start_passkey_registration`/`finish_passkey_registration`；typed-first 修正 resident fields，并通过 fail-closed JSON projection 让 outbound `extensions` **精确等于** `{ "credProps": true }`；持久化前严格要求 `clientExtensionResults.credProps.rk === true`。
- **重要限定**：0.5.5 server state 中的 `require_resident_key` 仍为 false，且仍记录 library 默认的 credProtect/uvm/credProps requested；finish 忽略 resident flag，并容忍未发送的其他 extension。该锁定版本差异必须由 exact outbound key-set test、有效 ceremony e2e 与升级审计约束。
- **安全语义**：`credProps.rk` 是未签名、可被客户端修改的协议报告，不是实际 resident 状态的密码学证明；WebAuthn challenge/origin/RP/attestation 验证仍必须独立成功。
- **数据语义**：finish 会把 rk 报告归一化为 library `ExtnState::Unsigned(CredProps)` 并随 `Passkey` 存入 `passkey_json`；不保存原始完整 extension payload，也不新增可信列或授权用途。失败注册不消费 challenge、不写 credential；成功只追加一条 credential。
- **登录语义**：继续使用同一配置来源 RP ID 的 username-less discoverable authentication，继续省略 `allowCredentials`。
- **证据边界**：自动化只能证明无 `allowCredentials` 的服务端 ceremony 可验证被测试代码显式选择的 key；Firefox/Bitwarden 是否实际发现 credential 必须由实机 chooser 证据证明。
- **公开影响**：registration options 和 verify request wire contract 收紧；不返回 credProps 的旧客户端将被有意拒绝。Duplicate runtime 继续返回 400 generic error，OpenAPI/生成类型删除虚假的 409。Challenge 生命周期不变。
- **发布/回滚**：无 schema migration、无 feature flag；测试与 Firefox/Bitwarden 手工门禁通过后整体发布，异常时回滚二进制，数据库无需回滚。

### 本轮审查修订

| Finding             | 修订决策                                                                                                                                                                                                               |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RRF-01              | Outbound extensions 改为 closed allowlist，exact JSON 只能是 `{ "credProps": true }`；typed 清空 library extensions，projection 与测试拒绝任何第二个 key；补足 server state 对 omitted credProtect/uvm 的 0.5.5 语义。 |
| RRF-02              | 明确接受 library-normalized `ExtnState::Unsigned(CredProps)` 随 `Passkey` 进入 `passkey_json`；只禁止原始完整 payload、独立可信列和安全/授权用途。                                                                     |
| RRF-03              | 保持 runtime duplicate generic 400 与 transaction rollback；OpenAPI/生成类型删除虚假 409；增加密码学有效 duplicate 与旧行六字段不变测试。                                                                              |
| Implementation note | 改为 typed-first mutation，只保留一个 fail-closed JSON projection；自动化 server ceremony 与实机 discoverability 证据明确分层。                                                                                        |

---

## 1. 背景与动机

auth-mini 的 passkey 登录不先询问用户名，而是调用 `start_discoverable_authentication` 并省略 `allowCredentials`。该流程只能依赖浏览器/密码管理器主动发现 RP 下的 discoverable credential。

当前注册端虽然调用 `start_passkey_registration`，但锁定的 `webauthn-rs 0.5.5` 将该高层 Passkey 定义为“任意 authenticator”，默认 `.require_resident_key(false)`。core 因而生成 discouraged/false。应用随后手工投影 options 时又丢掉库已生成的 `extensions`，所以浏览器既没有必须创建 resident credential 的强约束，也没有收到 `credProps` 请求。现有文档却提前声称 registration 是 required，形成实现、测试和公开契约不一致。

本任务不是把 resident key 提升为新的密码学认证属性，而是让“新注册可用于现有无用户名登录”成为明确、可测试、失败时不落库的协议契约。

证据详见 [`research.md`](./research.md)，尤其是：

- 应用 options/verify 路径：`rust-backend/src/webauthn.rs:185-406`
- 0.5.5 默认值：Cargo registry `webauthn-rs-0.5.5/src/lib.rs:534-576`
- 0.5.5 finish 忽略 state resident flag：`webauthn-rs-core-0.5.5/src/core.rs:377-410`
- credProps 未签名且可选：`webauthn-rs-proto-0.5.5/src/extensions.rs:284-320`

## 2. 目标

1. Registration options 实际发送：
   - 配置并规范化后的同一 RP ID；
   - `authenticatorSelection.residentKey = "required"`；
   - `authenticatorSelection.requireResidentKey = true`；
   - `extensions` 的 key 集合精确为 `{credProps}`，值为 true；不得透传 library 的 credProtect/uvm 或未来成员。
2. Registration verify 只有在完整 WebAuthn 验证成功且客户端值严格等于布尔值 `true` 时才追加 credential；false、缺失、null、字符串或错误结构全部拒绝。
3. Authentication 继续是无用户名 discoverable flow 并省略 `allowCredentials`；自动化证明被显式选择的新 key 可完成该服务端 ceremony，实机证明 Firefox/Bitwarden chooser 确实发现它。
4. 保持当前 HTTP auth/error、challenge 失效/消费、RP/origin snapshot 与 transaction 语义。
5. 以 Rust unit/HTTP、真实密码学 e2e、OpenAPI contract、生成校验和手工 Firefox/Bitwarden 证据锁定行为。
6. 不触碰既有 credential 数据；失败和成功注册都不能隐式管理旧 credential。Duplicate credential 继续按当前 runtime 返回 generic 400 并完整回滚。

## 3. Non-goals

- 不增加用户名优先登录、credential chooser API 或 `allowCredentials` 回退。
- 不探测、标记、迁移、替换、删除或重写既有非 discoverable credential。
- 不新增 `discoverable`/`rk` 数据库列，不保存原始完整 client extension JSON，也不把 library 归一化的 unsigned metadata 用作授权、认证强度或密码学证明。
- 不修改 RP ID 配置模型、origin 规则、user handle 派生、算法策略、UV 策略或 challenge TTL。
- 不为 Firefox、Bitwarden 或单一平台增加 user-agent 分支。
- 不用 `credProps.rk` 声称或证明 authenticator 的内部 resident 状态。
- 不在本任务升级 `webauthn-rs`、引入 attestation device catalog、改造日志/指标基础设施。
- 不新增 `webauthn-rs-core`/`webauthn-rs-proto` 直接依赖；不可命名的 nested type 只能在一个受限 JSON projection 边界处理。
- 不修复与本契约无关的既有 API/文档差异；duplicate 409 与本任务 transaction/error 验证直接相关，明确纳入修正。

## 4. 硬约束

### 4.1 协议与兼容性

- `rk === true` 是冻结的严格条件；不能把缺失当作“未知但接受”。
- RP ID 必须继续来自 `app_meta`，注册与登录不能接受请求方覆盖。
- Registration verify 仍要求 human-authenticated session（`email_otp` 或 `webauthn` AMR）。
- Authentication options/verify 仍为公开的 username-less ceremony。
- HTTP 失败继续使用现有 `400 invalid_request` 或 `400 invalid_webauthn_registration` 分类，不新增 discoverability 专用外部错误。
- Duplicate credential 继续使用 `400 invalid_webauthn_registration`；不得实现 409，OpenAPI 必须删除当前虚假 409。

### 4.2 安全与数据

- `finish_passkey_registration` 的 challenge、origin、RP ID hash、UP/UV、算法和 attestation 验证不可跳过或降级。
- 只有完整验证与严格信号都通过后，才能进入 credential 写 transaction。
- 旧 credential 行不得成为 registration transaction 的 update/delete 目标。
- 日志不得记录原始 credential、clientDataJSON、attestationObject 或完整 extension payload。
- Outbound `publicKey.extensions` 必须是 closed allowlist，exact key set 为 `["credProps"]`；任何 library/default/future extension 都不得泄漏到浏览器。
- 允许 `finish_passkey_registration` 将已解析的 credProps 归一化为 `Unsigned` library credential metadata 并写入 `passkey_json`；该 metadata 不得被查询为可信 policy。

### 4.3 依赖与运维

- 当前设计只对 lockfile 中 `webauthn-rs{,-core,-proto} 0.5.5` 成立。
- 实现仅依赖现有 `webauthn-rs` 高层 crate；CI/release 的 Rust 构建与测试优先使用 tracked lockfile/`--locked`。
- 不新增运行配置或 feature flag；失败回退手段是回滚应用二进制。
- 无数据库 schema/data migration。

## 5. 定义

- **Discoverable credential / resident key**：客户端可在 RP 未提供 credential ID 列表时发现并选择的 credential；这里是无用户名 UX 前提，不是额外密码学强度声明。
- **`residentKey=required`**：现代 WebAuthn authenticator selection 要求。
- **`requireResidentKey=true`**：兼容旧客户端的布尔字段；必须与 `residentKey=required` 同时发送。
- **credProps**：Authenticator Credential Properties client extension。`rk` 是 user agent 输出，未被 authenticator 签名。
- **Library state**：`start_passkey_registration` 返回并由服务端持久化的 `PasskeyRegistration`；它与 challenge 配对，不能由客户端持有或替换。
- **Outbound extension allowlist**：浏览器实际收到的 extension inputs；本 RFC 只允许 `credProps=true`，与 server-only library state 中记录的完整 requested map 有意不同。
- **Normalized extension metadata**：library finish 从已解析 credential 构造的 `RegisteredExtensions`。本设计接受 `cred_props=ExtnState::Unsigned(CredProps { rk: Some(true) })` 随 `Passkey` 序列化，不等同于保存原始 request JSON。

---

## 6. 候选方案与取舍

### 6.1 方案 A：保留高层 Passkey API，修正 wire options，并由应用严格检查 credProps（推荐）

**做法**

1. 继续调用 `start_passkey_registration` 并保存原 `PasskeyRegistration`。
2. 优先在库返回的 typed options 上修改可访问字段：把 `require_resident_key` 设为 true，并把 typed `extensions` 设为 `None`，先消除 library map 的任何 outbound 泄漏可能。
3. 只对高层 prelude 无法命名的 resident enum 和 exact extension object 使用一个小型、fail-closed JSON projection：把 `residentKey` 设为 required，并加入精确 `{ "extensions": { "credProps": true } }`；projection 返回前重新检查路径、类型和值与 extension exact key set。
4. Verify 在调用 `finish_passkey_registration` 前，从应用请求模型严格检查 `clientExtensionResults.credProps.rk`；只有布尔 true 继续。
5. 继续使用高层 finish 生成现有 `Passkey`，接受其保存 normalized unsigned credProps metadata，并沿用当前 transaction 追加保存。

**关键事实与有意接受的不一致**

- 0.5.5 的 library state 仍保存 `require_resident_key=false`。
- 0.5.5 的 state 还保留高层入口生成的 credProtect/uvm/credProps requested；outbound allowlist 则只发 credProps。
- 0.5.5 的 finish 解构 state 时忽略 resident 字段；客户端未返回 state 中其他 extension 时也不失败：credProtect 缺失归一化为 `Ignored`，uvm 不进入 0.5.5 `RegisteredExtensions`/拒绝逻辑。因此 wire/state 差异不妨碍完整 WebAuthn 验证。
- 应用的 strict credProps gate 补上当前高层 API 没有执行的产品契约，但它不比该未签名信号本身更可信。
- 对 rk=true，finish 将该报告归一化为 `ExtnState::Unsigned(CredProps)`，并随 `Passkey` 序列化进 `passkey_json`；这是明确接受的数据语义。

**优点**

- 最小改动面；保留已使用和已测试的安全高层 wrapper、`Passkey` 存储格式与 discoverable auth 路径。
- 无新依赖、feature、attestation policy 或数据库迁移。
- Exact outbound allowlist 与 typed-first mutation 防止 0.5.5 的 credProtect/uvm 及未来 library extension 静默扩大浏览器协议行为。
- 回滚仅需回滚二进制；新旧 credential 存储格式一致。
- 容易用现有 TypeScript authenticator 构造有效 success/failure ceremony。

**缺点**

- wire/state 语义不一致，需要明确注释、锁版本证据和 dependency drift test。
- 一小段 JSON projection 仍依赖预期 wire shape，必须集中、fail closed，不能散落 JSON patch。
- 未来依赖升级可能改变 private state、options shape 或 finish 行为，不能无审计升级。
- 未签名 true 可伪造；只能提高 conforming client 的契约确定性。

### 6.2 方案 B：直接使用 `webauthn-rs-core`

**做法**

使用 `WebauthnCore::new_unsafe_experts_only`、`ChallengeRegisterBuilder.require_resident_key(true)` 生成 options 与 `RegistrationState`，再直接调用 core `register_credential`。

**优点**

- 生成的 options 和 state 都能原生记录 `require_resident_key=true`，没有方案 A 的 state mismatch。
- builder 可精确设置 extensions 与其他 WebAuthn 参数。

**缺点 / 风险**

- 上游明确标为 UNSAFE，并声明 minor release 可无通知破坏 API；调用方需自行维持大量未文档化 invariant。
- 需新增 `webauthn-rs-core` 的直接依赖所有权，即使它当前已是 transitive lock entry。
- 必须复制高层 wrapper 当前选择的算法、UV required、attestation none、credProtect、同步 authenticator 与其他策略；任何遗漏都可能改变认证安全边界。
- core finish 返回 `Credential`。转换回现有 opaque `Passkey` 需要启用 `danger-credential-internals`，或改造数据库与 authentication path；两者都显著扩大 scope 和升级风险。
- core 0.5.5 最终仍不能从签名数据证明 resident 状态，严格 credProps gate 仍然需要。

**结论**：不采用。为了消除一个不参与 0.5.5 finish 的 state 字段不一致，而接管整个安全 wrapper，不成比例。

### 6.3 方案 C：使用 0.5.5 的 resident-key 高层专用 API

#### C1. `start_attested_resident_key_registration`

- 需启用 `resident-key-support`。
- 必须提供非空 attestation CA list，使用 Direct attestation、限制 attestation formats、拒绝同步 authenticator。
- 上游定位为严格控制硬件型号的企业环境；会排除本任务要支持的同步密码管理器 passkey。
- finish 源码仍承认无法知道实际 rk，因此不会让 credProps 从未签名信号变成证明。

#### C2. Google Password Manager 专用 API

- 能设置 resident required，但要求 platform attachment。
- 只允许在 Android + GMS Core 且服务端/客户端预先识别该场景时调用；上游明确禁止对其他浏览器使用。
- 不适用于 Firefox/Bitwarden 的通用注册 endpoint。

**结论**：两者均不采用。它们不是通用 Passkey API 的 drop-in replacement，会引入 attestation/platform 限制和新维护分支。

### 6.4 方案 D：修改序列化的高层 state 或 fork 依赖

可以在持久化前修改 opaque state JSON 的 `require_resident_key`，或 fork 0.5.5 暴露 generic high-level builder。前者依赖 private 序列化布局且在当前 finish 中没有验证收益；后者引入长期补丁与升级维护。两者都比方案 A 更脆弱，当前不采用。若未来官方高层 API 可同时生成 generic Passkey、required resident 与兼容现有 `Passkey` 类型，再单独评估替换。

### 6.5 决策矩阵

| 维度                       | A 高层 API + wire/gate           | B core                          | C 专用高层 API                          | D state/fork  |
| -------------------------- | -------------------------------- | ------------------------------- | --------------------------------------- | ------------- |
| 满足通用 Firefox/Bitwarden | 是（待实机门禁）                 | 可实现                          | 否/严重受限                             | 可实现        |
| 保留安全高层 wrapper       | 是                               | 否                              | 是                                      | 部分          |
| 新依赖/feature             | 无；禁止新增 core/proto 直接依赖 | 直接 core + 可能 danger feature | resident/attestation feature 与 CA 数据 | fork/内部布局 |
| 数据格式兼容               | 是                               | 需额外转换                      | 可转 Passkey但 policy 改变              | 是            |
| 实现/维护成本              | 低                               | 高                              | 高                                      | 中到高        |
| 仍需处理未签名 credProps   | 是                               | 是                              | 是                                      | 是            |
| 升级风险                   | 中（显式门禁）                   | 高                              | 高                                      | 高            |

**最终选择：方案 A。** 放弃 state 与 outbound 完全同形的形式一致性，换取继续使用现有安全高层 API、存储格式和最小可回滚改动；浏览器协议面由 exact allowlist 封闭，而非跟随 library map 漂移。

---

## 7. Proposed Design

### 7.1 模块边界

- `rust-backend/src/webauthn.rs`
  - 生成并规范化 registration options；
  - 检查 strict credProps；
  - 保持 registration/authentication state 与数据库 transaction。
- `rust-backend/src/http.rs`
  - 不新增 route/error；仅补 HTTP contract tests。
- `tests/helpers/webauthn.ts` / `rust-e2e/rust-server.test.ts`
  - 构造带 true/false/missing/duplicate 的密码学有效 registration ceremony，验证服务端 authentication ceremony 与数据保留；不把 helper 行为称为浏览器发现证据。
- `openapi.yaml` / `src/generated/api/**`
  - 收紧 wire schema 并重新生成。
- `docs/integration/webauthn.md` / `docs/reference/http-api.md`
  - 说明实际流程、严格拒绝和未签名限制。

不新增数据库表/列、服务配置或新的公共 endpoint。

### 7.2 Registration options 详细流程

1. HTTP 层保持现有 access token 与 passkey-management AMR 校验。
2. 解析空对象请求；额外字段仍为 `invalid_request`。
3. 从 `app_meta` 读取 issuer/RP ID/RP name，执行现有 origin/RP 规范化与父域校验。
4. 用该 RP 配置构建 `Webauthn`，调用 `start_passkey_registration`，得到 mutable typed options 与独立 state。
5. **Typed-first mutation**：
   - 从 `options.public_key.authenticator_selection.as_mut()` 取得已存在的 typed selection；缺失则 fail closed；
   - 直接设置其公开 `require_resident_key = true`；
   - 直接设置公开 `options.public_key.extensions = None`，先移除 library 生成的 credProtect/uvm/credProps map，确保它不可能被整体序列化到浏览器；
   - 不修改独立的 library state。
6. **单一 JSON projection 边界**：只因 `ResidentKeyRequirement` 与 extension request 类型未由高层 prelude 命名，序列化 typed `publicKey` 后进入一个小 helper；不得在其他位置散落 JSON mutation，也不得为命名类型新增 core/proto 直接依赖。该 helper 必须：
   - 要求根、`rp`、`authenticatorSelection` 都是 object，且 `rp.id` 精确等于规范化后的 configured RP ID；
   - 要求 typed mutation 已产生 `/authenticatorSelection/requireResidentKey === true`；
   - 把 `/authenticatorSelection/residentKey` 设为字符串 `"required"`；
   - 要求 typed 清空后根对象没有 `extensions`，再插入 exact object `{ "credProps": true }`；若 library 仍序列化任何原 extension 则拒绝生成 options；
   - 返回前重新断言 `/extensions` 是 object、key set 排序后精确等于 `["credProps"]`，且值严格为布尔 true；
   - 保持当前 challenge/user/algorithms/timeout；registration `userVerification` 保持库当前的 `"required"`。
7. 序列化并持久化原 library state，保持其内容不改写。
8. 保持现有 challenge 生命周期：先标记该用户此前未使用的 registration challenge 为 consumed，再插入新 challenge snapshot。
9. 返回 options。任何 typed field 缺失、projection 路径/类型不符或 exact key-set 断言失败，都沿用现有 options error，绝不回退为透传 library map。

对外稳定投影如下。`extensions` 是 closed allowlist，实际响应不得含第二个 key：

```json
{
  "request_id": "<uuid>",
  "publicKey": {
    "challenge": "<base64url>",
    "rp": { "id": "example.com", "name": "auth-mini" },
    "user": {
      "id": "<base64url>",
      "name": "user@example.com",
      "displayName": "user@example.com"
    },
    "pubKeyCredParams": [{ "type": "public-key", "alg": -7 }],
    "timeout": 300000,
    "authenticatorSelection": {
      "residentKey": "required",
      "requireResidentKey": true,
      "userVerification": "required"
    },
    "extensions": {
      "credProps": true
    }
  }
}
```

#### 7.2.1 Server state 与 outbound extensions 的有意差异

`start_passkey_registration` 在产生 typed options 的同时已经产生独立 `PasskeyRegistration`。清空/投影 outbound options 不会修改 state，所以精确 0.5.5 state 仍记录：

- `require_resident_key=false`；
- `credProtect(UserVerificationRequired, enforce=false)` requested；
- `uvm=true` requested；
- `credProps=true` requested。

本设计明确接受该 server-only state 与浏览器实际只收到 credProps 的差异，因为已审计的 0.5.5 finish 行为是：

- resident flag 被解构后忽略；
- 未发送、因而未返回的 credProtect 被归一化为 `ExtnState::Ignored`，不会拒绝 ceremony；
- uvm 不存在于 0.5.5 的 `RegistrationExtensionsClientOutputs`/`RegisteredExtensions`，其缺失不参与拒绝逻辑；
- outbound 请求并由客户端返回的 credProps 被归一化为 `ExtnState::Unsigned`。

这里的 `Ignored` 是 library extension bookkeeping，不代表浏览器曾收到 credProtect/uvm。有效 ceremony e2e 必须证明该差异在 0.5.5 下可工作；依赖升级不得外推此结论。

### 7.3 Registration verify 详细流程与顺序

顺序是安全与错误契约的一部分：

1. **HTTP 认证**：沿用 access token 和 AMR 检查；失败仍为 401/403。
2. **语法边界**：沿用 `deny_unknown_fields`、UUID/非空/base fields 检查；失败仍为 `400 invalid_request`。`clientExtensionResults` 在 Rust 解析模型中仍可反序列化为 optional `Value`，避免把 ceremony policy 失败重新分类为语法失败。
3. **challenge precheck**：读取 type=register、未消费、未过期的 challenge，并校验 challenge owner 等于当前 user；失败仍为 `400 invalid_webauthn_registration`。
4. **strict credProps precondition**：只接受 JSON 路径 `clientExtensionResults.credProps.rk` 的值为布尔 `true`。以下全部返回 `InvalidWebauthnRegistration`：
   - `clientExtensionResults` 缺失或不是 object；
   - `credProps` 缺失或不是 object；
   - `rk` 缺失、false、null、数字或字符串。
5. **恢复服务端 state**：反序列化 challenge 内的 `PasskeyRegistration`，使用 challenge snapshot 的 RP ID/origin/RP name 重建 `Webauthn`。
6. **完整 WebAuthn 验证**：转换为库 `RegisterPublicKeyCredential` 并调用 `finish_passkey_registration`。strict credProps 绝不替代此步骤。
7. **准备新记录**：从已验证 `Passkey` 提取 credential ID 并序列化；此时 library 已把浏览器 credProps 报告归一化为 `ExtnState::Unsigned(CredProps)`，该 normalized metadata 会包含在待写入的 `passkey_json` 中，但原始完整 `clientExtensionResults` JSON 不会被独立保存；尚不写数据库。
8. **单 transaction 提交**：
   - compare-and-set `consumed_at`，必须恰好更新一行；
   - `INSERT INTO webauthn_credentials`；
   - commit。
9. 返回 `{ "ok": true }`。

选择在 library finish **之前**检查 credProps，是为了对已知不满足产品契约的客户端 fail fast。把同一未签名字段放到 finish 之后检查不会增加可信度；无论顺序如何，持久化前都必须同时满足 strict signal 与 cryptographic finish。

### 7.4 失败语义与 challenge 生命周期

| 失败点                                  | HTTP 契约                           | Challenge                               | Credential 数据        |
| --------------------------------------- | ----------------------------------- | --------------------------------------- | ---------------------- |
| body/基础字段非法                       | 400 `invalid_request`               | 不变                                    | 不变                   |
| challenge 缺失/过期/已消费/owner 错误   | 400 `invalid_webauthn_registration` | 不变                                    | 不变                   |
| `rk=false`、缺失或错误类型              | 400 `invalid_webauthn_registration` | **保持未消费**                          | 不变                   |
| state/完整 WebAuthn 验证失败            | 400 `invalid_webauthn_registration` | 保持未消费                              | 不变                   |
| 密码学有效但 credential ID duplicate    | 400 `invalid_webauthn_registration` | CAS 与 transaction 整体回滚，保持未消费 | 已有主键行全部字段不变 |
| 其他 transaction CAS/insert/commit 失败 | 现有 registration error             | transaction 回滚                        | 不新增、不更新旧行     |
| 成功                                    | 200 `{ok:true}`                     | consumed                                | 只追加新行             |

不因 strict rejection 改为主动消费 challenge，因为那会改变现有“验证失败可重试直到 TTL/新 options”语义。客户端可修改未签名字段后重试是 credProps 固有局限，不应伪装成服务端可防止的安全属性。

### 7.5 Authentication 流程

不改生产逻辑：

1. options 继续读取同一 `app_meta` 配置并调用 `start_discoverable_authentication`；
2. 返回 `rpId`、challenge、timeout、userVerification，明确不返回 `allowCredentials`；
3. verify 根据浏览器返回的 credential ID 和 challenge RP ID 读取一条 credential；
4. 调用 `finish_discoverable_authentication`，成功后只更新该次实际使用 credential 的现有 counter/backup state/`last_used_at`。

第 4 点是既有正常认证行为，不是本任务对旧 credential 的迁移或注册后改写。Registration success/failure 都不能触发旧行更新或删除。

自动化 helper 在第 3 步直接指定测试 credential ID，因此只能证明“服务端 options 不含 `allowCredentials`，且显式选择该 key 后 assertion 可验证并建立 session”。它不能证明真实浏览器/Bitwarden 在没有 ID 提示时会发现并展示该 credential；后者只由第 10.3 节实机 chooser 门禁证明。

### 7.6 Library state 与升级门禁

方案 A 必须在代码注释与测试中写清：

- outbound options 是 required/true，且 `/extensions` key set 精确为 `["credProps"]`；
- library-generated credProtect/uvm 与未来 extension 绝不 outbound；
- serialized 0.5.5 `PasskeyRegistration` 内部仍是 resident=false，并保留 library 默认 extension requests；
- 0.5.5 finish 当前忽略 resident field，并按 7.2.1 处理缺失 extension outputs；
- normalized unsigned credProps 会进入 `passkey_json`，但不得成为可信 policy；
- strict gate 由 auth-mini 执行。

任何修改 `webauthn-rs` version/features/lockfile 的 PR，必须重新审计以下源码事实并运行完整成功/false/missing e2e：

1. `start_passkey_registration` 的 typed fields、options/extensions/state 默认；
2. typed `extensions=None` 是否仍保证 projection 前无 outbound extension，以及 exact key-set test 是否通过；
3. `finish_passkey_registration`/core 是否开始读取 resident flag 或拒绝 state-requested/outbound-omitted extension；
4. `RegisterPublicKeyCredential` 对 `clientExtensionResults` 的字段映射与 `Unsigned` persistence；
5. `Passkey` 序列化兼容性与无 allowCredentials authentication ceremony。

CI/release 应以 tracked `Cargo.lock` 执行 Rust build/test（优先 `--locked`）。实现不得通过新增 `webauthn-rs-core`/`webauthn-rs-proto` 直接依赖来绕过 projection 边界。

若上游提供适合 generic consumer Passkey 的安全高层 required API，应新开设计变更替换方案 A，而不是在依赖升级中静默切换。

---

## 8. 失败原子性与数据保留

### 8.1 不变量

- `webauthn_credentials` schema 不变。
- Registration path 的唯一 credential DML 是成功 transaction 内的单条 `INSERT`。
- strict rejection、库验证失败、duplicate/DB failure 均不得修改任何旧 credential。
- transaction 中先消费 challenge、后插入 credential；任一步失败均整体回滚。
- Duplicate 测试必须在完整 finish 成功后触发主键冲突，并逐字段比较已有行的 `credential_id`、`user_id`、`passkey_json`、`rp_id`、`last_used_at`、`created_at`；challenge `consumed_at` 也必须因 transaction rollback 保持 NULL。
- 成功注册第二枚 credential 时，第一枚仍存在并出现在 `/me`；删除仍只能经显式 `DELETE /webauthn/credentials/{id}` 且校验 owner/AMR。

### 8.2 新 credential 的 extension metadata

- 服务端不会把原始 `clientExtensionResults` `Value`、未知 extension 成员或完整请求 JSON 独立写入数据库。
- `finish_passkey_registration` 会读取已解析的 `reg.extensions`。对于被接受的 rk=true，它构造的 core `Credential.extensions.cred_props` 是 `ExtnState::Unsigned(CredProps { rk: Some(true) })`。
- `Passkey` 包含该 core credential，现有 `serde_json::to_string(&passkey)` 会把 normalized unsigned metadata 一并写入新行 `passkey_json`。本 RFC 明确接受该行为，不要求在 finish 前净化 credential。
- 该 metadata 只能作为 library credential 的未签名 UX bookkeeping；不得复制到独立可信列、用于授权/认证判定、筛选旧 credential、自动迁移或宣称实际 residence。

### 8.3 既有数据

- 不判断既有 row 是否 discoverable。
- 不 backfill `rk`，因为没有可信证据来源。
- 既有 discoverable credential 继续登录。
- 既有非 discoverable credential 可能仍无法被 username-less chooser 发现，但继续保留供显式管理；本任务不增加回退入口。

---

## 9. API、OpenAPI、生成类型与文档影响

### 9.1 HTTP wire contract

Route、认证及 runtime status/error body 不变；成功 options/request schema 收紧，并删除与 runtime 不符的 OpenAPI duplicate 409：

- `PublicKeyCredentialCreationOptionsJson.authenticatorSelection`
  - `residentKey`：required，`const: required`；
  - `requireResidentKey`：required，boolean，`const: true`；
  - `userVerification`：保留实际值 required，并在 schema/example 中反映。
- `PublicKeyCredentialCreationOptionsJson.extensions`
  - required object；
  - `credProps` required，boolean，`const: true`；
  - `additionalProperties: false`；outbound exact key set 只能是 `credProps`，明确禁止 credProtect/uvm/未来 library member。
- `RegistrationCredentialJson.clientExtensionResults`
  - 在接受的公开契约中 required；
  - `credProps.rk` required 且 `const: true`；
  - extension object 其他成员保持开放；
  - description 明确该值未签名、只用于 registration policy。
- Authentication options 文档明确 `allowCredentials` 有意省略；schema/生产逻辑不新增该字段。
- `/webauthn/register/verify` 删除当前 OpenAPI `409 duplicate_credential` response。Duplicate 的真实且保留的 runtime 契约是 `400 invalid_webauthn_registration`，与其他 ceremony/transaction failure 共用 generic body。

OpenAPI 将“可被服务端接受的请求”描述为 rk=true；运行时仍把缺失/false 识别为 ceremony policy failure 并返回现有 `invalid_webauthn_registration`，而不是新增 schema-specific 错误。

### 9.2 生成 API

修改 `openapi.yaml` 后必须运行 `npm run generate:api`，提交 `src/generated/api/**` 的确定性差异，并通过 `npm run check:generated:api` 与 TypeScript typecheck。预期生成类型会把 required/const 字段收紧为字面量 true/required、把 outbound extensions 变成 closed object，并从 `VerifyWebauthnRegistrationErrors` 删除 409。

这包含两项公开 source-level breaking correction：旧 SDK 构造缺失/false credProps 的请求将不再满足生成类型，依赖生成 error union 中 409 的消费者也需移除该分支。Runtime 从未返回 duplicate 409，因此删除它是文档/类型向现状收敛，不是服务端 error 行为改变；发布说明必须同时指出这两项。

### 9.3 人类文档

`docs/integration/webauthn.md` 与 `docs/reference/http-api.md` 必须：

1. 示例同时展示 `residentKey`、`requireResidentKey`、`extensions.credProps`；
2. registration verify 示例展示 `clientExtensionResults.credProps.rk=true`；
3. 说明 false 或缺失会以现有 generic registration error 拒绝，且不会保存 credential；
4. 明确 credProps 未签名、可被客户端修改，不是密码学证明；
5. 区分“原始完整 extension payload 不独立保存”与“library-normalized `Unsigned(CredProps)` 会进入 `passkey_json`”；
6. 说明 duplicate 继续返回 generic 400，OpenAPI 不再承诺 409；
7. 明确旧 credential 不迁移，非 discoverable 旧 credential 仍可能无法 username-less 登录；
8. 修正 registration `userVerification` 示例为当前实际 required；
9. 修正 Rust backend 依赖说明，不再声称使用 `@simplewebauthn/server`。

---

## 10. 测试策略与矩阵

### 10.1 自动化矩阵

| 层级             | Case                                | 关键断言                                                                                                                                                                |
| ---------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rust unit        | registration options                | configured `rp.id`；residentKey=required；requireResidentKey=true；`extensions == {"credProps":true}` 且 key set 精确为 `["credProps"]`；UV 保持 required               |
| Rust unit        | outbound extension drift            | 断言不含 `credentialProtectionPolicy`、`enforceCredentialProtectionPolicy`、uvm 或任何第二个 key；projection 前 typed extensions 已清空；意外 library shape fail closed |
| Rust unit        | dependency/state sentinel           | state 可 round-trip 并仍记录 resident=false 与 library 默认 extension requests；有效 e2e 证明 outbound/state 差异被 0.5.5 finish 接受                                   |
| Rust unit        | strict extractor                    | true 接受；false/missing client results/missing credProps/missing rk/null/string/number 全拒绝                                                                          |
| Rust unit        | auth options regression             | 同 RP ID；无 `allowCredentials`；现有 timeout/UV 不变                                                                                                                   |
| Rust HTTP        | options boundary                    | 200 body 锁定四个 discoverable 字段及 configured RP；challenge snapshot 不变                                                                                            |
| Rust HTTP        | false/missing rejection             | 400 `invalid_webauthn_registration`；challenge 未消费；credential count/旧 row 完全不变                                                                                 |
| Rust HTTP        | malformed request                   | 仍为 400 `invalid_request`，证明错误分类未漂移                                                                                                                          |
| Rust e2e         | true success                        | 有效 registration + rk=true 返回 200 并插入新 row                                                                                                                       |
| Rust e2e         | false                               | 使用密码学上有效的 registration response，仅把 rk 设 false；返回 400 且不插入                                                                                           |
| Rust e2e         | missing                             | 使用密码学上有效的 response，省略 clientExtensionResults/credProps；返回 400 且不插入                                                                                   |
| Rust e2e         | append-only                         | 已有 credential 后成功注册第二枚，旧 row/passkey JSON 不变且两枚都保留                                                                                                  |
| Rust e2e         | failure retention                   | 已有 credential 后失败注册，旧 row/passkey JSON/last_used_at 不变                                                                                                       |
| Rust e2e         | duplicate rollback                  | 用同一测试 key 对新 challenge 生成密码学有效 response；finish 成功后 INSERT 主键冲突；断言 generic 400、challenge 未消费、旧 row 六个字段逐一不变                       |
| Rust e2e         | normalized persistence              | true success 后 `passkey_json` 体现 0.5.5 library-normalized unsigned credProps metadata，且任意未知原始 extension key 未被独立保存/复制                                |
| Rust e2e         | no-allowCredentials server ceremony | options 无 allowCredentials；helper 显式选择新 key 后 authenticate/verify 成功并获得 session；测试名和说明不得声称浏览器已发现 key                                      |
| SDK unit         | browser serialization               | `getClientExtensionResults()` 的 credProps.rk=true 原样发往 verify；传入 `navigator.credentials.create` 的 extensions exact 等于 `{credProps:true}`                     |
| OpenAPI contract | schema/errors                       | required/const、outbound `additionalProperties:false`、unsigned description 存在；authentication 未增加 allowCredentials；verify responses 不含 409                     |
| Generated check  | source consistency                  | regenerate 后无 drift，typecheck/build 通过                                                                                                                             |

测试 helper `tests/helpers/webauthn.ts` 应默认产生 `rk=true`，并允许测试显式选择 false 或 omit；重复使用同一 seed/key/credential ID 时仍应针对新 challenge 生成新的密码学有效 response，以确定性触发 duplicate INSERT。不能通过构造无效 attestation 来代替 strict/duplicate 分支，否则无法证明失败发生在预期阶段。

### 10.2 Challenge/transaction 专项断言

- false/missing 失败后 `consumed_at IS NULL`。
- 再请求 registration options 后，旧 registration challenge 按现状被消费。
- Duplicate case 必须先完成 library finish，再由主键 INSERT 失败；断言 challenge consume 回滚，旧 credential 的六个持久化字段完全等于冲突前 snapshot。
- authentication challenge 并发语义不受 registration options 影响。

### 10.3 手工互操作门禁

至少记录一次目标组合（具体版本写入验证报告）：

1. Firefox 打开 auth-mini registration；
2. 确认 Network/DevTools 中 publicKey 含 required/true/credProps=true；
3. 用 Bitwarden 创建 passkey；
4. 确认 verify payload 返回 `credProps.rk=true`；
5. 退出并在未输入用户名、无 allowCredentials 的登录页确认 Firefox/Bitwarden chooser **主动列出**该 passkey，再选择它；
6. 完成登录并确认旧 credential 列表未被自动修改。

若目标组合省略 credProps 或不能 discover，即使自动化通过也不得发布；先记录为兼容性阻塞证据，不得放宽冻结的 strict contract。

---

## 11. 兼容性

### 11.1 客户端

- 支持 required + credProps 且返回 true 的客户端：注册继续成功。
- 返回 false 或省略可选扩展结果的旧客户端：有意从“可能保存不可用 credential”变为明确 400 失败。这是已接受 breaking behavior。
- 浏览器 outbound 只收到 credProps；不会再因 library 0.5.5 默认或未来升级意外收到 credProtect/uvm。Inbound 若附带其他 client extension output，应用 strict gate 只解释 credProps，后续仍由库的既有解析规则处理；这些额外值不成为 auth-mini API 保证。
- OpenAPI/生成类型删除 duplicate 409 是 source contract correction；runtime 保持一直存在的 generic 400。依赖 409 union branch 的生成客户端需要同步更新。

### 11.2 服务端与数据

- 无 schema/version migration。
- `Passkey` JSON 类型/格式不变，旧 credential 可继续反序列化和认证；新成功 credential 的同一结构中会包含 library-normalized `Unsigned(CredProps)` metadata。
- 发布前已签发、尚未完成的 registration challenge 最长约 5 分钟：若其旧 options 产生 false/missing，升级后的 verify 会拒绝，用户需重新开始；challenge 不被自动删除。
- 发布前 authentication challenges 与所有已存 credential 不受影响。
- RP 配置若在 ceremony 期间变化，verify 继续使用 challenge snapshot；不改变现状。

### 11.3 依赖

Cargo.toml 的 `"0.5.5"` 是兼容版本要求，真正的当前精确性来自 lockfile。任何 lock refresh 都必须触发第 7.6 节升级审计，而不能仅依赖测试“看起来通过”；CI/release 优先使用 `cargo ... --locked`。本方案不增加 core/proto 直接依赖。

---

## 12. Migration、Rollout 与 Rollback

### 12.1 Migration

- **数据迁移**：无。
- **Backfill/双写**：无。
- **旧 credential**：原样保留。
- **in-flight registration**：允许自然失败/过期并由用户重新发起，不做 challenge 改写。

### 12.2 Rollout

1. 完成核心行为、失败原子性与 dependency sentinel tests。
2. 更新 OpenAPI、删除虚假 duplicate 409、生成类型和文档，运行完整 Rust/Node/e2e/generated checks；Rust 命令优先带 `--locked`。
3. 通过安全视角 `review-rfc`/后续 change review。
4. 在目标 Firefox/Bitwarden 组合完成手工门禁。
5. 整体发布；不按 user agent 灰度，不提供可关闭 strict contract 的 feature flag。
6. 观察 registration options 200、register verify 200/400 比率与用户反馈；authentication 成功率必须无回归。

### 12.3 Rollback 触发器

满足任一条件即停止/回滚：

- 目标 Firefox/Bitwarden 在 required options 下持续不返回 rk=true；
- 新注册返回成功但在 username-less chooser 中不可发现；
- register verify 400 比率相对基线显著上升并确认来自目标支持客户端；
- authentication 成功率回归；
- 发现失败路径修改/删除旧 credential 或错误消费 challenge；
- 发现依赖 state/finish 行为与本 RFC 证据不符。

### 12.4 可执行回滚

1. 回滚到上一应用二进制/发布制品；不执行 SQL。
2. 保留升级期间成功新增的 credential；它们与旧 `Passkey` 格式兼容。
3. 保留所有旧 credential 与 challenge 数据；让 challenge 按现有 TTL/后续 options 规则处理。
4. 验证旧版本 options/verify/authentication endpoint 恢复。
5. 记录回滚原因。不得为“恢复一致性”自动删除本版本新增 credential。

回滚会重新开放原有“保存非 discoverable credential”的风险，只是应急措施，不是长期兼容模式。

---

## 13. 可观测性与排障

### 13.1 决策

本任务不引入日志/指标框架，也不改变对外 generic error，以免扩大认证面与泄露数据。当前 Rust server 没有结构化 endpoint metrics，因此发布观测依赖部署层 HTTP status 统计、验证报告与用户反馈；这是已知限制，不伪称已有精细原因指标。

### 13.2 建议观测项

- `/webauthn/register/options`：请求量、2xx/4xx 比率。
- `/webauthn/register/verify`：请求量、200 与 generic 400 比率。
- `/webauthn/authenticate/verify`：成功率是否回归。
- 手工/支持记录：浏览器、OS、密码管理器版本，是否返回 rk，是否 username-less 可发现。

不得记录 credential ID 与用户身份的可关联组合、原始 extension、attestation 或 client data。若未来增加内部 reason metric，应使用低基数枚举（例如 `cred_props_not_true`），并另行评审隐私与日志框架。

### 13.3 Debug playbook

1. 检查 registration options 的 RP ID、required/true，并确认 `extensions` exact key set 只有 `credProps=true`。
2. 检查浏览器提交的 JSON shape，只确认 rk 是否布尔 true，不复制敏感 payload。
3. 区分 `invalid_request` 与 `invalid_webauthn_registration`。
4. 检查对应 challenge type/expiry/consumed 状态与 snapshot RP/origin。
5. 比较失败前后 credential row count/旧 row hash，确认无副作用。
6. 若自动化通过但实机不可发现，保留为客户端互操作 residual，不把 credProps 描述升级为证明。

---

## 14. Security & Privacy

### 14.1 Threat model

- **伪造 rk=true**：页面 JavaScript/恶意客户端可修改未签名输出，从而让非 discoverable credential 通过应用 gate。该风险无法由 credProps 消除；攻击者仍必须完成有效 WebAuthn registration，不能借此绕过 challenge/origin/RP/UV/attestation 验证。
- **false/missing 导致拒绝**：兼容性或恶意客户端可造成自身注册失败，但不能写入 credential 或破坏旧数据。
- **replay/race**：继续依靠服务端保存 state、challenge TTL 与 transaction CAS；strict check 不搬到客户端可信边界。
- **RP/origin confusion**：继续使用 challenge snapshot 与现有 origin/RP 校验，不接受 request-provided RP。
- **数据破坏**：append-only INSERT 与 transaction rollback 防止失败路径消费 challenge 或覆盖旧 row；密码学有效 duplicate test 专门验证该不变量。

### 14.2 安全结论

`residentKey=required` 是对 conforming client 的创建约束，`credProps.rk=true` 是对 client report 的严格一致性检查。两者共同降低当前 UX 契约漂移，但都不替代签名验证，也不把 key residence 变成认证强度属性。

### 14.3 隐私与保留

- 不新增 PII 或 credential metadata 字段。
- 不独立持久化原始完整 client extension payload；允许 library 将 credProps 归一化为明确标记 `Unsigned` 的 credential metadata 并随 `passkey_json` 保存。
- 不把 normalized unsigned metadata 复制到可信列，也不用于授权、安全证明、自动迁移或 credential 发现判定。
- 不引入 attestation allowlist 或设备型号收集。
- 旧 credential 保留期限与显式删除能力不变。

---

## 15. Milestones

### Milestone 1：核心协议与原子性

- **Scope**：typed-first options mutation、单一 projection、exact credProps-only allowlist、strict verify、normalized persistence、duplicate rollback、Rust unit/HTTP 与 TypeScript crypto e2e helper。
- **Acceptance**：outbound extension key set 只有 credProps；true success；false/missing/duplicate 均 generic 400；duplicate challenge 回滚且旧行六字段不变；auth options 无 allowCredentials；helper 显式选 key 后服务端 ceremony 成功。
- **Rollback impact**：单纯回滚代码，无数据迁移。

### Milestone 2：公开契约一致

- **Scope**：OpenAPI required/const/closed extensions、删除 duplicate 409、生成 API、两份文档与 contract tests。
- **Acceptance**：generated check、typecheck、文档示例与实际 wire 一致，明确 normalized unsigned persistence；生成 error union 不再含 409。
- **Rollback impact**：与 Milestone 1 同版本回滚，避免实现/文档分裂发布。

### Milestone 3：安全与互操作发布门禁

- **Scope**：完整自动化、review、Firefox/Bitwarden 手工证据、回滚演练检查。
- **Acceptance**：review PASS；目标 Firefox/Bitwarden chooser 主动列出新 credential 并能 username-less 登录；无旧数据变化。自动化结果不得替代该实机发现证据。
- **Rollback impact**：按 12.4 回滚二进制，不执行 credential cleanup。

---

## 16. 风险登记

| 风险                                                       | 可能性/影响   | 缓解与验证                                                                                                         |
| ---------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------ |
| credProps 可伪造，false positive 入库                      | 中/中         | 文档不夸大；始终执行完整 finish；承认不可消除 residual                                                             |
| 合法旧客户端缺失 credProps 被拒绝                          | 中/中         | 冻结决策；目标实机门禁；观察 400；必要时二进制回滚而非放宽                                                         |
| 0.5.5 state=false 与 wire=true 在升级时漂移                | 中/高         | lockfile、源码注释、drift test、依赖升级强制重审                                                                   |
| state 记录 credProtect/uvm requested，但 outbound 刻意省略 | 中/中         | 精确记录 0.5.5 Ignored/不参与 gate 语义；有效 e2e；升级重审                                                        |
| library/future extensions 意外泄漏到浏览器                 | 低/高         | typed `extensions=None` + 单一 fail-closed projection + exact `["credProps"]` key-set test + OpenAPI closed object |
| JSON projection 因 library shape 漂移而误改字段            | 低/高         | 仅一个 helper；逐路径类型/值检查；异常 fail closed；禁止新增 core/proto 依赖绕行                                   |
| normalized unsigned metadata 被误当可信属性                | 中/高         | 明确 passkey_json 持久化事实；禁止独立列、授权、证明与迁移用途；文档/security review                               |
| 删除生成类型中的虚假 409 造成 source break                 | 中/低         | runtime 不变；发布说明与 SDK 同步更新；OpenAPI contract test 锁定 409 缺失                                         |
| in-flight 旧注册在部署后失败                               | 高/低         | 5 分钟窗口；明确重试，不迁移 challenge                                                                             |
| strict/duplicate failure 误写或删除旧 credential           | 低/高         | pre-transaction gate、密码学有效 duplicate transaction test、旧 row 六字段断言                                     |
| 自动化被误述为实际 discoverability 证明                    | 中/中         | 测试名限定 server ceremony；实机 chooser 是独立 release gate                                                       |
| 文档继续把信号称为证明                                     | 中/高（误用） | OpenAPI/两份文档强制 unsigned 文案，安全 review                                                                    |
| 无细粒度生产 reason metrics                                | 高/中         | 部署层 status 统计、手工版本证据、保守 rollback trigger；后续另行设计 telemetry                                    |

---

## 17. Open Questions / Unknowns

没有需要改变冻结 contract 的设计阻塞项。以下是实现/发布验证门禁，而非授权放宽条件：

- [ ] 记录目标 Firefox、Bitwarden、OS 的具体版本与 rk=true/discovery 证据。
- [ ] 在 dependency upgrade 流程中建立可见的源码重审说明；当前仓库没有自动识别所有相关语义变化的机制。
- [ ] 生产环境 HTTP status 基线未知，发布负责人需在 rollout 前定义可用观测窗口。
- [ ] 发布验证报告需指定实机门禁环境、执行责任人与证据文件位置；这不改变设计，但发布前不可缺失。

这些 unknown 应由 `review-rfc` 判断风险是否充分受控；它们不需要回到 brainstorm，因为目标、拒绝策略、数据保留和推荐方案均已稳定。

---

## 18. Implementation Boundaries

预计修改范围仅为：

- `rust-backend/src/webauthn.rs`
- `rust-backend/src/http.rs`（测试为主，除非无需生产改动）
- `tests/helpers/webauthn.ts`
- `rust-e2e/rust-server.test.ts`
- `tests/unit/sdk-webauthn.test.ts` / `tests/helpers/sdk.ts`（仅补 wire 断言所需）
- `tests/integration/openapi-contract.test.ts`
- `openapi.yaml`
- `src/generated/api/**`
- `docs/integration/webauthn.md`
- `docs/reference/http-api.md`

不得借此修改数据库 schema、清理 credential、切换 WebAuthn library、增加 core/proto 直接依赖、增加登录回退或重构无关认证代码。Options 改动必须优先操作可访问 typed fields；无法命名的 resident enum/exact extension object 只能由一个 fail-closed JSON projection helper 处理。

建议实现顺序：先用失败测试锁定 exact outbound key set、strict gate、normalized persistence 与密码学有效 duplicate rollback，再改核心行为；随后补无 allowCredentials server ceremony e2e；最后更新 OpenAPI（含删除 409）、生成类型和文档。实现阶段必须由 `engineer`/既定工作流执行，本 RFC 不包含生产实现。

## 19. References

- Contract：`.legion/tasks/fix-passkey-discoverable-contract/plan.md`
- Task state：`.legion/tasks/fix-passkey-discoverable-contract/tasks.md`
- Research：`.legion/tasks/fix-passkey-discoverable-contract/docs/research.md`
- Prior review：`.legion/tasks/fix-passkey-discoverable-contract/docs/review-rfc.md`
- Application：`rust-backend/src/webauthn.rs`、`rust-backend/src/http.rs`
- Data constraint：`sql/schema.sql:64-71`
- Dependency pin：`rust-backend/Cargo.toml`、`rust-backend/Cargo.lock`
- Exact dependency source：
  - `~/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/webauthn-rs-0.5.5/src/lib.rs`
  - `~/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/webauthn-rs-core-0.5.5/src/core.rs`
  - `~/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/webauthn-rs-core-0.5.5/src/internals.rs`
  - `~/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/webauthn-rs-core-0.5.5/src/interface.rs`
  - `~/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/webauthn-rs-proto-0.5.5/src/extensions.rs`
  - `~/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/webauthn-rs-proto-0.5.5/src/options.rs`
- Test flow：`tests/helpers/webauthn.ts`、`rust-e2e/rust-server.test.ts`
- Public contract：`openapi.yaml`、`docs/integration/webauthn.md`、`docs/reference/http-api.md`
