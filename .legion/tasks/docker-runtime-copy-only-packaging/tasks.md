# docker-runtime-copy-only-packaging - 任务清单

## 快速恢复

**当前阶段**: 阶段 3 - 验证与交付 ✅ COMPLETE
**当前任务**: (none)
**进度**: 6/6 任务完成

---

## 阶段 1: 设计运行时产物契约 ✅ COMPLETE

- [x] 明确 Docker runtime bundle 应包含的文件、平台假设与构建边界 | 验收: plan.md 写清 runtime bundle 组成、平台约束、风险与回滚口径
- [x] 确认 workflow 与 Dockerfile 的职责拆分 | 验收: plan.md phase map 明确哪些步骤在 CI 外执行、哪些步骤留在 Docker build 内

---

## 阶段 2: 实现 copy-only 打包链路 ✅ COMPLETE

- [x] 新增/调整脚本与 workflow，在 runner 上先产出 Linux runtime artifact | 验收: release-image workflow 能在 docker build 前准备运行时 bundle，且不依赖宿主机非 Linux 产物
- [x] 简化 Dockerfile 为 copy-oriented runtime 封装 | 验收: Dockerfile 不再在镜像构建阶段执行完整应用编译，仍保持 tini 校验、权限设置、入口契约

---

## 阶段 3: 验证与交付 ✅ COMPLETE

- [x] 更新 Docker smoke tests 以适配新的打包路径 | 验收: 容器 contract / supervision / image smoke 继续通过
- [x] 完成 task 文档、测试结论与 PR 汇报材料 | 验收: 产出 test-report、review 结果与 pr-body，可直接用于 review

---

## 发现的新任务

- [x] 按用户反馈移除 `.artifact-manifest.json` 与 `verify-runtime-artifact.sh`，CI 默认依赖 fresh 环境 | 来源: 用户最新明确要求简化
- [x] 按用户反馈将 `NODE_IMAGE` 从 digest pin 回退为固定 tag，并继续保留 action SHA pin | 来源: 用户最新明确要求简化

---

_最后更新: 2026-04-10 23:30_
