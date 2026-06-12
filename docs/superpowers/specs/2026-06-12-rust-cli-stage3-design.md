# Rust CLI stage3 迁移设计

## 背景

- Rust CLI 已迁移 `origin` 与 `smtp`，并使用 `clap` 解析命令。
- TS CLI 仍承载 `init`、`start`、`rotate jwks` 的发布入口；本轮不切换 npm `auth-mini` 入口。
- Rust server 已可按 `Config` 启动，但缺少与 TS `start INSTANCE --issuer ...` 对齐的显式子命令。

## 范围

- 新增 Rust `init [INSTANCE]`，初始化 SQLite schema 并播种 `CURRENT` / `STANDBY` JWKS 槽位。
- 新增 Rust `rotate jwks [INSTANCE]`，保持双槽位语义：`STANDBY` 晋升为 `CURRENT`，再生成新的 `STANDBY`。
- 新增 Rust `start [INSTANCE] --issuer <URL>`，启动 Rust server，并保留 `--host`、`--port`、`--openapi`、`--schema` 参数。
- 保留既有无子命令 serve 路径，供当前 Rust backend 直接开发运行使用。

## 非范围

- 不切换 npm package 的 `bin` 或 oclif 命令实现。
- 不删除 TS CLI 文件；删除前必须完整验证 npm build、pack、Docker 与发布链路。
- 不增加旧 JWKS schema 兼容或历史 key 保留路径。

## 行为约束

- `start` 必须显式提供 `--issuer`，对齐 TS runtime config 中 issuer 必填的业务契约。
- `INSTANCE` 省略时使用 `~/.auth-mini/default.sqlite3`；显式传入时按用户输入路径使用。
- `rotate jwks` 必须要求数据库已存在完整 `CURRENT` / `STANDBY` 槽位；空库只建 schema 不自动播种后轮转。
- `init` 可重复执行，并通过现有 schema 初始化与 JWKS bootstrap 保持幂等。
- JWT 签发使用 `Config.issuer`，不再在 HTTP 路径中写死 `auth-mini`。

## 验证要求

- Rust 测试覆盖新增命令解析、`init` DB 变更、`rotate jwks` DB 变更与错误路径、`start` 配置解析。
- `start` 测试不启动长跑 server，只验证可测试配置边界。
- 本轮 npm/TS CLI 只做最小验证，确认未切换入口且未破坏现有构建/类型检查。
