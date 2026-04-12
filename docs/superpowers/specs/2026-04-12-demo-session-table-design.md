# `examples/demo` Session 页多会话表格设计

## 背景

- 当前 `examples/demo/src/routes/session.tsx` 只展示 `Current session` 与 `Current user` 两个 JSON panel，并提供 `Clear local auth state` 按钮。
- 浏览器 SDK 的 `session.me.active_sessions` 已包含当前登录用户的活跃 session 列表，元素结构为 `id / created_at / expires_at`。
- 仓库已具备“定向注销其他 session”的服务端能力，本轮只补齐 demo Session 页的可视化查看与触发入口，不扩展到新的顶层页面。

## 目标

- 在现有 `/session` 路由内直接新增一个 sessions table，展示 `me.active_sessions` 中的全部条目。
- 保留现有 `Current session` 与 `Current user` JSON panel，不改变它们的职责。
- 允许用户在表格中对单个 session 执行 `Kick`，并在点击后提供行级 pending 状态。
- `Kick` 成功后自动刷新当前 session / user 快照，使表格以服务端最新 `active_sessions` 为准。
- 为 demo Session 路由测试补齐表格渲染、空状态、错误提示和 kick 成功流程覆盖。

## 非目标

- 不新增独立的 Session 管理页、tab、嵌套路由或通用管理组件。
- 不修改 SDK 公共类型、后端接口、HTTP 文档或仓库其他产品页面。
- 不新增批量踢下线、筛选、排序、分页、搜索或“踢除全部其他 session”能力。
- 不移除或替换现有 JSON panel，也不把整个页面改造成纯表格页。

## UI 结构

- 页面仍使用当前 `FlowCard` 作为容器，顶部说明文案与 `Clear local auth state` 按钮保持存在。
- JSON 展示区域继续保留双列 `Current session` / `Current user`。
- 在 JSON 区域下方新增一个 `Active sessions` section，作为同一路由中的第三个信息块。
- 表格列固定为 `Session ID / Created At / Expires At / Action`。
- 表格直接按 `me.active_sessions` 原始数组顺序渲染，不额外过滤当前 session，也不在本轮引入“Current”标签或排序规则。
- 当用户未登录或 `me.active_sessions` 为空时，该 section 显示明确空状态文案，例如“暂无活跃 sessions”。

## 数据来源

- 表格数据唯一来源是共享 provider 当前 `session.me?.active_sessions`。
- `Action` 触发的目标 session id 直接取自对应数据行的 `id`。
- 页面刷新完成后的最新数据以重新拉取的 `/me` 或等价 session 刷新结果为准，不依赖本地手工删除行来维持最终一致性。

## 交互流程

1. `/session` 初次渲染时，页面先消费 provider 已有的 `session` / `user` 快照。
2. 若存在 `active_sessions`，则渲染完整表格；若为空，则显示空状态文案。
3. 用户点击某一行 `Kick` 后，仅该行进入 pending 状态；其他行与页面其他区域保持可见。
4. pending 期间，该行按钮禁用并显示进行中语义，避免重复提交。
5. 请求成功后，页面自动刷新当前认证快照，再按刷新后的 `active_sessions` 重新渲染表格、JSON panel 与相关文案。
6. 若目标行在刷新后已不存在，则它自然从表格消失；若服务端仍返回该行，则页面按刷新结果继续展示。

## 错误处理

- `Kick` 失败时，只在 sessions table 所在 section 内显示一条简洁错误信息，不影响上方 JSON panel 的展示。
- 错误提示必须允许用户直接重试；重试入口可以复用原行 `Kick` 按钮，不要求额外全局 toast 或弹窗。
- 新的一次成功请求后，应清除该 table section 的错误提示。
- 本轮不要求把 `Clear local auth state` 的错误语义与 table 行为打通。

## 测试范围

- 仅补充 `examples/demo/src/routes/session.test.tsx` 的路由级测试。
- 测试至少覆盖以下场景：
  1. 未登录或无 `active_sessions` 时显示现有 JSON panel 和明确空状态文案。
  2. 已登录且有多个 `active_sessions` 时，表格按原数组内容渲染全部行，不过滤当前 session。
  3. 点击某一行 `Kick` 时，该行进入 pending，成功后触发自动刷新并反映刷新后的列表。
  4. `Kick` 失败时，只在 table section 显示简洁错误，且用户可以再次点击重试。

## 验收标准

- `/session` 路由内新增 sessions table，而不是新页面。
- 表格直接渲染 `me.active_sessions` 的全部条目，包含当前 session 对应行。
- 现有 `Current session` 与 `Current user` JSON panel 继续保留。
- 空列表时有清晰的无数据提示，不出现空白区域。
- 单行 `Kick` 具有局部 pending 状态，并在成功后自动刷新页面所依赖的 session / user 快照。
- 失败反馈限制在 table section 内，文案简洁且用户可重试。
- 本轮变更范围仅限 demo Session 页设计与对应 route tests，不扩展到 SDK、后端或其他文档实现。
