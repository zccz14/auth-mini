# 验证报告：Passkey Discoverable Credential 契约

## 最终结论

**PASS — `EXTERNAL-01` 已满足，允许 merge 与发布。**

结论基于三个相互独立、边界明确的证据层级：

1. **自动化验证：PASS。** Rust unit/HTTP、真实密码学 e2e、Node/TypeScript、OpenAPI contract、generated drift、typecheck 与 lint 全部通过。
2. **部署静态核对：PASS。** acorn 服务、feature commit、健康端点及公网 OpenAPI contract 已核对。
3. **Operator browser attestation：PASS。** 用户明确报告在 acorn 部署的新版本上使用 Firefox/Bitwarden 完成注册与无用户名登录，并确认原问题已修复。

`cargo fmt --all -- --check` 的 repo baseline 失败、`credProps.rk` 的 unsigned 固有限制、部署制品与本地 validation artifact 的 hash 差异继续保留记录，但均不构成本次 change 的阻塞项。

## 环境与时间

### 自动化验证环境

- 自动化执行时间：2026-07-11T16:24:55+08:00
- 工作目录：`/home/c1/Work/auth-mini/.worktrees/fix-passkey-discoverable-contract`
- 分支：`legion/fix-passkey-discoverable-contract-webauthn`
- 当前 feature commit：`b4f6cf75459f4969cc126d5d1d65cb556a40e4bd`
- OS：Linux 6.12.93 x86_64
- Node.js：v24.18.0；npm：11.16.0
- Rust：rustc/cargo 1.96.0
- 测试工具：Vitest 4.1.2、TypeScript 5.9.3、ESLint 9.39.4、Prettier 3.8.1、`@hey-api/openapi-ts` 0.96.0
- 锁定 WebAuthn 依赖：`webauthn-rs`、`webauthn-rs-core`、`webauthn-rs-proto` 均为 0.5.5

### acorn 部署环境

- 报告更新时间：2026-07-11T20:02:04+08:00
- Service：`auth-mini-manual.service` active，自 2026-07-11 19:57:59 CST 运行
- ExecStart：`/opt/auth-mini-manual/b4f6cf7/auth-mini --host 127.0.0.1 --port 7777 --db /var/lib/auth-mini/auth-mini.sqlite`
- 部署 feature commit：`b4f6cf75459f4969cc126d5d1d65cb556a40e4bd`
- acorn deployed file SHA-256：`3acdbeb57d42054f9db3c2dbcfff9ea7dd0e15646e944433ec3a56e4ca925a14`
- 健康端点：`http://127.0.0.1:7777/openapi.json` 与 `https://auth.0xc1.wang/web/` 均健康

## 证据来源层级

### 1. 自动化验证证据

由 verify-change 阶段在本地工作树独立执行，不引用 engineer 的成功声明替代复跑。

| 命令                                                                                      | 结果 | 证据                                                                                                                                                      |
| ----------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cargo test --locked`（`rust-backend`）                                                   | PASS | 141 passed，0 failed；main/doc tests 0 failed。包含 WebAuthn unit 与 HTTP boundary 全量测试。                                                             |
| `cargo build --locked --manifest-path rust-backend/Cargo.toml && npx vitest run rust-e2e` | PASS | locked build 成功；1 test file、2 tests passed。完成真实签名的 registration/authentication ceremony。                                                     |
| `npm test`                                                                                | PASS | typecheck 通过；`test:unit` 阶段 19 files/119 tests passed，并执行 generated check 与 SDK DTS consumer compile；integration 阶段 3 files/9 tests passed。 |
| `npm run typecheck`                                                                       | PASS | `tsc --noEmit` exit 0。                                                                                                                                   |
| `npm run lint`                                                                            | PASS | `eslint .` exit 0。                                                                                                                                       |
| `npm run check:generated:api`                                                             | PASS | 从 `openapi.yaml` 临时重新生成并与 `src/generated/api` 比较，无 drift。                                                                                   |
| `npx prettier --check <全部本次受 Prettier 管理的变更文件>`                               | PASS | 8 个 TS/YAML/Markdown 变更文件全部匹配格式；生成目录按 `.prettierignore` 排除。                                                                           |
| `git diff --check`                                                                        | PASS | 无 whitespace error。                                                                                                                                     |
| `git diff --exit-code -- rust-backend/Cargo.toml rust-backend/Cargo.lock`                 | PASS | manifest 与 lockfile 均未修改。                                                                                                                           |
| `cargo tree --locked -p auth-mini --depth 1`                                              | PASS | 直接依赖只有高层 `webauthn-rs v0.5.5`；没有新增 core/proto 直接依赖。                                                                                     |

自动化覆盖：

- 配置 RP ID、`residentKey="required"`、`requireResidentKey=true`、`userVerification="required"`。
- Outbound extensions exact `{ "credProps": true }`，拒绝第二个或 library drift extension。
- strict true/false/missing/null/string/number/错误结构。
- 密码学有效 true success、false/missing rejection、duplicate rollback。
- challenge 未消费、append-only、既有 row 六字段 snapshot 不变。
- library-normalized `Unsigned(CredProps { rk: true })` 持久化，raw extension sentinel 不持久化。
- Authentication options 无 `allowCredentials`；helper 显式选择新 key 后 server ceremony 成功。
- OpenAPI required/const/closed contract、verify 无 409、生成类型同步。

### 2. 部署静态核对证据

acorn 服务与公开 contract 已独立核对：

- `auth-mini-manual.service` active，ExecStart 指向 commit 前缀目录 `/opt/auth-mini-manual/b4f6cf7/` 下的 binary。
- 当前部署 feature commit 为 `b4f6cf75459f4969cc126d5d1d65cb556a40e4bd`。
- Loopback OpenAPI 与公网 Web UI 健康。
- 公网 `https://auth.0xc1.wang/openapi.json` 已验证：
  - `residentKey` const `required`；
  - `requireResidentKey` const `true`；
  - `userVerification` const `required`；
  - `extensions` required、closed，且 exact `credProps`；
  - `clientExtensionResults` required；
  - `credProps.rk` const `true`；
  - `/webauthn/register/verify` responses 仅 200/400/401/403。

#### 部署制品 provenance 限制

acorn deployed file SHA-256 是 `3acdbeb57d42054f9db3c2dbcfff9ea7dd0e15646e944433ec3a56e4ca925a14`。它由 acorn 侧另行构建，与本地 validation artifact SHA 前缀 `f4a756...` 不同。

本报告**不声称** deployed binary 与本地 validation artifact hash match，也**不声称**当前构建具备 reproducible build。部署证据依赖明确的 feature commit、live contract 静态核对和 operator browser attestation，而不是二进制 hash 等同。

### 3. Operator browser attestation

**`EXTERNAL-01：SATISFIED`。**

用户明确报告：部署新版本后，已在 Firefox/Bitwarden 上完成实机注册与无用户名登录，两个流程均成功，并确认原 discoverability 问题已修复。

证据边界：

- 这是 operator attestation，不是本代理在 GUI 中直接执行的记录。
- 用户未提供 Firefox、Bitwarden 或 OS 的具体版本，也未提供截图、HAR 或 Network export；本报告不编造这些信息。
- 用户没有提供数据库行截图。既有 credential 不被破坏的结论来自自动化 false/missing/duplicate/append-only 场景对六字段 row snapshot 的断言，不归因于 operator 额外提供的数据证据。
- Node helper 只证明 server ceremony；真实 chooser 成功由本节 operator attestation 提供，两类证据不互相替代。

## 验收项判定

### 1. Registration options 强制 discoverable contract

**PASS。** 自动化锁定 configured RP ID、required/true/required 和 exact credProps；公网 OpenAPI 静态 contract 与部署版本一致。

### 2. Firefox/Bitwarden 可发现并完成无用户名登录

**PASS。** 自动化证明服务端无 `allowCredentials` ceremony；operator attestation 证明 acorn 部署版本上的 Firefox/Bitwarden 实机注册与无用户名登录成功。`EXTERNAL-01` 已满足。

### 3. Verify 严格接受 `credProps.rk=true`

**PASS。** Rust unit/HTTP 与密码学有效 e2e 覆盖 true、false、missing 及错误类型；公网 OpenAPI 将 required/const contract 暴露为部署事实。

### 4. Duplicate rollback、append-only 与既有凭据保留

**PASS。** 自动化比较 challenge 与既有 credential 六字段 snapshot；没有把 operator attestation 误述为数据库级证据。

### 5. OpenAPI、生成类型与文档同步

**PASS。** Contract tests、generated drift、typecheck 均通过；公网 OpenAPI 静态核对与预期一致，verify 不再承诺 409。

### 6. 不自动删除、迁移或改写既有凭据

**PASS。** 由自动化 false/missing/duplicate/append-only 六字段 snapshot 与 credential count 证据覆盖。

## 保留事项

### Repo rustfmt baseline

`cargo fmt --all -- --check` 继续记录为 **FAIL（baseline）**，不能隐藏：rustfmt 仅要求重排 `rust-backend/src/session.rs:183`。该文件与 `origin/main` blob hash 均为 `6ab7ae7e5223e239e72f08d178b578000f702785`；本次 Rust diff 只有 `http.rs`、`webauthn.rs`，二者 scoped rustfmt PASS，现有 PR workflows 也没有 cargo fmt gate。因此它属于 repo/toolchain baseline issue，不归因于本次 change。

### Unsigned credProps 固有限制

`credProps.rk` 是 unsigned client report，不是 authenticator resident storage 的密码学证明。完整 WebAuthn finish、challenge/origin/RP/UV/算法验证仍是独立必要条件；不得把 normalized metadata 用作授权或安全强度判断。

### Browser evidence granularity

Operator attestation 已满足本任务外部互操作门禁，但缺少浏览器、扩展、OS 具体版本和截图。这是证据粒度限制，不改变用户明确报告的成功结果，也不得在后续材料中补写不存在的版本或附件。

### Artifact hash 差异

acorn deployed binary 与本地 validation artifact hash 不同，未建立 reproducible-build 证据。不得将 commit 一致或 live behavior 成功误写成二进制 hash match。

## 最终判定

**PASS。`EXTERNAL-01` SATISFIED。允许 merge 与发布。**

自动化、部署静态 contract 和 operator browser attestation 三层证据共同满足本任务验证要求；repo rustfmt baseline、unsigned 信号限制及 artifact hash 差异按上述边界继续保留。
