# Summary

- 删除 `docker/entrypoint.sh` 和 `docker/launcher.mjs`
- 镜像入口改为 `tini -> auth-mini start`
- runtime 保持 `node:24.14.1-trixie-slim`，且不包含 `curl` / `cloudflared`

# Testing

- ✅ `bash -n docker/test-entrypoint.sh && bash -n docker/test-image-smoke.sh`

# Risks or Follow-ups

- 还未在有 Docker daemon 的环境重跑容器级测试。
- 当前不再额外做 issuer 校验或 init 编排，完全依赖 `auth-mini start`。
