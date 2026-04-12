# `examples/demo` 构建修复与专用 CI 设计

## 背景

- 根目录已提供 `npm run demo:build` 与 `npm run demo:typecheck`，其中 `demo:build` 会先执行根包构建，再执行 `examples/demo` 构建。
- `examples/demo` 自身已提供 `build`、`typecheck` 与 `test` 脚本，但当前仓库只有 GitHub Pages 发布工作流，没有一个专门面向 demo 质量门槛的独立 CI 工作流。
- 已批准方案要求把范围限制在 `examples/demo` 与 GitHub Actions：先在当前 worktree 复现 demo 构建失败，再做最小根因修复，并新增专用 CI 覆盖 demo build、demo typecheck 与 demo tests；现有 `pages.yml` 保持以部署为主，不承担额外检查职责。

## 目标

- 修复当前 `examples/demo` 构建链路中的实际失败点，并把改动限制在满足构建恢复所需的最小范围内。
- 新增独立的 demo CI 工作流，稳定执行 demo build、demo typecheck 与 demo tests。
- 保持 GitHub Pages 工作流继续专注于部署，不把 demo 质量检查堆叠进 `pages.yml`。

## 非目标

- 不扩展到根包主应用逻辑、其他 examples、发布镜像、publish/release 流程或无关脚本改造。
- 不把本轮扩展成通用 monorepo / workspace / CI 重构。
- 不新增与 demo build、demo typecheck、demo tests 无关的检查项。
- 不重做 `examples/demo` 的产品交互、页面结构或视觉设计。

## 决策

采用“最小修复 + 独立工作流”方案：先以当前实际失败为准修复 `examples/demo` 构建链路中的根因，只修改 demo 自身及其完成构建所必需的直接依赖配置；同时新增一个专用 GitHub Actions workflow，在单个 `ubuntu-latest` job 中按固定顺序准备根依赖与 `examples/demo` 依赖，并执行 `npm run demo:build`、`npm run demo:typecheck` 与 `npm --prefix examples/demo test`；现有 `pages.yml` 继续只负责构建发布产物并部署到 GitHub Pages，不吸收上述检查职责。

## 构建修复范围

### 允许变更范围

- `examples/demo` 目录下与 build / typecheck / test 直接相关的源码、配置、测试文件。
- 根目录中仅与 demo 构建入口直接相关的最小必要脚本或配置，例如已存在的 `demo:build`、`demo:typecheck` 所依赖的调用关系。
- `.github/workflows/` 下与 demo CI 或 Pages 部署边界相关的工作流文件。

### 修复原则

- 必须先复现当前 demo build 失败，再按失败根因做最小修复，不允许预防性大扫除。
- 若失败根因位于 `examples/demo` 内，优先在该目录内修复；只有当根级脚本/配置是直接阻塞点时，才允许做最小根级调整。
- 修复目标是恢复 `npm run demo:build` 的稳定通过，不借机改造与本次失败无关的实现。

### 明确排除

- 不修改与 demo 构建无关的根包业务逻辑。
- 不改造 `publish.yml`、`release-image.yml` 的职责。
- 不把 demo 构建修复扩展成 SDK 发布策略、镜像流程或其他 CI 统一化改造。

## CI 范围

### 工作流职责

- 新增独立 demo CI workflow，职责仅为验证 demo 的 build、typecheck、test。
- `pages.yml` 继续作为 GitHub Pages 部署工作流存在，不承担 PR / 通用 CI 质量门槛职责。

### 触发与边界

- 专用 workflow 触发事件固定为 `pull_request`，且仅在目标分支为 `main` 时运行；本轮不扩展到 `push`、发布事件或部署事件。
- 本轮不要求把 demo 检查并入现有 `pr-checks.yml`；即使仓库已有通用 PR 检查，demo 仍需有独立、可读、职责明确的工作流。

### 执行内容

- 工作流必须显式准备根目录依赖与 `examples/demo` 依赖，避免因安装缺失导致假失败。
- 工作流环境沿用仓库现有 Node 24 基线，并启用 npm cache，避免与现有 CI / Pages 运行环境割裂。
- 检查范围固定为以下三项，不增不减：
  1. `npm run demo:build`
  2. `npm run demo:typecheck`
  3. `npm --prefix examples/demo test`
- 任一命令失败都必须直接导致 workflow 失败，不引入软失败或允许失败步骤。

## 验收

- 能在开发环境中复现并确认当前 demo build 的真实失败点。
- 修复后，`npm run demo:build` 可以稳定通过。
- 修复后，`npm run demo:typecheck` 可以稳定通过。
- 修复后，`npm --prefix examples/demo test` 可以稳定通过。
- 仓库新增独立的 demo CI workflow，且该 workflow 会执行 build、typecheck、test 三项检查。
- 该 workflow 仅在目标分支为 `main` 的 `pull_request` 上运行，并使用 Node 24 环境。
- `pages.yml` 仍保持部署主责，没有被扩展为承载 demo 全量质量检查的工作流。
- 本轮变更未扩散到无关应用、包、镜像或发布链路。

## 风险与控制

- 风险：为了解决构建失败而顺手修改大量 demo 之外的代码，造成 scope drift。
  - 控制：spec 将修复范围限定在 `examples/demo`、最小必要根级脚本/配置与 GitHub Actions。
- 风险：新增 CI 时与 `pages.yml` 职责重叠，导致部署与校验边界混乱。
  - 控制：明确要求新增独立 demo workflow，`pages.yml` 仅保留部署职责。
- 风险：workflow 只安装一侧依赖，导致 CI 失败并非来自真实构建问题。
  - 控制：workflow 中必须显式准备根依赖与 `examples/demo` 依赖。
- 风险：把本轮扩展为与 demo 无关的通用 CI 改造，延长交付周期。
  - 控制：验收仅围绕 demo build、demo typecheck、demo tests 与部署边界是否清晰展开。
