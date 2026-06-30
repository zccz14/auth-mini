# Rust /web 内嵌 GUI 静态资源 implementation plan

1. 增加 Rust web demo 构建入口
   - 新增 `examples/demo/vite.web.config.ts`，复用现有 Vite 配置，设置 `base: '/web/'` 与 `outDir: '../../rust-backend/web'`。
   - 在 `examples/demo/package.json` 增加 `build:web`。
   - 在根 `package.json` 增加 `demo:build:web`，先构建根 SDK，再构建 web 静态资源。

2. 生成并提交内嵌资源
   - 运行 web build，生成 `rust-backend/web/index.html` 和少量 `assets` 文件。
   - 保持 Pages `examples/demo/dist` 不作为本任务提交目标。

3. 实现 Rust 静态资源服务
   - 新增 `rust-backend/src/web_assets.rs`，用 `include_str!` 内嵌 `rust-backend/web` 文件。
   - 暴露一个按 path 查找 asset 的小函数，集中处理入口 HTML、assets、SPA fallback、MIME 和 cache 策略。
   - 在 `http.rs` 的 GET `/web` 路由前置调用该函数，支持 bytes response、redirect 与 query string path 匹配。

4. 更新测试和文档
   - 在 Rust HTTP 单元测试中覆盖 `/web` redirect、入口、asset MIME/cache、SPA fallback 与 query string 行为。
   - 在 workflow 单元测试中覆盖 release build 先生成 web assets 再执行 Cargo release build。
   - 在 Rust E2E smoke 中增加 `/web` HTML 与 asset 请求断言。
   - 更新 CLI/operations 文档说明 release binary 内置 GUI。

5. 验证和发布流程
   - 运行 `npm run demo:build:web`。
   - 运行 `CARGO_HOME=$PWD/.cargo-home cargo test --manifest-path rust-backend/Cargo.toml`。
   - 运行 `npm --prefix examples/demo run test`、`npm --prefix examples/demo run typecheck`、`npm --prefix examples/demo run build`。
   - 运行 `CARGO_HOME=$PWD/.cargo-home cargo build --manifest-path rust-backend/Cargo.toml --release`。
   - 运行 `npm run test:rust-e2e`。
   - 提交后按规则 fetch、rebase、push、创建并跟进 PR。
