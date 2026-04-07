# AuthMini 全面重命名设计

## 背景

- 当前浏览器 SDK 通过 `window.MiniAuth` 暴露全局单例。
- SDK 内部类型、工厂函数、测试 helper、demo 文案与 README 也普遍使用 `MiniAuth` 命名。
- 用户确认当前没有历史兼容包袱，接受一次性破坏性改名。

## 目标

- 将 SDK 对外品牌与代码标识从 `MiniAuth` 统一改为 `AuthMini`。
- 保证浏览器全局入口、文档示例、demo、测试与内部 SDK 类型命名保持一致。
- 保持现有运行时行为不变，本次只做命名统一，不改变现有 API shape 与业务语义。

## 非目标

- 不改仓库名、包名、目录名等项目级命名，例如 `mini-auth`。
- 不改与 SDK 命名无关的业务语义、接口路径、存储键或服务端行为。
- 不提供 `window.MiniAuth` 兼容别名。
- 不回写历史归档 spec/plan 与 `.legion/` 记录中的旧命名，它们保留为历史描述。

## 决策

采用一次性全面重命名：把所有直接代表 SDK 标识的 `MiniAuth` 改为 `AuthMini`，包括浏览器全局变量、TypeScript 类型名、内部工厂函数、测试 helper 名、demo/README 中的调用示例与用户可见字符串。

## 影响范围

### 判定规则

- 必须改：浏览器全局名、导出类型、SDK 工厂函数、test helper 名、demo/README 示例、用户可见报错/提示、可被使用者观察到的 error name。
- 不改：仓库名、包名、目录名、接口路由、存储键、历史 spec/plan、`.legion/` 记录。

### 运行时与类型

- `src/sdk/singleton-entry.ts` 中的 `window.MiniAuth` 改为 `window.AuthMini`。
- `Window` 全局声明中的 `MiniAuth` 属性改为 `AuthMini`。
- `MiniAuthApi`、`MiniAuthInternal` 等 SDK 类型重命名为 `AuthMiniApi`、`AuthMiniInternal`。
- `createMiniAuthInternal` 等直接代表 SDK 标识的工厂函数重命名为 `createAuthMiniInternal`，并同步更新引用。
- 仅重命名标识，不调整 API shape、状态流转、错误处理与 bootstrap 逻辑。

### 测试与辅助工具

- `tests/helpers/sdk.ts` 中测试 helper 名与导入名一并改为 `AuthMini`。
- 所有断言 `window.MiniAuth` 或 `MiniAuth...` 文案的测试同步更新。
- 增加或调整一个浏览器 SDK 挂载断言，明确验证全局对象名为 `AuthMini`。

### 文档与 demo

- `README.md` 与 `demo/**` 中所有面向用户的 `MiniAuth` 调用示例改为 `AuthMini`。
- 所有直接读取浏览器全局 SDK 的运行时代码路径一并更新为 `window.AuthMini`，包括 demo bootstrap/runtime、served SDK endpoint 断言与相关测试 helper。
- 所有用户可见提示，如 “MiniAuth SDK did not load”，统一改为 “AuthMini SDK did not load”。
- 历史 design/plan 文档不回写，避免把一次 rename 扩散为历史文档整理工程。

### 内部字符串

- 凡是会出现在浏览器全局、导出类型、demo、测试断言、README、用户可见报错、可观察 error name 中的 `MiniAuth`，必须全部改为 `AuthMini`。
- 仅限完全未导出、不会进入用户运行时表面、不会出现在断言或提示文案中的内部常量，才允许保留旧名；如实现中无法明确证明满足这些条件，则默认一并重命名。

## 兼容性与迁移

- 这是一次破坏性变更：依赖 `window.MiniAuth` 的页面必须改为 `window.AuthMini`。
- 因用户明确说明没有历史包袱，不增加兼容层与迁移期别名，避免双命名继续扩散。

## 验证策略

- 先把受影响的 SDK/browser/demo 测试改为期望 `AuthMini`，确认至少有一项因旧实现失败。
- 再完成实现改名，使测试恢复通过。
- 最后运行以下命令作为验收：
  - `npm test`
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`
- 运行 `rg -n "MiniAuth" src demo tests README.md`，结果必须为空。
- 允许历史 spec/plan、`.legion/` 与本次 rename 设计文档继续出现 `MiniAuth` 作为历史描述；如需做仓库级检查，可用 `rg -n "MiniAuth" .`，结果只允许出现在这些历史/设计文档位置。
- 允许历史 spec/plan、`.legion/` 与本次 rename 设计文档继续出现 `MiniAuth` 作为历史描述。
- 至少保留两类可执行验收：
  - `/sdk/singleton-iife.js` 的 served source/集成测试同时验证脚本挂载 `window.AuthMini`，且不再挂载 `window.MiniAuth`。
  - demo bootstrap 或相关集成测试同时验证页面读取的是 `window.AuthMini`，且代码路径与提示文案中不再出现旧名。

## 风险与控制

- 风险：仓库内仍残留对外 `MiniAuth` 字符串，导致文档与实际 API 不一致。
  - 控制：仅在 `src/`、`demo/`、`tests/` 与 `README.md` 范围内做定向搜索，清理对外残留，同时明确放过历史归档文档与 `.legion/` 记录。
- 风险：把项目级名称也一并误改，扩大 scope。
  - 控制：仅改直接代表 SDK 标识的命名，明确保留仓库名、目录名、存储键等非目标项。
