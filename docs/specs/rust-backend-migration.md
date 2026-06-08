# Rust 后端迁移规格

## 迁移目标

将 auth-mini 的后端运行时从 TypeScript/Node 逐步迁移到 Rust，并保持现有公开 HTTP API、SQLite 数据模型、OpenAPI 文档、部署入口和 SDK 消费方式可验证。

第一阶段只交付可提交、可构建、可测试的 Rust 后端切片：

- 提供 Rust 后端 crate，作为后续完整迁移的承载位置。
- 提供可运行 HTTP 服务，验证 Rust 运行时、配置读取、OpenAPI 文件读取和基础请求处理链路。
- 保留现有 TypeScript 后端作为生产 CLI 和 Docker 入口，直到 Rust 后端覆盖现有公开 API 与数据库语义。

第二阶段继续交付最小数据库切片：

- Rust 后端可按显式 `--db` 指定 SQLite 文件，并按显式或默认 `--schema` 执行 `sql/schema.sql`。
- Rust 后端必须校验核心认证表与列存在，确认 Rust 端已能承载后续只读查询和认证 API 迁移。
- 第二阶段不迁移旧版本数据库兼容修复，不写入认证业务数据，不替换 TypeScript 生产入口。

## 保留行为

完整迁移完成前，下列行为仍以现有 TypeScript 实现为准：

- 邮件 OTP 登录：`POST /email/start`、`POST /email/verify`。
- 会话管理：`GET /me`、`POST /session/refresh`、`POST /session/logout`、`POST /session/{session_id}/logout`。
- Ed25519 登录和凭据管理。
- WebAuthn 注册、登录和凭据管理。
- JWKS 公钥发布和 JWT 签发、验证语义。
- SQLite schema 文件 `sql/schema.sql` 及现有迁移兼容行为。
- npm 包导出的 SDK、CLI 命令和现有 Docker 发布链路。

第一阶段 Rust 服务必须保留下列可验证行为：

- 默认监听 `127.0.0.1:7777`。
- 支持通过 `--host`、`--port`、`--openapi` 指定监听地址和 OpenAPI 文件路径。
- `GET /healthz` 返回 `200` 和 `ok`。
- `GET /openapi.yaml` 返回仓库 OpenAPI YAML 原文。
- `GET /openapi.json` 返回 `501 not_implemented`，表示 JSON 转换尚未迁移完成。
- 未知路径返回 `404 not_found`。

第二阶段 Rust 服务必须新增下列可验证行为：

- `--db <path>` 在启动监听前打开 SQLite 数据库、开启外键、应用 `sql/schema.sql`。
- `--schema <path>` 仅在同时提供 `--db` 时有效，用于指定 schema 文件。
- schema 校验覆盖 `users`、`sessions`、`jwks_keys`、`allowed_origins`、`webauthn_credentials`、`ed25519_credentials` 的后续迁移所需列。
- schema 缺失时启动失败；不得静默降级为无数据库模式。

## API 兼容范围

第一阶段不替换生产 API。兼容范围限定为新增 Rust 切片自身的基础端点，不声明覆盖现有认证 API。

后续阶段必须在 Rust 中逐项实现并验证 `openapi.yaml` 中列出的公开路径；每个路径迁移完成前不得从 TypeScript 生产入口移除对应行为。

## 数据库边界

- SQLite 仍是唯一持久化数据库。
- `sql/schema.sql` 仍是 schema 事实来源。
- 第一阶段 Rust 切片不写入数据库，不执行迁移，不改变 schema。
- 第二阶段 Rust 切片只执行 `sql/schema.sql` 中的 `CREATE TABLE IF NOT EXISTS`，不新增 schema，不执行 TypeScript 中已有的旧库修复逻辑。
- 后续 Rust 数据库访问必须复用现有表名、列名、约束和时间/令牌语义；需要迁移兼容逻辑时必须有明确旧版本依赖和删除条件。

## 配置边界

- 第一阶段 Rust 服务只读取命令行参数，不读取或改变现有 Node 配置解析。
- 第二阶段新增 `--db` 与 `--schema` 命令行参数；数据库能力为 Rust 端显式启用，不读取或改变现有 Node 配置解析。
- 默认 host、port 与现有启动命令保持一致。
- issuer、dbPath、SMTP、allowed origins 等业务配置留到对应 API 迁移阶段实现。

## 构建与部署边界

- 第一阶段新增 Rust 构建与测试命令，不改变现有 `npm run build`、`npm test`、Dockerfile 和发布 workflow 的生产语义。
- Rust 后端成为可选构建产物；生产入口切换必须等到公开 API、数据库语义和部署 smoke test 覆盖完成。

## 非目标

- 不在第一阶段或第二阶段重写邮件发送、JWT/JWKS、WebAuthn、Ed25519 或 SDK。
- 不在第二阶段迁移 TypeScript 的旧数据库兼容修复路径。
- 不引入新的数据库、缓存、队列或配置格式。
- 不改变现有 OpenAPI 合同。
- 不增加 TypeScript 与 Rust 之间的代理兼容层。

## 验收标准

- `docs/specs/rust-backend-migration.md` 明确迁移范围和非目标。
- `docs/plans/rust-backend-migration.md` 明确阶段和验证命令。
- `cargo test --manifest-path rust-backend/Cargo.toml` 通过。
- `cargo build --manifest-path rust-backend/Cargo.toml` 通过。
- `npm run typecheck` 通过，证明现有 TypeScript 入口未被破坏。
- 第二阶段 Rust 测试覆盖数据库配置解析、schema 初始化和缺失 schema 拒绝。
- 代码提交在对应迁移分支并通过 PR 合入流程推进。
