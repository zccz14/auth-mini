# Context

## Progress

- 2026-04-07: 基于 run `24081238974` / job `70242129093` 的新增诊断，已把失败进一步定位到 `docker/test-entrypoint.sh` 的 `supervision cloudflared exit stops auth-mini` case。最小复现显示问题在 `docker/entrypoint.sh`：`cloudflared` 先退出时先记录其退出码 `23`，随后 cleanup `auth-mini` 又等待并把全局 `WAIT_STATUS` 覆盖成 `143`，导致容器最终错误返回 `143`。已先通过把该 supervision case 加上 `STUB_REAL_SLEEP=1` 让本地稳定 red（`expected exit status 23, got 143`），再最小修改 `terminate_child` 支持保留主退出码，并在 sibling-cleanup 路径传入 preserve 标记。fresh 验证 `bash docker/test-entrypoint.sh supervision`、`bash docker/test-entrypoint.sh validation`、`bash docker/test-image-smoke.sh` 全部通过。
- 2026-04-07: 用户反馈推送 `69fc74f test: stabilize docker release checks` 后，新的 Actions run `24080449857` / job `70239376162` 仍在 `Validate entrypoint supervision` 失败。由于当前 GitHub 页面与 API 只能拿到 step 级 exit code，看不到脚本内部是哪一个 supervision 子场景断言失败，已在 `docker/test-entrypoint.sh` 增加 failure diagnostics：失败时打印 `mode`、当前 case 名称、每个临时 run dir 的 `events.log` / `*.argv` / `curl-*`，并输出相关容器的 `docker ps` 与 `docker logs`。同时把 supervision 末尾两个 signal/teardown 断言也改成条件等待，覆盖容器退出后挂载日志刷盘稍慢的竞态。fresh 验证 `bash docker/test-entrypoint.sh validation` 与 `bash docker/test-entrypoint.sh supervision` 均通过；下一次 CI 失败时应能直接看到具体卡在哪个 case。
- 2026-04-07: 针对用户给出的 `release-image` 失败 job `70236397258` 做了 root-cause 排查。GH log 显示失败发生在 `bash docker/test-entrypoint.sh supervision`；本地脚本和镜像 smoke 可通过，说明更像 CI 时序竞态而非 entrypoint 逻辑回归。已将 `docker/test-entrypoint.sh` 与 `docker/test-image-smoke.sh` 中“看到 `cloudflared.argv` 后立刻断言 curl 计数/容器日志”的检查改为条件等待，避免日志与挂载文件尚未刷出时偶发误判。随后 fresh 验证 `bash docker/test-entrypoint.sh validation`、`bash docker/test-entrypoint.sh supervision`、`bash docker/test-image-smoke.sh` 全部通过。
- 2026-04-07: 为推进 Task 5，运行了非网络 final verification：`npm test` 在默认并行模式下失败于 `tests/integration/oclif-cli.test.ts` 中两个 packed-install help tests（各 30s timeout）；进一步排查显示 `npm pack --json --dry-run` 实际包含 `dist/`，且手工 instrument 的 packed CLI 路径很快（build ~1.4s / pack ~0.6s / install ~2.1s / `--help` ~3.3s），对应两个测试单独运行通过，`npx vitest run tests --maxWorkers=1` 全量 249 tests 也通过。当前判断为并行模式下的 suite-level contention / flaky timeout，而非本轮 docs 变更回归。
- 2026-04-07: Task 4 已完成实现、通过 spec review / code quality review，并在本地重新验证 `bash docker/check-docs.sh post` 通过；已提交 `acc140f docs: add cloudflared docker deployment guide`。Task 3 仍仅剩 `actionlint` 受环境镜像拉取超时阻塞。
- 2026-04-07: Task 3 当前已生成 `.github/workflows/release-image.yml` 与 `docker/check-release-workflow.sh`，并经过多轮 spec/code review 修正 recovery path、owner lowercase、publish.yml drift guard、rerun gating、manual recovery ancestry、GHCR dual-tag skip 逻辑；本地 `bash docker/check-release-workflow.sh` 已通过，但 `docker run --rm -v "$PWD":/repo -w /repo rhysd/actionlint:1.7.7 -color` 仍因镜像拉取超时受阻，暂未宣告该 task 最终完成或提交。
- 2026-04-07: 发现当前分支已经比 `origin/main` 超前 3 个 cloudflared 相关提交：`17d8ca1 build: add docker image skeleton`、`db73e9a build: include runtime sql schema in image`、`8427f1d build: add cloudflared container entrypoint`。已用现有脚本 fresh 验证 `bash docker/test-entrypoint.sh validation` 与 `bash docker/test-entrypoint.sh supervision` 均通过；`bash docker/test-image-smoke.sh` 仍在 Docker Hub / base-image 拉取阶段超时，待网络可达时复核。

- 2026-04-07: 用户要求继续执行 cloudflared Docker release 方案；当前使用 legionmind + subagent-driven-development，主上下文只做 orchestration / review，不使用 worktree。
- 2026-04-07: 检查到 `.legion/plan.md` 与 `.legion/tasks.md` 仍指向更早的 demo/docs 任务，已切换为当前 cloudflared Docker release 执行契约与 task tracker。
- 2026-04-07: 已根据 reviewer 最新意见细化 `docs/superpowers/plans/2026-04-07-cloudflared-docker-release.md`：把 entrypoint Task 2 进一步拆分为 readiness / supervision / image smoke 子阶段，并把 workflow/docs/final verification 拆成独立 chunk，减少 implementer scope。
- 2026-04-06: 用户提出将 SDK 中的全局变量 `MiniAuth` 改为 `AuthMini`。初始方案为仅改浏览器全局名；在澄清后，用户确认当前没有历史包袱，要求做一次性全面重命名。
- 2026-04-06: 已完成本轮 brainstorming，确认范围包括浏览器全局、SDK 类型/工厂函数、测试 helper、demo 文案与 README；明确非目标为仓库名、目录名、存储键等项目级命名。
- 2026-04-06: 已写出设计文档 `docs/superpowers/specs/2026-04-06-authmini-rename-design.md`，下一步进入 spec review 与用户 review gate。
- 2026-04-06: `docs/superpowers/specs/2026-04-06-authmini-rename-design.md` 已完成 review-rfc 闭环；初版问题主要是范围失控与不可执行的验证口径，现已收敛为可判定的 allowlist 验收，并获得 `APPROVED`。
- 2026-04-06: 用户已认可 `docs/superpowers/specs/2026-04-06-authmini-rename-design.md`。随后完成 implementation plan `docs/superpowers/plans/2026-04-06-authmini-rename.md`，修正了 error 名、测试命令、demo hook 全局名与 verification 口径后，通过 review-rfc 获得 `APPROVED`。

- 2026-04-04: 用户批准 `docs/superpowers/specs/2026-04-04-single-page-demo-docs-design.md` 与 `docs/superpowers/plans/2026-04-04-single-page-demo-docs.md`，要求直接执行，不使用 worktree，采用 LegionMind multi-agent，边做边提交，全部完成后再 push。
- 2026-04-04: 主上下文仅做 orchestration / review / `.legion` 写回；实现、测试、提交按 plan task 顺序交给 fresh subagent 执行。
- 2026-04-04: 已完成本轮 brainstorming、中文 spec、implementation plan，并得到用户批准开始执行。
- 2026-04-04: 用户要求使用 legionmind multi-agent 执行，不使用 worktree，边做边提交，完成后 push。
- 2026-04-04: 当前仓库有未跟踪设计/计划文档：`docs/superpowers/specs/2026-04-03-auth-server-cors-sdk-demo-design.md` 与 `docs/superpowers/plans/2026-04-03-auth-server-cors-sdk-demo.md`，需要纳入执行过程。
- 2026-04-04: 执行顺序按 plan 切为三段：Server CORS、SDK endpoint 契约、Demo/README/最终验证。
- 2026-04-04: 已提交 design/plan 文档：`cf36bb9 docs: add cors sdk demo design and plan`。
- 2026-04-04: Task 1 已完成并提交：`82d091c feat: add auth server cors responses`；该切片补齐了全局 CORS middleware、allowed/disallowed origin、preflight、error-path 与 `Vary: Origin` 行为。
- 2026-04-04: Task 2 已完成并提交：`3470131 test: cover sdk endpoint cors contract`；该切片为 `/sdk/singleton-iife.js` 补上了 allowed-origin CORS 测试，并去掉了 served source 里的 same-origin 限制文案。
- 2026-04-04: Task 3 已完成并提交：`e4c0626 feat: update demo for direct cors usage`；该切片移除了 proxy 文案，setup 继续从 `window.location.origin` 推导 Auth Server `--origin`，并允许通过 `?sdk-origin=` 覆盖默认 SDK origin。
- 2026-04-04: Task 4 已完成最终实现与验证；README 已更新 cross-origin 浏览器接入说明，demo 启动命令现在会根据实际 SDK URL 渲染具体 `--issuer`，并将 passkey 限制与 CORS allowlist 提示拆开。
- 2026-04-04: 已完成最终全量验证：`npm test && npm run typecheck && npm run lint && npm run build`，结果为 21 个 test files / 148 个 tests 全通过，typecheck/lint/build 全成功。

## Decisions

- 继续使用 `.legion/` 作为主控上下文，subagent 不直接写回 `.legion` 三文件。
- 不使用 worktree；所有实现在当前工作区进行。
- cloudflared Docker release 执行遵循 `docs/superpowers/plans/2026-04-07-cloudflared-docker-release.md`，按 Task 1-5 顺序推进，每个 task 完成后先做 spec compliance review，再做 code quality review。
- 当前交付只覆盖 Docker / cloudflared / GHCR workflow / docs，不把 Cloudflare 逻辑侵入 `src/`。

## Next

- 派发 fresh implementer subagent 执行 Task 1：`Dockerfile`、`.dockerignore`、`docker/entrypoint.sh` 骨架。
- Task 1 完成后做 spec review 与 code quality review；如通过则提交该 task。
- 然后继续 Task 2-5，全部验证完成后 push 当前分支。
