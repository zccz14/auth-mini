# Rust CLI stage3 Implementation Plan

**Goal:** 在不切换 npm CLI 入口的前提下，把 Rust CLI 的 `init`、`rotate jwks`、`start` 补齐到可测试闭环。

**Architecture:** 复用现有 `clap` 命令分发、SQLite schema 初始化和 Rust JWKS key 生成能力。新增命令只接入真实业务边界，不引入 trait 层、测试专用 server 模式或旧 schema 兼容路径。

## Steps

- [x] 调研 Rust `cli.rs`、`main.rs`、`config.rs`、`db.rs`、`jwks.rs` 与 TS `init`、`start`、`rotate jwks` 行为。
- [x] 先写 Rust CLI 单元测试，覆盖解析、DB 变更、错误路径和 start 配置边界。
- [x] 实现 `init`：初始化 schema 并播种 `CURRENT` / `STANDBY`。
- [x] 实现 `rotate jwks`：事务性写入新 `STANDBY` 后晋升旧 `STANDBY` 到 `CURRENT`。
- [x] 实现 `start`：解析 `INSTANCE`、`--issuer`、`--host`、`--port`、`--schema` 并传入 Rust server；Rust binary 内置 `openapi.yaml`，不提供 `--openapi` 覆盖参数。
- [x] 将 Rust HTTP token issuer 从硬编码 `auth-mini` 改为 `Config.issuer`。
- [x] 跑 Rust fmt、clippy、test、build。
- [x] 跑最小 npm typecheck/build/CLI 测试，确认未破坏 TS CLI/package/Docker 当前入口。
- [x] 将 Docker runtime 切换为直接构建并运行 Rust release binary，删除旧 Node runtime artifact 准备路径和 entrypoint wrapper 测试。
- [x] 增加 PR Docker smoke workflow，只构建本地镜像并运行 smoke，不做 GHCR 发布。
- [x] 更新 README、CLI ops 和 Docker 部署文档，说明入口、端口、非 root 用户、数据库路径与 GHCR 后续处理。
- [ ] commit、fetch、rebase、push、创建 PR，并跟进 checks/mergeability。
