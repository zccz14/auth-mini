# 测试报告

## 执行命令

```bash
bash -n docker/test-entrypoint.sh
bash -n docker/test-image-smoke.sh
bash docker/test-entrypoint.sh validation
bash docker/test-entrypoint.sh supervision
bash docker/test-image-smoke.sh
```

## 结果

PASS

## 关键信号 / 观察

- `bash -n docker/test-entrypoint.sh` 通过。
- `bash -n docker/test-image-smoke.sh` 通过。
- `bash docker/test-entrypoint.sh validation` 输出 `validation ok`。
- `bash docker/test-entrypoint.sh supervision` 输出 `supervision ok`。
- `bash docker/test-image-smoke.sh` 输出 `image smoke ok`。
- 本轮 `docker/test-image-smoke.sh` 已不只是 stub 验证，还包含真实容器级 smoke：
  1. 用镜像内 `auth-mini init /data/auth.sqlite` 初始化独立 volume；
  2. 以 `-e AUTH_HOST=0.0.0.0 -e AUTH_ISSUER=https://auth.example.com` 启动真实容器；
  3. 对外验证 `GET /jwks`、`GET /sdk/singleton-iife.js`、未带 bearer 的 `GET /me`。
- 真实 HTTP smoke 已确认：
  - `/jwks` 返回 200 且 `keys` 非空；
  - `/sdk/singleton-iife.js` 返回 200 且包含 `AuthMini`；
  - `/me` 在未授权时返回 401 `invalid_access_token`。
- 通过本轮实跑还额外验证了三项真实运行时修复：
  - `USER node` 现在可读取 `/app/package.json`，CLI 不再因 root metadata 不可读而启动失败；
  - `USER node` 现在可读取 `/app/sql/schema.sql`，`auth-mini init` 可在容器内正常初始化数据库；
  - `AUTH_HOST` / `AUTH_ISSUER` 环境变量回退已能驱动本地 Docker published-port smoke。

## 备注

- 当前镜像默认 `CMD` 为 `auth-mini start /data/auth.sqlite --port 7777`；host 默认值由应用提供（默认 `127.0.0.1`），本地端口映射 smoke 使用 `AUTH_HOST=0.0.0.0` 覆盖。
- 当前脚本默认以 `IMAGE_PLATFORM=linux/amd64` 构建并运行镜像；如目标环境不同，建议按目标平台复跑一次。
