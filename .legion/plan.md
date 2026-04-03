# singleton browser SDK 执行契约

## 任务

- 按 `docs/superpowers/specs/2026-04-03-singleton-browser-sdk-design.md` 与 `docs/superpowers/plans/2026-04-03-singleton-browser-sdk.md` 实现 singleton browser SDK。

## 验收

- Server 暴露 `GET /sdk/singleton-iife.js`
- 浏览器得到 `window.MiniAuth`
- 同源 / 同源代理路径推断生效
- `localStorage`、启动恢复、自动 refresh、`/me` 契约满足 spec
- WebAuthn register/authenticate 封装完成
- README 与 demo 更新
- 分段提交并最终 push

## 设计索引

- Spec: `docs/superpowers/specs/2026-04-03-singleton-browser-sdk-design.md`
- Plan: `docs/superpowers/plans/2026-04-03-singleton-browser-sdk.md`

## 阶段

1. 基础设施：route / build / bootstrap / state
2. 会话流：email / me / refresh / logout
3. WebAuthn / 文档 / demo / 最终验证
