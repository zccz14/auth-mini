---
name: clean-code
description: Use for every coding task to control flow complexity. Enforces a complexity gate that treats each branch as an added logical path requiring explicit business justification, especially during implementation and code review.
---

# clean-code

Keep code correct by controlling flow complexity.

## When to use

Use this skill for every coding task, especially implementation, refactoring, debugging, and code review.

## Principles

1. **Complexity is the number of paths**: Every branch multiplies the paths that must be understood, tested, and proven to match the intended business semantics. Do not add a branch unless its necessity is explicit.
2. **Compatibility is debt**: Avoid adding code that is only compatible with existing systems or conventions without a clear business reason, as it increases complexity without providing value. Don't compatible-ize unless necessary for a specific business need.
3. **Minimal Error Handling**: Catch only errors the code knows how to handle, and keep error recovery separate from ordinary business flow. Avoid adding error handling that hides unknown states or swallows errors without a clear recovery strategy. Don't log or catch errors everywhere.
4. **Linear Flow First**: Prefer a straight-line process inside each function. If the process requires category-by-category discussion, extract that classification into a more specific function where each case can be handled linearly.
5. **Divide and Conquer**: When you need to solve a problem with multiple items, consider whether to solve it with a single path that iterates over the items, or with multiple paths that each handle one item. Don't add paths for each item unless there is a clear business reason to treat them separately.
6. **Compatibility must be collectable**: Every compatibility path needs an owner, a reason, and a release condition. If future cleanup cannot be judged, the compatibility design is leaking complexity.
7. **Minimize object compatibility surface**: Prefer procedural and functional code by default. Avoid classes, inheritance, mutable instance state, and public object members unless they reduce path reasoning or are required by a concrete boundary.

## Instructions

1. Treat complexity as the number of possible logical paths through a program.

   Every branch multiplies the paths that must be understood, tested, and proven to match the intended business semantics. Humans and AI agents both fail when there are too many paths to hold in attention. Do not add a branch unless its necessity is explicit.

2. Treat every logical divergence as a branch.

   Branches include `if`, `else`, `switch`, ternaries, `try`, `catch`, `throw`, loops, `break`, `continue`, `return`, `await`, callbacks, forks, spawned work, feature flags, boolean parameters, fallback paths, and any other point where execution can diverge.

3. Apply the complexity gate before changing code.

   For every new or modified branch, require a sufficient reason:
   - What business rule, input class, or failure mode does this path represent?
   - Why must it be a separate path instead of part of the main path?
   - Can this path be deleted, merged, shortened, or moved behind a clearer boundary?
   - How will this path be verified by tests, existing behavior, or explicit reasoning?

   If the path exists for compatibility, also require:
   - Who or what depends on this compatibility behavior?
   - What condition allows this path to be removed?
   - How can future humans or AI agents verify that removal is safe?

   If a branch lacks a sufficient reason, treat it as a defect. Do not normalize it as style, preference, or harmless flexibility. If a compatibility path has no owner, no observable dependency, or no release condition, treat it as leaking complexity and do not add it.

4. Implement with the fewest necessary paths.
   - Prefer the smallest correct change.
   - Keep the main path straight and visible.
   - Prefer linear flow inside each function; move classification and case-specific discussion behind a clearer function boundary.
   - Make necessary branches short, local, named when useful, and easy to test.
   - Avoid nested branches unless each nested decision has a clear independent semantic reason.
   - Do not add boolean or mode parameters unless each mode is a real business concept.
   - Do not add fallback behavior that hides unknown states or swallows errors.
   - Catch only errors the code knows how to handle, and keep error recovery separate from ordinary business flow.
   - Split code when one function is forced to manage unrelated paths.
   - Use data structure, table-driven dispatch, or polymorphism only when it reduces path reasoning.
   - Prefer procedural or functional code when it keeps dependencies explicit, flow local, and compatibility surfaces small.
   - Do not introduce a class, inheritance hierarchy, mutable instance state, or public object API only to reduce parameter count or prepare for future extension.
   - Prefer explicit parameters over hidden object state. If the language supports named parameters, prefer named parameters for readability and mistake prevention.
   - Treat every public field, method, override hook, fallback, flag, migration path, and compatibility API as a compatibility commitment that needs a release condition.

5. Review flow complexity before style.

   List findings by severity:
   - `blocker`: a new or existing path lacks sufficient business meaning, hides failure, or makes correctness hard to prove.
   - `non-blocker`: a path is necessary but could be shorter, clearer, more local, or better tested.

   For each finding, name the branch and explain:
   - The paths it creates.
   - Why those paths are insufficiently justified or hard to reason about.
   - The concrete simplification: delete, merge, shorten, split, move, test, or clarify the branch.

6. Report the complexity result for non-trivial changes.

   Include:
   - New paths added.
   - Why each path is necessary.
   - Whether any path exists for compatibility.
   - For each compatibility path, its owner, dependency, release condition, and safe-removal verification.
   - How the paths were kept local and verified.

   If no new paths were added, say so. If no compatibility path was added, say so.

## Compatibility is the source of Complexity

Compatibility decides what inputs are valid and how the system should respond to them, which creates branches in the code. If we design for a specific set of inputs and behaviors, we can keep the code simple and focused. If we try to be more compatible with different inputs, edge cases, or failure modes, we add branches that increase complexity and make the code harder to understand and maintain. Therefore, compatibility is a form of technical debt that should only be taken on when there is a clear business need for it.

AI agents can accidentally add compatibility paths but never have enough context to remove them, so they need to be guided to avoid adding unnecessary paths and to keep the main path clear.

The strategy is to start with a minimal implementation that solves the problem for the most case, and only add branches when there is a clear business issue that requires them.

## Compatibility Must Be Collectable

Compatibility is like memory allocation: every compatibility path allocates complexity, and every allocation needs a release condition. Compatibility is not garbage-collected automatically; it must be designed so humans and AI agents can later judge whether it is safe to remove.

Do not add compatibility behavior unless its lifetime is clear. A compatibility path should document what code cannot express: who depends on the compatibility behavior, what condition allows it to be removed, and how future maintainers can verify that removal is safe.

Use a `COMPATIBILITY` comment next to compatibility branches when the removal condition is not obvious from code:

```ts
// COMPATIBILITY: Mobile clients before 4.8 send `user_id`.
// Remove when mobile <4.8 traffic stays below 1% for 30 days.
const userId = body.userId ?? body.user_id;
```

If a compatibility path has no clear owner, no observable dependency, or no release condition, treat it as a leak. Avoid designing APIs, object models, flags, fallbacks, migrations, or public members that cannot be judged collectable later.

Good compatibility design makes cleanup possible. Bad compatibility design creates permanent residue.

## Minimize Object Compatibility Surface

Avoid object-oriented design by default, especially public mutable object models, inheritance, and override-based behavior. Classes turn every public field and method into a compatibility surface. Once exposed, AI agents and humans both have difficulty proving whether each public member must remain compatible, so classes tend to accumulate compatibility debt and cause complexity to grow explosively.

Prefer procedural or functional design unless object-oriented modeling is required by the language, framework, external API, persisted data model, or an explicit business need. The goal is not to follow a paradigm, but to keep dependencies explicit, flows local, and compatibility surfaces small.

| Style | Prefer when | Avoid when | Complexity risk |
| --- | --- | --- | --- |
| Procedural | The task is a clear sequence of operations with explicit inputs and outputs. | It relies on global state, hidden initialization order, or long functions that mix unrelated workflows. | Can become a large implicit state machine if shared state is not controlled. |
| Functional | The logic can be expressed as pure transformations, validation, calculation, or data mapping. | It becomes point-free, overly abstract, deeply nested, or hides control flow behind generic combinators. | Can hide paths behind higher-order abstractions and make debugging indirect. |
| Object-oriented | The language, framework, external API, persisted model, or business domain requires stable object boundaries. | It is introduced only to reduce parameter count, prepare for future extension, or create broad public APIs. | Public members, inheritance, mutable instance state, and overrides create compatibility surfaces and hidden paths. |

Do not treat many parameters as a reason to introduce an object or class. In AI-assisted programming, passing explicit parameters is acceptable because the cost of writing and updating call sites is much lower than the cost of maintaining an unclear compatibility surface. If the language supports named parameters, prefer named parameters for readability and mistake prevention.

When object-oriented code is necessary, keep it narrow:
- Minimize public fields and methods.
- Prefer composition over inheritance.
- Avoid mutable instance state when plain data can be passed explicitly.
- Avoid override hooks unless the extension point is a real business requirement.
- Treat every public member as a compatibility commitment.

## Modeling Error is the source of bug

Code represents real-world concepts, but never the real world itself.

Suppose we have a branch condition that checks a real-world state. The code can be wrong by accepting, granting, matching, or allowing something it should not, or by rejecting, denying, missing, or blocking something it should allow. If the code fully knew how to classify the real world, the modeling error would not exist. For modeling errors that cannot be eliminated, reason about whether the system remains safe and recoverable when the approximation is wrong.

Think about the **probability and impact** of these errors.

- High Probability: If the branch condition is based on a complex heuristic, an external system, or a new feature, it is more likely to be wrong.
- High Impact: If the branch condition controls a critical business rule, a security check, or a costly operation, it is more likely to cause significant damage if it is wrong.

Use an `ASSUMPTION` comment before fuzzy or approximate branches. The comment must be self-contained: name the real-world state being approximated, then explain how the system remains safe if the branch is wrong in either direction. Prefer behavior words from the domain over abstract terms like false positive or false negative.

```ts
// ASSUMPTION: Treat a matching email domain as a weak signal that the user may
// belong to this organization.
// If this accepts the wrong user: they only see the join request screen and
// cannot access organization data until an admin approves.
// If this rejects the right user: they can still request an invite manually.
if (email.endsWith(companyDomain)) {
  showJoinRequest();
}
```

```ts
// ASSUMPTION: Treat a recent successful payment as enough evidence that the
// subscription is active while billing webhooks may be delayed.
// If this grants access incorrectly: access is limited to the current billing
// period and the next webhook or reconciliation job will revoke it.
// If this denies access incorrectly: the user can retry after webhook sync or
// contact support; no billing state is mutated here.
if (lastPayment.status === "succeeded") {
  allowAccess();
}
```

If the comment cannot explain why the system remains safe or recoverable when the approximation is wrong, treat the branch as a possible bug or vulnerability. Do not use comments to paper over that risk; reduce permission, add verification, move the decision behind a clearer boundary, or make the failure mode explicit.

If error is low probability and low impact, we can accept the risk of the branch being wrong, but we should still monitor it and be ready to fix it if it causes problems.

## Code Comment Policy

Comments should cover facts the code cannot prove by itself. Do not comment ordinary straight-line code, obvious assignments, or behavior that names and tests can express.

Use comments mainly for:
- `COMPATIBILITY`: a compatibility branch whose safe removal condition is not expressible in code.
- `ASSUMPTION`: a fuzzy or approximate real-world model where the system must remain safe if the approximation is wrong.
- `RECOVERY`: an error-handling path that uses a real fallback, bounded retry, context-preserving rethrow, or boundary-level report.
- `INVARIANT`: a local dependency on a fact that is enforced elsewhere and cannot be proven at the current site.

If a comment is needed only to explain what the code does, simplify or rename the code instead. If a long comment is needed to justify a branch, first try to delete, merge, shorten, split, move, test, or clarify that branch.

## Error Handling (Runtime Exceptions)

Error throwing and catching are powerful tools that create new complexity paths, so they must be used with care.

Error handling in `try-catch` always has exactly four valid choices.

A `try-catch` is allowed only when the code can make one of these decisions:

1.  **FALLBACK AVAILABLE**: It knows how to handle the failure: use a real fallback, such as cached data or a looser parser.
2.  **RETRY IF ACCIDENTAL**: It believes the failure is accidental or transient: retry with a clear retry limit or policy.
3.  **ENHANCE CONTEXT**: It can add missing context: wrap and rethrow while preserving the original stack with `cause` or an existing project helper.
4.  **LOG AT BOUNDARY**: It cannot handle the failure locally: report or present the error, contain the blast radius, and notify external intervention at a boundary such as API, GUI, CLI, worker, delegate, or error boundary code.

In every other case, never catch. Do not catch only to log, ignore, translate without preserving the original error, or make the code look defensive. Log where the error is presented or reported, not at every layer. If wrapping is useful, prefer an existing helper such as `newError` or `scopeError`; otherwise use `new Error(message, { cause: error })` where supported.

## Divide and Conquer

When you need to solve a problem with multiple items, consider whether to solve it with a single path that iterates over the items, or with multiple paths that each handle one item. Don't add paths for each item unless there is a clear business reason to treat them separately.

### Collection to Element

for-loops need to narrow the collection problem into a single item to be a single path. If the items are truly independent, they can be separate paths. If they are part of the same problem, they should be handled in a single path that iterates over them. This keeps the main path clear and avoids unnecessary branching.

### General to Specific

When handling a problem that has a general case and specific cases, consider whether the specific cases can be handled as part of the main path with conditional logic, or if they require separate paths. If the specific cases are just variations of the general case, they can often be handled in the same path with clear conditions. If they represent fundamentally different scenarios, they may warrant separate paths.

## Linear Flow First

Prefer a linear process inside each function. A reader should be able to follow the function as one general flow with only the necessary local decisions.

When a function needs to discuss multiple categories, types, modes, or scenarios, treat that as a signal to divide the problem. Keep the caller focused on the general process, and extract the category-specific discussion into a more specific function where that narrower problem can be handled linearly.

This follows General to Specific: the outer function describes the broad workflow, while inner functions handle the detailed cases. Do not make one function carry too many categories of flow at once.
