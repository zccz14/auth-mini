# docker-runtime-copy-only-packaging 交付说明

## 任务目标

把 Docker 打包链路调整为更轻的 runtime artifact copy-only packaging：

- Docker 镜像构建只消费预先准备好的 Linux runtime artifact
- 不再在 Dockerfile 内执行 `npm ci` / `npm run build` / `npm prune`
- 保持现有镜像运行契约与启动/冒烟行为不变
- 简化 release workflow，去掉之前过重的 gate 设计

## 实现摘要

本次最终实现完成了以下调整：

- 新增 `build/Dockerfile` 与 `build/docker-bake.json`
- 删除仓库根目录 `Dockerfile`，将 Docker 构建入口统一迁移到 `build/`
- 新增：
  - `scripts/prepare-linux-runtime-artifact.sh`
  - `scripts/build-runtime-image.sh`
- Docker build 现在只读取 `build/runtime/linux-amd64/` 中的 artifact
- artifact 在固定 tag 的 `node:24.14.1-trixie-slim` 容器环境中准备
- 按用户反馈继续简化：不再生成 `.artifact-manifest.json`，也不再做额外 artifact 校验
- workflow 参考 `~/Work/Yuan` 做过对照后，最终收敛为单 job：在一个 `release-image` job 内直接完成 prepare / build / test / publish，避免不必要的 artifact upload/download
- publish 决策改成更直接的“镜像是否已存在”判断：push 到 main 时若当前版本 tag 在 GHCR 不存在则发布，存在则跳过；`workflow_dispatch` 仍可显式发布
- GitHub Actions 继续 pin 到 commit SHA

## 关键结果

### 1. Docker 构建职责收敛为 copy-only

镜像构建阶段不再承担依赖安装、构建和裁剪职责，边界变为：

- artifact 准备：在固定 Node tag 的 Linux 容器环境中完成
- image 组装：仅复制 runtime artifact 并组装镜像

这样显著降低了 Dockerfile 的隐式构建行为，流程也更接近“少 build、多 copy”的目标。

### 2. 复杂度进一步下降

在初版实现基础上，又按你的反馈做了两处收敛：

- 去掉 `.artifact-manifest.json` 与 `verify-runtime-artifact.sh`
- 把 `NODE_IMAGE` 从 digest pin 改回固定版本 tag

现在默认假设 CI 是 fresh 环境，不再为 artifact 复用引入额外元数据检查。

### 3. 镜像运行契约保持不变

虽然构建链路发生变化，但运行面契约保持稳定：

- 入口链路仍为 `tini -> auth-mini start`
- 仍使用 `USER node`
- 真实 `auth-mini init` / `start` 行为保持通过
- HTTP smoke 保持通过

## 变更范围

### 构建入口

- `build/Dockerfile`
- `build/docker-bake.json`

### 脚本

- `scripts/prepare-linux-runtime-artifact.sh`
- `scripts/build-runtime-image.sh`

### 清理/迁移

- 删除根目录 `Dockerfile`
- 删除 `scripts/verify-runtime-artifact.sh`

### CI / Workflow

- 去除旧的复杂 release gate 逻辑
- 调整为更简单的 image existence / manual recovery 检查
- GitHub Actions pin 到 commit SHA

## 验证结果

以下验证均已通过（PASS）：

### 配置/脚本静态校验

- `python3 - <<'PY' ... yaml.safe_load(...) ... PY`
- `bash -n scripts/prepare-linux-runtime-artifact.sh`
- `bash -n scripts/build-runtime-image.sh`
- `bash -n docker/test-entrypoint.sh`
- `bash -n docker/test-image-smoke.sh`

### Docker / 运行时验证

- `docker buildx bake -f build/docker-bake.json release-check --print`
- `bash docker/test-entrypoint.sh validation`
- `bash docker/test-entrypoint.sh supervision`
- `bash docker/test-image-smoke.sh`

### 评审结果

- review-code: PASS
- review-security: PASS

## 风险与影响

当前改动的主要影响点：

- Docker 构建前置依赖 runtime artifact，流程上比“直接 docker build”更显式
- 构建入口迁移到 `build/` 后，依赖旧根目录 `Dockerfile` 的外部调用需要同步更新
- 当前平台聚焦 `linux-amd64`，多架构扩展需要后续统一抽象

总体风险可控，且运行契约与冒烟验证均已覆盖核心路径。

## 后续建议

以下为非阻塞 follow-up：

- 若未来支持 arm64，可统一参数化 artifact / bake / smoke 平台
- 若追求更纯的 copy-only，可后续评估是否将 `tini` 也前移到 artifact 阶段
- 当前 workflow 已按你的要求优先选择“更快、更稳”的单 job 版本；若未来发布链路变复杂，再考虑是否拆 job

## 结论

本任务已完成从“Dockerfile 内构建应用”到“Docker 仅组装 runtime artifact”的切换，同时保持镜像行为契约不变，并按你的反馈进一步删掉了不必要的 manifest 校验与 digest pin，整体复杂度已明显下降，具备合并条件。
