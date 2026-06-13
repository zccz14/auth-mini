# Release 版本一致性校验

## 背景/目标

- GitHub binary release 与 GHCR image release 都由 `v*` tag 触发。
- 发布版本必须只有一个来源：Git tag `vX.Y.Z`。
- 发布前必须确认 npm manifest 与 Rust manifest/lockfile 都已经手动对齐到 `X.Y.Z`。

## 范围

- 新增 release version 校验脚本，读取显式 tag 参数或 `GITHUB_REF_NAME`。
- tag 只接受 `vX.Y.Z`。
- 校验 `package.json`、`rust-backend/Cargo.toml`、`rust-backend/Cargo.lock` 中的版本都等于 `X.Y.Z`。
- 在 Rust binary release workflow 构建前运行校验。
- 在 GHCR image release workflow Docker smoke 与 push 前运行校验。
- 更新发布文档，说明 tag 是 single truth，manifest 必须先手动改到同一版本。

## 非目标

- 不创建 release tag。
- 不自动 bump 或修改 manifest 版本。
- 不发布 npm、GHCR image 或 binary。
- 不引入宽松 tag 猜测、多版本来源选择或 fallback。

## 失败语义

- tag 缺失或不匹配 `vX.Y.Z` 时立即失败。
- 任一 manifest 版本与 tag 版本不一致时立即失败，并输出具体不一致文件。
- 校验失败时 release workflow 不继续构建或发布。

## 验证

- 脚本正例覆盖 `v0.3.0` 与三个 manifest 都为 `0.3.0` 的 fixture。
- 脚本负例覆盖 bad tag 与 manifest mismatch。
- 运行现有 npm、Rust、workflow YAML parse 与 cargo 验证。

## 后续工作

- 真正发布前由维护者手动对齐 manifest 版本。
- 版本对齐后再创建并推送 release tag。
- npm SDK-only publish 流程仍保持独立。
