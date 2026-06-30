# Rust /web 内嵌 GUI 静态资源 spec

## 背景

Auth Mini 的 Rust 后端已经是 release binary 的正式运行时，但当前浏览器 GUI 仍需要访问独立发布的 `auth-mini.zccz14.com` Pages demo。自托管用户下载 release binary 后，还需要额外知道远端 demo URL，整体体验不是一个自包含 server。

仓库内已有 `examples/demo` Vite/React GUI Demo。该 demo 使用 HashRouter，适合在任意静态路径下部署；它也已经有独立测试、typecheck 与 build 流程。

## 目标

1. Rust backend 在 `/web` 路径下服务 GUI Demo 静态资源。
2. `/web` 使用仓库现有 `examples/demo` 内容构建，不重新维护第二套 GUI 源码。
3. release build 的 Rust binary 必须把静态资源内嵌进二进制，运行时不依赖外部 web 目录，保持单文件执行。
4. `/web` 对 GUI SPA 友好：`/web` redirect 到 `/web/`，`/web/` 返回入口 HTML，`/web/<asset>` 返回对应资源；不存在的 GUI 子路径返回入口 HTML，不存在的 asset 返回 404。
5. 静态资源响应应包含合理 Content-Type；入口 HTML 不长期缓存，带 hash 的 assets 可以长期缓存。

## 构建行为

新增一个专用于 Rust 内嵌资源的 demo 构建入口：

- 继续保留现有 `examples/demo` Pages 构建行为和 `base: './'`。
- 新增 Rust web build 使用 `base: '/web/'`，输出到 `rust-backend/web`。
- `rust-backend/web` 是 release binary 的静态资源来源，文件数应保持很少，作为构建产物提交到仓库。
- Cargo 编译通过 `include_str!` 内嵌这些已提交资源。

## HTTP 行为

`GET /web`：

- 返回 308 redirect，Location 为 `/web/`。

`GET /web/`：

- 返回入口 HTML。
- Content-Type 为 `text/html; charset=utf-8`。
- Cache-Control 为 `no-cache`。

`GET /web/assets/<file>`：

- 若资源存在，返回资源内容。
- JS 返回 `text/javascript; charset=utf-8`，CSS 返回 `text/css; charset=utf-8`，并覆盖 SVG、PNG、ICO、WOFF2、JSON 等常见静态资源类型。
- Cache-Control 为 `public, max-age=31536000, immutable`。
- 若资源不存在，返回 404 JSON error，避免把缺失的 chunk 伪装成 HTML。

`GET /web/<其它路径>`：

- 返回入口 HTML，支持 SPA 直接访问。

请求 target 带 query string 时，静态资源匹配只使用 path 部分。非 GET 的 `/web` 请求不新增静态资源行为，继续落入现有 API 404 行为。

## 非目标

1. 本次不新增独立前端源码目录。
2. 本次不改变现有 Pages demo 发布流程。
3. 本次不实现开发时反向代理到 Vite dev server；`/web` 服务的是内嵌静态资源。
4. 本次不把所有 `examples/demo` 测试改造成浏览器 E2E。

## 验收

1. Rust 单元测试覆盖 `/web` 入口、asset MIME/cache、SPA fallback 与缺失 asset 404。
2. Rust E2E 覆盖已构建 Rust binary 可以访问 `/web`，且返回的 HTML 引用 `/web/assets/` 资源。
3. demo build/typecheck 通过，Rust web build 能刷新 `rust-backend/web`。
4. release build 验证通过，证明内嵌静态资源可随 Rust binary 编译。
5. 文档说明 release binary 可通过 `/web` 访问内置 GUI。
