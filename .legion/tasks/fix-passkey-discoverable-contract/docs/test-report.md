# 验证报告：Passkey Discoverable Credential 契约

## Legion 路由结论

**PASS with explicit residual — 允许进入 `review-change`；不允许进入发布。**

本报告区分三个结论，避免把不同门禁混为一谈：

1. **本次 change 自动化判定：PASS。** 功能、协议、真实密码学 ceremony、事务原子性、数据保留、OpenAPI、生成类型、typecheck 与 lint 均已独立通过。
2. **Repo baseline issue：非本次 change failure。** `cargo fmt --all -- --check` 的失败必须保留记录，但唯一差异是与 `origin/main` blob 完全相同的 `rust-backend/src/session.rs`；本次两个 Rust 变更文件 scoped rustfmt 均通过，PR workflows 也没有 cargo fmt gate。
3. **外部人工发布门禁：未验证，阻塞发布。** 当前没有 Firefox、Bitwarden、GUI 或测试 vault，不能执行真实 chooser；Node helper 证据不替代该门禁。

RFC §12.2 明确把 change review 排在 Firefox/Bitwarden 手工门禁之前，§10.3 明确该门禁阻塞的是发布。因此当前 Legion 可路由到 `review-change`，但 review 通过后仍不得发布，直到补齐实机证据。这是阶段边界分类，不是降低验收标准。

## 环境

- 时间：2026-07-11T16:24:55+08:00
- 工作目录：`/home/c1/Work/auth-mini/.worktrees/fix-passkey-discoverable-contract`
- 分支：`legion/fix-passkey-discoverable-contract-webauthn`
- HEAD：`86b4aaa8ca97d1218217a7f6f0144251a5f30c9b`
- OS：Linux 6.12.93 x86_64
- Node.js：v24.18.0；npm：11.16.0
- Rust：rustc/cargo 1.96.0
- 测试工具：Vitest 4.1.2、TypeScript 5.9.3、ESLint 9.39.4、Prettier 3.8.1、`@hey-api/openapi-ts` 0.96.0
- 锁定 WebAuthn 依赖：`webauthn-rs`、`webauthn-rs-core`、`webauthn-rs-proto` 均为 0.5.5
- 浏览器环境探测：`firefox`、`bitwarden`、`google-chrome`、`chromium` 均不在 `PATH`；无 `DISPLAY`/`WAYLAND_DISPLAY`

## 验证选择

- Rust 改动涉及认证协议、challenge 与事务，使用 tracked lockfile 跑全量 unit/HTTP 测试，并以真实外部 Rust binary 和 Node `crypto` 生成的 packed attestation/assertion 执行端到端 ceremony。
- 仓库的 `npm run test:rust-e2e` 构建步骤没有 `--locked`，因此使用证明力更强的等价组合：`cargo build --locked --manifest-path rust-backend/Cargo.toml && npx vitest run rust-e2e`。
- SDK、OpenAPI 和生成类型同时变化，因此运行 `npm test` 全套，并独立复跑 typecheck、lint 和 generated drift check。
- FAIL 回退后只复跑最小静态命令，确认 production diff 未变化、`session.rs` baseline 身份、Rust scoped formatting 与 workflow 门禁事实；没有修改生产文件。

## 命令与结果

### 本次 change 自动化

| 命令                                                                                      | 结果 | 证据                                                                                                                                                      |
| ----------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cargo test --locked`（`rust-backend`）                                                   | PASS | 141 passed，0 failed；main/doc tests 0 failed。包含 WebAuthn unit 与 HTTP boundary 全量测试。                                                             |
| `cargo build --locked --manifest-path rust-backend/Cargo.toml && npx vitest run rust-e2e` | PASS | locked build 成功；1 test file、2 tests passed。核心 smoke test 完成真实签名的 registration/authentication ceremony。                                     |
| `npm test`                                                                                | PASS | typecheck 通过；`test:unit` 阶段 19 files/119 tests passed，并执行 generated check 与 SDK DTS consumer compile；integration 阶段 3 files/9 tests passed。 |
| `npm run typecheck`                                                                       | PASS | `tsc --noEmit` exit 0。                                                                                                                                   |
| `npm run lint`                                                                            | PASS | `eslint .` exit 0。                                                                                                                                       |
| `npm run check:generated:api`                                                             | PASS | 从 `openapi.yaml` 临时重新生成并与 `src/generated/api` 比较，无 drift。                                                                                   |
| `npx prettier --check <全部本次受 Prettier 管理的变更文件>`                               | PASS | 8 个 TS/YAML/Markdown 变更文件全部匹配格式；生成目录按 `.prettierignore` 排除。                                                                           |
| `git diff --check`                                                                        | PASS | 初次验证及回退复核均无 whitespace error。                                                                                                                 |
| `git diff --exit-code -- rust-backend/Cargo.toml rust-backend/Cargo.lock`                 | PASS | manifest 与 lockfile 均未修改。                                                                                                                           |
| `cargo tree --locked -p auth-mini --depth 1`                                              | PASS | 直接依赖只有高层 `webauthn-rs v0.5.5`；没有新增 `webauthn-rs-core`/`webauthn-rs-proto` 直接依赖。                                                         |

### Repo baseline 与回退复核

| 命令/核对                                                                                                | 结果             | 分类                                                                                                    |
| -------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------- |
| `cargo fmt --all -- --check`（`rust-backend`）                                                           | **FAIL（保留）** | rustfmt 仅要求重排 `src/session.rs:183`。该失败真实、确定性、非 flaky，但不归因于本次 change。          |
| `git hash-object rust-backend/src/session.rs` 与 `git rev-parse origin/main:rust-backend/src/session.rs` | PASS             | 两者均为 `6ab7ae7e5223e239e72f08d178b578000f702785`；工作区文件与 `origin/main` blob 完全相同。         |
| `git diff --exit-code origin/main -- rust-backend/src/session.rs`                                        | PASS             | `session.rs` 相对 `origin/main` 无差异。                                                                |
| `git diff --name-only origin/main -- rust-backend`                                                       | PASS             | 本次 Rust diff 仅 `rust-backend/src/http.rs`、`rust-backend/src/webauthn.rs`。                          |
| `rustfmt --edition 2021 --check src/webauthn.rs src/http.rs`                                             | PASS             | 两个本次 Rust 变更文件在初次验证及回退复核中均通过。                                                    |
| 扫描 `.github/workflows/*.yml` 并回读 `pr-checks.yml`、`rust-e2e.yml`                                    | PASS             | 现有 PR workflows 运行 npm lint/typecheck/tests 与 Rust e2e build/test，没有 `cargo fmt`/rustfmt gate。 |
| `git status --short --branch && git diff --check`                                                        | PASS             | 回退后 production diff 文件集合未变化；仅更新本报告。                                                   |

## 验收项对应证据

### 1. Registration options 使用配置 RP ID，并强制 discoverable contract

**自动化通过。**

- Rust unit/HTTP 与 Rust e2e 均断言配置的 `rp.id`。
- 实际响应断言：`residentKey="required"`、`requireResidentKey=true`、`userVerification="required"`。
- `extensions` 断言为 exact `{ "credProps": true }`，key 集合只有 `credProps`；fail-closed projection 测试拒绝既有或第二个 extension key。
- SDK unit 断言传给 `navigator.credentials.create` 的 selection 与 extension object 同样精确。

### 2. 无用户名登录保持同一 RP ID 并省略 `allowCredentials`

**服务端自动化通过；真实 chooser 仍是外部人工发布门禁。**

- Rust unit 与 e2e 断言 authentication options 使用同一 RP ID 且没有 `allowCredentials`。
- e2e 显式选择刚注册的测试 key，生成有效 assertion，服务端 verify 成功并建立 WebAuthn session。
- 该测试不经过 Firefox/Bitwarden chooser，因此没有、也不得声称已证明真实 discoverability。

### 3. Verify 仅接受严格布尔 `credProps.rk=true`

**自动化通过。**

- Rust extractor unit 覆盖 true、false、client results 缺失、credProps 缺失、rk 缺失、null、string、number、错误结构和 array。
- Rust HTTP 测试覆盖 false/missing 返回 `400 invalid_webauthn_registration`，challenge 未消费，旧 row 六字段及 credential count 不变。
- e2e 使用密码学有效 registration response：true 成功；false 与缺失均返回 generic 400、不插入新 credential，并保留既有 credential snapshot。

### 4. 真实 ceremony、duplicate rollback、已有凭据保留与 normalized metadata

**自动化通过。**

- helper 通过 Node `crypto` 生成 P-256 key、COSE key、packed attestation signature 与 authentication assertion signature；不是用无效 attestation 代替 strict/duplicate 分支。
- 成功注册第二枚 credential 后，第一枚 row 六字段不变且总数为 2。
- duplicate 使用同一 key 针对新 challenge 重新生成有效 response；返回 generic 400，duplicate challenge 的 `consumed_at` 保持 NULL，两枚旧 row snapshot 均不变，总数仍为 2。
- 成功 row 的 `passkey_json` 包含 library-normalized `Unsigned(CredProps { rk: true })`；自定义 raw extension sentinel 未进入 `passkey_json`。
- authentication 后只更新实际使用的第一枚 credential；第二枚 snapshot 不变。

### 5. OpenAPI、生成类型与文档同步

**自动化与静态核对通过。**

- OpenAPI contract test 锁定 required/const、closed outbound extensions、unsigned 描述、authentication 无 `allowCredentials`，以及 verify responses 无 409。
- `/webauthn/register/verify` 当前只声明 200/400/401/403；生成的 `VerifyWebauthnRegistrationErrors` 只有 400/401/403。
- 生成类型包含字面量 `residentKey: 'required'`、`requireResidentKey: true`、`credProps: true`、required `rk: true`；generated drift check 通过。
- 两份文档包含 strict rejection、generic 400、unsigned 限制、normalized metadata、旧 credential 保留和无 `allowCredentials` 说明。

### 6. 不自动删除、迁移或改写已有 credential

**自动化通过。**

- false、missing、duplicate 和成功 append 场景均比较既有 row snapshot；没有 update/delete。
- `/me` 在追加后仍列出两枚 credential；全量 Rust 测试中的显式 credential 管理边界也通过。

## 分类结论

### 本次 change 自动化判定

**PASS。** 没有自动化失败可归因于实现缺口；无需退回 engineer 修改代码。可以进入 `review-change` 做只读安全与范围评审。

### Repo baseline issue

`cargo fmt --all -- --check` 继续记录为失败，不能隐藏或改写为通过。但证据证明它只命中与 `origin/main` 完全相同的 `session.rs`，本次 Rust diff 两文件 scoped rustfmt 通过，且该命令不是现有 PR workflow gate。因此分类为 **repo/toolchain formatting baseline issue，非本次 change failure**；应由独立维护项处理，不在 verify-change 阶段改生产代码。

### 外部人工发布门禁

**UNVERIFIED — 阻塞发布，不阻塞进入 `review-change`。** 当前环境没有 Firefox、Bitwarden、GUI 或可用测试 vault。必须在目标组合上完成并记录以下步骤：

1. 记录 OS、Firefox 与 Bitwarden 的精确版本，以及测试 RP ID/origin。
2. Firefox 打开 auth-mini registration。
3. 在 Network/DevTools 确认 `publicKey` 使用配置 RP ID，包含 `residentKey="required"`、`requireResidentKey=true`，且 extensions exact 为 `{ "credProps": true }`。
4. 使用 Bitwarden 创建 passkey，并确认 verify payload 的 `clientExtensionResults.credProps.rk` 是 JSON boolean `true`。
5. 退出，在未输入用户名且服务端 options 无 `allowCredentials` 的登录页，确认 Firefox/Bitwarden chooser **主动列出**刚创建的 passkey。
6. 选择该 passkey 完成登录，并确认既有 credential 列表未被自动删除、迁移或改写；记录截图/Network evidence 的位置。

任一步失败或目标组合省略 `credProps` 时，不得放宽 strict contract，也不得发布；应记录兼容性阻塞并回到上游判断。

### 固有安全 residual

`credProps.rk` 是 unsigned client report。自动化证明 strict gate 与完整 WebAuthn finish、事务原子性并存，但不能把该值升级为 authenticator resident storage 的密码学证明。

## 最终判定

**PASS with explicit residual。Legion 下一阶段：`review-change`。**

允许进入 change review；不允许发布。恢复发布资格的条件是：`review-change` 通过，并补齐上述 Firefox/Bitwarden 实机 chooser 成功证据且无旧 credential 变化。
