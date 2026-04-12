# RFC 审查报告

## 结论

REVISION_NEEDED

## 阻塞问题

- [ ] **native 依赖的 Linux 兼容性约束仍然不够可实现、可验证。**
      RFC 只要求“在 Linux runner 上准备 artifact”，这不足以证明 `better-sqlite3` 等 native 依赖与最终运行镜像 ABI 一致。`linux/amd64` 只约束 CPU 架构，不约束 libc / distro / Node ABI；GitHub Actions Linux runner 产出的 `node_modules`，不一定与最终 `node:*-slim` runtime 完全兼容。当前文档虽然提到真实容器 smoke，但没有把“native 模块必须在最终镜像内被显式加载验证”上升为硬契约，也没有规定 artifact 构建环境必须与 runtime 基镜像对齐。
      **最小化复杂度建议：**不要把编译塞回 Dockerfile；只需二选一并写死到 RFC：
  1. artifact 必须在与最终 runtime 同族的 Linux 容器环境中生成（至少固定 Node major + libc/distro）；或
  2. 发布前必须在最终镜像内执行一条显式 native 加载校验（例如实际跑到会触发 sqlite native 模块加载的命令），并把这一步列为 blocking gate。

- [ ] **回滚方案过于抽象，不满足“可执行 / 可回滚”。**
      当前“回滚到旧版 workflow + 根目录 Dockerfile”只是方向，不是操作方案。RFC 没说明：回滚触发条件是什么、按哪个 commit/文件集回滚、`build/` 迁移后旧入口如何恢复、回滚后用哪些命令确认镜像契约恢复。对发布链路改造来说，这会导致事故时仍要临场判断，风险偏高。
      **最小化复杂度建议：**把回滚收敛成一个最小剧本：
  1. 触发条件：`release-check` 连续失败 / publish 后 smoke 失败 / native 模块不兼容；
  2. 操作：`git revert <本次迁移提交>`（或恢复明确列出的 3~5 个文件到上一已知良好版本）；
  3. 验证：重新执行 `bash docker/test-entrypoint.sh validation`、`bash docker/test-entrypoint.sh supervision`、`bash docker/test-image-smoke.sh`；
  4. 结果：确认恢复旧发布路径，不保留半迁移状态。

## 非阻塞建议

- 建议把“为什么 Docker build 不再 `npm ci`”再补一条**产物复用原则**：同一份 artifact 同时服务 `release-check`、smoke、publish，避免读者误解为“只是把编译步骤换个地方跑”。
- 建议把发布门禁补成一个简短真值表：`push main + version bump`、普通 push、rerun、`workflow_dispatch recovery` 各自是否发布、为什么。这样能证明“去复杂 Determine release gate”不是“去掉必要约束”。
- 建议明确 artifact 最终落盘路径，不要在“仓库内临时目录”和 “upload/download-artifact” 两种模型之间悬而未决；否则 `.dockerignore`、bake context、日志排障路径都容易反复变更。
- 建议在验证计划中加入一条最小白名单校验：artifact 只允许包含 `dist/`、生产依赖、package 元数据、`sql/`，防止 copy-only 方案退化成“把整个 workspace 打进镜像”。

## 推荐修订方向

1. **先补齐环境契约。** 把“Linux runner”改成“与最终 runtime 兼容的 Linux artifact 生成环境”，并明确 native 模块的最终镜像内验证方式。
2. **把发布门禁写成最小可判定规则。** 保留简化方向，但补一个 4 行左右的条件矩阵，证明没有遗漏必要发布条件。
3. **把回滚写成可执行剧本。** 明确触发条件、回滚动作、验证命令，避免事故时临场推理。
4. **冻结 artifact 契约。** 明确单一目录、最小内容、白名单校验、供 `release-check` 与 `release` 复用，避免后续 scope 膨胀。

## 修复指导

可按以下最小改动修正文档：

1. 在“runtime artifact 准备方式”补一段“环境兼容契约”，明确 artifact 生成环境与最终 runtime 的对齐要求。
2. 在“验证计划”补一条“native 模块最终镜像内加载验证”为 blocking gate。
3. 在“workflow 简化方式”后追加一个简短条件矩阵，说明哪些路径发布、哪些路径只验证不发布。
4. 在“回滚”小节改为具体步骤 + 验证命令，而不是方向性描述。

在以上两项阻塞问题修正前，我不建议判定该 RFC 为 PASS。
