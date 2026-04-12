# docker-runtime-copy-only-packaging

## 目标

将 Docker 镜像构建从应用编译流程中解耦，让 CI 先产出 Linux runtime artifact，Dockerfile 只负责 copy + 封装运行时，并通过 `build/docker-bake.json` 驱动镜像构建。

## 问题定义

- 当前 `release-image` workflow 在 Docker build 内执行 `npm ci` / `npm run build` / `npm prune`，导致镜像构建过重、失败信号混入镜像封装阶段。
- 当前发布 workflow 的 `Determine release gate` 逻辑过于复杂，不利于维护和排查。
- 用户要求新的构建链路更偏向“先在 CI 外完成构建，再在 Docker build 中尽量多 copy、尽量少 build”。

## 验收

- `build/` 目录承载新的 Docker 构建入口，至少包含 `build/Dockerfile` 与 `build/docker-bake.json`。
- release workflow 不再依赖复杂的 `Determine release gate` 脚本；逻辑收敛为简单、可读的发布条件。
- 最终 Docker 镜像构建阶段不再执行应用编译；镜像仍保持 `tini -> auth-mini start`、`USER node`、runtime SQL 资产可用。
- Docker smoke tests 继续通过，且覆盖真实容器启动路径。

## 假设与约束

- 目标发布平台继续以 `linux/amd64` 为主；native 依赖必须在 Linux 兼容环境中准备。
- 可以接受“runner 先构建 artifact，再交给 Dockerfile copy”的模型；不重新引入 shell launcher/entrypoint。
- 允许新增 `build/**` 目录与辅助脚本，但不把一次性构建产物长期提交到仓库。
- workflow 简化优先于兼容旧的复杂 recovery path。

## 风险分级

- **Level: Medium**
- **标签**：`rfc:light`
- **理由**：本任务会同时改动 Docker 构建入口、CI 发布流程、测试脚本和任务范围，属于多模块联动的发布基础设施调整；虽可回滚，但错误会直接影响镜像产出与发布链路。

## 要点

- Docker build 内尽量不执行 `npm ci` / `npm run build`，而是在 CI 外先准备 runtime bundle。
- 保持现有镜像契约：`tini -> auth-mini start`、`USER node`、最小 runtime 内容与 smoke test 覆盖。
- 确保 native 依赖与目标平台兼容，避免把宿主机产物直接塞进 Linux 镜像。
- 发布流程要仍然支持版本 bump 后的 GHCR 镜像构建与验证。
- 按用户建议采用 `build/docker-bake.json`，并把 Dockerfile 移入 `build/`。

## 允许 Scope

- build/\*\*
- Dockerfile
- .github/workflows/release-image.yml
- docker/test-entrypoint.sh
- docker/test-image-smoke.sh
- .dockerignore
- .gitignore
- package.json
- package-lock.json
- scripts/\*\*
- .legion/tasks/docker-runtime-copy-only-packaging/\*\*

## Design Index

- `docs/rfc.md`：copy-only Docker 打包链路与 workflow 简化方案。

## Phase Map

1. **设计运行时产物契约**：明确 runtime bundle、bake 入口、workflow 简化边界。
2. **实现 copy-only 打包链路**：创建 `build/` 目录、重构 Dockerfile/workflow/辅助脚本。
3. **验证与交付**：更新 smoke tests、完成测试报告与 PR 材料。

---

_创建于: 2026-04-10 | 最后更新: 2026-04-10_
