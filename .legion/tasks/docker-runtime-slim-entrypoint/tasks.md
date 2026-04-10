# Docker runtime slim + entrypoint 评估 - 任务清单

## 快速恢复

**当前阶段**: 阶段 3 - 评审与交付 ✅ COMPLETE
**当前任务**: (none)
**进度**: 8/8 任务完成

---

## 阶段 1: 设计与现状调研 ✅ COMPLETE

- [x] 审查当前 Dockerfile 与运行时脚本，确认问题、验收与允许 scope | 验收: `plan.md` 完成，包含风险分级、允许 scope、验收与 phase map
- [x] 形成设计结论并保留 RFC 入口 | 验收: `docs/rfc.md` 可追溯当前容器模型与回滚口径

---

## 阶段 2: 实现与测试收敛 ✅ COMPLETE

- [x] 将镜像入口收敛为 `tini -> auth-mini start` | 验收: `Dockerfile` 不再依赖 entrypoint/launcher，默认命令链可由 smoke test 验证
- [x] 修复本地 Docker 测试夹具并补 non-root 回归 | 验收: `docker/test-entrypoint.sh` 与 `docker/test-image-smoke.sh` 在本地 Docker 环境通过，且显式验证 `id -u != 0`
- [x] 为远程下载的 `tini` 增加完整性校验 | 验收: `Dockerfile` 对 `tini-static-${TARGETARCH}` 做 SHA256 校验，smoke test 包含轻量回归断言
- [x] 修复真实容器启动与初始化路径 | 验收: `USER node` 下 `auth-mini init` / `auth-mini start` 可在容器内运行，published-port 场景可通过环境变量完成本地 smoke

---

## 阶段 3: 评审与交付 ✅ COMPLETE

- [x] 完成本地 Docker 冒烟验证并记录结果 | 验收: `docs/test-report.md` 包含真实执行命令与 PASS 结果
- [x] 完成代码审查与安全审查 | 验收: `docs/review-code.md`、`docs/review-security.md` 结论均为 PASS
- [x] 生成 walkthrough 与 PR 描述 | 验收: `docs/report-walkthrough.md`、`docs/pr-body.md` 可直接用于交付

---

## 发现的新任务

- [x] 在具备 Docker daemon 的环境复跑 3 条 Docker 集成验证 | 来源: 早前 test-report 环境阻塞
- [x] 为 non-root 运行补一条显式回归断言 | 来源: review-security 非阻塞建议
- [x] 修复本地 arm64 宿主机上 Docker 测试的 build/run 平台与挂载权限问题 | 来源: 本地 Docker 冒烟验证实跑失败
- [x] 为 `tini` 远程下载补供应链完整性校验 | 来源: 最新 review-security blocking finding
- [x] 修复 runtime 下 package/schema 文件权限导致的真实容器 `init/start` 失败 | 来源: 手动 Docker 启动验证
- [x] 为 `start` 命令增加容器场景环境变量回退，并补真实 HTTP smoke | 来源: 用户要求“docker 启动之后执行一遍测试”

---

## 非本轮范围备注

- 若未来需要自动 init / issuer 校验，应优先在 `auth-mini` 本体能力中提供，而不是重新引入 launcher 或 shell entrypoint。
- 若未来继续收紧供应链，可评估基础镜像 digest pin 与 CI 漏洞扫描。

---

_最后更新: 2026-04-09 22:34_
