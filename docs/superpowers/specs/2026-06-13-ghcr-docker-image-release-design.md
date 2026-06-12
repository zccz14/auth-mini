# GHCR Docker Image 发布设计

## 背景/目标

- 当前 Docker runtime 已固定为 Rust `auth-mini` binary，PR CI 已通过 Docker smoke 覆盖本地镜像构建与基础运行检查。
- 需要在 `v*` release tag 推送时发布正式 Docker image 到 GHCR，供用户直接拉取运行。
- 本轮目标是新增单一路径的 GHCR 发布 workflow：发布现有 Rust Docker runtime image，不引入 Node runtime、npm CLI wrapper、双 runtime、Helm、Cloudflared 打包或 npm 发布。

## 范围

- 新增 GitHub Actions workflow，在 push `v*` tag 时运行。
- 发布 `ghcr.io/zccz14/auth-mini`，平台仅覆盖 `linux/amd64`。
- 发布 tags：完整 release tag（如 `v0.3.0`）、minor tag（如 `0.3`）和 `latest`。
- tag 必须匹配 `vX.Y.Z`；不匹配时 workflow 失败，不猜测版本。
- 发布前运行 Docker smoke，覆盖镜像构建、`/healthz`、未认证 `/me`、SQLite 初始化检查。
- 更新 README、CLI operations 和 Docker deployment 文档，说明 GHCR 拉取与运行方式。

## 非目标

- 不创建实际 release tag。
- 不做 multi-arch；`linux/amd64` 之外的平台是后续工作。
- 不做 npm package release；npm 仍只作为 SDK 发布路径。
- 不做 Helm、Cloudflared image 或线上 EC2 变更。
- 不新增 Node runtime、Node wrapper、npm/npx 运行路径或旧 Docker 兼容路径。

## 设计方案

- 新增 `.github/workflows/release-image.yml`，使用 `push.tags: v*` 触发。
- workflow 权限最小化为 `contents: read` 和 `packages: write`。
- 先用 shell 正则校验 `${{ github.ref_name }}` 必须是 `vX.Y.Z`，并派生 GHCR full、minor、latest 三个 tag。
- 复用 `docker/test-image-smoke.sh` 构建本地 smoke image 并运行现有 runtime 检查；该 PR smoke 路径不推送镜像。
- smoke 通过后登录 GHCR，并使用 Docker 官方 actions 构建和推送 `linux/amd64` image。

## 测试与验证

- YAML parse 验证新增 workflow 可被解析。
- `bash -n` 检查 smoke/build/docs 脚本。
- `bash docker/check-docs.sh post` 验证 Docker 文档约束。
- Docker daemon 可用时运行 `bash docker/test-image-smoke.sh`。
- 运行现有 TypeScript、npm、Rust e2e、cargo fmt/clippy/test/build 验证。

## 后续工作

- multi-arch image 发布。
- 实际 release tag 创建与发布演练。
- npm SDK-only release 流程继续独立处理。
