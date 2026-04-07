# origin / rpId 启动与运行时关系设计

## 背景

- 当前 `start` 启动流程会从 `allowed_origins` 读取第一条 origin，并把它的 hostname 当作全局 `rpId` 注入应用。
- 当前实现还要求实例数据库里必须至少存在一条 allowed origin，否则启动直接失败。
- 但运行中的 WebAuthn `rp_id` 实际并不依赖这个启动期全局值；请求阶段已经支持客户端显式传入 `rp_id`，现准备进一步收紧为必填输入。
- 用户明确要求：服务启动时不能假设 origin 非空；同时 `rpId` 不应由某条 origin 在启动期预先决定。

## 目标

- 允许实例在没有任何 allowed origin 的情况下启动。
- 去掉启动期“第一条 origin 派生全局 `rpId`”的错误模型。
- 将 WebAuthn options 接口中的 `rp_id` 收紧为必填参数，删除服务端 fallback 推导。
- 保留服务端对 `rp_id` 的约束：不能无条件接受任意 `rp_id`，它必须落在当前实例允许的 origins 范围内。

## 非目标

- 不把 `rpId` 做成新的持久化全局配置项。
- 不新增启动参数来提供全局 `rpId`。
- 不改变 WebAuthn challenge / credential 表中继续持久化 `rp_id` 的现有模型。
- 不放宽为“无 origin 时接受任意 `rp_id`”。
- 不把 SDK 对外的 `rpId` 参数一并收紧为必填；SDK 仍保留浏览器侧默认化能力。

## 决策

采用“启动去耦合、请求期显式声明”的模型：`start` 只加载 allowed origins 作为运行时 allowlist，不再从中派生全局 `rpId`。WebAuthn 在每次 options 请求里都必须显式提供本次流程使用的 `rp_id`，服务端再校验该 `rp_id` 是否被当前实例的 allowed origins 覆盖；如果实例没有任何 allowed origin，服务可以正常启动，但所有依赖 `rp_id` 判定的 WebAuthn 请求都会在运行时明确失败。

## 现状根因

- `src/app/commands/start.ts` 目前把 `allowed_origins` 的第一条记录当作 primary origin。
- 启动期要求 primary origin 必须存在，导致没有 origin 的实例根本无法启动。
- 启动期又把 `new URL(primaryOrigin).hostname` 作为全局 `rpId` 注入 `createApp`。
- 但应用路由和 WebAuthn service 实际并不消费这个全局 `rpId`；真正入库的 `rp_id` 来自 options 请求体。
- 因此当前问题主要是启动模型错误，以及 options 接口仍保留了不必要的 fallback 推导。

## 设计

### 启动层

- `start` 允许 `allowed_origins` 为空数组。
- `loadStartRuntimeResources` 不再因为没有 origin 抛错。
- 启动层不再派生或返回全局 `rpId`。
- `createApp` 的注入参数与 request context 同步移除未被使用的全局 `rpId` 字段。

### WebAuthn 请求层

- `generateRegistrationOptions` 与 `generateAuthenticationOptions` 的请求体都必须显式提供 `rp_id`。
- WebAuthn options 请求的 origin 来源必须唯一且显式：
  - 优先使用 HTTP `Origin` header
  - 若没有 `Origin` header，则使用当前请求 URL 的 origin
  - 不允许再回退到 allowlist 第一项
  - 不允许再使用示例值或占位 origin
- `rp_id` 仍需做规范化与合法性校验；缺失时直接视为无效请求。
- WebAuthn options 请求需要双重门禁：
  - 请求 origin 本身必须属于当前实例的 allowed origins
  - `rp_id` 必须被当前实例的 allowed origins 集合中的至少一项合法覆盖
- WebAuthn options 请求还需要保持当前请求 origin 与本次 `rp_id` 组合本身成立：
  - 当前请求 origin 的 hostname 必须等于 `rp_id`，或是 `rp_id` 的子域
  - `localhost` 与 IP 地址场景仍只允许精确匹配
- `rp_id` 不再与启动期某个固定值比较。

### SDK 层

- Browser SDK 对外的 `rpId` 仍保持可选。
- 当外部调用未显式传入 `rpId` 时，SDK 在浏览器侧使用当前页面 `window.location.hostname` 补出要发送给服务端的 `rp_id`。
- 当外部调用显式传入 `rpId` 时，SDK 必须原样透传该值，允许调用方用父域名覆盖默认 hostname。
- 因此本次收紧的是 HTTP API 合同，而不是 SDK 的对外调用形态。

### origin 与 rpId 的关系

- `origin` 不再负责在启动期生成一个全局 `rpId`。
- `origin` 仍然是信任边界：
  - 发起 WebAuthn options 的请求 origin 必须先通过 allowlist 校验
  - 实例只接受属于当前 allowed origins 范围内的 `rp_id`
  - 当前请求 origin 与本次 `rp_id` 组合本身也必须满足 WebAuthn 的 host / parent-domain 关系
- 校验规则沿用现有语义：
  - 若某个 allowed origin 的 hostname 等于 `rp_id`，允许
  - 若某个 allowed origin 的 hostname 是 `rp_id` 的子域，允许
  - `localhost` 与 IP 地址不允许做父域推导，必须精确匹配
- 判定对象从“单个 primary origin”改为“allowed origins 集合中的任意一项”。

### 无 origin 场景

- 服务启动成功。
- 非 WebAuthn 能力不受影响。
- 所有 WebAuthn options 请求都会失败，因为当前实例没有任何 allowed origin，既无法通过请求 origin allowlist，也无法确认 `rp_id` 落在允许范围内。
- verify 阶段继续依赖 challenge 中已经持久化的 `rp_id` 与 `origin` 做一致性校验；由于 options 无法创建 challenge，无 origin 场景下不会进入有效的 WebAuthn verify 流程。

## 影响范围

### 启动与应用装配

- `src/app/commands/start.ts`
  - 删除“至少一条 origin 才能启动”的硬失败
  - 删除启动期 `rpId` 派生与返回值
- `src/server/app.ts`
  - 删除 `AppVariables` 与 `createApp` 输入中的全局 `rpId`
  - 将两个 WebAuthn options 路由的 `rp_id` 合同收紧为必填
  - 保持 WebAuthn verify 路由继续从 challenge 消费已保存的 `rp_id`

### SDK

- `src/sdk/types.ts`
  - 保持 `passkey.register` / `passkey.authenticate` 的 `rpId` 为可选输入
- `src/sdk/singleton-entry.ts`
  - 在调用两个 WebAuthn options 接口前，若未传 `rpId`，则用当前页面 hostname 补出 `rp_id`
  - 若外部传入 `rpId`，则原样透传给服务端，不做覆盖
- SDK 的默认化只发生在浏览器侧；服务端不再承担缺失 `rp_id` 的补全逻辑

### WebAuthn service

- `src/modules/webauthn/service.ts`
  - 接收由路由层明确传入的本次请求 origin；不再在 service 内回退到示例 origin 或 allowlist 第一项
  - 先校验请求 origin 本身属于 allowed origins
  - 再校验当前请求 origin hostname 与本次 `rp_id` 组合本身成立
  - 再把 `rp_id` 允许性判断从“当前请求 origin hostname”扩展为“实例 allowed origins 集合”
  - 删除 `rp_id` 缺失时回退到 origin hostname 的逻辑
  - 保留 challenge/credential 持久化与 verify 绑定逻辑
  - 在没有任何 allowed origin 或 `rp_id` 不落在允许范围内时，继续抛出现有 invalid WebAuthn 错误族

### 测试

- 删除或改写“从第一条 origin 派生临时 `rpId`”的单元测试预期。
- 新增启动层测试：无 origin 时仍可启动。
- 新增 WebAuthn 测试：
  - 无 allowed origin 时 options 失败
  - `rp_id` 缺失时 options 失败
  - 无 `Origin` header 时，使用请求 URL origin 作为唯一回退来源
  - 请求 origin 不在 allowlist 时 options 失败，即使 `rp_id` 可被其它 allowed origin 覆盖也不放行
  - 当前请求 origin 与 `rp_id` 是 sibling host 或其它不成立组合时 options 失败，即使二者都各自出现在 allowlist 范围内
  - 有 allowed origins 时，只接受属于 allowlist 范围内的 `rp_id`
  - 多 origin 场景下，只要 `rp_id` 被任一 allowed origin 合法覆盖即可接受
  - 不接受与 allowlist 无关的 `rp_id`
- 新增 SDK 测试：
  - 未传 `rpId` 时，SDK 使用当前页面 hostname 发送 `rp_id`
  - 传入 `rpId` 时，SDK 原样透传该值，允许父域名覆盖
  - SDK 不再依赖服务端 fallback 来补全缺失 `rp_id`

## 数据与兼容性

- 数据库 schema 无需变更。
- `webauthn_challenges.rp_id` 与 `webauthn_credentials.rp_id` 继续记录每次流程实际使用的 `rp_id`。
- 现有已经入库的 challenge / credential 数据模型保持兼容。
- 这是一次运行时行为修正，不引入新的持久化迁移。

## 风险与控制

- 风险：错误地把“无 origin 可启动”实现成“无 origin 也允许任意 `rp_id`”。
  - 控制：明确要求无 origin 时仅启动成功，WebAuthn options 仍失败。
- 风险：修掉启动期 `rpId` 后仍保留错误的 origin 回退来源，导致请求在缺少 `Origin` 头时落到错误默认值。
  - 控制：明确 origin 只允许来自 `Origin` header 或请求 URL origin，并增加对应测试。
- 风险：HTTP schema、路由层与 service 合同不一致，导致 `rp_id` 在部分入口仍被当成可选。
  - 控制：把 HTTP schema、路由层与 service 测试同时收紧到必填语义。
- 风险：只修改服务端合同，遗漏 SDK 仍然可能发送缺失 `rp_id` 的请求。
  - 控制：明确 SDK 继续对外保持可选，但必须在浏览器侧补齐并增加对应测试。
- 风险：只校验 `rp_id`，遗漏请求 origin 自身的 allowlist 门禁，意外放宽 challenge 创建边界。
  - 控制：明确采用双重门禁，并增加“origin 不允许但 rp_id 可覆盖”仍失败的测试。
- 风险：多 origin 场景只看 allowlist 集合覆盖，放过当前请求 origin 与 `rp_id` 之间并不成立的 sibling host 组合。
  - 控制：增加第三条组合约束，并新增 sibling host 失败测试。
- 风险：删除启动期 `rpId` 时误伤请求期 WebAuthn 行为。
  - 控制：保留 challenge/credential 绑定测试，并新增 `rp_id` 必填合同测试。
- 风险：多 origin 实例的 `rp_id` 允许性校验只检查当前请求 origin，遗漏其它 allowlist 场景。
  - 控制：新增多 origin 覆盖测试，要求 `rp_id` 只要被任一 allowed origin 合法覆盖即可接受。

## 验证策略

- 先新增或改写测试，使旧实现暴露两个问题：
  - 无 origin 时启动失败
  - WebAuthn options 仍存在 `rp_id` fallback、错误的 origin 回退与单 origin 判定模型
- 再做最小实现修改让测试转绿。
- 验收命令：
  - `npm test`
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`
