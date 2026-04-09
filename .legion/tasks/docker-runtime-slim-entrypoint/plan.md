# Docker runtime slim + tini start

## 问题定义

用户要求进一步收敛为最简单的容器启动链：删除 `launcher.mjs`，不做额外校验，直接使用 `tini + auth-mini start`。

## 验收

- 基础镜像使用 `node:24.14.1-trixie-slim`
- 删除 `docker/entrypoint.sh` 与 `docker/launcher.mjs`
- runtime 不安装 `curl` / `cloudflared`
- 镜像入口为 `tini -> auth-mini start`
- 如需 graceful teardown，仅保留在应用内已有逻辑

## 风险分级

- **Level: Low**
- **标签**：`continue`

## 允许 Scope

- Dockerfile
- src/commands/start.ts
- docker/test-entrypoint.sh
- docker/test-image-smoke.sh
- .legion/tasks/docker-runtime-slim-entrypoint/\*\*

## Phase Map

1. 移除 launcher，改为纯 tini + auth-mini start
2. 更新测试脚本验证默认命令链
3. 更新文档与汇报

---

_创建于: 2026-04-09 | 最后更新: 2026-04-09_
