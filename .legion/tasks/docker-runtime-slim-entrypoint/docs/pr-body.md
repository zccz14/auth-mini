# Summary

## What

本 PR 将 Docker 运行时收敛为最小启动模型，最终镜像采用：

- `ENTRYPOINT ["/tini", "--"]`
- 默认 `CMD ["auth-mini", "start", "/data/auth.sqlite", "--port", "7777"]`

同时移除了 runtime 中不再需要的 `curl`、`cloudflared`、`docker/entrypoint.sh`、`docker/launcher.mjs`，保持 `USER node`，并修复了真实容器下 `auth-mini init/start` 需要读取的 package/schema 文件权限。

## Why

目标是把容器启动链简化为可审计、可验证、低耦合的最小形态，减少 runtime 面与历史遗留启动包装逻辑。

另外，本轮也补齐了 `tini` 下载的按架构 SHA256 校验，为 `start` 命令增加了 `AUTH_HOST` / `AUTH_PORT` / `AUTH_ISSUER` 环境变量回退，并让本地 Docker 冒烟测试覆盖真实容器启动后的 HTTP 路径。

## How

实现上保留 `tini -> auth-mini start` 作为唯一启动链，并在 Docker 测试脚本中补强以下断言：

- 镜像默认 `ENTRYPOINT + CMD` 命令链
- non-root 运行
- runtime 精简结果
- `tini` checksum 回归
- 本地 Docker arm64 宿主机场景下的平台 / 权限兼容性
- 真实容器 `init -> start -> HTTP` smoke（`/jwks`、SDK、未授权 `/me`）

# Testing

见 `./test-report.md`，以下命令均已 PASS：

```bash
bash -n docker/test-entrypoint.sh
bash -n docker/test-image-smoke.sh
bash docker/test-entrypoint.sh validation
bash docker/test-entrypoint.sh supervision
bash docker/test-image-smoke.sh
```

评审结果：

- `./review-code.md`：PASS
- `./review-security.md`：PASS

# Risks or Follow-ups

当前无阻塞风险；建议后续继续补强：

- 基础镜像 digest pin
- CI 漏洞扫描 / SBOM
- 请求体大小限制与超时控制
- 环境变量异常路径测试（如非法 `AUTH_PORT`）
