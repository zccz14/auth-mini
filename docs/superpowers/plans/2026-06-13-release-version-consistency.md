# Release 版本一致性校验实施计划

## 目标

在 release workflow 发布前强制执行单一路径：读取 Git tag `vX.Y.Z`，校验所有 manifest 都是 `X.Y.Z`，一致才继续，不一致立即失败。

## 文件变更

- 新增 `scripts/check-release-version.mjs`：解析 tag、校验 manifest 版本、向 `GITHUB_OUTPUT` 输出 `tag`、`version`、`minor`。
- 更新 `package.json`：新增 `check:release-version` 脚本。
- 更新 `.github/workflows/release.yml`：Rust binary 构建前运行版本校验。
- 新增 `tests/unit/release-version-check.test.ts`：覆盖正例、bad tag 与 manifest mismatch。
- 更新 README 与 CLI operations 文档：说明 release 版本 single truth 与手动对齐步骤。

## 实施步骤

- [x] 调研现有 npm、Cargo、release workflow 和 release 文档。
- [x] 实现单一 release version 校验脚本。
- [x] 增加最小可靠测试覆盖。
- [x] 更新发布文档、spec 与 plan。
- [ ] 运行验证、提交、rebase、push、创建 PR，并跟进 checks/mergeability。

## 复杂度边界

- 只新增必要失败路径：tag 缺失、tag 格式错误、manifest 缺失/不一致。
- 不新增自动 bump、fallback、旧 tag 兼容、多版本来源选择或 release tag 创建路径。
