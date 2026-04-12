# AGENTS PR 闭环跟进流程设计

## 背景

- 当前 `AGENTS.md` 已覆盖 worktree、提交、push、PR 创建与最终清理等约束，但“创建 PR 之后直到真正结束”的闭环流程仍不够明确。
- 现有规则已经要求通过 PR 合并、并在 PR 已合并/关闭/废弃后删除 worktree，但没有把“持续跟进 checks / review / mergeability / merge / 清理”串成一条不可中断的执行链。
- 本轮范围仅为补充 `AGENTS.md` 中与 PR 后续处理相关的行为约束，使 Agent 将“PR 创建”视为中间状态，而不是任务终点。

## 目标

- 明确 PR 创建不是终态；终态是“PR 已合并、已关闭或已确认废弃，且关联 review 处理完成、worktree 已清理”。
- 要求 Agent 在 PR 创建后主动持续跟进 checks、review 状态与 mergeability，而不是等待用户再次提醒。
- 要求当 checks 失败且问题仍在当前 scope 内时，Agent 在同一 worktree / 分支 / PR 内完成修复、验证、push，并继续跟进。
- 要求存在 blocking review 时继续处理 review，不得抢先合并。
- 要求在 checks 全绿且不存在 blocking review 时，Agent 依据仓库允许的合并策略主动完成合并，且不得绕过保护规则。
- 保持与现有 `AGENTS.md` 的主 Agent / Sub Agent 分工一致，并尽量以增量方式补充规则，避免大幅重构文档结构。

## 非目标

- 不修改本轮以外的开发流程原则，例如 worktree 创建位置、rebase 时机、spec / plan 门禁或 repo 外写入限制。
- 不在本 spec 中设计新的 CI、review 机制或分支保护规则；仅规定 Agent 在既有仓库规则下的跟进行为。
- 不把 PR 跟进扩展为长期值守平台设计；只约束当前任务生命周期内的闭环执行。
- 不在本轮直接修改 `AGENTS.md` 文本；本 spec 只定义后续应如何更新该文档。

## 核心决策

将 PR 生命周期重新定义为闭环流程：创建 PR 只是进入“待跟进”阶段，Agent 必须持续检查 PR 的 checks、review 和 mergeability；若失败或被 review 阻塞，则在当前 scope 内继续处理并保持同一 worktree / 分支 / PR 的连续性；只有在 PR 已合并、已关闭或已确认废弃，且相关 review 处理完成、对应 worktree 已删除后，任务才算真正结束。

## 设计细节

### 1. PR 终态定义

- `AGENTS.md` 需要明确声明：`创建 PR` 不是终态，只是标准流程中的中间节点。
- 终态必须满足以下之一：
  - PR 已合并，且后续 review 处理已完成，关联 worktree 已删除。
  - PR 已关闭或已确认废弃，且无需继续处理 review，关联 worktree 已删除。
- 只要 worktree 仍保留、checks 仍失败、存在未处理的 blocking review，或 PR 仍处于可继续推进状态，就不能把任务判定为完成。

### 2. PR 创建后的主动跟进义务

- 在 `AGENTS.md` 中补充：创建 PR 后，Agent 必须主动跟进以下状态，而不是等待用户手动催办：
  - checks 是否完成、是否失败、失败详情是什么；
  - review 是否存在 blocking 意见；
  - PR 当前是否可合并、是否受 merge conflict 或仓库保护规则阻塞。
- “主动跟进”强调持续推进责任：只要 PR 仍未到达终态，Agent 就应继续执行下一步所需动作。

### 3. checks 失败时的处理规则

- 当 PR checks 失败时，Agent 必须先查看失败详情，再判断问题是否属于当前任务 scope。
- 若失败原因在当前 scope 内，必须在原 worktree、原分支、原 PR 中继续修复；不得新开平行分支、平行 PR 或脱离当前闭环。
- 修复后必须执行与失败原因相匹配的验证，并 push 回同一 PR，然后继续跟进后续 checks / review / mergeability。
- 若失败原因超出当前 scope 或需要越界修改，则按现有升级机制交由 orchestrator / 人类决策，不得擅自扩大范围。

### 4. review 阻塞时的处理规则

- `AGENTS.md` 需要明确区分“普通评论”与“blocking review / 必须处理的 review 意见”。
- 一旦存在 blocking review，Agent 必须继续处理该阻塞项，不得在阻塞未解除时推进合并。
- 若 review 修改仍属于当前 scope，则继续在同一 worktree / 分支 / PR 中处理、验证、push，并重新跟进 checks 与 review。
- 若 review 建议与现有 spec、scope 或权限边界冲突，应保持阻塞状态并升级决策，而不是自行绕过或提前合并。

### 5. 可合并时的主动合并义务

- 当 checks 已全部通过，且不存在 blocking review、merge conflict 或仓库规则阻塞时，Agent 必须主动推进合并。
- 合并必须使用仓库允许的策略（例如 squash / merge / rebase 中被允许的一种），不得绕过分支保护、审批要求或任何平台保护机制。
- `AGENTS.md` 需要把“等待用户手动点 merge”改为非默认行为；默认要求 Agent 在满足条件时自行完成合并。

### 6. 合并后 / 关闭后的清理义务

- PR 合并、关闭或确认废弃后，若后续 review 处理已完成，Agent 必须删除对应 git worktree。
- 该清理动作是闭环终态的一部分，不是可选收尾步骤。
- 需要明确：只要 worktree 尚未清理，任务仍未真正完成；禁止把“PR 已 merged”误判为最终结束。

### 7. 主 Agent 与 Sub Agent 的职责对齐

- 保持现有总原则：主 Agent 负责协调、派发、汇总、审核与状态管理；Sub Agent 负责开发执行。
- 对 PR 闭环流程，职责进一步细化为：
  - 主 Agent：跟踪任务是否仍处于 PR 闭环中、决定是否继续派发 Sub Agent 处理 checks/review/merge/cleanup、汇总最终状态。
  - Sub Agent：在被派发后实际执行修复、验证、push、review 处理、PR 状态推进，以及在允许范围内执行 merge 与 worktree 清理。
- 不新增“主 Agent 亲自处理 PR 跟进”的例外；PR 后续跟进仍属于开发流程的一部分，应继续由 Sub Agent 执行具体操作。

## 对 `AGENTS.md` 的最小改动方案

- 仅在现有章节中做增量补充，避免重写全文结构。
- 重点修改位置建议为：
  - **第 2 节（Git 与 Worktree 强制流程）**：补充 PR 创建后必须持续跟进至 merge/close + cleanup 的规则。
  - **第 3 节（标准执行顺序）**：把“push 分支并创建 PR”与“删除 worktree”之间展开为 checks / review / merge / cleanup 的完整链路。
  - **第 5 节（主 Agent 与 Sub Agent 规则）**：补充 PR 跟进阶段的职责划分。
  - **第 7 节（明确禁令）**：增加“禁止把 PR 创建视为终点”“禁止在 blocking review 存在时提前合并”“禁止绕过保护直接合并”等禁令。
  - **第 8 节（判定口径）**：补充“开发任务完成”的闭环定义，明确需包含 PR 后续处理与 worktree 清理。
- 不调整章节编号体系，不引入新的大章节；优先通过新增条目或扩写现有条目完成集成。

## 验收标准

- spec 明确写出“PR 创建不是终态，merged/closed/abandoned + review 处理完成 + worktree 清理完成才是终态”。
- spec 明确要求 PR 创建后主动跟进 checks、review、mergeability。
- spec 明确规定 checks 失败时需查看失败详情，并在当前 scope 内于同一 worktree / 分支 / PR 修复、验证、push、继续跟进。
- spec 明确规定存在 blocking review 时不得提前合并，必须继续处理或升级决策。
- spec 明确规定在 checks 通过且无 blocking review 时，Agent 必须按仓库允许策略主动合并，且不得绕过保护。
- spec 明确规定 PR 合并/关闭/废弃且 review 处理完成后必须删除对应 worktree。
- spec 明确主 Agent 与 Sub Agent 在该闭环中的职责分工，并与现有 `AGENTS.md` 总体分工一致。
- spec 明确要求对 `AGENTS.md` 采用最小重构、增量集成的修改策略。

## 风险与控制

- 风险：把 PR 跟进写成“建议”，导致执行时仍把 PR 创建当成终点。
  - 控制：全文使用必须/禁止语义，并把终态定义写入执行顺序、禁令和判定口径。
- 风险：PR 跟进职责与主 Agent / Sub Agent 分工冲突，导致主 Agent 越权执行开发动作。
  - 控制：明确主 Agent 只做协调与状态管理，具体修复、验证、合并、清理由 Sub Agent 执行。
- 风险：把闭环要求扩展成大规模流程重写，造成 `AGENTS.md` 结构震荡。
  - 控制：限制为现有章节内的增量补充，不新增大段无关机制。
- 风险：在“主动合并”要求下误解为可以绕过保护规则快速结束任务。
  - 控制：明确合并只能在 checks 通过、无 blocking review 且符合仓库保护策略时进行，禁止 bypass。

## 自检结论

- 无占位符、TODO 或待补章节。
- 终态、阻塞条件、主从职责与最小改动边界已显式写明，未发现内部矛盾。
- 范围限定在更新 `AGENTS.md` 的 PR 闭环跟进流程，未扩展到 CI、权限模型或其他仓库流程重构。
