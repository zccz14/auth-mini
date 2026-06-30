# Admin setup flow implementation plan

1. 提取配置持久化模块
   - 新增 Rust setup/admin 模块，承载 allowed origin 与 SMTP 配置的验证、读写、响应模型。
   - 从 CLI 迁移必要的 Origin 正规化和 SMTP 校验逻辑，避免 HTTP 层直接操作 SQL 细节。

2. 精简 CLI
   - 移除 clap 子命令模型和管理命令导出。
   - 保留无参数启动与服务参数解析。
   - main 直接解析服务配置并启动 HTTP server。

3. 增加 HTTP admin setup 路由
   - GET /admin/setup 与 PUT /admin/setup。
   - 在 request 中携带 peer loopback 判断。
   - 非 loopback 返回 403 admin_setup_forbidden。
   - 响应永不包含 SMTP password。

4. 更新 OpenAPI 与 SDK
   - 在 openapi.yaml 增加 admin setup schema 与 operation。
   - 重新生成 TS API SDK。
   - 在手写 SDK wrapper 中暴露 admin setup 调用。

5. 更新 GUI Demo
   - Setup 页面新增 API 配置表单。
   - 移除 SMTP/Origin CLI 命令展示。
   - 更新页面测试，覆盖 API 提交和命令删除。

6. 验证
   - 运行 Rust 单元测试。
   - 运行生成 SDK 检查、demo 测试和必要 typecheck。
