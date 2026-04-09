# Docker runtime slim + entrypoint 评估 - 上下文

## 会话进展 (2026-04-09)

### ✅ 已完成

- 已完成任务契约 plan.md、简版 RFC 与 RFC review 闭环；风险定级为 Medium 并获 APPROVED。
- 已完成 Dockerfile 改造：基础镜像锁定到 node:24.14.1-trixie-slim@sha256:c319bb4fac67c01ced508b67193a0397e02d37555d8f9b72958649efd302b7f8，新增非 runtime 的 cloudflared-fetch 阶段并移除 runtime apt。
- 已完成 entrypoint 安全收敛：TUNNEL_TOKEN 不再出现在 argv，且不会被 auth-mini 继承；runtime 默认切换为非 root 用户。
- 已完成 review 闭环：review-code PASS、review-security PASS；entrypoint 结论为“本轮不可移除”。
- 用户已将方案进一步收敛：只保留 node:24.14.1-trixie-slim，不锁 digest；runtime 去掉 apt、curl、cloudflared。
- Dockerfile 已简化为纯 auth-mini runtime；docker/entrypoint.sh 已改为单进程入口，只做 AUTH_ISSUER 校验、首次 init、exec auth-mini start。
- docker/test-entrypoint.sh 与 docker/test-image-smoke.sh 已同步移除 cloudflared/curl mock 与相关断言；shell 语法检查通过。
- 已删除 docker/entrypoint.sh，运行模型改为 tini -> node /app/docker/launcher.mjs -> auth-mini。
- Dockerfile 已切换到 node:24.14.1-trixie-slim，并在独立阶段安装 tini 后复制到 runtime。
- docker/test-entrypoint.sh 与 docker/test-image-smoke.sh 已改为围绕 launcher + 单进程 auth-mini 模型验证。
- 已删除 docker/launcher.mjs，镜像入口进一步收敛为 tini -> auth-mini start。
- Dockerfile 现在使用 ENTRYPOINT ["/usr/bin/tini", "--", "auth-mini"] + 默认 CMD start /data/auth.sqlite --host 127.0.0.1 --port 7777。
- docker/test-entrypoint.sh 与 docker/test-image-smoke.sh 已改为验证默认命令链与 tini 存在，不再依赖 launcher。


### 🟡 进行中

(暂无)


### ⚠️ 阻塞/待定

- 容器级 Docker 测试仍待在有 Docker daemon 的环境执行。


---

## 关键文件

(暂无)

---

## 关键决策

| 决策 | 原因 | 替代方案 | 日期 |
|------|------|----------|------|
| 本任务先按 Medium 风险推进 | 变更影响容器运行时契约与发布镜像，但仍可通过 Dockerfile 回滚，不涉及数据迁移。 | 若仅替换 tag 且不评估 entrypoint，可按 Low 处理；但用户要求同时评估 entrypoint 去留，需更明确设计。 | 2026-04-09 |
| 本轮固定采用 node:24.14.1-trixie-slim 作为 builder/runtime 基础镜像 | 满足锁定 Node 24.14.1 与最新 Debian slim 的要求，且官方 tag 当前可用。 | 继续使用浮动 tag 或 bookworm-slim 会降低可复现性/不满足“最新 slim”要求。 | 2026-04-09 |
| 本轮 entrypoint 不移除 | 它仍承载参数校验、首次初始化、readiness 门控、双进程监督、信号处理与退出码保留，当前没有等价替代。 | 删除 entrypoint 改成 CMD 串联命令会回退现有容器契约与测试覆盖。 | 2026-04-09 |
| 直接删除所有 cloudflared 与 curl 路径，而不是保留 shim 或下载阶段 | 用户明确要求容器内不要启动 cloudflared、不要 mock curl、不要安装 cloudflared。 | 保留 cloudflared-fetch/curl shim 与双进程编排会违背新的明确指令。 | 2026-04-09 |
| 用 Node launcher 取代 shell entrypoint | 用户明确要求删除 entrypoint.sh，并要求由 tini 作为父进程启动 Node 进程。 | 继续保留 shell entrypoint 不符合最新指令。 | 2026-04-09 |
| 不再新增 launcher 或 index.ts 级包装逻辑 | 用户要求纯粹的 tini + auth-mini start；当前 start 命令已具备基本 graceful shutdown 处理，因此本轮不再额外加一层。 | 继续保留 Node launcher 或把相同职责搬到 index.ts 都会违背“纯粹 tini + auth-mini start”的目标。 | 2026-04-09 |

---

## 快速交接

**下次继续从这里开始：**

1. 在有 Docker daemon 的环境执行 docker/test-entrypoint.sh validation、docker/test-entrypoint.sh supervision、docker/test-image-smoke.sh。

**注意事项：**

- 当前镜像使用默认 CMD 提供 start/dbPath/host/port，issuer 通过容器启动参数追加。

---

*最后更新: 2026-04-09 20:28 by Claude*
