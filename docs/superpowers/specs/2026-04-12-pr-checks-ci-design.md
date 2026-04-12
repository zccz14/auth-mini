# PR 专用 CI 工作流设计

## 背景

- 当前仓库已有面向发布与文档校验的自动化能力，但缺少一个只服务于 Pull Request 合并前检查的独立 CI 工作流。
- 本轮已批准的范围仅是在 `.github/workflows/` 下新增一个 PR 专用工作流文件，用统一、可取消的检查流程覆盖主线合并前的基础质量门槛。
- 该工作流必须与现有 publish / release 职责解耦，避免把发布责任、Docker 冒烟验证或额外触发策略混入 PR 检查范围。

## 目标

- 新增独立工作流文件 `.github/workflows/pr-checks.yml`，专门承载 PR 检查。
- 仅在 `pull_request` 且目标分支为 `main` 时触发该工作流。
- 在单个 `ubuntu-latest` job 中按固定顺序执行仓库已批准的一组检查命令。
- 通过最小权限与按 PR 聚合的并发取消策略，确保工作流安全且不会为同一 PR 保留过期运行。

## 非目标

- 不在 PR CI 中新增 Docker smoke tests。
- 不为该工作流新增 path filters、paths-ignore 或其他按文件路径裁剪触发范围的规则。
- 不修改现有 publish / release 工作流的职责分配，也不把发布逻辑迁移到本工作流。

## 决策

采用独立的 `pr-checks.yml` 工作流：当 PR 指向 `main` 时，在 `ubuntu-latest` 上以只读仓库权限运行一个单 job，先完成 checkout 与 Node 24 环境准备，再依次执行 `npm ci`、lint、typecheck、test、build、`bash docker/check-release-workflow.sh` 与 `bash docker/check-docs.sh post`；并为同一 PR 使用基于 workflow 名称与 PR 编号的 concurrency key，使新提交自动取消旧运行。

## 工作流结构

### 文件与触发条件

- 工作流文件路径固定为 `.github/workflows/pr-checks.yml`。
- 触发事件固定为 `pull_request`。
- 仅当 `pull_request` 的目标分支为 `main` 时触发。
- 本轮不添加额外事件类型，不扩展到 `push`、`workflow_dispatch` 或 tag 触发。

### Job 拓扑

- 工作流只包含一个 job，不拆分为矩阵、多平台或多阶段依赖图。
- 该 job 运行环境固定为 `ubuntu-latest`。
- 任一步骤失败都必须直接导致 job 与工作流失败，不引入 `continue-on-error`、允许失败步骤或软失败分支。

### 权限模型

- 工作流顶层 `permissions` 固定为：

```yaml
permissions:
  contents: read
```

- 不额外申请 `packages`、`id-token`、`pull-requests` 或写权限。

### 并发策略

- 工作流必须配置 `concurrency`，按“workflow 名称 + PR 编号”聚合同一 PR 的运行。
- 同一 PR 上的新提交触发新运行时，旧运行必须自动取消。
- 并发分组目标是避免同一 PR 因连续 push 产生多条过期检查队列；不同 PR 之间不共享并发组。

## 执行步骤

### 环境准备

- 使用 `actions/checkout@v4` 检出代码。
- 使用 `actions/setup-node@v4` 安装 Node 24。
- `actions/setup-node@v4` 必须启用 npm cache。

### 命令顺序

单 job 中按以下顺序执行，不重排、不删减、不插入额外检查：

1. `npm ci`
2. `npm run lint`
3. `npm run typecheck`
4. `npm test`
5. `npm run build`
6. `bash docker/check-release-workflow.sh`
7. `bash docker/check-docs.sh post`

### 失败语义

- 以上任一命令返回非零退出码，都必须让对应 step 失败，并最终让整个工作流失败。
- 本轮不引入失败后继续收集结果、聚合报告或条件执行补偿步骤的机制。

## 与现有自动化边界

- `pr-checks.yml` 只负责 PR 合并前质量检查，不承担发布、制品上传、镜像验证或版本发布责任。
- `bash docker/check-release-workflow.sh` 在本工作流中的作用仅是校验 release workflow 相关约束仍然成立，不意味着把 release 执行迁入 PR CI。
- `bash docker/check-docs.sh post` 在本工作流中的作用仅是执行已批准的 docs 校验命令，不扩展为额外文档生成或发布动作。

## 验收标准

- 仓库新增独立文件 `.github/workflows/pr-checks.yml`。
- 工作流只在目标分支为 `main` 的 `pull_request` 上触发。
- 工作流仅包含一个运行于 `ubuntu-latest` 的 job。
- 工作流权限固定为 `contents: read`。
- 工作流为同一 PR 配置按 workflow / PR 编号聚合并可取消旧运行的 concurrency。
- 工作流使用 `actions/checkout@v4` 与启用 npm cache 的 `actions/setup-node@v4`，Node 版本为 24。
- 工作流按批准顺序执行 `npm ci`、lint、typecheck、test、build、release workflow 检查与 docs 检查。
- 任一步骤失败都会让整个工作流失败。
- 工作流不新增 Docker smoke tests、不新增 path filters、也不改变 publish / release 工作流职责。

## 风险与控制

- 风险：实现时把 PR 检查与发布流程耦合，导致职责漂移。
  - 控制：spec 明确限定 `pr-checks.yml` 仅做 PR 质量检查，不承载 publish / release 责任。
- 风险：同一 PR 连续提交时保留多条过期运行，浪费 CI 资源并增加结果噪音。
  - 控制：使用基于 workflow 名称与 PR 编号的 concurrency 分组，并开启自动取消旧运行。
- 风险：为了追求覆盖面而额外引入 Docker smoke tests 或 path filters，造成 scope drift。
  - 控制：将两者都列为显式非目标，禁止在本轮扩展。
