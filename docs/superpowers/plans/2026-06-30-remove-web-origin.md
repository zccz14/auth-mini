# /web GUI 删除 Auth Server Origin 配置 plan

> spec: `docs/superpowers/specs/2026-06-30-remove-web-origin.md`

## 任务清单

- [x] 审核上一位 worker 的未提交改动，确认 demo provider/config/setup/home/session/credentials 已开始移除 origin override。
- [x] 收窄 demo config API，只保留 `pageHref` 与 `pageOrigin`，避免继续暴露 hash/search/storage 兼容参数。
- [x] 更新 README、Browser SDK 文档和 release 合同测试，删除 live demo `auth-origin` query 合同。
- [ ] 运行格式化与 demo 测试，修复继承改动中的格式或断言问题。
- [ ] 执行 `npm run demo:build:web` 并提交 `rust-backend/web` 产物；如 asset hash 变化同步 `rust-backend/src/web_assets.rs`。
- [ ] 运行要求的验证：demo typecheck/build:web、受影响 unit tests、必要 Rust 测试。
- [ ] `git fetch origin && git rebase origin/main` 后 push 分支。
- [ ] 创建 PR，跟进 checks/review/mergeability，通过后合并。
- [ ] 合并后删除 worktree 和分支。

## 复杂度记录

- 新增业务分支：无。
- 删除兼容路径：删除 GUI `auth-origin` query、localStorage override、等待配置状态和 Setup origin 表单。
- 保留路径：Setup 的 Issuer 与 Allowed page origin 属于后端 app metadata/admin setup，不是 GUI 连接 base URL 配置。
- 验证方式：以单元测试、typecheck、web build、bundle 字符串检查和 Rust asset 测试证明删除后的直线路径可用。
