# Rust 后端迁移实施计划

## 阶段 1：Rust 后端基础切片

实现内容：

- 新增 `rust-backend` crate。
- 实现标准库 HTTP 服务。
- 支持 `--host`、`--port`、`--openapi` 参数。
- 实现 `GET /healthz`、`GET /openapi.yaml`、`GET /openapi.json`、未知路径响应。
- 增加 Rust 单元测试，覆盖参数解析、响应状态、OpenAPI YAML 读取路径。

验证命令：

- `cargo test --manifest-path rust-backend/Cargo.toml`
- `cargo build --manifest-path rust-backend/Cargo.toml`
- `npm run typecheck`

## 阶段 2：数据库初始化与 schema 校验

实现内容：

- 在 Rust 中接入 SQLite。
- 新增显式 `--db` 与 `--schema` 参数；提供 `--db` 时启动前执行数据库初始化。
- 复用 `sql/schema.sql` 的 schema 合同，不新增或修改 schema。
- 校验后续认证迁移所需核心表和列：用户、会话、JWKS、allowed origins、WebAuthn 凭据、Ed25519 凭据。
- 增加 Rust 测试，覆盖数据库参数解析、schema 初始化、缺失 schema 拒绝。
- 不迁移 TypeScript 的旧数据库兼容修复路径；该兼容逻辑后续如需迁移，必须明确旧版本依赖和删除条件。

验证命令：

- `cargo fmt --manifest-path rust-backend/Cargo.toml --check`
- `cargo test --manifest-path rust-backend/Cargo.toml`
- `cargo build --manifest-path rust-backend/Cargo.toml`
- `npm run typecheck`

## 阶段 3：认证 API 迁移

实现内容：

- 迁移邮件 OTP 登录。
- 迁移 JWT/JWKS 和会话刷新、登出。
- 迁移 Ed25519 登录和凭据管理。
- 迁移 WebAuthn 注册、登录和凭据管理。
- 每个路径迁移时对照 `openapi.yaml` 增加 API 测试。

验证命令：

- Rust API 集成测试。
- 现有 SDK 测试和 API drift 检查。

## 阶段 4：生产入口切换

实现内容：

- 切换 CLI/Docker 启动到 Rust 后端。
- 保留 npm SDK 构建，不改变 SDK 导出路径。
- 更新 Docker smoke test 和发布 workflow。
- 删除已被 Rust 覆盖且不再被 SDK/CLI 使用的 TypeScript 后端代码。

验证命令：

- `npm run build`
- `npm test`
- Docker image smoke test
- Rust build/test 全量命令

## 当前 PR 范围

本 PR 执行阶段 2 的最小数据库初始化与 schema 校验切片。阶段 3 到阶段 4 需要后续 PR，避免在同一变更中同时引入认证密码学、公开 API 行为和部署入口切换造成不可审查风险。
