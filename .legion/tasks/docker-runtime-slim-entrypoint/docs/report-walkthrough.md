# 交付走查报告：Docker runtime slim + tini start

## 本轮结论

- `docker/entrypoint.sh` 与 `docker/launcher.mjs` 都已删除
- Docker 运行模型改为：`tini -> auth-mini start`
- runtime 中不再包含 `curl` / `cloudflared`

## 当前入口职责

- `tini` 作为父进程
- `auth-mini start /data/auth.sqlite --host 127.0.0.1 --port 7777`
- `--issuer` 由容器启动参数追加提供

## graceful teardown

- 当前未额外新增 launcher 级 teardown 逻辑
- `auth-mini start` 现有进程生命周期处理保持不变

## 已验证

- `bash -n docker/test-entrypoint.sh`
- `bash -n docker/test-image-smoke.sh`

## 待验证

- 在有 Docker daemon 的环境重跑容器级测试
