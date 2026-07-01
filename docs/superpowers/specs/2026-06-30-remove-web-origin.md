# /web GUI 删除 Auth Server Origin 配置 spec

## 背景

Rust 后端已经在 `/web` 内嵌并服务 React GUI。这个 GUI 与 Rust API 运行在同一个 server 上，因此不再需要让用户在浏览器里配置 auth server origin，也不需要通过 hash query 或 localStorage 记忆该配置。

之前的 demo 曾支持 `auth-origin` hash 参数、本地存储覆盖和 Setup 页面中的 Auth server origin 表单。这些路径会让 `/web` GUI 看起来像可连接任意 auth server，但当前产品方向是内置 GUI 只服务当前 Rust server。

## 目标

1. `/web` GUI 不展示 Auth server origin 输入框，也不读取 `auth-origin` query。
2. `/web` GUI 创建 SDK 时使用相对 base URL `..`，并从当前页面 URL 解析为同一 Rust server 根路径。
3. 删除 demo 专用的 auth origin localStorage 读写逻辑。
4. Setup 页面继续保留 Issuer 字段和 Allowed page origin 字段；Issuer 写入后端 `app_meta.issuer`，不属于本次删除范围。
5. README、Browser SDK 文档和 release 合同测试不再把 live demo 描述为带 `auth-origin` 的链接。
6. 重建并提交 `rust-backend/web` 内嵌 bundle，确保发布 binary 使用新 GUI。

## 非目标

1. 不改变 `createBrowserSdk(serverBaseUrl)` API；应用代码仍可显式传入自己的 server base URL。
2. 不删除后端 `app_meta.issuer`、Admin setup API 或 Setup 页面里的 Issuer 字段。
3. 不改变 Pages 构建入口和独立 `ui-web/dist` 发布结构。
4. 不新增跨 origin GUI 配置兼容路径。

## 行为

- `ui-web` 的配置层只产出 `serverBaseUrl: '..'` 和 `resolvedServerBaseUrl`。
- `resolvedServerBaseUrl` 使用 `new URL('..', window.location.href).toString()` 计算。
- `/web/#/setup` 这类页面会解析到当前 Rust server 根路径，例如 `https://auth.example.com/`。
- Setup 页面将 `resolvedServerBaseUrl` 作为默认 Issuer 和 Admin setup API base URL。
- 页面仍使用 `window.location.origin` 作为默认 Allowed page origin。

## 验收

1. demo unit tests 覆盖配置层、Provider、Setup、Router、Email/Passkey/Session/Credentials 等受影响页面。
2. `npm run demo:typecheck` 通过。
3. `npm run demo:build:web` 通过并刷新 `rust-backend/web`。
4. `tests/unit/ui-web-pages-release.test.ts` 覆盖文档不再包含 origin override 链接。
5. Rust web assets 测试通过，且 `rust-backend/src/web_assets.rs` 引用新的 bundle hash。
6. `rust-backend/web` bundle 不再包含 `Auth server origin`、`auth-origin` 或旧 hosted auth origin 常量。
