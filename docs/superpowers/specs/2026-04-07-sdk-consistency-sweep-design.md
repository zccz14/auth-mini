# auth-mini SDK / Docs 一致性修正设计

## 背景

- 当前仓库的源码与测试已经定义了一部分明确合同，但 `README.md`、部署说明、CLI 示例、SDK 默认值与 caveats 文案之间仍存在漂移。
- 已确认的漂移至少包括：仍有旧的 `--origin` 启动写法残留、`auth-mini` 与 `npx auth-mini` 的示例混用、Auth Server 默认示例值不统一、以及 WebAuthn options 请求说明与当前 `rp_id` 必填合同不完全一致。
- 用户要求本轮以“当前源码与测试契约”为准修正对外不一致之处，并额外要求：若 `docs/` 或 `README.md` 与实现存在冲突，不得擅自改实现，必须先列出冲突点并征求确认。

## 目标

- 以最小改动完成一次 SDK / README / docs / 示例命令 / 默认值 / caveats 的一致性清扫。
- 统一所有对外 CLI 示例，持续使用 `npx auth-mini ...`。
- 移除或修正文档里所有仍暗示 `auth-mini start --origin ...` 或 `--rp-id` 启动参数的残留内容。
- 将 Auth Server 默认示例值统一为 `https://auth.zccz14.com`。
- 让 WebAuthn options 两个接口的文档、流程说明与示例都与当前源码合同一致：请求体需要 `rp_id`。
- 检查并修正 `Current caveats`、`Operational limits`、部署文档与 demo/docs 文案中的已知漂移。
- 用测试锁住这批对外合同，减少后续再漂移。

## 非目标

- 不借机重做 SDK 架构、会话模型或 WebAuthn 设计。
- 不在没有用户确认的前提下把“文档与实现冲突”直接升级为运行时代码改动。
- 不处理与本轮一致性无关的命名、重构或 API 扩展。
- 不手工编辑 `dist/` 产物；若需要更新产物，统一通过现有构建流程刷新。

## 设计决策

采用“先完整盘点，再按类型处理”的最小一致性修复策略。

本轮不在执行阶段继续探索范围；先把已发现的不一致项完整写入本 spec，由用户确认后再进入实施。处理规则分三类，且三类互斥：

1. 静态文档/示例文案漂移：只改静态文本、代码块、占位值与对应测试，可直接实施。
2. 静态渲染内容漂移：只改已经写死的静态输出内容，不改变生成逻辑、页面工作流或用户步骤，可直接实施。
3. 任何会改变生成命令、说明口径、默认值、页面工作流、setup/render 逻辑、或运行时代码行为的改动：一律列入冲突清单，待用户确认后再实施。

本轮的真相基线是“当前运行时行为 + 已存在的通过测试”。任何运行时代码改动，包括 SDK 默认值改动，都必须在 spec 中显式列出，并经用户确认后才执行。

额外门禁：对 `demo/*.js`、其他生成器/模板逻辑、以及运行时代码的改动，不因其属于“docs/demo”就自动获批；只有在 B 组中被精确列出并经用户确认的项，才能进入执行。

## 为什么选这个方向

- 用户已经明确本轮以源码与测试契约为准，因此最小收敛修复能最快消除可见不一致，而不会把任务扩展为产品重定义。
- 这类问题主要风险不在运行时，而在对外接入说明误导；优先修 README / docs / 示例命令 / 测试可以最大化降低集成误用概率。
- 通过补强测试把 `npx auth-mini`、默认 Auth Server、`rp_id` 文档合同等关键点固定下来，可以避免后续文档再次漂移。

## 范围与来源

### 真相来源

- 运行时合同以 `src/` 下源码与现有测试为准。
- 对外说明以 `README.md`、`docs/`、demo/docs 页面文案与测试断言为主要修复对象。
- `dist/` 只作为构建产物，不作为人工编辑的权威来源。

### 重点检查对象

- `README.md`
- `docs/deploy/docker-cloudflared.md`
- demo/docs 页面与其生成的接入命令/示例
- `src/sdk/singleton-entry.ts` 中默认 `baseUrl`
- 与 README / SDK 合同相关的测试，例如：
  - `tests/integration/oclif-cli.test.ts`
  - `tests/unit/sdk-base-url.test.ts`
  - `tests/unit/sdk-webauthn.test.ts`

## 具体设计

### 1. CLI 示例统一策略

- 所有面向用户复制执行的 CLI 示例统一写成 `npx auth-mini ...`。
- 范围包括 `init`、`start`、`rotate jwks`、`origin` 子命令、`smtp` 子命令，以及 README / docs / demo/docs 中的其他可执行命令片段。
- 如果某处文本只是描述二进制名、日志名、镜像内命令或测试输出，不强行替换为 `npx`；只统一“用户在终端直接执行”的示例。

### 2. 已移除启动参数的文档清理

- 清除 README、docs、demo/docs 中所有仍把 `--origin` 或 `--rp-id` 作为 `start` 启动参数展示给用户的内容。
- 相关说明统一改成当前合同：页面 origin 通过 `origin` topic 命令写入实例，而不是通过 `start` 启动参数传入。
- 若 demo/docs 仍基于旧合同自动生成 `--origin` 启动命令，则这属于“文档与实现冲突”，需要先列出冲突并让用户确认，再决定是否改页面逻辑。

### 3. Auth Server 默认值统一

- 将 README、docs、demo/docs 中面向用户展示的默认 Auth Server 示例值统一为 `https://auth.zccz14.com`。
- 这包括 README、docs、demo/docs 的默认示例和输入占位值。
- SDK 运行时代码不应 fallback 到任何具体域名；若需调整运行时默认值，按“代码层冲突项”单独确认。

### 4. WebAuthn options 文档合同统一

- `POST /webauthn/register/options` 与 `POST /webauthn/authenticate/options` 的请求说明必须显式包含 `rp_id`。
- README、demo/docs、API reference、流程步骤中不再出现“authenticate/options 用空 body 调用”或省略 `rp_id` 的示例。
- SDK 对外说明继续保留“调用方可省略 `rpId`，SDK 会默认使用当前页面 hostname 填充 `rp_id`”这一易用性描述，因为这与当前源码/测试一致。

### 5. Caveats / Operational limits 清扫规则

- 检查 README 里的 `Operational limits`、docs 中的 caveats / notes / current caveats 类说明，以及 demo/docs 的注意事项。
- 只保留当前源码与测试明确支持或明确已知的问题。
- 删除或修正仍基于旧 same-origin / 旧 startup 参数 / 旧 WebAuthn 请求模型的 caveat。
- 多标签页 refresh race 这类已知 SDK bug 可继续保留，但文案要与当前 README 口径一致。

### 6. 发现额外不一致时的处理规则

- 若只是文案、命令示例、占位值、测试断言漂移，直接列入 spec 并在执行时修正。
- 若发现 `docs/` 或 `README.md` 与实现存在真实语义冲突，例如文档承诺了实现并未提供的行为，先整理出“冲突点 + 当前实现 + 建议处理方式”清单给用户确认。
- 在用户确认前，不主动改运行时代码去迎合文档。
- 本轮执行阶段不得新增未在本 spec 中列出的修复项；如实施中发现遗漏，必须先回到 spec 增补并等待确认。
- 执行阶段只允许触达本 spec 已枚举的文件、位置与不一致项；任何新发现的相邻问题都不自动纳入本轮。

## 已发现不一致清单

以下清单基于当前扫描结果，执行阶段只处理这里已经列出的项。

### A. 可直接修正文档 / demo / 测试的漂移项

1. `README.md` 中 CLI 示例混用 `npx auth-mini` 与裸 `auth-mini`
   - 位置：`README.md:117-129`, `README.md:266-267`
   - 现状：`init`、`start`、`rotate jwks` 使用 `npx`，但 `origin`/`smtp` 以及部分示例仍使用裸 `auth-mini`
   - 计划：统一为 `npx auth-mini ...`

2. `docs/deploy/docker-cloudflared.md` 中 CLI 示例仍使用裸 `auth-mini`
   - 位置：`docs/deploy/docker-cloudflared.md:78`
   - 现状：post-start 配置仍写 `auth-mini origin add ...`
   - 计划：统一为 `npx auth-mini ...`

3. `README.md` 中 Auth Server 示例值仍是 `https://auth.example.com`
   - 位置：`README.md:138`, `README.md:156`, `README.md:169`, `README.md:216`, `README.md:255-267`, `README.md:282`
   - 现状：多个 README 代码块和示例 URL 使用 `auth.example.com`
   - 计划：统一改为 `https://auth.zccz14.com`

4. `docs/deploy/docker-cloudflared.md` 中 Auth Server 示例值仍是 `https://auth.example.com`
   - 位置：`docs/deploy/docker-cloudflared.md:18-19`, `29`, `55`, `90`
   - 现状：部署文档继续用 `auth.example.com`
   - 计划：统一改为 `https://auth.zccz14.com`

5. `demo/index.html` 的输入 placeholder 仍是 `https://auth.example.com`
   - 位置：`demo/index.html:47`
   - 计划：改为 `https://auth.zccz14.com`

6. `README.md` 的 WebAuthn flow 仍写 authenticate/options 可用空 body
   - 位置：`README.md:309`
   - 现状：写着 “call `POST /webauthn/authenticate/options` with an empty body”
   - 与实现关系：当前 `src/shared/http-schemas.ts` 要求 `rp_id` 必填，`tests/integration/webauthn.test.ts` 也覆盖了缺失 `rp_id` 的拒绝行为
   - 计划：修正文档为显式携带 `rp_id`；同时补 register/options 的请求说明，避免两边都省略 body

7. `demo/content.js` 的 WebAuthn API Reference 缺少 options 请求体示例
   - 位置：`demo/content.js:95-123`
   - 现状：`/webauthn/register/options` 和 `/webauthn/authenticate/options` 只有响应示例，没有 `body: { rp_id: ... }`
   - 与实现关系：当前服务端两个 options 接口都要求 `rp_id`
   - 计划：为两个接口补上请求体示例，说明 SDK 可在浏览器侧自动补 `rp_id`

8. 相关测试仍锁定旧文案 / 旧命令
   - 位置：`tests/integration/oclif-cli.test.ts`, `tests/unit/demo-content.test.ts`, `tests/unit/demo-setup.test.ts`, `tests/unit/demo-render.test.ts`, `tests/unit/demo-bootstrap.test.ts`
   - 现状：这些测试目前显式断言 `auth-mini ... --origin ...`、`auth.example.com`、以及裸 `auth-mini` 子命令示例
   - 计划：随文档/demo 一起更新，作为防漂移回归测试

### B. `docs/` / demo 与实现存在真实冲突，需用户确认后才能改代码或 demo 逻辑的项

1. demo 当前仍把页面 origin 映射成 `start --origin ...`
   - 位置：`demo/setup.js:7-9`, `20`, `38`; `demo/index.html:36-38`, `77-95`, `319`, `403`, `422`; `demo/content.js:37-42`, `161-167`
   - 测试锁定位置：`tests/unit/demo-setup.test.ts:40-42`, `150-152`, `173-175`, `233-235`; `tests/unit/demo-content.test.ts:12`, `82`, `187`, `205`; `tests/unit/demo-render.test.ts:34-37`, `54-56`, `183-185`; `tests/unit/demo-bootstrap.test.ts:157-159`, `250-251`
   - 当前实现：CLI 已明确移除 `start --origin` / `--rp-id`，`tests/integration/oclif-cli.test.ts:329-345` 断言会拒绝这两个 flags
   - 冲突性质：这不是普通文案漂移，而是 demo 的“生成命令逻辑”和帮助文案都仍在输出一个已不存在的 CLI 合同
   - 建议处理：把 demo 从“生成 `start --origin ...` 命令”改成“生成 `npx auth-mini origin add ...` + `npx auth-mini start ... --issuer ...` 两步式命令/说明”
   - 需要你确认：是否按这个方向修改 demo 逻辑和所有相关测试

2. demo 当前把 cross-origin 配置说明写成“page origin must be listed in `--origin`”
   - 位置：`demo/content.js:38`, `41`, `161-167`; `demo/index.html:37`, `319`, `403`, `422`
   - 当前实现：实际合同是通过 `origin` topic 命令把 page origin 写入实例，而不是在 `start` 时传 `--origin`
   - 冲突性质：对外产品说明与现有 CLI/运行时合同冲突
   - 建议处理：统一改成 `npx auth-mini origin add <instance> --value <page-origin>` 口径
   - 需要你确认：是否按现有实现合同全面替换 demo 的这套说明

3. SDK 运行时代码默认 `baseUrl` 仍是 `https://auth-mini.local`
   - 位置：`src/sdk/singleton-entry.ts:644`
   - 当前实现：`createSingletonSdk()` 在未显式传入 `baseUrl` 时会落到这个默认值；而 `bootstrapSingletonSdk()` 常规路径会从 script URL 推导 base URL
   - 冲突性质：这是运行时代码默认值。用户已明确拒绝把它改成另一个具体域名，并要求 SDK 内部不应 fallback 到任何具体 host
   - 相关测试：需补/改 `tests/unit/sdk-base-url.test.ts`；另外，`tests/unit/sdk-state.test.ts` 当前直接无 `baseUrl` 调用 `createSingletonSdk()`，若最终合同要求 direct construction 显式传 `baseUrl`，该测试也需要同步调整
   - 用户确认结果：改，但方向不是替换成 `https://auth.zccz14.com`，而是移除“fallback 到具体域名”的行为；最终实现方案在 implementation plan 中细化，但本轮已确认需要修改运行时代码与测试

## 本轮实施边界

- 只处理上面 A/B 两组已列出的项。
- A 组可在你确认 spec 后直接实施。
- B 组涉及 demo 逻辑或运行时代码默认值，需你在 review spec 时一并确认要不要改。
- 若你否决某个 B 组项，我会把它从执行 plan 中排除，不在实施阶段再次提出。

## 文件与职责

- `README.md`：修正 CLI 示例、Auth Server 默认值、WebAuthn 请求说明、Operational limits 文案。
- `docs/deploy/docker-cloudflared.md`：修正对外命令示例与 issuer 示例值。
- `demo/index.html`、`demo/setup.js`、`demo/content.js`：按用户确认结果修正文案、生成命令、API reference 与 caveats。
- `src/sdk/singleton-entry.ts`：按用户确认结果，移除 fallback 到具体域名的默认 `baseUrl` 行为。
- `tests/integration/oclif-cli.test.ts`：锁定 README 中 `npx auth-mini`、移除旧 `--origin` / `--rp-id` 示例、统一默认 issuer 示例值。
- `tests/unit/demo-content.test.ts`、`tests/unit/demo-setup.test.ts`、`tests/unit/demo-render.test.ts`、`tests/unit/demo-bootstrap.test.ts`：锁定 demo 说明与生成命令的新合同。
- `tests/unit/sdk-base-url.test.ts`：补充或更新“不得 fallback 到具体域名”的对应断言。
- `tests/unit/sdk-state.test.ts`：仅在 direct `createSingletonSdk()` 合同改为必须显式传 `baseUrl` 时，同步更新该测试调用方式。

## 验证策略

- 优先补或更新测试，再改实现/文档。
- 文件级检查范围固定为：
  - `README.md`
  - `docs/deploy/docker-cloudflared.md`
  - `demo/index.html`
  - `demo/setup.js`
  - `demo/content.js`
  - `src/sdk/singleton-entry.ts`（仅当你确认要改运行时默认值）
  - `tests/unit/sdk-state.test.ts`（仅当实现方案需要同步 direct `createSingletonSdk()` 测试调用）
- 需要通过的最小测试集：
  - `npm test -- tests/integration/oclif-cli.test.ts`
  - `npm test -- tests/unit/demo-setup.test.ts`
  - `npm test -- tests/unit/demo-content.test.ts`
  - `npm test -- tests/unit/demo-render.test.ts`
  - `npm test -- tests/unit/demo-bootstrap.test.ts`
  - `npm test -- tests/unit/sdk-webauthn.test.ts`
  - `npm test -- tests/unit/sdk-base-url.test.ts`
- 机器可检查的完成条件：
  - README / deploy / demo 中不再向用户展示 `start --origin` 或 `--rp-id` 启动命令
  - README / deploy / demo 的 user-facing CLI snippets 统一为 `npx auth-mini`
  - README 与 demo 的 WebAuthn options 请求说明包含 `rp_id`
  - `src/sdk/singleton-entry.ts` 中不再保留 `https://auth-mini.local`
  - SDK 不再 fallback 到任何具体域名字符串
- 若改动影响构建产物，再运行 `npm run build` 以刷新 `dist/` 并验证无漂移。

## 风险与应对

- 风险：demo 旧 `--origin` 逻辑牵涉页面文案、生成命令、API guidance 与多组测试，不是单点替换。
  - 应对：已在 B 组冲突项中整体列出，只有在你确认后才实施。
- 风险：README 测试当前对 `origin` / `smtp` 示例是否使用 `npx` 没有完全锁死，可能导致修文档后测试仍不足。
  - 应对：同步加强相关断言。
- 风险：移除 SDK 的具体域名 fallback 后，若某些测试或少量调用路径隐式依赖该默认值，会出现局部失败。
  - 应对：以 `tests/unit/sdk-base-url.test.ts` 锁定目标行为，并在 implementation plan 中明确最小改法。

## 验收

- A 组项全部完成，且没有新增 spec 外修复项。
- README、deploy docs、demo 中不再向用户展示 `auth-mini start ... --origin ...` 或 `--rp-id ...` 旧启动命令。
- 面向用户执行的 CLI 命令示例统一使用 `npx auth-mini ...`。
- README、deploy docs、demo 的默认 Auth Server 示例值统一为 `https://auth.zccz14.com`。
- `POST /webauthn/register/options` 与 `POST /webauthn/authenticate/options` 的文档说明都包含 `rp_id` 合同，且不再误导为空 body。
- `Current caveats` / `Operational limits` / 相关 notes 不再保留与当前源码/测试冲突的旧表述。
- `src/sdk/singleton-entry.ts` 不再保留 `https://auth-mini.local`，且 SDK 不再 fallback 到任何具体域名。
- B 组冲突项只在获得你的明确确认后才会实施；本轮已确认 B.1、B.2、B.3 进入执行 plan。
