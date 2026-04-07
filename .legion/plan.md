# auth-mini Cloudflared Docker Release 执行契约

## 任务

- 按 `docs/superpowers/specs/2026-04-06-cloudflared-docker-release-design.md` 与 `docs/superpowers/plans/2026-04-07-cloudflared-docker-release.md` 实现 auth-mini 的 Cloudflare Tunnel + Docker + GHCR 自动发布方案。

## 验收

- 提供官方 Docker 镜像，在单容器内同时运行 `auth-mini` 与 `cloudflared`。
- 镜像入口脚本只接受 `TUNNEL_TOKEN` 与 `AUTH_ISSUER` 为核心用户输入，并固定使用容器内 `127.0.0.1:7777`。
- 空卷首次运行会自动初始化 `/data/auth.sqlite`，并在 `/jwks` ready 前不启动 `cloudflared`。
- 启动日志固定提醒 `AUTH_ISSUER` 必须与 Cloudflare Dashboard 公网 hostname 一致。
- GitHub Actions 仅在 `main` 上的 `package.json` version 变更时自动发布 GHCR 镜像，并允许 `workflow_dispatch`/rerun 作为补发路径。
- README 与 `docs/deploy/docker-cloudflared.md` 覆盖 Tunnel 创建、token 获取、固定 service URL、`docker run`、持久化与排障说明。
- Docker 相关文件不进入 npm tarball。
- 按 task 顺序分段提交，全部验证完成后再 push。

## 设计索引

- Spec: `docs/superpowers/specs/2026-04-06-cloudflared-docker-release-design.md`
- Plan: `docs/superpowers/plans/2026-04-07-cloudflared-docker-release.md`

## 阶段

1. Container Runtime：镜像骨架、入口脚本、脚本/镜像级 smoke tests
2. Release Workflow：GHCR 发布工作流与本地 workflow assertions
3. Docs / Verify：README、部署文档、最终验证、push
