# 安全审查报告

## 结论

PASS

基于对 `Dockerfile`、`docker/test-entrypoint.sh`、`docker/test-image-smoke.sh`、`src/commands/start.ts` 的只读审查，以及当前最终状态摘要，本次与 `docker-runtime-slim-entrypoint` 相关的最终状态未发现阻塞级安全问题。

## 阻塞问题

- 无。

## 建议（非阻塞）

- `[STRIDE:Spoofing/Tampering]` `src/commands/start.ts:86-93` - `AUTH_HOST` / `AUTH_PORT` / `AUTH_ISSUER` 环境变量回退适合容器场景，但建议在启动参数落地前增加显式校验：`AUTH_PORT` 必须是合法端口，`AUTH_ISSUER` 必须是预期 URL/Origin，避免错误配置导致监听异常或 issuer 漂移。
- `[STRIDE:Information Disclosure]` `docker/test-image-smoke.sh:146-183` - 当前 smoke 已覆盖 `/jwks`、SDK bundle、未授权 `/me` 返回 401，默认暴露面基本合理。建议补充对生产日志的约束，确保不会记录 bearer/token/敏感请求头。
- `[STRIDE:Repudiation]` `docker/test-entrypoint.sh:27-53`、`docker/test-image-smoke.sh:23-48` - 测试脚本的失败诊断较完整。建议确认正式运行路径对认证失败、启动失败、配置异常有结构化审计日志，便于追溯。
- `[STRIDE:Denial of Service]` `Dockerfile:21-56` - 镜像已移除 `curl`、`cloudflared`、旧 `entrypoint` / `launcher`，攻击面缩小。建议在部署侧补齐 CPU/内存限制、健康检查、重启策略、入口限流，降低 DoS 风险。
- `[STRIDE:Elevation of Privilege]` `Dockerfile:45-53` - 当前继续 `USER node` 运行，且新增权限调整仅为只读可读，未见新增提权面。建议部署时默认启用只读根文件系统与最小 capabilities，保持 secure-by-default。
- `[STRIDE:Tampering/Dependency Risk]` `Dockerfile:24-35`、`package.json:44-67` - `tini` 已按 `amd64/arm64` 做 SHA256 校验，这是明显加分项。建议在 CI 持续加入基础镜像与 npm 依赖漏洞扫描；本次静态审查未覆盖实时 CVE 情报。

## 修复指导

- 当前无需阻塞发布的代码修复。
- 建议后续按以下顺序加固：
  1. 为 `AUTH_PORT` / `AUTH_ISSUER` 增加显式格式校验与更清晰的错误提示；
  2. 为生产日志增加敏感字段脱敏规则；
  3. 在 CI/镜像流水线中加入基础镜像与依赖漏洞扫描；
  4. 在部署清单中固化资源限制、只读根文件系统、最小权限运行基线。

## 审查说明

- **Spoofing**：未见密钥/凭证硬编码；运行入口保持 `tini -> auth-mini start`，未重新引入旁路启动链路。`/me` 无 bearer 返回 401 `invalid_access_token`，未发现明显认证绕过路径。
- **Tampering**：`tini` 下载有 SHA256 校验；放宽的 `/app/package.json`、`/app/package-lock.json`、`/app/sql/schema.sql` 权限为只读可读，不是可写，未见明显完整性退化。
- **Repudiation**：测试路径有失败诊断输出；正式运行路径的审计完备性建议继续补强。
- **Information Disclosure**：镜像移除了 `curl`、`cloudflared`、旧 `entrypoint` / `launcher`，降低旁路和调试面；未发现硬编码凭证。
- **Denial of Service**：本次变更未引入明显 DoS 新面，但也未体现限流/资源治理能力，应由服务/部署层配套兜底。
- **Elevation of Privilege**：继续 `USER node` 运行是正向信号；未发现新增越权边界问题。

[Handoff]
summary:

- 已完成对 `Dockerfile`、`docker/test-entrypoint.sh`、`docker/test-image-smoke.sh`、`src/commands/start.ts` 的只读安全审查。
- 结论为 PASS：未发现阻塞级 STRIDE 问题。
- 当前 runtime 入口、tini 校验、非 root 运行、真实容器 smoke 覆盖均为正向安全信号。
  risks:

- 环境变量回退配置若缺少显式格式校验，可能放大错误部署配置的影响。
- 本次未进行实时依赖/CVE 扫描，基础镜像与 npm 依赖仍需依赖 CI 持续治理。
- 审计日志脱敏与运行期追溯能力在当前范围内未被完全证明。
  open_questions:

- `runStartCommand` 内部是否已对 `host/port/issuer` 做严格校验与错误分级？
- 生产部署是否默认启用容器资源限制、只读根文件系统和最小 capabilities？
