# Research：Passkey Discoverable Credential 现状

> **范围**：只读调查；依据 2026-07-11 worktree 与本机 Cargo registry 中锁定依赖源码。
> **契约来源**：`../plan.md`、`../tasks.md`。下文将静态源码可证事实与仍待实机确认项分开。

## 1. 问题复述

注册端目前沿用 `webauthn-rs` 的非 resident 默认值并丢弃其 `extensions`，登录端却启动无用户名 discoverable authentication。结果是服务端可能保存无法在无 `allowCredentials` 登录中被浏览器发现的新凭据。稳定契约要求新注册必须请求 discoverable credential，并只在 WebAuthn 校验成功且客户端报告 `credProps.rk === true` 后追加保存；既有凭据不得被迁移或改写。

## 2. 已验证事实

### 2.1 注册 options 与登录 options

- `register_options` 使用同一个 `ResolvedOptionsInput.rp_id` 构造 `Webauthn`、调用 `start_passkey_registration`，并把 RP ID/名称/origin 与序列化 state 存入 challenge（`rust-backend/src/webauthn.rs:185-254`）。
- 返回 JSON 只拣选 `challenge`、`rp`、`user`、`pubKeyCredParams`、`timeout`、`authenticatorSelection`，没有传出库生成的 `extensions`（`rust-backend/src/webauthn.rs:204-226,256-266`）。
- RP ID 来自 `app_meta`，经规范化并校验为 issuer host 本身或允许的父域（`rust-backend/src/webauthn.rs:624-640,686-720`）。
- `authentication_options` 调用 `start_discoverable_authentication`，返回同一配置来源的 `rpId`，手工响应中没有 `allowCredentials`（`rust-backend/src/webauthn.rs:269-317`）。Rust unit/HTTP tests 已明确断言其缺失（`rust-backend/src/webauthn.rs:1031-1068`；`rust-backend/src/http.rs:2626-2668`）。

### 2.2 锁定依赖的精确行为

- 直接依赖声明为 `webauthn-rs = "0.5.5"`，启用 `conditional-ui` 与 state 序列化 feature（`rust-backend/Cargo.toml:7-19`）；lockfile 锁定 `webauthn-rs`、`webauthn-rs-core`、`webauthn-rs-proto` 均为 `0.5.5`（`rust-backend/Cargo.lock:1703-1748`）。
- 0.5.5 的 `start_passkey_registration` 确实构造 `cred_props: Some(true)`，但 builder 明确调用 `.require_resident_key(false)`（`~/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/webauthn-rs-0.5.5/src/lib.rs:534-576`）。
- 该高层入口生成的 extension request 不只有 credProps：还包含 `credProtect(UserVerificationRequired, enforce=false)` 与 `uvm=true`；`credProtect` 通过 serde flatten 成为浏览器 extension input，而不是嵌套的 `credProtect` key（`webauthn-rs-0.5.5/src/lib.rs:541-555`；`webauthn-rs-proto-0.5.5/src/extensions.rs:39-82`）。直接透传整个 map 会扩大本任务 wire scope。
- core 在 `false` 时生成 `residentKey = discouraged`，同时把 `requireResidentKey = false` 写入 options 和 `RegistrationState`；完整 library extension request 也 clone 进 state（`~/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/webauthn-rs-core-0.5.5/src/core.rs:276-360`）。因此现有 Rust 返回的 `authenticatorSelection` 是 discouraged/false，而 server state 同时保留 resident=false 与 credProtect/uvm/credProps requested。
- `finish_passkey_registration` 只转调 core `register_credential`（`webauthn-rs-0.5.5/src/lib.rs:638-659`）；core 解构 state 时显式忽略 `require_resident_key` 与 attachment（`webauthn-rs-core-0.5.5/src/core.rs:377-410`），内部验证处也留有“能否验证 attachment/resident key”的 TODO（同文件 `:526-548`）。0.5.5 不会据此拒绝非 resident credential。
- 协议类型把 `clientExtensionResults` 映射为默认可缺失的 `RegistrationExtensionsClientOutputs`（`webauthn-rs-proto-0.5.5/src/attest.rs:140-170`）；`cred_props` 和内部 `rk` 都是 `Option`（`webauthn-rs-proto-0.5.5/src/extensions.rs:284-320`）。
- 当 state 记录某 extension requested、客户端没有返回时，0.5.5 不据此拒绝：可记录的 `credProtect`/`credProps` 缺失会归一化为 `ExtnState::Ignored`；`uvm` 不存在于 0.5.5 的 `RegistrationExtensionsClientOutputs`/`RegisteredExtensions`，其缺失也不参与 finish gate（`webauthn-rs-core-0.5.5/src/internals.rs:136-182`；`webauthn-rs-proto-0.5.5/src/extensions.rs:295-320,365-402`）。因此 outbound 只 allowlist credProps、server state 仍保留其他 requested 在该锁定版本下可成立。
- 依赖源码明确将 `credProps` 描述为浏览器提供、未签名、可被页面 JavaScript 修改的不可靠信号（`webauthn-rs-proto-0.5.5/src/extensions.rs:284-307`）。finish 把浏览器报告归一化为 `ExtnState::Unsigned(CredProps)`，放入 core `Credential.extensions`；`Passkey` 包含并序列化该 credential，所以 normalized unsigned metadata 会随新行进入 `passkey_json`（`webauthn-rs-core-0.5.5/src/internals.rs:168-208`、`src/interface.rs:246-296`；`webauthn-rs-0.5.5/src/interface.rs:55-59`）。它不是原始完整 extension JSON，也不能成为 credential 实际 discoverability 的密码学证明。
- `CreationChallengeResponse.public_key.authenticator_selection` 与 `extensions` 是可访问的 typed fields；但 `ResidentKeyRequirement`、`RequestRegistrationExtensions` 未由 `webauthn-rs` 高层 prelude 重导出（`webauthn-rs-proto-0.5.5/src/attest.rs:16-53`、`src/options.rs:283-325`；`webauthn-rs-0.5.5/src/lib.rs:206-229`）。这允许优先 typed mutation/清空 extensions，并仅为不可命名 enum 与 exact extension object 保留一个小型 JSON projection，无需新增 core/proto 直接依赖。

### 2.3 当前 register verify、错误与原子性

- 请求模型把 `clientExtensionResults` 保留为 `Option<Value>`，因此目前允许缺失，且没有读取 `credProps.rk`（`rust-backend/src/webauthn.rs:48-63,127-153`）。
- `register_verify` 的现有顺序是：读取未过期/未消费 challenge、校验 user、恢复 state、转换 credential、执行库验证、序列化新 Passkey，最后在同一 SQLite transaction 中先 compare-and-set 消费 challenge，再 `INSERT` 新 credential（`rust-backend/src/webauthn.rs:344-406,534-567`）。
- 所有 ceremony 失败都映射为 HTTP 400 `invalid_webauthn_registration`；语法/边界解析失败映射为 HTTP 400 `invalid_request`（`rust-backend/src/http.rs:725-745`）。
- 在 transaction 开始前失败不会消费 challenge；transaction 内插入失败会回滚 challenge 消费。注册成功路径只有 `INSERT`，没有更新或删除旧 credential（`rust-backend/src/webauthn.rs:374-404`）。显式删除是独立、按 owner 约束的 endpoint（同文件 `:482-493`）。
- `credential_id` 是全局主键（`sql/schema.sql:64-71`）。密码学验证成功但 ID 重复时，当前 `INSERT` 失败会回滚同一 transaction 中的 challenge consume，并由现有单一错误分支返回 HTTP 400 `invalid_webauthn_registration`；runtime 没有 409 分支（`rust-backend/src/webauthn.rs:374-404`；`rust-backend/src/http.rs:725-745`）。
- 新 registration options 会使同一用户此前未消费的 registration challenge 失效；authentication challenges 不走该更新（`rust-backend/src/webauthn.rs:231-254,293-307`）。

### 2.4 替代 API 的边界

- 0.5.5 没有“普通 Passkey + generic required resident key”的安全高层入口。
- `start_attested_resident_key_registration` 受 `resident-key-support` feature 控制，要求非空 attestation CA list、Direct attestation、拒绝同步 authenticator，并限制 attestation format；源码自身仍注释无法知道实际 rk（`webauthn-rs-0.5.5/src/lib.rs:1397-1489`）。其类型文档定位于受控企业硬件环境（`webauthn-rs-0.5.5/src/interface.rs:472-486`）。这与 Bitwarden 等同步 consumer passkey 目标冲突。
- Google Password Manager 专用高层入口会要求 resident key，但固定 platform attachment，且仅可在 Android + GMS Core 的预识别分支启用（`webauthn-rs-0.5.5/src/lib.rs:579-635` 及 `:135-154`）；不能作为 Firefox/Bitwarden 通用方案。
- `webauthn-rs-core` 的 crate/module 文档反复标注直接使用为 UNSAFE、minor version 可无通知改签名，并要求调用方自行维持安全 invariant（`webauthn-rs-core-0.5.5/src/lib.rs:7-14`；`src/core.rs:183-220`）。直接采用还需复制高层 wrapper 的 UV、算法、扩展与同步 credential 策略，并处理 core `Credential` 到现有 opaque `Passkey` 的转换。

### 2.5 测试与公开契约现状

- Rust unit tests 只断言注册 RP/user/算法与 state 可 round-trip，没有锁定 resident/requireResidentKey/extensions（`rust-backend/src/webauthn.rs:857-934`）。HTTP options test 也只锁定 RP/user 与 challenge metadata（`rust-backend/src/http.rs:2315-2371`）。
- 现有 register verify tests 覆盖错误用户、legacy state、缺 challenge/非法 body，但没有 `rk=true|false|missing` 或有效 ceremony 的数据保留矩阵（`rust-backend/src/webauthn.rs:1088-1171`；`rust-backend/src/http.rs:2429-2588`）。
- Rust e2e 已覆盖有效注册后无用户名登录，但测试 authenticator 当前返回 `clientExtensionResults: {}`，新严格契约下会失败（`tests/helpers/webauthn.ts:75-121`；`rust-e2e/rust-server.test.ts:242-341`）。
- 该 e2e helper 直接选择指定测试 key；它只能自动证明“服务端发出的 authentication options 没有 `allowCredentials`，且该 key 的 assertion 可被验证”，不能证明 Firefox/Bitwarden chooser 实际发现了 credential。真实 discoverability 仍需浏览器/密码管理器实机证据。
- Browser SDK 已序列化 `getClientExtensionResults()`/fallback 属性（`src/sdk/browser-runtime.ts:1038-1060`），SDK unit fixture 与断言已包含 `credProps.rk=true`（`tests/helpers/sdk.ts:320-346`；`tests/unit/sdk-webauthn.test.ts:232-261`）。
- OpenAPI 的 creation options 未要求 `requireResidentKey` 或 `extensions`，`residentKey` 只是任意字符串；registration `clientExtensionResults` 仍可选且完全开放（`openapi.yaml:1320-1425`）。生成类型同步反映了该宽松契约（`src/generated/api/types.gen.ts:180-224`）。
- OpenAPI 还声明 duplicate credential 为 409 `duplicate_credential`，生成类型暴露 409，但 Rust runtime 实际统一返回 400；这是本任务原子性分支的直接契约差异（`openapi.yaml:620-627`；`src/generated/api/types.gen.ts:952-968`）。
- 两份文档已经声称 `residentKey=required`，但漏掉 `requireResidentKey`、`extensions.credProps` 与严格 verify；示例还把当前库实际生成的 registration `userVerification=required` 写成 preferred（`docs/integration/webauthn.md:12-35`；`docs/reference/http-api.md:157-180`）。集成文档错误声称 Rust 路径使用 `@simplewebauthn/server`（`docs/integration/webauthn.md:71-75`）。

## 3. 仍待确认 / Unknowns

- [ ] **目标实机互操作性**：仓库无法证明具体 Firefox + Bitwarden 版本会遵循 required 并返回 `credProps.rk=true`；需在实现后记录浏览器、扩展/应用版本的手工 ceremony 证据。
- [ ] **信号真实性不可消除**：即使实机返回 true，`credProps.rk` 仍未签名且可伪造；本任务只能执行客户端协议报告，不能证明 authenticator 内部状态。
- [ ] **旧客户端影响规模**：不返回可选 credProps 的客户端将被有意拒绝；仓库没有生产客户端分布或失败率基线。
- [ ] **依赖升级行为**：0.5.5 之后是否新增合适高层 API、改变 state/finish 语义或扩展序列化，必须在任何升级 PR 中重新审计，不能由当前证据外推。
- [ ] **生产观测基线**：Rust server 没有 endpoint 指标或结构化 WebAuthn 拒绝原因；当前只能依赖 HTTP status、外部代理统计与人工反馈。

以上 unknown 不改变已冻结的产品契约，但必须进入测试、发布门禁与升级风险说明。

## 4. 证据索引

- 任务契约：`.legion/tasks/fix-passkey-discoverable-contract/plan.md:3-54`
- 核心实现：`rust-backend/src/webauthn.rs:185-480`
- HTTP 映射与测试：`rust-backend/src/http.rs:698-803,2315-2809`
- Credential 主键：`sql/schema.sql:64-71`
- 依赖与锁文件：`rust-backend/Cargo.toml:7-19`、`rust-backend/Cargo.lock:1703-1748`
- 依赖 extension/state/persistence：`webauthn-rs-core-0.5.5/src/internals.rs:136-208`、`webauthn-rs-core-0.5.5/src/interface.rs:246-296`、`webauthn-rs-proto-0.5.5/src/extensions.rs:284-402`
- 测试 authenticator/e2e：`tests/helpers/webauthn.ts:13-165`、`rust-e2e/rust-server.test.ts:242-341`
- 公开契约：`openapi.yaml:544-694,1292-1509`
- 文档：`docs/integration/webauthn.md:1-75`、`docs/reference/http-api.md:143-288`
