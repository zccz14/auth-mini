# AGENTS Rules

## 1. 总则

1. 本文件的目标是约束 Agent 行为。Agent 必须优先追求约束执行效果，不以人类可读性为首要目标。
2. 本文件中的“必须 / 禁止 / 仅允许 / 只能 / 不得”均为硬性规则，Agent 不得自行放宽、重解释或按习惯替换执行方式。
3. 当本文件与通用默认行为冲突时，优先遵循本文件。
4. 当本文件与仓库内其他历史文档、计划文档、流程文档或上下文说明冲突时，优先遵循本文件；除非用户直接明确要求按其他文档执行。
5. 当用户直接明确要求与本文件冲突时，优先遵循用户要求；未出现明确冲突时，不得将用户意图扩展解释为例外。

## 2. Git 与 Worktree 强制流程

1. 开始任何开发任务前，必须先执行 `git fetch origin`，确保本地 `origin/main` 是最新状态。
2. 开发任务只能基于 `origin/main` 创建新的 git worktree。禁止基于任何本地分支创建 worktree。
3. git worktree 仅允许创建在仓库内的 `<repo>/.worktrees/` 目录下。禁止在其他路径创建 worktree。
4. 所有开发相关操作必须在该 worktree 中执行。开发相关操作包括：
   - 编写或修改 spec 文档。
   - 编写或修改 implementation plan。
   - 修改代码或测试。
   - 运行实现验证、文档校验、测试、构建、lint。
   - 执行 `git add`、`git commit`、`git push`。
   - 创建 PR、补充 PR 内容、处理 review。
5. “仓库准备操作”不属于开发相关操作，只允许用于创建、维护或回收 worktree，以及协调开发流程。仓库准备操作包括：`git fetch origin`、`git worktree add`、`git worktree remove`，以及为协调所需的只读仓库检查（如 `git status`、`git branch`、`git log`）。
6. 主工作区禁止执行任何开发相关操作。主工作区仅允许执行仓库准备操作，以及做只读检查、协调、派发、状态汇总。
7. 主 Agent 可以在主工作区执行仓库准备操作；Sub Agent 也可以在主工作区执行其被派发任务所必需的仓库准备操作。除仓库准备操作外，Sub Agent 的开发执行必须在 worktree 中完成。
8. spec、implementation plan 与对应代码变更必须位于同一个 worktree、同一个分支、同一个 PR 中。禁止拆分到不同 PR。
9. push 代码前，必须先执行 `git rebase origin/main`，确保当前开发分支基于最新 `origin/main`；禁止基于过时基线直接 push。
10. 所有代码合并必须通过 PR 完成。禁止直接向 `main` 分支提交或推送任何变更。
11. 不使用本地 `main` 分支进行开发、提交、验证或承载临时改动。
12. 对应 PR 已合并、关闭或确认废弃，且后续 review 处理已完成后，必须删除对应的 git worktree。禁止过早删除仍需处理 review 的 worktree，也禁止保留已完成、已废弃或失去用途的 worktree。

## 3. 标准执行顺序

1. 接到开发任务后，必须按以下顺序执行：
   1. `git fetch origin`
   2. 从 `origin/main` 创建新 worktree
   3. 如果任务需要 spec，在 worktree 中编写或更新 spec
   4. 如果任务需要 implementation plan，在 worktree 中编写或更新 implementation plan
   5. 如果任务涉及代码变更或需要执行验证，在 worktree 中执行实现与验证；如果任务仅涉及 spec、plan 或其他文档修改，可跳过实现，按任务需要执行相应文档校验或最小必要验证
   6. 在 worktree 中提交 commit
   7. 在 worktree 中执行 `git rebase origin/main`
   8. 在 worktree 中 push 分支并创建 PR
   9. 在 PR 合并、关闭或确认废弃，且 review 处理完成后删除 worktree
2. 如果任务不涉及代码、文档、spec、plan、commit、push、PR 变更，可不进入完整开发流程；但只要涉及上述任一项，就必须进入完整开发流程。
3. 是否需要 spec、implementation plan、实现与验证，必须按任务类型判定，不得机械地对所有任务强制执行同一套子步骤。

## 4. Spec / Implementation Plan 规则

1. spec 文档必须使用中文。
2. implementation plan 不需要请求用户 review，也不需要询问用户是否同意 implementation plan。
3. 用户只 review spec 文档。Agent 不得把 implementation plan 当作等待用户批准的门禁。
4. 如果任务需要 spec，则必须先完成 spec，再进入 implementation plan 和实现阶段。禁止跳过 spec 直接编码。
5. 如果任务不需要 spec，不得为了走流程而强制补写 spec。
6. 如果 spec 已存在，后续实现必须以该 spec 为准。禁止在实现阶段擅自扩展超出 spec 的 scope，除非用户明确要求。

## 5. 主 Agent 与 Sub Agent 规则

1. 主 Agent 只负责协调、分解、派发、汇总、review 与状态管理。主 Agent 禁止直接执行开发相关任务。
2. 所有开发相关任务必须交由 Sub Agent 执行。开发相关任务包括：
   - 编写或修改 spec、implementation plan。
   - 修改源码、测试、脚本、配置、CI。
   - 运行实现验证、文档校验、测试、构建、lint、验证脚本。
   - 执行 commit、push、PR 创建与更新。
3. 主 Agent 不得因为任务较小、修改较少、文件较少、时间较短而绕过 Sub Agent。
4. 主 Agent 的职责只包括：
   - 读取用户要求。
   - 判定是否进入开发流程。
   - 派发合适的 Sub Agent。
   - 审核 Sub Agent 结果。
   - 维护任务状态与上下文。
5. 若存在多步开发任务，主 Agent 应优先将执行拆分给 Sub Agent，而不是在主上下文中直接完成。

## 6. 文件系统边界

1. 任何写操作、落盘产物、持久化缓存都只能发生在当前 repo 内。禁止在 repo 外创建、修改、删除任何文件。
2. 所有日志、临时产物、诊断输出如果需要落盘，必须写入当前 repo 内部。
3. 禁止把任务文档、工作日志、脚本输出或其他持久化产物写到用户主目录、系统临时目录或仓库外的任意目录。

## 7. 明确禁令

1. 禁止在主工作区编写 spec。
2. 禁止在主工作区编写 implementation plan。
3. 禁止在主工作区修改代码、测试、脚本、配置、CI。
4. 禁止在主工作区执行 commit、push、PR 创建。
5. 禁止从本地分支创建 worktree。
6. 禁止在 `<repo>/.worktrees/` 之外创建 worktree。
7. 禁止直接向 `main` 分支开发、提交、push。
8. 禁止使用本地 `main` 分支承载任务。
9. 禁止跳过 `git fetch origin`。
10. 禁止跳过 `git rebase origin/main` 后直接 push。
11. 禁止让 spec、implementation plan 与代码变更分散到不同 PR。
12. 禁止主 Agent 亲自执行开发任务。
13. 禁止在 repo 外写入文件或留下持久化产物。

## 8. 判定口径

1. “开发任务”指任何会产生仓库内容变更、提交记录变更、分支状态变更、PR 状态变更的任务。
2. “主工作区”指用户当前默认打开的仓库根目录工作区，而非通过 `git worktree add` 创建的独立工作目录。
3. “Sub Agent 执行”指实际实施变更、运行验证、提交代码的执行主体必须是 Sub Agent，而不是主 Agent。
4. “仓库准备操作”指 `git fetch origin`、`git worktree add`、`git worktree remove`，以及为协调流程所需的只读仓库检查命令；仓库准备操作不等于开发相关操作。
5. 只要任务包含以下任一动作，就视为开发任务：写文档到仓库、改代码、改测试、跑验证、提交 commit、push、开 PR、更新 PR 内容、处理 review。
