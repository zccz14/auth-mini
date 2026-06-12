# GHCR Docker Image 发布实施计划

## 目标

新增 `v*` tag 触发的 GHCR Docker image 发布 workflow，发布现有 Rust `auth-mini` Docker runtime 到 `ghcr.io/zccz14/auth-mini`，当前仅覆盖 `linux/amd64`。

## 文件变更

- 新增 `.github/workflows/release-image.yml`：tag 触发、semver 校验、Docker smoke、GHCR login、构建并推送 image。
- 更新 `README.md`、`docs/reference/cli-and-operations.md`、`docs/deploy/docker-cloudflared.md`：说明 GHCR image 拉取、运行和版本 tag。
- 更新 `docker/check-docs.sh`：文档检查从“GHCR 是后续工作”调整为“GHCR 已发布 linux/amd64，multi-arch 后续”。
- 新增本 spec 和 plan：记录 GHCR 发布范围与后续 multi-arch 边界。

## 实施步骤

- [x] 调研现有 release、Docker smoke、Dockerfile、bake、文档和 spec/plan 目录。
- [x] 新增 release image workflow，保持单一路径发布 Rust Docker runtime。
- [x] 复用现有 Docker smoke，发布前覆盖构建、`/healthz`、未认证 `/me` 和 DB 初始化。
- [x] 更新文档与文档检查脚本。
- [ ] 执行本地验证、提交、rebase、push、创建 PR，并跟进 checks/mergeability。

## 验证计划

- workflow YAML parse。
- `bash -n scripts/build-runtime-image.sh docker/test-image-smoke.sh docker/check-docs.sh`。
- Docker daemon 可用时运行 `bash docker/test-image-smoke.sh`。
- `bash docker/check-docs.sh post`。
- `npm run typecheck`、`npm run build`、`npm test`、`npm run test:rust-e2e`。
- `cargo fmt --manifest-path rust-backend/Cargo.toml --check`。
- `cargo clippy --manifest-path rust-backend/Cargo.toml --all-targets -- -D warnings`。
- `cargo test --manifest-path rust-backend/Cargo.toml`。
- `cargo build --manifest-path rust-backend/Cargo.toml`。

## 复杂度边界

- 新增分支只用于 release tag semver 校验；不匹配时失败，避免猜测或兼容多种 tag 格式。
- 不新增 runtime 分支、兼容旧 Docker 路径、Node wrapper、npm/npx 或双 runtime。
- multi-arch、actual release tag、npm SDK-only release 保持为明确后续任务。
