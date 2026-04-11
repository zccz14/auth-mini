# `examples/demo` GitHub Pages 发布切换设计

## 背景

- 仓库已经引入新的 `examples/demo` Vite React demo，并在根包保留了 `demo:build` 入口用于串联根包构建与 demo 构建。
- 当前 GitHub Pages 工作流仍直接发布旧 `demo/` 目录，README 中的 demo 指引也仍指向旧路径，导致对外发布链路与当前正式 demo 形态不一致。
- 已确认采用方案 2：保留根级统一发布入口，把 GitHub Pages 发布目标切换到 `examples/demo`，并让旧 `demo/` 从发布链路退役。

## 目标

- 将 GitHub Pages 的 demo 发布源从旧 `demo/` 切换到 `examples/demo/dist`。
- 保留根级 `npm run demo:build` 作为唯一 demo 发布构建入口。
- 让 CI 明确覆盖根依赖安装、`examples/demo` 依赖安装，以及先构建根包、再构建 demo 的顺序。
- 同步 README 中 live demo / demo 相关说明，使其与 `examples/demo` 的新定位一致。
- 在不追改历史 spec 文档的前提下，完成当前发布链路切换设计。

## 非目标

- 不在本设计中重做 `examples/demo` 的产品体验、路由结构或 UI 方案。
- 不为旧 `demo/` 保留新的发布职责或兼容性发布路径。
- 不追溯修改历史 spec，让旧文档改写为“当时就已包含发布切换”。
- 不把本轮扩展成 workspace/monorepo 架构改造。

## 决策

采用方案 2：保留仓库根级 `demo:build` 作为唯一 demo 发布入口，由该命令先构建根包，再触发 `examples/demo` 构建；`pages.yml` 只通过根级命令生成发布产物，并上传 `examples/demo/dist`；README 与相关说明统一指向 `examples/demo`；旧 `demo/` 退出发布链路，且在确认不存在运行时、测试或脚本依赖后可直接删除旧目录。

## 发布链路边界

### 构建入口

- 根级 `demo:build` 必须继续存在，并作为本仓库唯一的 demo 发布构建入口。
- GitHub Pages 工作流不得绕过根级入口，直接在 workflow 内手写另一套 demo 构建命令。
- `demo:build` 的职责边界保持明确：先产出根包浏览器 SDK / 发布所需构建结果，再构建 `examples/demo`。

### Pages 工作流

- `pages.yml` 必须通过根级命令构建 demo。
- Pages artifact 上传路径必须指向 `examples/demo/dist`，不再指向旧 `demo/`。
- workflow 需要显式体现发布链路所需的安装与构建顺序，避免出现仅安装根依赖或遗漏 `examples/demo` 依赖的情况。

### CI 安装与构建顺序

- CI 必须覆盖根目录依赖安装。
- CI 必须覆盖 `examples/demo` 目录依赖安装。
- CI 的构建顺序必须先完成根包构建，再完成 `examples/demo` 构建。
- 若 workflow 中已有独立校验步骤，它们可以继续存在，但不得与上述安装/构建顺序冲突。

## 文档边界

- README 中 live demo / demo 相关说明必须同步到 `examples/demo`，避免继续把旧 `demo/` 写成对外主入口。
- 文档应明确 `examples/demo` 是当前对外发布的 demo 位置，而 `docs/` 仍是静态参考资料主入口。
- 本轮不要求批量追改历史 spec 文档，只处理当前实现所需的 README 与发布链路说明。

## 旧 `demo/` 退役规则

- 旧 `demo/` 必须从 GitHub Pages 发布链路退役。
- 若确认旧目录已不存在运行时、测试或脚本依赖，则应删除旧 `demo/` 目录，避免仓库中保留失效发布源。
- 若仍存在依赖，本轮至少要先断开其发布职责，并在实现/验证中明确剩余依赖点，避免误删。

## 历史文档策略

- 历史 spec 文档不追改。
- 当前设计可以引用既有设计作为背景，但不要求回头修改先前关于“暂不改 CI / 暂不替换旧 demo”的历史结论。
- 发布切换以本 spec 为当前生效范围定义。

## 验证口径

- `npm run demo:build` 成功，并可产出 `examples/demo/dist`。
- 相关测试、检查或脚本断言能够覆盖新的发布链路约束，至少能发现根包未先构建、`examples/demo` 未安装依赖或 Pages 仍指向旧路径等回归。
- `pages.yml` 的 Pages artifact 路径明确指向 `examples/demo/dist`。
- README 中 live demo / demo 说明已与 `examples/demo` 对齐，不再把旧 `demo/` 当作当前发布入口。
- 若删除旧 `demo/`，需要有对应验证证明仓库运行时、测试与脚本未再依赖该目录。

## 风险与控制

- 风险：workflow 只切换 artifact 路径，但遗漏 `examples/demo` 依赖安装，导致 Pages 构建在 CI 中失败。
  - 控制：在 spec 中明确 CI 需同时安装根依赖与 `examples/demo` 依赖，并保持先根包、后 demo 的构建顺序。
- 风险：README 仍沿用旧 `demo/` 表述，导致用户理解与线上发布结果不一致。
  - 控制：把 README 的 live demo / demo 描述纳入本轮必做范围。
- 风险：旧 `demo/` 目录被过早删除，但仍被测试或脚本隐式引用。
  - 控制：删除前以运行时、测试、脚本依赖为门禁；若依赖仍在，先完成发布退役，再显式记录剩余依赖。
