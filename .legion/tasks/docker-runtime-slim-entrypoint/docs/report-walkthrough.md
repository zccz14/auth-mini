# Docker runtime slim + entrypoint 交付 walkthrough

## 任务目标

本 task 目标是将容器运行时收敛为最小模型，最终交付：

- 启动链固定为 `tini -> auth-mini start`
- runtime 不再包含 `curl`、`cloudflared`、`docker/entrypoint.sh`、`docker/launcher.mjs`
- 保持 `USER node`
- 为远程下载的 `tini` 增加按 `TARGETARCH` 的 SHA256 校验
- 修复真实容器下 `auth-mini init` / `auth-mini start` 的权限与配置回退问题
- 完成本地 Docker 冒烟验证并补齐对应回归断言

范围绑定 `plan.md` 中允许的 scope，核心覆盖：

- `Dockerfile`
- `docker/test-entrypoint.sh`
- `docker/test-image-smoke.sh`
- 相关 task 文档与评审材料

## 实现摘要

设计与背景见：

- `../plan.md`
- `./rfc.md`

本轮最终实现已收敛到极简运行模型：

- `Dockerfile` 维持 `ENTRYPOINT ["/tini", "--"]`
- 默认 `CMD ["auth-mini", "start", "/data/auth.sqlite", "--port", "7777"]`
- runtime 镜像中不再保留历史 launcher / entrypoint 路径，也不再携带 `curl` / `cloudflared`
- 容器继续以 `USER node` 运行
- `tini` 远程下载已按 `TARGETARCH` 做 SHA256 校验
- `start` 命令新增 `AUTH_HOST` / `AUTH_PORT` / `AUTH_ISSUER` 环境变量回退

同时，本轮把本地 Docker 验证脚本补齐到了当前契约上，确保“镜像默认命令链 + non-root + checksum + 平台一致性 + 真实容器 HTTP 路径”都能被覆盖。

## 改动清单

### 1. Dockerfile / 运行时模型

- 保持最终入口为 `ENTRYPOINT ["/tini", "--"]`
- 默认命令收敛为直接执行 `auth-mini start`
- 显式修正 `USER node` 读取 `/app/package.json` 与 `/app/sql/schema.sql` 所需的只读权限
- 明确 runtime 不再包含：
  - `curl`
  - `cloudflared`
  - `docker/entrypoint.sh`
  - `docker/launcher.mjs`
- 保持 `USER node`
- 为 `tini-static-${TARGETARCH}` 下载增加 SHA256 校验，补上供应链完整性保护
- 移除 `CMD` 中硬编码的 `--host 127.0.0.1`，让 Docker 场景可以通过 `AUTH_HOST` 覆盖 published-port 监听地址

### 2. `docker/test-entrypoint.sh`

已修复并补强以下验证点：

- 适配本地 Docker arm64 宿主机上的权限与平台问题
- 修正对 Docker `ENTRYPOINT + CMD` 语义的使用
- 覆盖默认命令链回归
- 覆盖 `validation` / `supervision` 主路径
- 保证测试在 non-root 运行模型下成立

### 3. `docker/test-image-smoke.sh`

已补强以下 smoke 断言：

- 镜像配置检查
- non-root 回归断言
- runtime 中不含 `curl` / `cloudflared` / 旧 launcher/entrypoint 文件
- `tini` checksum 轻量回归断言
- 平台声明与本地 Docker 实跑语义对齐
- 真实容器 `init -> start -> HTTP` smoke：验证 `/jwks`、SDK bundle 与未授权 `/me`

### 4. 文档与评审结果

- `./test-report.md`：本地 Docker 实跑验证结论
- `./review-code.md`：PASS
- `./review-security.md`：PASS

## 如何验证

参考 `./test-report.md`，本轮最新验证命令如下：

```bash
bash -n docker/test-entrypoint.sh
bash -n docker/test-image-smoke.sh
bash docker/test-entrypoint.sh validation
bash docker/test-entrypoint.sh supervision
bash docker/test-image-smoke.sh
```

预期结果：

- 所有命令均 PASS
- `validation` 输出 `validation ok`
- `supervision` 输出 `supervision ok`
- `image smoke` 输出 `image smoke ok`

本轮已在本地有 Docker daemon 的环境完成真实容器级验证，覆盖的关键信号包括：

- `tini -> auth-mini start` 默认命令链成立
- `USER node` 生效
- 容器内 `auth-mini init` 与 `auth-mini start` 都可在真实 volume 场景下运行
- 通过 `AUTH_HOST=0.0.0.0` + `AUTH_ISSUER=...` 可完成本地 published-port smoke
- runtime 不含 `curl` / `cloudflared` / `docker/entrypoint.sh` / `docker/launcher.mjs`
- `tini` SHA256 校验存在且有 smoke 回归
- 本地 arm64 宿主机下的平台/权限问题已被测试夹具修复

## 风险与回滚

### 当前风险

本轮代码与安全评审均为 PASS，未发现阻塞合入问题。剩余风险主要为非阻塞项：

- 基础镜像仍使用 tag，未做 digest pin
- CI 侧尚缺少自动化漏洞扫描 / SBOM 证据
- 若未来部署改为更外露的监听方式，请补请求体大小限制与超时控制
- 环境变量异常路径（如非法 `AUTH_PORT`）仍可继续补测试

### 回滚口径

若后续发现兼容性或发布链路问题，可按最小粒度回滚：

1. 回退 `Dockerfile` 中本轮 runtime / `tini` 相关调整
2. 回退测试脚本中的新断言与平台/权限修复
3. 重新执行：
   - `bash docker/test-entrypoint.sh validation`
   - `bash docker/test-entrypoint.sh supervision`
   - `bash docker/test-image-smoke.sh`

本轮不涉及数据迁移，回滚主要是镜像构建与测试夹具层面的恢复。

## 未决项与后续

非阻塞 follow-up 建议：

- 为基础镜像补 digest pin
- 在 CI 中补充镜像 / 依赖漏洞扫描
- 为请求体读取路径补 body size limit / timeout

交接建议：

- PR 描述可直接复用 `pr-body.md`
- 若后续扩展目标平台，建议显式覆写目标平台后再复跑一轮 Docker 验证
