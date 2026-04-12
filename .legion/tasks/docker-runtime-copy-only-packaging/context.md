# docker-runtime-copy-only-packaging - 上下文

## 会话进展 (2026-04-10)

### ✅ 已完成

- 已归档上一阶段 task `docker-runtime-slim-entrypoint`，并创建新的 active task `docker-runtime-copy-only-packaging`。
- 已根据用户最新要求收敛任务方向：使用 `build/docker-bake.json` 作为构建入口，把 Dockerfile 移入 `build/`，并移除过度复杂的 `Determine release gate`。
- 已完成初步风险分级：Medium。
- 已生成并收敛短 RFC：`docs/rfc.md`；最新 `review-rfc` 结论为 PASS。
- 已完成 `build/` 目录重构：新增 `build/Dockerfile` 与 `build/docker-bake.json`，并删除根目录 `Dockerfile`。
- 已新增 Linux runtime artifact 链路：`scripts/prepare-linux-runtime-artifact.sh`、`scripts/build-runtime-image.sh`。
- 已按用户反馈进一步简化：CI 默认依赖 fresh 环境，不再生成 `.artifact-manifest.json` 或执行额外 artifact 校验；`NODE_IMAGE` 固定为版本 tag `node:24.14.1-trixie-slim`。
- 已参考 `~/Work/Yuan` 的 release docker 流程做过对照，最终把 `release-image.yml` 收敛回单 job：在一个 `release-image` job 内直接完成 prepare / build / test / publish，优先满足速度与稳定。
- 已修正 publish 判定逻辑：不再只看 version bump，而是在 push 到 main 后检查当前版本镜像是否已存在；若缺失则补发，避免某次 bump 失败后该版本永远没有镜像。
- 已把 workflow 中使用的 GitHub Actions pin 到 commit SHA。
- 已更新 `docker/test-entrypoint.sh` 与 `docker/test-image-smoke.sh`，切换到 artifact + bake 入口。
- 已完成本地验证：YAML 解析、脚本 `bash -n`、`docker buildx bake --print`、`validation`、`supervision`、`image smoke` 全部 PASS。
- 已完成最终代码审查与安全审查，结论均为 PASS。
- 已生成交付文档：`docs/test-report.md`、`docs/review-code.md`、`docs/review-security.md`、`docs/report-walkthrough.md`、`docs/pr-body.md`。

### 🟡 进行中

- （无）

### ⚠️ 阻塞/待定

- （无）

---

## 关键文件

- `/.github/workflows/release-image.yml`：已收敛为单 job 的 release 流程，避免不必要的 artifact upload/download。
- `/build/Dockerfile`：新的 runtime-only Dockerfile，已只保留 copy + `tini` 封装。
- `/build/docker-bake.json`：新的 bake 构建入口，context 固定为 `build/runtime/linux-amd64`。
- `/scripts/prepare-linux-runtime-artifact.sh`：在固定 Node tag 的 Linux 容器中生成 artifact。
- `/scripts/build-runtime-image.sh`：本地/测试统一的 release-check 构镜入口。
- `/docker/test-entrypoint.sh`：已切换到 artifact + bake 构建入口。
- `/docker/test-image-smoke.sh`：已切换到 artifact + bake 构建入口。
- `/.legion/tasks/docker-runtime-copy-only-packaging/plan.md`：当前任务契约与 scope 真源。
- `/.legion/tasks/docker-runtime-copy-only-packaging/docs/rfc.md`：已通过 review-rfc 的设计入口。
- `/.legion/tasks/docker-runtime-copy-only-packaging/docs/pr-body.md`：可直接作为 PR 描述。

---

## 关键决策

| 决策                                                            | 原因                                                                                                | 替代方案                                                                   | 日期       |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------- |
| 本任务按 Medium 风险推进，并要求短 RFC                          | 会同时修改发布 workflow、Docker 打包入口与 smoke tests，属于基础设施多模块联动。                    | 按 Low 风险直接开改容易让发布链路变更缺少收敛。                            | 2026-04-10 |
| 采用 `build/docker-bake.json` + `build/Dockerfile`              | 用户明确要求用 bake JSON 作为构建入口，并把 Docker 相关构建文件迁入 `build/`。                      | 继续沿用根目录 Dockerfile 与裸 `docker build` 不符合新的目标。             | 2026-04-10 |
| 优先移除复杂 `Determine release gate`                           | 用户明确指出该逻辑维护成本过高；本任务以简化发布门禁为目标之一。                                    | 只局部修补旧 gate 逻辑会保留原有复杂度。                                   | 2026-04-10 |
| runtime artifact 固定为 `build/runtime/linux-amd64/`            | 需要冻结单一 artifact 契约，便于 bake context、校验与排障统一。                                     | 使用未固定的临时目录或 artifact 中转会增加流程复杂度。                     | 2026-04-10 |
| artifact 必须在与 runtime 同族的 Linux 容器环境中生成           | `better-sqlite3` 等 native 依赖要求 Node / distro / libc / platform 对齐。                          | 仅依赖“Linux runner”或宿主机产物都不足以保证 ABI 兼容。                    | 2026-04-10 |
| `NODE_IMAGE` 固定为版本 tag，GitHub Actions 继续 pin commit SHA | 用户明确要求基础镜像只 pin tag 不 pin digest，同时保留 workflow action 的确定性。                   | 基础镜像也 pin digest 会偏离用户想要的简化程度。                           | 2026-04-10 |
| 不再对 runtime artifact 做额外 manifest 校验                    | 用户明确指出 CI 默认是 fresh 环境，不需要 `.artifact-manifest.json` / verify 脚本这类额外复杂度。   | 保留 manifest 校验虽更严，但不符合当前“更简单”的目标。                     | 2026-04-10 |
| release workflow 参考 Yuan 对照后仍收敛为单 job                 | 用户明确强调速度与稳定优先，不需要为了两段式而两段式；当前仓库这条 release-image 只需一个简单入口。 | 强行拆成 build / docker-build 两段会引入额外 artifact 上传下载与逻辑分叉。 | 2026-04-10 |

---

## 快速交接

**下次继续从这里开始：**

1. 如需继续推进，可直接使用 `docs/pr-body.md` 作为 PR 描述。
2. 若后续继续加固，可优先评估多架构参数化，以及是否需要更轻量的发布摘要。

**注意事项：**

- `Scope` 已扩展到 `build/**`；后续新增构建文件必须留在该目录内。
- 本任务目标是“Docker build 少 build、多 copy”，但 native 依赖仍要保证 Linux 兼容。
- 发布前必须通过最终镜像内的 native 加载验证（至少 `auth-mini init /data/auth.sqlite`）。
- 当前本地 smoke 已验证 `auth-mini init` / `start` / HTTP 路径；线上仍建议观察一次真实 GitHub Actions publish run。

---

_最后更新: 2026-04-10 23:45 by Claude_
