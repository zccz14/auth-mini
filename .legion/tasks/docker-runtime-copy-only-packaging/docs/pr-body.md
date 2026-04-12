# Summary

## What

本 PR 将容器打包链路调整为基于 runtime artifact 的 copy-only packaging：

- 新增 `build/Dockerfile` 与 `build/docker-bake.json`
- 删除根目录 `Dockerfile`，统一从 `build/` 进入 Docker 构建
- 新增 artifact 准备 / 镜像构建脚本
- Dockerfile 不再执行 `npm ci` / `npm run build` / `npm prune`

## Why

此前镜像构建同时承担依赖安装、构建与运行时组装，职责耦合较重，复现与调试成本较高。
本次调整将“artifact 生成”和“image 组装”解耦，使 Docker build 更接近“少 build、多 copy”的目标，并顺手去掉了过重的 release gate 逻辑。

## How

- 在固定 tag 的 `node:24.14.1-trixie-slim` 容器中准备 `build/runtime/linux-amd64/` artifact
- 通过 `build/docker-bake.json` 驱动 `release-check` / `release` 镜像构建
- workflow 参考 `~/Work/Yuan` 做过对照后，最终收敛为单 job：在一个 `release-image` job 内直接完成 prepare / build / test / publish，避免不必要的 artifact upload/download
- publish 决策改成更直接的“镜像是否已存在”判断：push 到 main 时若当前版本 tag 在 GHCR 不存在则发布，存在则跳过；`workflow_dispatch` 仍可显式发布
- GitHub Actions 继续 pin 到 commit SHA
- 按最新要求删掉 `.artifact-manifest.json` / `verify-runtime-artifact.sh`，不再为 CI fresh 环境增加额外 artifact 校验复杂度
- 保持镜像契约不变：`tini -> auth-mini start`、`USER node`、真实 init/start/smoke 继续通过

# Testing

以下验证均已 PASS：

- `python3 - <<'PY' ... yaml.safe_load(...) ... PY`
- `bash -n scripts/prepare-linux-runtime-artifact.sh`
- `bash -n scripts/build-runtime-image.sh`
- `bash -n docker/test-entrypoint.sh`
- `bash -n docker/test-image-smoke.sh`
- `docker buildx bake -f build/docker-bake.json release-check --print`
- `bash docker/test-entrypoint.sh validation`
- `bash docker/test-entrypoint.sh supervision`
- `bash docker/test-image-smoke.sh`

评审结果：

- review-code: PASS
- review-security: PASS

# Risks or Follow-ups

## Risks

- 外部若仍依赖根目录 `Dockerfile`，需要同步切换到 `build/` 入口
- 当前实现聚焦 `linux-amd64` artifact，后续多架构扩展仍需统一建模

## Follow-ups

- 如需支持 arm64，可统一参数化 artifact / bake / smoke 平台
- 若进一步追求纯 copy-only，可评估将 `tini` 也前移到 artifact 阶段
- 当前 workflow 已按你的要求优先选择“更快、更稳”的单 job 版本
