# Context

## Progress

- 2026-04-04: 已完成本轮 brainstorming、中文 spec、implementation plan，并得到用户批准开始执行。
- 2026-04-04: 用户要求使用 legionmind multi-agent 执行，不使用 worktree，边做边提交，完成后 push。
- 2026-04-04: 当前仓库有未跟踪设计/计划文档：`docs/superpowers/specs/2026-04-03-auth-server-cors-sdk-demo-design.md` 与 `docs/superpowers/plans/2026-04-03-auth-server-cors-sdk-demo.md`，需要纳入执行过程。
- 2026-04-04: 执行顺序按 plan 切为三段：Server CORS、SDK endpoint 契约、Demo/README/最终验证。
- 2026-04-04: 已提交 design/plan 文档：`cf36bb9 docs: add cors sdk demo design and plan`。
- 2026-04-04: Task 1 已完成并提交：`82d091c feat: add auth server cors responses`；该切片补齐了全局 CORS middleware、allowed/disallowed origin、preflight、error-path 与 `Vary: Origin` 行为。
- 2026-04-04: Task 2 已完成并提交：`3470131 test: cover sdk endpoint cors contract`；该切片为 `/sdk/singleton-iife.js` 补上了 allowed-origin CORS 测试，并去掉了 served source 里的 same-origin 限制文案。
- 2026-04-04: Task 3 已完成并通过 spec/code review；当前 demo 已移除 proxy 文案，setup 继续从 `window.location.origin` 推导 Auth Server `--origin`，并允许通过 `?sdk-origin=` 覆盖默认 SDK origin，下一步进入 README 与最终验证。

## Decisions

- 继续使用 `.legion/` 作为主控上下文，subagent 不直接写回 `.legion` 三文件。
- 不使用 worktree；所有实现在当前工作区进行。
- 浏览器拓扑保持 `script-origin == api-origin`，CORS allowlist 与 WebAuthn origin 校验统一复用 `--origin`。

## Next

- 提交 Task 3 的 Demo 去 proxy 化切片。
- 然后进入 Task 4：README、全量验证与 push。
