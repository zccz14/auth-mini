# 安全审查报告

## 结论

PASS

## 阻塞问题

- (none)

## 建议（非阻塞）

- `[STRIDE:Repudiation]` `docker/entrypoint.sh:13-18,79-116` - 当前失败日志可读，但缺少结构化阶段/退出码字段。建议为 readiness 超时、子进程先退、信号清理补充统一日志字段，提升审计与事后追溯能力。
- `[STRIDE:DoS]` `Dockerfile:43-89`、`docker/entrypoint.sh:86` - runtime `curl` shim 仅用于本地 readiness，风险面已较小；但其 `fetch()` 仍无显式超时/响应体上限。建议补超时与最大响应体限制，避免异常本地响应导致启动卡死或内存放大。
- `[STRIDE:Information Disclosure]` `docker/entrypoint.sh:67-100` - 当前实现已先保存 token、`unset TUNNEL_TOKEN`，并仅在启动 `cloudflared` 时单次注入，凭证作用域控制是正确的。建议进一步在 `cloudflared` 启动后清理 shell 内部临时变量，并优先评估 `_FILE`/secret mount 方案，继续缩小秘密暴露面。
- `[STRIDE:Tampering]` `Dockerfile:1,5-10,39,95` - 基础镜像已做 digest pin，`cloudflared` 也已做版本 pin 与 SHA256 校验，完整性控制到位。建议在 CI 增加镜像/二进制漏洞扫描与版本刷新提醒，持续跟踪 Node / cloudflared 的安全公告。
- `[STRIDE:Elevation of Privilege]` `Dockerfile:91-99` - 当前 runtime 已切到 `USER node`，默认权限边界优于 root。建议补一条安全回归测试，显式断言容器内 uid 非 0 且 `/data` 仍可正常初始化，防止后续回退。
- `[STRIDE:Information Disclosure]` `docker/test-entrypoint.sh:317-345`、`docker/test-image-smoke.sh:244-299` - 建议新增回归断言：`auth-mini` stub 环境中不可见 `TUNNEL_TOKEN`。当前代码静态看已满足最小权限，但测试尚未把这条安全契约固化下来。

## 修复指导

1. 为 readiness 用的 `curl` shim 增加超时、响应体大小上限，避免异常响应拖住启动链路。
2. 把“token 不进 argv、也不进入 auth-mini 环境”固化为测试断言，防止后续脚本重构回退。
3. 在 CI 中加入基础镜像与 `cloudflared` 的漏洞扫描/刷新检查，持续验证 pin 的版本仍处于安全窗口。
4. 若部署环境允许，补充容器运行建议：`no-new-privileges`、按需 `cap-drop`、只读根文件系统等运行时加固项。

[Handoff]
summary:

- 本轮审查结论为 PASS：基础镜像已 digest pin，cloudflared 下载已做 SHA256 校验，runtime 已切到非 root。
- 先前常见的 token 作用域问题在当前最终状态中已被正确收敛：`TUNNEL_TOKEN` 会先被 `unset`，仅在启动 `cloudflared` 时单次注入。
- 当前剩余问题主要是加固与可观测性，不构成阻塞发布的高风险缺陷。
  decisions:
- (none)
  risks:
- runtime `curl` shim 仍缺少显式超时/响应体上限，异常本地响应可能放大启动期 DoS 风险。
- “auth-mini 不应继承 tunnel token” 尚未被测试显式锁定，后续重构存在回退可能。
  files_touched:
- path: .legion/tasks/docker-runtime-slim-entrypoint/docs/review-security.md
  commands:
- (none)
  next:
- 为 curl shim/readiness 增加超时与边界控制。
- 补 token 作用域与 non-root 运行时的安全回归测试。
- 在 CI 增加基础镜像与 cloudflared 的漏洞扫描/版本刷新检查。
  open_questions:
- (none)
