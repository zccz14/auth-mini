# 安全审查报告

## 结论

PASS

本轮 `docker-runtime-copy-only-packaging` 最终状态未发现阻塞级安全问题。

## 阻塞问题

- 无。

## 建议（非阻塞）

- `[STRIDE: Repudiation]` `.github/workflows/release-image.yml`：建议在 workflow summary 中记录 `release_ref`、最终镜像 digest 与触发方式，增强追溯性。
- `[STRIDE: Tampering]` `build/Dockerfile`：当前仍通过远程下载获取 `tini`，虽已有 SHA256 校验，但构建仍依赖外部网络源。若后续想进一步收紧供应链，可再评估是否把 `tini` 也前移到 artifact 阶段。
- `[STRIDE: Denial of Service / Supply Chain]` `scripts/prepare-linux-runtime-artifact.sh`：当前 `npm ci` 仍会执行依赖 lifecycle scripts。若未来依赖面扩大，可评估 `--ignore-scripts`、SBOM / dependency snapshot / registry policy 等额外手段。
- `[STRIDE: Elevation of Privilege]` `docker/test-image-smoke.sh`：现有 smoke 已验证非 root 运行；后续可再加一条断言，确认容器内 `node` 用户不能写 `/app`、只能写 `/data`。

## 修复指导

当前无需阻塞修复，可按以下方向持续加固：

1. 在 CI summary 中记录 `release_ref` 与最终 pushed image digest。
2. 在 smoke 中增加“`USER node` 仅可写 `/data`、不可写 `/app`”断言。
3. 视需要补充 SBOM、依赖快照或 provenance attestation。

## 审查备注

- **Spoofing**：本轮未引入新的认证/凭证处理逻辑，未见硬编码密钥。
- **Tampering**：`NODE_IMAGE` 已按用户要求固定为明确版本 tag；GitHub Actions 继续 pin 到 commit SHA；`tini` 仍有 checksum 校验。
- **Repudiation**：已有基本 gating；若补充 workflow summary，将更利于审计。
- **Information Disclosure**：当前范围内未见新增敏感日志/错误侧信道问题。
- **Denial of Service**：未见新增明显 DoS 面；构建期仍受外部 registry 可用性影响，但属于常规风险。
- **Elevation of Privilege**：运行时仍为 `USER node`，未见新增提权边界绕过路径。

[Handoff]
summary:

- 当前安全基线维持稳定：`tini -> auth-mini start`、`USER node`、真实 Docker smoke 全都保留。
- 供应链方向已按最新用户意图收敛：基础镜像固定版本 tag，GitHub Actions pin commit SHA，`tini` 继续做 checksum 校验。
- 删除 `.artifact-manifest.json` 与 verify 脚本后，复杂度明显下降，且未引入新的阻塞性安全问题。
  risks:

- 构建阶段仍依赖 npm registry 与 `tini` 下载源，属于常规外部依赖风险。
- 当前 artifact 依赖 CI fresh 环境假设；若未来迁移到持久 runner，可能需要重新评估是否恢复更强的产物校验。
  open_questions:

- 后续是否计划为发布镜像补充 SBOM / provenance attestation？
- 是否希望在 smoke 中显式加入“`/app` 不可写、`/data` 可写”的权限边界断言？
