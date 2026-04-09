# Docker runtime slim + entrypoint 评估 - 上下文

## 会话进展 (2026-04-09)

### ✅ 已完成

- 已恢复 active task `docker-runtime-slim-entrypoint`，沿用既有 `plan.md` / `rfc.md` / task docs 继续推进。
- 已确认当前运行模型为极简容器入口：`ENTRYPOINT ["/tini", "--"]` + 默认 `CMD ["auth-mini", "start", "/data/auth.sqlite", "--port", "7777"]`。
- 已修复本地 Docker 冒烟测试在 `USER node` 下的 bind mount 日志目录权限问题；测试临时 `/logs` 目录现显式 `chmod 0777`。
- 已统一 Docker 测试脚本的 build/run 平台声明，默认使用 `IMAGE_PLATFORM=linux/amd64`，避免本地 arm64 宿主机上出现 build/run 平台语义漂移。
- 已修复测试对 Docker `ENTRYPOINT + CMD` 语义的误用：运行时 case 现在会显式重建默认命令链后再追加 `--issuer`，同时通过 `docker image inspect` 静态断言镜像默认 `Entrypoint/Cmd`。
- 已补充 non-root 回归断言，确认镜像内 `id -u != 0`。
- 已为远程下载的 `tini` 增加按 `TARGETARCH` 的 SHA256 校验（amd64/arm64），并在 smoke test 中增加轻量回归断言。
- 已修复真实容器启动时 `USER node` 无法读取 `/app/package.json` 与 `/app/sql/schema.sql` 的问题；容器内 `auth-mini init` / `auth-mini start` 现可正常运行。
- 已为 `start` 命令增加 `AUTH_HOST` / `AUTH_PORT` / `AUTH_ISSUER` 环境变量回退，避免本地 Docker published-port smoke 必须重写整条默认命令链。
- `docker/test-image-smoke.sh` 已升级为真实容器 HTTP smoke：先 init volume，再以 `AUTH_HOST=0.0.0.0` + `AUTH_ISSUER=...` 启动真实容器，验证 `/jwks`、`/sdk/singleton-iife.js` 与 `/me` 401。
- 已在本地 Docker daemon 环境真实执行并通过：
  - `bash -n docker/test-entrypoint.sh`
  - `bash -n docker/test-image-smoke.sh`
  - `bash docker/test-entrypoint.sh validation`
  - `bash docker/test-entrypoint.sh supervision`
  - `bash docker/test-image-smoke.sh`
- 已完成最新一轮代码审查与安全审查，结论均为 PASS。

### 🟡 进行中

- 正在同步最终交付文档（report-walkthrough / pr-body）与任务状态。

### ⚠️ 阻塞/待定

- （无）

---

## 关键文件

- `Dockerfile`：为 `tini-static-${TARGETARCH}` 增加 checksum 校验，维持 `tini -> auth-mini start` 运行模型。
- `src/commands/start.ts`：增加 `AUTH_HOST` / `AUTH_PORT` / `AUTH_ISSUER` 环境变量回退。
- `docker/test-entrypoint.sh`：修复非 root bind mount 日志写入、显式平台声明、默认命令链验证。
- `docker/test-image-smoke.sh`：补充镜像配置检查、non-root 回归、`tini` checksum 回归断言与真实容器 HTTP smoke。
- `.legion/tasks/docker-runtime-slim-entrypoint/docs/test-report.md`：记录真实本地 Docker 验证结果。
- `.legion/tasks/docker-runtime-slim-entrypoint/docs/review-code.md`：最新代码审查结论（PASS）。
- `.legion/tasks/docker-runtime-slim-entrypoint/docs/review-security.md`：最新安全审查结论（PASS）。

---

## 关键决策

| 决策                                                                  | 原因                                                                                                 | 替代方案                                                                            | 日期       |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------- |
| 本轮按 Low 风险继续推进                                               | 当前工作以测试收敛与供应链完整性补强为主，可通过脚本与 Dockerfile 最小回滚，不涉及数据迁移。         | 重新开新 task 会割裂既有 task 历史与交付物。                                        | 2026-04-09 |
| 继续保持极简入口 `tini -> auth-mini start`                            | 这是当前 task 契约与用户明确目标。                                                                   | 重新引入 shell entrypoint / launcher 会违背最新约束。                               | 2026-04-09 |
| 测试脚本显式声明 `IMAGE_PLATFORM=linux/amd64`                         | 当前镜像与本地验证都围绕 amd64 目标进行，显式声明可避免 arm64 宿主机上 build/run 语义漂移。          | 继续依赖 Docker 默认平台会产生告警和潜在歧义。                                      | 2026-04-09 |
| 通过 `chmod 0777` 修复测试临时日志目录写权限                          | 问题根因在测试夹具，不应为通过测试而放宽 runtime 非 root 边界。                                      | 回退到 root 运行会削弱镜像安全边界。                                                | 2026-04-09 |
| 继续使用远程 `ADD` 下载 `tini`，但补充按架构 checksum 校验            | 这是修复供应链完整性问题的最小改动，且不改变当前运行模型。                                           | 改成额外下载阶段/GPG 流程会增加复杂度。                                             | 2026-04-09 |
| 显式放宽 `/app/package.json` 与 `/app/sql/schema.sql` 为只读可读      | 真实容器在 `USER node` 下需要读取 oclif root metadata 与 schema 文件，否则 `init/start` 会直接失败。 | 回退到 root 或重新引入 wrapper 都不如直接修正文件权限简单。                         | 2026-04-09 |
| 将镜像默认 CMD 简化为 `auth-mini start /data/auth.sqlite --port 7777` | 保留 `tini -> auth-mini start` 模型，同时让 `AUTH_HOST` 环境变量可在 Docker 场景下覆盖 host。        | 继续把 `--host 127.0.0.1` 硬编码进 CMD 会阻断 env 覆盖与本地 published-port smoke。 | 2026-04-09 |

---

## 快速交接

**下次继续从这里开始：**

1. 直接复用 `<taskRoot>/docs/pr-body.md` 作为 PR 描述。
2. 如需进一步加固，可优先评估基础镜像 digest pin、CI 漏洞扫描与环境变量异常路径测试。

**注意事项：**

- 当前 Docker 验证脚本默认使用 `IMAGE_PLATFORM=linux/amd64`；若目标平台不同，请显式覆写后复跑。
- 本地 published-port 场景若需从宿主访问容器，需要显式提供 `AUTH_HOST=0.0.0.0`；镜像默认 host 仍由应用保持 `127.0.0.1`。
- 当前任务已不再保留 `docker/entrypoint.sh` / `docker/launcher.mjs` / `cloudflared` / `curl` 路径。

---

_最后更新: 2026-04-09 22:34 by Claude_
