# Docker runtime slim + tini start

## 问题定义

用户要求进一步收敛为最简单的容器启动链：删除 `launcher.mjs`，不做额外校验，直接使用 `tini + auth-mini start`。

## 验收

- 基础镜像使用 `node:24.14.1-trixie-slim`
- 删除 `docker/entrypoint.sh` 与 `docker/launcher.mjs`
- runtime 不安装 `curl` / `cloudflared`
- 镜像入口为 `tini -> auth-mini start`
- 真实容器可在 `USER node` 下完成 `auth-mini init` 与 `auth-mini start`
- 容器场景支持通过环境变量回退配置 `AUTH_ISSUER`（以及需要 published port 时的 `AUTH_HOST`）
- 如需 graceful teardown，仅保留在应用内已有逻辑

## 风险分级

- **Level: Low**
- **标签**：`continue`
- **理由**：当前继续项主要是本地 Docker 冒烟验证、测试夹具修复与 `tini` 完整性校验补强；均可通过 Dockerfile / shell 脚本最小回滚，不涉及数据迁移或外部契约再设计。

## 假设与约束

- 保持极简运行模型：`tini -> auth-mini start`。
- 不重新引入 `docker/entrypoint.sh`、`docker/launcher.mjs`、`curl`、`cloudflared`。
- 本轮以本地可用 Docker daemon 的真实容器验证为准，默认目标平台为 `linux/amd64`。
- 本轮允许通过 `src/commands/start.ts` 的环境变量回退适配容器场景，但不重新引入 Docker 专用 launcher/entrypoint。

## 允许 Scope

- Dockerfile
- src/commands/start.ts
- docker/test-entrypoint.sh
- docker/test-image-smoke.sh
- .legion/tasks/docker-runtime-slim-entrypoint/\*\*

## Design Index

- `docs/rfc.md`：本 task 的设计背景、容器模型与回滚口径。
- `docs/test-report.md`：本地 Docker 实跑验证结论。
- `docs/review-code.md` / `docs/review-security.md`：最终评审结论。

## Phase Map

1. 移除 launcher，改为纯 tini + auth-mini start
2. 更新测试脚本验证默认命令链与真实容器 HTTP smoke
3. 更新文档与汇报

---

_创建于: 2026-04-09 | 最后更新: 2026-04-09_
