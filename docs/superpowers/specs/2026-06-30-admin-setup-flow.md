# Admin setup flow spec

## 背景

Auth Mini 的 Rust 后端已经具备无参数启动能力，但 SMTP 配置和浏览器 Origin allowlist 仍主要通过 CLI 工具写入 SQLite。GUI Demo 的 setup 页面也继续展示 smtp、origin 等 CLI 命令，这会让自托管路径依赖命令行配置。

## 目标

1. Rust 后端提供 admin setup API，用于配置浏览器页面 Origin allowlist 和 SMTP 发送配置。
2. GUI Demo 的 setup 页面通过 API 完成上述配置，不再指导用户运行 smtp / origin CLI 工具。
3. Rust CLI 可以无参数启动服务。
4. 删除 Rust CLI 工具入口中的 init、origin、smtp、rotate jwks 等管理子命令，只保留服务启动参数。

## API 行为

新增本机管理接口：

- GET /admin/setup
  - 返回当前 setup 状态。
  - 返回 origins 列表。
  - 返回 SMTP 配置摘要，但不得返回 SMTP password。
- PUT /admin/setup
  - 请求体包含一个 origin 和一个 smtp 对象。
  - 写入或更新该 origin。
  - 写入第一个 SMTP 配置；若已存在配置，则更新最早的配置。
  - 返回更新后的 setup 状态。

安全边界：

- admin setup API 仅允许 loopback TCP peer 调用。
- 非 loopback 请求返回 403 admin_setup_forbidden。
- 缺少数据库配置时返回 501 not_implemented，与现有需要数据库的 API 行为一致。
- SMTP password 仅允许写入，不允许在响应中泄漏。

## GUI Demo 行为

Setup 页面保留 Auth server origin 覆盖能力，并新增 admin setup 表单：

- 表单默认使用当前 page origin 作为 allowlist origin。
- 表单收集 SMTP host、port、username、password、from email、from name、secure、weight。
- 提交时调用当前 Auth server origin 的 /admin/setup。
- 成功后展示 setup 状态摘要，不展示 password。
- 页面不再展示 auth-mini smtp 或 auth-mini origin 命令。
- 页面可以保留无参数启动提示，帮助用户先启动 Rust 服务。

## 非目标

1. 本次不引入完整 admin 用户体系或远程管理权限模型。
2. 本次不实现多 SMTP 配置管理 UI。
3. 本次不改变现有 email、session、webauthn、ed25519 业务 API。

## 验收

1. auth-mini 无参数启动服务。
2. CLI 管理子命令不再存在。
3. PUT /admin/setup 可以写入 origin 和 SMTP 配置。
4. GET /admin/setup 不返回 SMTP password。
5. GUI Demo setup 页面可提交配置，且测试覆盖不再出现 smtp add / origin add 命令。
