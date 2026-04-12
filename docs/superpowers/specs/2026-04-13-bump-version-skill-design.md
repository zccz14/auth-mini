# `bump-version` 本地项目技能设计

## 背景 / 问题

- 当前仓库已经具备基于 `package.json` `version` 变化触发 npm 发布 CI 的能力，但“如何安全地发一个新稳定版本”仍需要人工串联多个步骤。
- 现有发布动作不只是改版本号，还包括按仓库 `AGENTS.md` 约束走 worktree 开发流、提交 PR、持续跟进 checks / review / mergeability、在 scope 内修复基线问题、合并后确认 npm registry 上确实出现新版本。
- 这些步骤分散在 git、GitHub、CI、npm registry 之间，人工执行容易漏掉 PR 后续跟进、错误地在未合并时宣告完成，或把 CI / 外部平台问题与本地可修复问题混在一起。
- 本轮需要一个仅服务当前项目的本地技能 `bump-version`，把“稳定版本发布”收敛成一条受约束、可重复的操作流。

## 目标

- 提供一个本地项目技能 `bump-version`，用于发布当前包的下一个稳定版本。
- 支持三种输入方式：显式版本号（如 `0.1.9`）、`patch` / `minor` / `major` bump 类型、无参数交互模式。
- 默认只修改 `package.json` 中的版本号，并围绕该变更走完整 worktree + PR 闭环。
- 在 PR 阶段主动持续跟进 checks、review 与 mergeability；若存在当前任务 scope 内的基线失败，继续在同一 worktree / 分支 / PR 中修复并推进。
- 合并后轮询 npm registry，确认新版本已经可见；若外部发布链路阻塞，则停止并明确报告阻塞点。

## 非目标

- 不支持 prerelease 版本，如 `-alpha`、`-beta`、`-rc`。
- 不支持自定义 dist-tag、`next` / `beta` 等非默认 npm 发布标签。
- 不在本地执行 `npm publish`，也不绕过仓库 CI 的正式发布路径。
- 不扩展到多包 monorepo、批量发版、changelog 生成、release note 生成、git tag 管理或 GitHub Release 创建。
- 不把“修复所有失败 checks”泛化为无边界维护；仅处理因当前版本 bump 或仓库既有稳定发布基线而必须解决、且仍在本次任务 scope 内的问题。

## 核心决策

`bump-version` 是一个面向当前仓库的发布编排技能，而不是通用 npm 发布工具。它只负责生成稳定版本号、在隔离 worktree 中更新 `package.json`、按仓库强制流程创建并持续推进 PR、在同一 PR 内处理 scope 内检查失败，最终在 PR 合并后轮询 npm registry 确认新版本已上线。真正的 npm 发布仍由仓库既有 CI 在 `main` 合并后完成；技能不得在本地直接执行发布命令，也不得扩展到 prerelease、tag 策略或其他发布治理功能。

## 用户体验

### 调用方式

- `bump-version 0.1.10`：显式指定目标稳定版本。
- `bump-version patch`：基于当前 `package.json` 计算下一个 patch 版本。
- `bump-version minor`：基于当前版本计算下一个 minor 版本。
- `bump-version major`：基于当前版本计算下一个 major 版本。
- `bump-version`：进入交互模式，让用户从“显式输入版本号”或“选择 patch / minor / major”两条路径中完成选择。

### 输入约束

- 显式版本号必须是稳定 semver 三段式版本，如 `x.y.z`。
- 显式版本号必须严格大于当前 `package.json` 版本；不得回退、重复或保持不变。
- `patch` / `minor` / `major` 仅按标准 semver 递增，不允许附加 prerelease / build metadata。
- 无参数交互模式最终也必须收敛为以上两类合法输入之一。

### 输出期望

- 技能在开始前明确将发布的目标版本。
- 技能在 PR 创建后持续报告所处阶段，例如“已提交 PR，等待 checks”“正在处理 scope 内失败”“已合并，等待 npm registry 可见”。
- 若被外部平台阻塞，输出必须指出阻塞发生在 PR 审核、CI 发布、npm registry 可见性还是权限/凭证层面。

## 执行流程

### 1. 版本解析与前置校验

- 读取当前 `package.json` 的 `name` 与 `version`。
- 根据显式版本或 bump 类型计算目标版本。
- 拒绝以下输入：非法 semver、prerelease、目标版本不大于当前版本。
- 在进入开发流程前，明确本轮只围绕 `package.json` 版本 bump 与其直接引出的发布闭环开展工作。

### 2. worktree 开发流

- 严格遵循仓库 `AGENTS.md`：先 `git fetch origin`，再基于最新 `origin/main` 创建新的 git worktree，且 worktree 只能位于仓库 `.worktrees/` 下。
- 所有开发相关操作都在该 worktree 中执行，包括修改版本号、验证、提交、push、PR 创建、PR 跟进、合并与最终 worktree 清理。
- 该技能的实现不应在主工作区直接改 `package.json`、提交或创建 PR。

### 3. 版本修改与最小变更边界

- 只对 `package.json` 的 `version` 做最小必要改动。
- 若仓库未来存在与版本号直接绑定、且已由现有约束明确要求同步更新的发布元数据，可作为“直接伴随版本 bump 的必要联动”处理；若无明确现有约束，则本轮默认不扩展。
- 提交内容应保持聚焦于版本 bump 本身，不混入无关重构或文档修改。

### 4. 提交、push 与 PR 创建

- 在 worktree 中仅暂存与本次版本 bump 直接相关的文件。
- 创建简洁提交，例如 `chore: bump version to <target>`。
- push 前必须再次执行 `git fetch origin` 与 `git rebase origin/main`。
- 创建 PR 时，PR 标题与摘要应明确这是一次稳定版本发布 bump，且说明 npm 发布由 merge 后 CI 完成。

### 5. PR 闭环跟进

- PR 创建后，技能不得把“已开 PR”视为结束，而必须持续跟进 checks、review、mergeability 与仓库保护状态。
- 若 checks 失败，必须先读取失败详情并判断是否属于当前任务 scope。
- 若失败原因为版本 bump 直接引发的问题，或属于本仓库既有发布基线中必须修复的稳定阻塞项，则在同一 worktree / 分支 / PR 中继续修复、验证、push。
- 若失败原因为外部平台故障、仓库权限、第三方服务异常，或明显超出“版本 bump 发布闭环”范围，技能必须停止自动扩展并报告阻塞。
- 若存在 blocking review，技能必须继续在同一 PR 中处理；只有在阻塞解除后才能继续推进合并。
- 当 checks 通过、无 blocking review、无 merge conflict 且满足仓库保护规则时，技能必须主动完成合并，并在 PR 终态后清理对应 worktree。

### 6. 合并后 npm 可见性确认

- PR 合并后，技能读取目标包名与目标版本，查询 npm registry 是否已可见。
- 查询应采用短周期重试，总等待窗口允许在 1 至 5 分钟之间；每次重试之间进行短暂 sleep，避免无界轮询。
- 一旦 npm registry 返回目标版本存在，技能即可将发布状态判定为“已上线”。
- 若在允许窗口内仍不可见，需要进一步区分：
  - CI 尚未完成或尚未开始正式 publish。
  - npm/token/权限/平台异常导致 publish 未发生。
  - registry 可见性传播仍未完成，但已超过本技能允许等待窗口。
- 对以上外部阻塞，技能必须停止并报告当前证据，不得伪造“已发布”结论，也不得尝试本地 `npm publish` 兜底。

## 守护栏与失败边界

- 技能只处理稳定版本；任何 prerelease 输入都必须在最开始失败退出。
- 技能只适用于单包 `package.json` 版本 bump；若仓库形态与该假设不符，应立即中止并提示超出设计边界。
- 技能只能在 worktree 流程内执行开发动作；如果无法创建或使用合规 worktree，应直接失败，不回退到主工作区执行。
- 技能只能处理 scope 内检查失败：版本 bump 引发的失败、与本仓库既有稳定发布基线直接相关且为完成此次发布必须解决的问题。超出该边界时必须升级决策。
- 技能不得本地执行 `npm publish`、不得使用自定义 dist-tag、不得创建 prerelease、不得绕过 PR / review / branch protection。
- 技能在任一阶段遇到外部系统阻塞时，必须以“阻塞中”结束，而不是继续无界重试或宣称任务成功。

## 验证期望

后续实现至少应验证以下行为：

- 输入校验：显式稳定版本、`patch` / `minor` / `major`、无参数交互模式都能正确收敛到合法目标版本；非法 semver、prerelease、非递增版本会被拒绝。
- worktree 合规性：技能在执行开发动作前会 `git fetch origin`，并在 `.worktrees/` 下基于 `origin/main` 创建新 worktree。
- 变更边界：版本 bump 仅修改允许范围内文件，默认至少包含 `package.json` 的 `version` 变化。
- PR 闭环：技能不会在“已创建 PR”时提前结束；会继续跟进 checks / review / mergeability，并在满足条件时完成 merge 与 worktree cleanup。
- 失败分流：scope 内基线失败会在同一 PR 中继续修复；超出 scope 或外部平台阻塞会停止并输出 blocker。
- npm 可见性确认：合并后会在有限窗口内重试查询 registry，并仅在目标版本实际可见时报告成功。

## 风险与控制

- 风险：把技能实现成“本地改版本号并开 PR”的半流程，遗漏 PR 后续跟进与 merge 后确认。
  - 控制：spec 明确将 PR follow-up、merge、worktree cleanup 与 npm registry 确认为同一技能职责链的一部分。
- 风险：把 scope 内基线修复无限扩大为通用仓库 maintenance。
  - 控制：spec 明确仅处理版本 bump 直接引发的问题，或完成本次稳定发布所必须解决的既有基线阻塞；超出即停止并报告。
- 风险：把 CI publish 失败时的外部阻塞误处理为需要本地 `npm publish` 补发。
  - 控制：spec 明确禁止本地 `npm publish`，且要求在 npm/token/权限/平台问题下以 blocker 结束。
- 风险：npm registry 传播延迟被误判为永久失败，或反过来在不可见时误报成功。
  - 控制：spec 明确有限窗口重试，并以 registry 实际返回目标版本存在作为唯一成功标准。
