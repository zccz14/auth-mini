# AGENTS PR Follow-Up Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update `AGENTS.md` minimally so PR creation is treated as a mid-flow state and the required workflow closes only after checks/review handling, merge-or-close, and worktree cleanup complete.

**Architecture:** Keep the existing `AGENTS.md` structure and numbering intact, and encode the new closed-loop behavior by extending only the already relevant sections: Git/worktree rules, standard execution order, role split, explicit prohibitions, and completion definitions. Verification stays documentation-focused: assert the required workflow phrases exist, confirm only `AGENTS.md` changed, and manually review the diff for scope discipline.

**Tech Stack:** Markdown, Python 3, git diff

---

## File Structure

- Modify: `AGENTS.md`
  - extend the existing workflow rules with PR post-creation follow-up, blocking review handling, merge obligations, and cleanup-as-terminal-state wording without adding new top-level sections
- Reference: `docs/superpowers/specs/2026-04-12-agents-pr-followup-workflow-design.md`
  - source of truth for scope, acceptance criteria, and the required “minimal change” strategy

## Task 1: Encode The Closed-Loop PR Workflow In Existing Process Sections

**Files:**

- Modify: `AGENTS.md`
- Reference: `docs/superpowers/specs/2026-04-12-agents-pr-followup-workflow-design.md`

- [ ] **Step 1: Re-read the approved spec and confirm the edit target stays minimal**

Run:

```bash
python - <<'PY'
from pathlib import Path

spec = Path('docs/superpowers/specs/2026-04-12-agents-pr-followup-workflow-design.md').read_text(encoding='utf-8')

required = [
    'PR 创建不是终态',
    '主动跟进',
    'checks 失败时的处理规则',
    'review 阻塞时的处理规则',
    '可合并时的主动合并义务',
    '合并后 / 关闭后的清理义务',
    '最小改动方案',
]

missing = [item for item in required if item not in spec]
if missing:
    raise SystemExit('spec missing required anchors:\n- ' + '\n- '.join(missing))

print('spec anchors verified for minimal AGENTS-only workflow update')
PY
```

Expected: PASS with `spec anchors verified for minimal AGENTS-only workflow update`.

- [ ] **Step 2: Extend Section 2 so PR creation is explicitly intermediate and follow-up is mandatory**

Update `AGENTS.md` by expanding `## 2. Git 与 Worktree 强制流程` with the following rule text, keeping numbering consistent with the surrounding list:

```md
13. 创建 PR 只是进入 PR 跟进阶段，不是任务终态。只要 PR 仍未合并、关闭或确认废弃，且对应 worktree 尚未清理，Agent 就必须继续推进后续动作，不得把“已开 PR”视为完成。
14. 创建 PR 后，必须主动持续跟进 checks、review 状态与 mergeability，不得等待用户再次提醒。只要 PR 仍处于可继续推进状态，Agent 就必须继续执行下一步所需动作。
15. 若 checks 失败，必须先查看失败详情；若失败原因仍在当前任务 scope 内，必须在同一 worktree、同一分支、同一 PR 中继续修复、验证、push，并继续跟进后续 checks / review / mergeability。若失败原因超出当前 scope，则必须先升级决策，不得擅自扩大范围。
16. 若存在 blocking review 或其他必须处理的 review 意见，必须继续在同一 worktree、同一分支、同一 PR 中处理、验证、push，并在阻塞解除前停止推进合并。若 review 意见与 spec、scope 或权限边界冲突，必须保持阻塞并升级决策。
17. 当 checks 全部通过、不存在 blocking review、merge conflict 或仓库保护规则阻塞时，必须按仓库允许的合并策略主动完成合并，不得等待用户手动点击 merge，也不得绕过任何保护规则。
18. PR 已合并、关闭或确认废弃，且后续 review 处理已完成后，必须删除对应 git worktree。只要 worktree 尚未清理，任务仍未真正完成。
```

- [ ] **Step 3: Expand Section 3 into a full post-PR execution chain**

Replace the tail of `## 3. 标准执行顺序` in `AGENTS.md` so the numbered flow becomes:

```md
   9. 在 worktree 中 push 分支并创建 PR
   10. 主动跟进 PR checks、review 状态与 mergeability
   11. 若 checks 失败且原因仍在当前 scope 内，则在同一 worktree / 分支 / PR 中修复、验证、push，并继续跟进
   12. 若存在 blocking review，则在同一 worktree / 分支 / PR 中继续处理、验证、push，并继续跟进，直到阻塞解除或升级决策
   13. 当 checks 通过且无 blocking review、merge conflict 或仓库规则阻塞时，按仓库允许策略主动合并 PR
   14. 在 PR 合并、关闭或确认废弃，且 review 处理完成后删除 worktree
```

- [ ] **Step 4: Verify the process sections now contain the closed-loop wording and no new top-level section was introduced**

Run:

```bash
python - <<'PY'
from pathlib import Path
import re

text = Path('AGENTS.md').read_text(encoding='utf-8')

checks = [
    ('section 2 intermediate PR rule', '创建 PR 只是进入 PR 跟进阶段，不是任务终态' in text),
    ('section 2 active follow-up rule', '必须主动持续跟进 checks、review 状态与 mergeability' in text),
    ('section 2 same-PR failure repair rule', '同一 worktree、同一分支、同一 PR 中继续修复、验证、push' in text),
    ('section 2 blocking review rule', '在阻塞解除前停止推进合并' in text),
    ('section 2 proactive merge rule', '必须按仓库允许的合并策略主动完成合并' in text),
    ('section 2 cleanup rule', '只要 worktree 尚未清理，任务仍未真正完成' in text),
    ('section 3 explicit follow-up step', '10. 主动跟进 PR checks、review 状态与 mergeability' in text),
    ('section 3 explicit merge step', '13. 当 checks 通过且无 blocking review、merge conflict 或仓库规则阻塞时，按仓库允许策略主动合并 PR' in text),
    ('no section 9 added', re.search(r'^## 9\.', text, flags=re.M) is None),
]

failed = [name for name, ok in checks if not ok]
if failed:
    raise SystemExit('process-section verification failed:\n- ' + '\n- '.join(failed))

print('process sections encode the closed-loop PR workflow')
PY
```

Expected: PASS with `process sections encode the closed-loop PR workflow`.

- [ ] **Step 5: Optionally create an intermediate checkpoint commit only if the work is intentionally being split**

```bash
git add AGENTS.md docs/superpowers/specs/2026-04-12-agents-pr-followup-workflow-design.md docs/superpowers/plans/2026-04-12-agents-pr-followup-workflow-plan.md
git commit -m "docs: checkpoint AGENTS PR workflow rules"
```

Expected: optional step only. Prefer skipping this checkpoint and creating a single final commit in Task 3.

## Task 2: Align Role Split, Explicit Prohibitions, And Completion Definitions

**Files:**

- Modify: `AGENTS.md`
- Reference: `docs/superpowers/specs/2026-04-12-agents-pr-followup-workflow-design.md`

- [ ] **Step 1: Update Section 5 so PR follow-up stays with Sub Agents**

Extend `## 5. 主 Agent 与 Sub Agent 规则` in `AGENTS.md` with the following additions:

```md
6. 对 PR 闭环流程，主 Agent 只负责跟踪任务是否仍处于 PR 跟进阶段、决定是否继续派发 Sub Agent、汇总最终状态；不得亲自执行 checks 修复、review 修改、merge 或 worktree 清理等开发动作。
7. 对 PR 闭环流程，Sub Agent 在被派发后负责实际执行 scope 内的 checks 失败修复、review 处理、验证、push、PR 状态推进、允许范围内的 merge，以及 PR 终态后的 worktree 清理。
```

- [ ] **Step 2: Add explicit prohibitions for the new failure modes in Section 7**

Append the following rules under `## 7. 明确禁令` in `AGENTS.md`:

```md
14. 禁止把“已创建 PR”视为开发任务终点。
15. 禁止在 PR checks 失败、存在 blocking review、存在 merge conflict 或存在仓库保护规则阻塞时提前合并。
16. 禁止通过绕过审批、绕过 checks 或其他 bypass 保护规则的方式强行合并 PR。
17. 禁止在仍需继续处理 checks / review / merge 的情况下保留悬而未决的 PR 却宣告任务完成。
```

- [ ] **Step 3: Tighten Section 8 so task completion includes PR closure and worktree cleanup**

Append the following definitions under `## 8. 判定口径` in `AGENTS.md`:

```md
6. “PR 跟进阶段”指 PR 创建后到 PR 合并、关闭或确认废弃且对应 worktree 清理完成之间的整个持续推进阶段；该阶段仍属于开发流程的一部分。
7. “开发任务完成”指对应 PR 已合并、关闭或确认废弃，相关 review 处理完成，且对应 worktree 已删除；仅完成创建 PR、push 分支或等待平台状态，不构成完成。
```

- [ ] **Step 4: Run a documentation-focused spec coverage check across Sections 5, 7, and 8**

Run:

```bash
python - <<'PY'
from pathlib import Path

text = Path('AGENTS.md').read_text(encoding='utf-8')

checks = [
    ('main agent remains coordinator only', '主 Agent 只负责跟踪任务是否仍处于 PR 跟进阶段' in text),
    ('sub agent owns follow-up execution', 'Sub Agent 在被派发后负责实际执行 scope 内的 checks 失败修复' in text),
    ('ban PR-created-is-done', '禁止把“已创建 PR”视为开发任务终点' in text),
    ('ban merging with blocking conditions', '禁止在 PR checks 失败、存在 blocking review、存在 merge conflict 或存在仓库保护规则阻塞时提前合并' in text),
    ('ban bypass merge', '禁止通过绕过审批、绕过 checks 或其他 bypass 保护规则的方式强行合并 PR' in text),
    ('define PR follow-up phase', '“PR 跟进阶段”指 PR 创建后到 PR 合并、关闭或确认废弃且对应 worktree 清理完成之间的整个持续推进阶段' in text),
    ('define completion with cleanup', '“开发任务完成”指对应 PR 已合并、关闭或确认废弃，相关 review 处理完成，且对应 worktree 已删除' in text),
]

failed = [name for name, ok in checks if not ok]
if failed:
    raise SystemExit('role/prohibition/completion verification failed:\n- ' + '\n- '.join(failed))

print('role split, prohibitions, and completion definitions verified')
PY
```

Expected: PASS with `role split, prohibitions, and completion definitions verified`.

- [ ] **Step 5: Confirm the branch-wide implementation stayed within the approved file scope**

Run:

```bash
python - <<'PY'
import subprocess

expected = {
    'AGENTS.md',
    'docs/superpowers/specs/2026-04-12-agents-pr-followup-workflow-design.md',
    'docs/superpowers/plans/2026-04-12-agents-pr-followup-workflow-plan.md',
}

output = subprocess.check_output(
    ['git', 'status', '--short', '--untracked-files=all'],
    text=True,
).splitlines()

paths = {line[3:] for line in output if line.strip()}
unexpected = sorted(paths - expected)
missing = sorted(expected - paths)

if unexpected or missing:
    message = []
    if unexpected:
        message.append('unexpected paths:\n- ' + '\n- '.join(unexpected))
    if missing:
        message.append('missing expected paths:\n- ' + '\n- '.join(missing))
    raise SystemExit('\n'.join(message))

print('full-scope status check passed for spec, plan, and AGENTS only')
PY
```

Expected:

```text
full-scope status check passed for spec, plan, and AGENTS only
```

- [ ] **Step 6: Optionally create an intermediate checkpoint commit only if the work is intentionally being split**

```bash
git add AGENTS.md docs/superpowers/specs/2026-04-12-agents-pr-followup-workflow-design.md docs/superpowers/plans/2026-04-12-agents-pr-followup-workflow-plan.md
git commit -m "docs: checkpoint AGENTS PR workflow rules"
```

Expected: optional step only. Prefer skipping this checkpoint and creating a single final commit in Task 3.

## Task 3: Final Documentation Verification For The Minimal Rules Change

**Files:**

- Modify: `AGENTS.md`
- Reference: `docs/superpowers/specs/2026-04-12-agents-pr-followup-workflow-design.md`

- [ ] **Step 1: Inspect the final diff to ensure the change is incremental rather than a document restructure**

Run:

```bash
git diff -- AGENTS.md
```

Expected: a focused diff that only extends Sections 2, 3, 5, 7, and 8 with PR follow-up, review/check handling, merge, and cleanup rules.

- [ ] **Step 2: Run the complete documentation assertion script for all acceptance criteria**

Run:

```bash
python - <<'PY'
from pathlib import Path

text = Path('AGENTS.md').read_text(encoding='utf-8')

checks = [
    ('PR creation not terminal', '创建 PR 只是进入 PR 跟进阶段，不是任务终态' in text),
    ('active follow-up required', '必须主动持续跟进 checks、review 状态与 mergeability' in text),
    ('scope-bound check failure repair', '若失败原因仍在当前任务 scope 内，必须在同一 worktree、同一分支、同一 PR 中继续修复、验证、push' in text),
    ('out-of-scope failure escalation', '若失败原因超出当前 scope，则必须先升级决策，不得擅自扩大范围' in text),
    ('blocking review blocks merge', '在阻塞解除前停止推进合并' in text),
    ('review conflict escalates', '若 review 意见与 spec、scope 或权限边界冲突，必须保持阻塞并升级决策' in text),
    ('proactive merge required', '必须按仓库允许的合并策略主动完成合并' in text),
    ('no bypass', '不得绕过任何保护规则' in text),
    ('cleanup part of terminal state', '只要 worktree 尚未清理，任务仍未真正完成' in text),
    ('main agent coordination only', '主 Agent 只负责跟踪任务是否仍处于 PR 跟进阶段、决定是否继续派发 Sub Agent、汇总最终状态' in text),
    ('sub agent executes merge and cleanup', 'Sub Agent 在被派发后负责实际执行 scope 内的 checks 失败修复、review 处理、验证、push、PR 状态推进、允许范围内的 merge，以及 PR 终态后的 worktree 清理' in text),
    ('completion definition updated', '“开发任务完成”指对应 PR 已合并、关闭或确认废弃，相关 review 处理完成，且对应 worktree 已删除' in text),
]

failed = [name for name, ok in checks if not ok]
if failed:
    raise SystemExit('acceptance criteria check failed:\n- ' + '\n- '.join(failed))

print('all AGENTS PR follow-up acceptance checks passed')
PY
```

Expected: PASS with `all AGENTS PR follow-up acceptance checks passed`.

- [ ] **Step 3: Record the final scope-limited file list**

Run:

```bash
python - <<'PY'
import subprocess

expected = sorted([
    'AGENTS.md',
    'docs/superpowers/specs/2026-04-12-agents-pr-followup-workflow-design.md',
    'docs/superpowers/plans/2026-04-12-agents-pr-followup-workflow-plan.md',
])

output = subprocess.check_output(
    ['git', 'status', '--short', '--untracked-files=all'],
    text=True,
).splitlines()

paths = sorted({line[3:] for line in output if line.strip()})
if paths != expected:
    raise SystemExit('final file list mismatch:\n- actual: ' + '\n- actual: '.join(paths) + '\n- expected: ' + '\n- expected: '.join(expected))

print('final file list verified for spec, plan, and AGENTS')
PY
```

Expected:

```text
final file list verified for spec, plan, and AGENTS
```

- [ ] **Step 4: Create the single preferred final commit if Tasks 1-3 were executed without scope drift**

```bash
git add AGENTS.md docs/superpowers/specs/2026-04-12-agents-pr-followup-workflow-design.md docs/superpowers/plans/2026-04-12-agents-pr-followup-workflow-plan.md
git commit -m "docs: require PR follow-up through cleanup"
```

## Self-Review

- Spec coverage: the plan maps terminal-state definition, active post-PR follow-up, same-PR/same-worktree repair for in-scope check failures, blocking-review handling, proactive merge under repository rules, required worktree cleanup, role alignment for Main Agent vs Sub Agent, and the minimal-change-only constraint to explicit task steps and verification commands.
- Placeholder scan: no `TODO`, `TBD`, “implement later”, or “similar to Task N” placeholders remain; every task names exact file paths, concrete rule text, and exact verification commands.
- Type consistency: the plan consistently uses the same workflow terms across all tasks—`checks`, `blocking review`, `mergeability`, `scope`, `同一 worktree / 分支 / PR`, `主 Agent`, `Sub Agent`, and `worktree 清理`—matching the approved spec wording.
