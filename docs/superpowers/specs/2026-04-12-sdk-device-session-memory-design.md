# SDK 设备会话内存态设计

## 背景

- 当前仓库已经具备浏览器 SDK 与 ED25519 设备认证相关的服务端能力，但缺少一个面向设备/机器场景的专用 SDK 工厂。
- 设备侧的核心诉求是：只提供 `serverBaseUrl`、`credentialId`、`privateKey` 这组三元输入，即可自动完成 challenge 获取、签名验签、会话建立与 `/me` 同步。
- 现有 `createBrowserSdk` 已经承载浏览器存储与会话恢复语义；本轮不能破坏它的既有行为。
- 本轮需要明确一个“单实例、纯内存、可释放”的设备 SDK 合同，为后续实现提供边界，但不在 spec 中展开实现计划。

## 目标

- 新增独立的设备 SDK 工厂，推荐公开形态为 `createDeviceSdk(...)`。
- 工厂核心输入边界固定为 `serverBaseUrl`、`credentialId`、`privateKey`。
- 工厂创建后自动执行 ED25519 设备登录：启动 challenge、用本地私钥签名、调用 verify、获取 session，并随后拉取 `/me`。
- 会话状态只保存在内存中，不写入 `Storage` / `localStorage`，也不在多个 SDK 实例之间共享。
- 每次调用工厂都返回一个彼此隔离的实例，各自拥有独立的会话生命周期、自动刷新与释放行为。
- 实例暴露 `ready`，用于表示首次自动建链与会话初始化结果。
- 实例支持释放语义：优先支持 `AsyncDisposable` 的 `[Symbol.asyncDispose]`，同时提供显式 `dispose(): Promise<void>`。
- 释放后停止后续刷新/恢复更新、清理全部本地内存态，并让依赖有效会话的 API 以清晰 SDK 错误（如 `disposed_session`）失败。
- 在不改变既有契约的前提下，尽量复用现有 session 语义：`recovering | authenticated | anonymous` 状态、自动 refresh、瞬时失败保留可恢复态、认证失效错误清空状态。

## 非目标

- 不修改 `createBrowserSdk` 的现有行为、存储策略或跨实例语义。
- 不为设备 SDK 增加本地持久化、跨进程共享、跨实例共享、后台守护进程或全局单例能力。
- 不在本轮引入新的认证协议、新的 token 类型、额外的设备注册流程或私钥生成/托管能力。
- 不要求设备 SDK 与浏览器 SDK 在公开 API 形状上完全一致；本轮只要求复用已验证的 session 语义。
- 不在 spec 中展开实现文件拆分、内部模块结构、迁移步骤或详细 implementation plan。

## 决策

新增一个独立于 `createBrowserSdk` 的设备 SDK 工厂 `createDeviceSdk(...)`。该工厂接收 `serverBaseUrl`、`credentialId`、`privateKey`，创建后立即自动执行 ED25519 认证链路并建立内存态 session；每个实例只维护自身的 session / `/me` / refresh 生命周期，不做任何持久化，也不与其他实例共享状态。实例通过 `ready` 暴露首次自动登录结果，并通过 `dispose()` / `[Symbol.asyncDispose]` 提供幂等释放：尝试远端 logout、必定清空本地内存态、终止未来恢复与刷新，并阻止后续依赖 session 的 API 继续工作。

## 方案对比

### 方案 A：新增独立 `createDeviceSdk(...)` 工厂（采用）

- 优点：与现有浏览器 SDK 的职责边界最清晰；可以把“纯内存、单实例、自动登录、可释放”作为设备场景的专属合同；不会把持久化或浏览器环境假设带入设备侧。
- 缺点：需要在 SDK 层维护一套与浏览器 SDK 平行的工厂入口与实例生命周期语义。

### 方案 B：在 `createBrowserSdk(...)` 上增加 `mode: 'device'` 等分支

- 优点：入口更少，表面上减少 API 数量。
- 缺点：会把浏览器存储语义与设备内存语义混在同一个工厂里，增加配置耦合，并提高回归 `createBrowserSdk` 的风险。

### 方案 C：提供无状态 helper，只暴露“登录一次并返回 token”

- 优点：实现看起来更轻。
- 缺点：无法承接本轮明确要求的自动 refresh、`ready`、隔离实例生命周期与可释放 session 管理，因此不满足已批准范围。

## 公开合同

### 工厂入口

- 推荐公开入口：`createDeviceSdk(options)`。
- `options` 的核心输入边界为：
  - `serverBaseUrl`
  - `credentialId`
  - `privateKey`
- 这三项构成本轮必须支持的最小输入集合；如后续需要额外配置，应作为可选扩展而不是替代这三项核心参数。

### 实例职责

每个 `createDeviceSdk(...)` 返回值都代表一个独立设备会话实例，至少承担以下职责：

- 自动完成首次设备认证与 `/me` 同步。
- 暴露当前 session 状态与依赖该 session 的 API 能力。
- 在 session 接近过期时自动 refresh。
- 在实例释放时终止其生命周期。

### `ready`

- 实例必须暴露 `ready`，用于表示“首次自动建立 session 并同步 `/me`”这一过程的完成结果。
- `ready` 成功意味着以下动作都已完成：
  - challenge 已启动；
  - challenge 已使用 `privateKey` 完成本地签名并通过 verify；
  - session 已建立到实例内存态；
  - `/me` 已成功拉取并写入当前实例状态。
- `ready` 失败意味着首次自动建链未完成，调用方可据此决定重试、记录错误或直接释放实例。

## 认证与会话流程

### 初始自动认证

创建实例后，SDK 自动执行以下顺序：

1. 使用 `credentialId` 向服务端发起 challenge start。
2. 使用本地 `privateKey` 对 challenge 原文执行 ED25519 签名。
3. 提交 verify 请求并获取标准 session。
4. 按现有 session 语义写入当前实例的内存态。
5. 拉取 `/me`，让实例在 `ready` 成功时已经具备可直接使用的会话与用户视图。

### 状态模型

- 设备 SDK 复用既有 session 状态语义：`recovering | authenticated | anonymous`。
- `recovering` 表示实例正在做首次建链或后续恢复/刷新中的校验过程。
- `authenticated` 表示当前实例持有可用 session，且 `/me` 已与之对齐。
- `anonymous` 表示当前实例不持有可继续使用的已认证会话。

### 自动 refresh

- 设备 SDK 默认启用自动 refresh。
- 自动 refresh 的语义应尽量与现有 session 语义保持一致，而不是另起一套设备专属规则。
- refresh 期间如遇瞬时失败，应尽量保留可恢复状态，不立刻抹除本地上下文。
- refresh 期间如遇认证失效类失败，则应清理当前实例会话并转入 `anonymous`。

## 内存隔离与实例边界

### 纯内存要求

- session 状态只保存在实例内存中。
- 明确禁止写入 `Storage`、`localStorage` 或其他持久化介质。
- 页面刷新、进程重启或实例销毁后，不要求保留任何可恢复状态。

### 实例隔离

- 每次调用 `createDeviceSdk(...)` 都必须返回一个新的隔离实例。
- 实例之间不得共享 session、`/me`、refresh 定时器、恢复状态或订阅器。
- 一个实例的登录、refresh、失败、dispose 都不得隐式影响另一个实例。

## 释放语义

### 公开释放接口

- 实例应优先支持 `AsyncDisposable` 语义，即 `[Symbol.asyncDispose]`。
- 同时必须提供显式 `dispose(): Promise<void>`，保证在不依赖语言级 `using` 语法时也可调用。
- `[Symbol.asyncDispose]` 与 `dispose()` 必须语义等价，而不是两套不同清理流程。

### `dispose()` 行为

`dispose()` 必须满足以下合同：

- 幂等：重复调用不会重新激活实例，也不会产生不一致的清理结果。
- 尝试远端 logout：若实例仍持有可用或可恢复的 session，应尽力调用远端注销。
- 始终清理本地内存态：无论远端 logout 成功、失败或超时，本地 session / `/me` / 恢复状态都必须被清空。
- 停止未来更新：释放后不得继续触发 refresh、恢复、状态推送或其他异步补写。
- 阻止后续使用：实例一旦释放，依赖有效 session 的 API 必须以清晰 SDK 错误失败，推荐错误码为 `disposed_session`。

### 释放后的错误语义

- 对仍依赖活跃 session 的 API，释放后应统一报出清晰且可判定的 SDK 错误。
- 推荐错误标识为 `disposed_session`，用于区分“实例已释放”与“普通匿名态 / 认证失败 / 网络失败”。
- 该错误语义应覆盖显式 `dispose()` 与 `[Symbol.asyncDispose]` 两种释放入口后的行为。

## 与现有浏览器 SDK 的关系

- `createBrowserSdk` 行为必须保持不变。
- 设备 SDK 是新增的独立工厂，不得通过修改 `createBrowserSdk` 现有默认行为来间接实现。
- 两者可以复用底层 session 规则，但不能让浏览器 SDK 被动继承“仅内存态”或“实例释放后禁用”的新行为变化。

## 测试期望

本轮只记录设计层测试期望，不展开具体实现计划。实现阶段至少应覆盖：

- 初始自动登录：创建实例后，`ready` 能驱动 challenge → 签名 → verify → `/me` 全链路完成。
- 自动 refresh：已认证实例会在既有 session 规则下自动刷新并保持 `/me` 一致性。
- refresh 瞬时失败处理：临时网络或瞬时失败不会过早清空可恢复状态。
- refresh 认证失效处理：认证失效类失败会清空当前实例会话并转入匿名态。
- dispose / logout 行为：`dispose()` 会尝试远端 logout，并无论远端结果如何都清空本地内存态。
- async dispose 一致性与幂等：`[Symbol.asyncDispose]` 与 `dispose()` 表现一致，重复释放不会产生额外副作用或恢复实例可用性。

## 验收标准

- 存在独立的设备 SDK 工厂，推荐公开形态为 `createDeviceSdk(...)`。
- 工厂核心输入边界包含且至少包含 `serverBaseUrl`、`credentialId`、`privateKey`。
- 工厂创建后自动完成 ED25519 challenge 登录、session 建立与 `/me` 拉取。
- session 仅保存在内存中，不持久化，也不在实例之间共享。
- 每个工厂调用都返回独立实例，并拥有独立的 session 生命周期。
- 实例暴露 `ready` 表示首次自动会话建立结果。
- 实例支持 `[Symbol.asyncDispose]` 与 `dispose(): Promise<void>` 两种等价释放入口。
- `dispose()` 幂等、尝试远端 logout、必定清空本地内存态、停止未来更新并禁止后续依赖 session 的 API 继续使用。
- 释放后依赖活跃 session 的 API 抛出清晰 SDK 错误，推荐错误码 `disposed_session`。
- 设备 SDK 尽量复用既有 `recovering | authenticated | anonymous`、自动 refresh、瞬时失败保留可恢复态、认证失效清空状态等 session 语义。
- `createBrowserSdk` 的现有行为不发生变化。

## 风险与控制

- 风险：把设备 SDK 做成浏览器 SDK 的模式分支，导致 `createBrowserSdk` 契约被连带改变。
  - 控制：明确要求新增独立 `createDeviceSdk(...)` 工厂，浏览器 SDK 行为保持不变。
- 风险：实例在释放后仍有 refresh 或恢复异步任务回写状态，导致“已释放实例复活”。
  - 控制：spec 明确要求释放后停止未来更新，并让依赖 session 的 API 统一失败为 `disposed_session`。
- 风险：为了“方便恢复”而把设备 session 落盘，扩大凭据暴露面。
  - 控制：spec 明确限制为纯内存态，不写 `Storage` / `localStorage`，不做跨实例共享。
- 风险：把 refresh 失败统一立即清空，破坏既有可恢复语义。
  - 控制：spec 要求复用现有 session 语义：瞬时失败保留可恢复态，认证失效类失败才清空。
