# SDK `/me` 显式拉取与 Demo UI 自主管理设计

## 背景

- 当前浏览器 SDK 在 session 状态中维护 `me` 快照，并在认证相关动作后隐式刷新 `/me`，同时对外暴露 `sdk.me.get()` 与 `sdk.me.reload()`。
- 这种设计把“session 合同”和“当前用户资料快照”耦合在一起，导致 SDK 内部要承担共享 `/me` 状态同步、隐式刷新时机和缓存一致性责任。
- `examples/demo` 的 provider 也继续把 `user` 暴露给页面，页面层缺少对 `/me` 请求、加载态、错误态和局部刷新时机的明确所有权。
- 本轮已确认方向是收缩 SDK 责任边界：SDK 只保留显式 `/me` 拉取能力，不再管理共享 `me` 快照；Demo 页面自行拥有 `/me` 数据流。

## 目标

- SDK session 状态中不再包含 `me` 字段。
- SDK 移除隐式 `/me` 刷新与共享 `me` 快照管理。
- SDK 对外只保留显式 API：`sdk.me.fetch(): Promise<MeResponse>`。
- Demo provider 不再暴露 `user`。
- Demo 路由与页面自行负责 `/me` 的请求、loading、error 和本地 refresh 交互。

## 非目标

- 本轮不修改 `/me` 服务端响应结构。
- 本轮不新增新的 SDK 缓存层、订阅机制或全局 store 来替代 `session.me`。
- 本轮不把多个 demo 页面重新合并成统一的跨页 `/me` 数据中心。
- 本轮不顺手重做 demo 的视觉样式或路由结构，除非是移除 provider 共享 `user` 所需的最小联动调整。

## 必要 API 变更

### Session 合同

- `sdk.session.get()`、session store 以及相关事件语义中的 session 数据不再包含 `me`。
- SDK 内部不得再把 `/me` 响应写回 session，也不得通过 session 变更广播当前用户资料快照。
- 认证相关动作成功后，SDK 只更新 session 自身字段；是否需要读取最新 `/me`，由调用方显式决定。

### `/me` SDK API

- 删除 `sdk.me.get()`。
- 删除 `sdk.me.reload()`。
- SDK 仅保留 `sdk.me.fetch(): Promise<MeResponse>` 作为 `/me` 读取入口。
- `sdk.me.fetch()` 语义为“发起一次显式请求并返回服务端当前响应”，不承担共享缓存更新、副作用同步或隐式重试职责。

### 行为边界

- SDK 不再在 sign-in、sign-out、credential mutation、session refresh 等流程后自动触发 `/me` 请求。
- SDK 不再承诺存在可立即同步读取的全局 `me` snapshot。
- 需要当前用户资料的消费者必须自行决定何时调用 `sdk.me.fetch()`，以及如何保留本地结果。

## Demo 数据流调整

### Provider 边界

- Demo provider 继续负责 SDK 实例、session、认证动作等共享能力。
- Demo provider 不再暴露 `user`，也不再维护共享 `me` 状态或统一 `refreshMe` 能力。
- 页面若需要 `/me` 数据，必须直接在页面级或页面私有 hook 中调用 `sdk.me.fetch()`。

### 页面所有权

- 依赖当前用户资料的 demo 页面各自维护本地 `me`、`loading`、`error` 状态。
- 页面首次进入、用户主动刷新、页面内破坏性操作成功后是否重拉 `/me`，由页面本地逻辑显式决定。
- 页面不得再依赖 provider 注入的共享 `user` 或 `session.me`。
- 页面间不要求自动同步 `/me` 本地结果；跨页最新性以各页下一次显式 `sdk.me.fetch()` 为准。

### 典型页面联动

- Session、Credentials 以及其他依赖当前用户资料的 demo 页面，需要从“读取 provider user / session.me”迁移为“本地显式 fetch `/me` 后渲染”。
- 删除凭据、登出其他 session 或其他会改变 `/me` 结果的页面内操作成功后，应由对应页面自行再次调用 `sdk.me.fetch()` 完成局部刷新。
- 未登录时，页面应基于 session 是否 authenticated 决定是否禁止请求、展示 sign-in-required，或在请求失败时呈现本地错误态；这类分支不再由 provider 统一兜底共享用户数据。

## 兼容性与范围

- 这是一次有意的 SDK 合同收缩：任何依赖 `session.me`、`sdk.me.get()`、`sdk.me.reload()` 或 provider `user` 的调用点都必须迁移。
- 本轮范围聚焦浏览器 SDK 与 `examples/demo` 消费方式调整；若仓库内还有其他浏览器侧示例或测试依赖旧合同，应做同一轮最小必要迁移。
- 服务端 `/me` endpoint、响应字段和鉴权规则不属于本轮改动目标。
- 文档、类型声明、demo 测试与示例代码必须同步反映“显式 `fetch`、UI 自主管理”的新口径，避免遗留旧 API 暗示。

## 验证预期

- 类型与测试层面应能证明 session 类型中已无 `me`，且 `sdk.me.get()` / `sdk.me.reload()` 不再作为可用公开 API。
- SDK 相关测试应覆盖：`sdk.me.fetch()` 会显式请求 `/me` 并返回响应，但不会把结果写入 session 或触发共享快照更新。
- Demo 测试应覆盖：provider 不再提供 `user`；依赖 `/me` 的页面自行处理 loading / error / refresh，并在页面内操作成功后显式重新拉取 `/me`。
- 回归验证应确认：认证流程本身仍可正常工作，只是 `/me` 数据改为由消费者显式获取。

## 风险与控制

- 风险：实现时仍在某些认证流程里保留隐式 `/me` 刷新，导致新旧模型并存。
  - 控制：spec 明确要求 SDK 不再承担任何 `/me` 自动刷新与共享快照写回责任。
- 风险：demo 页面继续从 provider 或 `session.me` 偷读旧数据，造成迁移不完整。
  - 控制：spec 明确要求 provider 不再暴露 `user`，页面本地显式持有 `/me` 状态。
- 风险：调用方误以为 `sdk.me.fetch()` 仍会顺带更新全局状态，产生隐性依赖。
  - 控制：文档、类型与测试都要把 `fetch` 约束为“仅返回本次请求结果”的显式 API。
