# Docker runtime slim + entrypoint 评估 - 任务清单

## 快速恢复

**当前阶段**: 阶段 3 - 评审与交付
**当前任务**: (none)
**进度**: 4/4 任务完成

---

## 阶段 1: 设计与现状调研 ✅ COMPLETE

- [x] 审查当前 Dockerfile 与 entrypoint 相关脚本，确认风险、约束与验证口径 | 验收: plan.md 完成，包含风险分级、允许 scope、验收与 design-lite 摘要

---

## 阶段 2: 实现与验证 🟡 IN PROGRESS

- [x] 更新 Dockerfile/runtime 逻辑并在必要时调整相关测试 | 验收: 变更实现完成，相关脚本验证结果已记录到 test-report.md
- [x] 评估 entrypoint 是否可移除并形成结论 | 验收: report/pr-body 中包含 entrypoint 职责拆解、是否可移除的结论与依据

---

## 阶段 3: 评审与交付 🟡 IN PROGRESS

- [x] 完成代码评审、安全评估（如需要）与交付文档 | 验收: 生成 review-code.md、report-walkthrough.md、pr-body.md；如涉及安全则补 review-security.md

---

## 发现的新任务

(暂无)
- [x] 同步更新测试脚本中硬编码的 node:20-slim 基线，避免与目标镜像漂移 | 来源: review-rfc APPROVED handoff
- [x] 为 auth-mini stub 增加 token 不继承的安全回归断言 | 来源: review-code / review-security 非阻塞建议
- [ ] 在具备 Docker daemon 的环境复跑 3 条 Docker 集成验证 | 来源: test-report 环境阻塞 ← CURRENT
- [x] 评估将 runtime curl shim 改成私有脚本名以减少误用 | 来源: review-code 非阻塞建议
- [ ] 为 non-root 运行补一条显式回归断言 | 来源: review-security 非阻塞建议
- [ ] 如需补强，再在有 Docker daemon 的环境执行精简后的容器级测试 | 来源: 当前只完成 bash -n 验证
- [ ] 如后续需要自动 init/issuer 校验，应在 auth-mini 本体内提供而非重新引入 launcher | 来源: 用户最新约束


---

*最后更新: 2026-04-09 20:28*
