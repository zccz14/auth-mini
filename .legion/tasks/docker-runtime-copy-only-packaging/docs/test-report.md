# 测试报告

## 执行命令

```bash
bash -n scripts/prepare-linux-runtime-artifact.sh
bash -n scripts/build-runtime-image.sh
bash -n docker/test-entrypoint.sh
bash -n docker/test-image-smoke.sh
python3 - <<'PY' ... yaml.safe_load(...) ... PY
docker buildx bake -f build/docker-bake.json release-check --print
bash docker/test-entrypoint.sh validation
bash docker/test-entrypoint.sh supervision
bash docker/test-image-smoke.sh
```

## 结果

PASS

## 关键信号 / 观察

- Shell 脚本语法检查全部通过。
- `python3` 解析 `release-image.yml` 通过，workflow YAML 语法有效。
- `docker buildx bake -f build/docker-bake.json release-check --print` 通过，说明新的 bake 入口可被正确解析。
- `bash docker/test-entrypoint.sh validation` 与 `bash docker/test-entrypoint.sh supervision` 通过，说明容器入口校验与 supervision 行为在新构建入口下未回退。
- `bash docker/test-image-smoke.sh` 通过，说明镜像 smoke 已成功切换到新的 artifact + bake 入口，并继续覆盖真实 `auth-mini init` / `start` / HTTP 路径。
- `scripts/prepare-linux-runtime-artifact.sh` 现在按用户要求保持简单：CI 默认依赖 fresh 环境，不再生成 `.artifact-manifest.json` 或执行额外 artifact 校验。
- 当前实现已满足以下核心目标：
  - Docker 构建链路转向消费 `build/runtime/linux-amd64/` artifact；
  - Linux artifact 准备脚本链路可用；
  - Docker 测试入口完成迁移；
  - workflow 简化后的主路径未表现出明显回归信号。

## 备注

- 本轮实测覆盖了本地 Docker 环境下的真实构建与容器级 smoke，不只是静态脚本检查。
- 当前构建与验证目标聚焦 `linux/amd64`。
- workflow 的线上 GitHub Actions publish 路径尚未在本轮本地直接模拟，但配置已完成 YAML 自检与 review。
