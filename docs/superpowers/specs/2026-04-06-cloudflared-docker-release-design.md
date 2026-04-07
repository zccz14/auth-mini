# Cloudflared Docker Release 部署设计

## 背景

- 用户准备把 auth 服务部署到 `auth.zccz14.com`。
- 目标运行环境是家里机器，不希望暴露入站端口。
- 用户希望把 `cloudflared` 打包进官方容器镜像，由外部用户直接 `docker run` 并挂载持久卷运行。
- 用户希望 GitHub Actions 在版本号更新后自动发布镜像，并尽量降低外部用户的配置心智成本。

## 目标

- 提供一个官方 Docker 镜像，在单容器内同时运行 `auth-mini` 与 `cloudflared`。
- 让用户通过最少配置完成部署：核心路径为 `docker run`、持久卷、`TUNNEL_TOKEN` 与 `AUTH_ISSUER`。
- 部署编排保持在 Docker 层与发布层处理，不向 `src/` 新增 Docker/Cloudflare 需求。
- 提供基于版本号变更的 GitHub Actions 自动镜像发布流程。
- 文档化 Cloudflare Tunnel 的申请、配置、运行与排障流程。

## 非目标

- 不在本轮引入 Kubernetes 作为首发部署方案。
- 不在 `src/` 中新增 Cloudflare/Tunnel 相关业务源码。
- 不支持多副本、高可用或外部数据库迁移；运行模型仍为单实例 SQLite。
- 不要求用户配置 Cloudflare API token、Account ID、Zone ID 等更高复杂度字段。
- 不把 Docker 相关文件纳入 npm 发布产物；它们只服务于容器分发与仓库级发布。

## 边界

- 本文只定义 Docker 镜像、`cloudflared` 集成、文档与 GHCR 发布流程。
- 本部署规格建立在当前已实现的应用契约之上，不重新设计应用层运行时语义。
- Docker 层只负责基于现有应用契约完成部署编排、暴露约束并文档化，不在本文中引入旁路或兼容分支去改变应用层行为。

## 决策

采用单镜像、单容器、双进程方案：容器内由 shell 入口脚本启动 `auth-mini` 与 `cloudflared`。`auth-mini` 固定监听容器内 `127.0.0.1:7777`，`cloudflared` 通过 `TUNNEL_TOKEN` 运行预先配置好的 tunnel，把外部域名流量转发到该本地地址。外部用户主路径只需要准备 Cloudflare tunnel、填写固定的 service URL、传入 `TUNNEL_TOKEN` 和 `AUTH_ISSUER`、挂载 `/data` 持久卷并运行官方镜像。

## 方案对比

### 方案 A：单容器双进程 + Tunnel Token（采用）

- 优点：最符合“直接 `docker run`”目标；用户只需理解少量固定字段；适合家里机器长期运行。
- 缺点：容器内需要入口脚本管理两个进程；Cloudflare Dashboard 仍需一次性配置 hostname 与 service URL。

### 方案 B：单镜像双模式运行

- 优点：既可单容器运行，也可拆为两个容器。
- 缺点：入口契约、文档和排障路径明显更复杂；偏离“最低心智成本”目标。

### 方案 C：Cloudflare API 全自动托管 Tunnel

- 优点：理论上可把 tunnel 创建与 ingress 配置全部自动化。
- 缺点：需要额外 API 凭据和 Cloudflare 资源模型知识；用户输入项更多，权限面更大，不符合当前目标。

## 架构

### 运行拓扑

- 宿主机运行一个官方 Docker 容器。
- 容器内运行两个前台进程：`auth-mini start ...` 与 `cloudflared tunnel run --token ...`。
- `auth-mini` 固定监听 `127.0.0.1:7777`。
- `cloudflared` 将 Cloudflare Tunnel 的公网 hostname 转发到 `http://127.0.0.1:7777`。
- SQLite 数据库存放在挂载卷 `/data` 下，例如 `/data/auth.sqlite`。
- `/jwks` 作为当前镜像的最小健康检查/readiness 路径契约。

### 外部契约

- 最终对外域名由 Cloudflare Tunnel 暴露，例如 `https://auth.zccz14.com`。
- `AUTH_ISSUER` 必须与最终对外域名完全一致，例如 `https://auth.zccz14.com`。
- 前端页面 origin allowlist、SMTP 配置、WebAuthn 域名校验仍由 `auth-mini` 现有 CLI 与应用配置负责，不因 Tunnel 自动完成。
- 浏览器相关配置与运行时约束遵循应用层现状；本文不重定义它们。

## 容器契约

### 必填环境变量

- `TUNNEL_TOKEN`：Cloudflare Tunnel token。
- `AUTH_ISSUER`：auth 服务对外 issuer，例如 `https://auth.zccz14.com`。

### 默认环境变量

- `AUTH_INSTANCE=/data/auth.sqlite`

### 固定内部常量

- `AUTH_HOST=127.0.0.1`
- `AUTH_PORT=7777`
- cloudflared 对接的本地 upstream 固定为 `http://127.0.0.1:7777`
- 一体化 cloudflared 模式下不支持通过环境变量覆盖 host、port 或 upstream，避免与 Dashboard 中固定 service URL 产生歧义

### 持久化

- 默认挂载目录为 `/data`。
- `/data` 至少持久化 SQLite 文件。
- Tunnel token 不写入卷，继续通过环境变量传入。

### 启动流程

1. 入口脚本校验必填环境变量。
2. 校验 `AUTH_ISSUER` 是合法 `https://` URL，且不带 path、query 或 hash。
3. 若 `AUTH_INSTANCE` 不存在，则自动执行 `auth-mini init "$AUTH_INSTANCE"`。
4. 启动 `auth-mini start "$AUTH_INSTANCE" --issuer "$AUTH_ISSUER" --host 127.0.0.1 --port 7777`。
5. 轮询 `GET http://127.0.0.1:7777/jwks`；当其在无需认证的情况下返回 `200` 时视为 ready。
6. 启动 `cloudflared tunnel run --token "$TUNNEL_TOKEN"`。
7. 若在固定超时窗口内未等到 `/jwks` ready，入口脚本直接退出，且不得启动 `cloudflared`。
8. 任一关键进程退出时，容器整体退出，由 Docker restart policy 负责重启。

### 首次部署体验

- 空卷首次运行必须能完成数据库初始化并成功启动服务。
- 首次 `docker run` 前不要求额外的 origin 启动前置步骤。
- 本文不把任何 origin / WebAuthn 运行时语义调整纳入 Docker 交付范围。

## Cloudflare Tunnel 用户流程

### 申请与管理 Tunnel Token

- 文档必须说明用户在 Cloudflare Zero Trust 中创建 `Cloudflared` tunnel 的步骤。
- 文档必须说明 token 来源：Cloudflare Dashboard 中展示的 `cloudflared tunnel run --token <TUNNEL_TOKEN>` 命令里的 `<TUNNEL_TOKEN>`。
- 文档必须说明 token 与某个具体 tunnel 绑定，可在 tunnel 页面轮换或替换；如怀疑泄露，用户应在 Cloudflare 侧重新生成。

### Dashboard 配置要求

- 用户需要在 Cloudflare Dashboard 中为该 tunnel 绑定公网 hostname，例如 `auth.zccz14.com`。
- 用户需要把 service URL 固定配置为 `http://127.0.0.1:7777`。
- 文档必须把该 service URL 解释为固定值，而非要求用户理解容器网络细节。
- 该步骤作为当前最低心智成本方案中唯一保留的 Cloudflare 手工配置项。
- 本轮仅支持 Cloudflare Dashboard 远程托管的 tunnel ingress + `TUNNEL_TOKEN` 运行模式；不支持本地 `config.yml`、credentials 文件或自定义 cloudflared ingress 配置。

## 友好校验与错误提示

### 启动前校验

- 若 `TUNNEL_TOKEN` 缺失，入口脚本直接退出，并提示用户从 Cloudflare tunnel 页面复制 token。
- 若 `AUTH_ISSUER` 缺失或格式非法，入口脚本直接退出，并提示应使用 `https://auth.example.com` 形式。
- 若 `AUTH_ISSUER` 包含 path、query 或 hash，入口脚本直接退出，并提示 issuer 必须是纯 origin。

### 运行时提示

- 若本地 `auth-mini` 未成功启动，入口脚本不得启动 `cloudflared`，应输出面向用户的错误说明。
- 若 `cloudflared` 进程退出，容器直接退出，保留清晰日志以便用户检查 token、hostname 或 Dashboard ingress 配置。
- 文档与排障说明必须覆盖 `AUTH_ISSUER` 与最终 tunnel hostname 不一致的常见问题，并明确指出这会影响 JWT `iss`、WebAuthn 预期 origin 与 SDK 文档示例。
- 当前版本不尝试在运行时自动探测最终 tunnel hostname；关于 mismatch 的处理范围仅限 `AUTH_ISSUER` 格式校验、入口脚本在容器启动日志中的固定提醒文案与文档化排障步骤。
- 固定提醒文案至少应明确：`AUTH_ISSUER` 必须与 Cloudflare Dashboard 中绑定的公网 hostname 完全一致，否则会影响 JWT `iss`、WebAuthn 与 SDK 使用说明。

### 明确不做的自动校验

- 容器不尝试通过 Cloudflare API 自动读取或修正 hostname / service URL。
- 容器不依赖额外 Cloudflare API 凭据。
- Dashboard 中 hostname 或 service URL 的错误主要通过文档、日志和排障步骤定位。

## 代码与目录结构

### 新增文件边界

- `Dockerfile`：构建官方镜像。
- `docker/entrypoint.sh`：容器唯一入口。
- `docker/` 下可放少量 shell helper，用于等待服务与统一报错。
- `.github/workflows/release-image.yml`：自动发布镜像。
- `README.md` 与必要 docs：部署说明、Tunnel 创建流程、运行示例、排障。

### 边界约束

- 不在 `src/` 中新增 Cloudflare/Tunnel 部署源码。
- 不修改现有 `auth-mini` 业务逻辑来适配容器运行；优先复用现有 CLI。
- 所有初始化、参数校验、双进程管理都放在 Docker 层处理。

## 发布流程

### 镜像发布

- 使用 GitHub Actions 在默认分支的每次 push 检查是否需要发布镜像。
- `push` 触发路径以 version bump 为先：仅当本次触发提交包含 `package.json` 中 `version` 字段变更时，工作流才进入发布判定阶段；否则直接跳过。
- 发布判定以 GHCR tag 为准：工作流读取变更后的 `package.json` `version`，检查 `ghcr.io/<owner>/auth-mini:<version>` 是否已存在；存在则跳过，不存在则发布。
- 推送的标签至少包括具体版本号与 `latest`。
- 工作流重跑或 `workflow_dispatch` 作为补发路径时，可直接进入 GHCR tag 判定；若该版本标签已存在则跳过，不存在则发布。
- `workflow_dispatch` 与 rerun 只允许针对默认分支上的提交执行正式发布；其他分支最多做构建验证，不推送正式镜像标签。
- 非默认分支的 push 不进入正式发布路径。

### npm 与 Docker 的边界

- Docker 相关文件仅用于仓库中的容器构建与镜像发布。
- npm 发布内容保持现有包边界，不把 Docker 配置打进 npm tarball。

## 文档要求

文档至少覆盖以下内容：

- 如何在 Cloudflare Zero Trust 中创建 tunnel。
- 如何获取与轮换 `TUNNEL_TOKEN`。
- 如何在 Dashboard 中配置 hostname 与固定 service URL `http://127.0.0.1:7777`。
- 如何运行官方镜像并挂载 `/data`。
- 如何完成实例启动后的配置、配置 SMTP，并理解 issuer 与 Cloudflare hostname 的关系。
- 常见故障排查：token 无效、issuer 格式错误、Dashboard service URL 配错、hostname 与 issuer 不一致、容器重启循环。

## Kubernetes 位置

- 本轮明确不交付 Kubernetes 清单、Helm chart 或 Operator。
- 镜像设计保持 Kubernetes 兼容性：环境变量驱动、数据目录固定、健康检查路径明确，且入口行为足够清晰，便于未来由其他编排层包装当前双进程模型。
- 文档只将 Kubernetes 作为后续扩展方向，不作为首发路径承诺。

## 验证策略

- 构建镜像，确认镜像内包含 `auth-mini` 运行产物、`cloudflared` 与入口脚本。
- 以本地或测试环境运行容器，验证空卷时会自动初始化数据库并成功启动服务。
- 验证首次 `docker run` 的成功路径不要求预先插入 origin 或执行额外启动前置步骤。
- 验证在合法 `AUTH_ISSUER` 与 `TUNNEL_TOKEN` 下，容器能够先启动 `auth-mini`，再启动 `cloudflared`。
- 验证缺失 `TUNNEL_TOKEN`、缺失 `AUTH_ISSUER`、非法 `AUTH_ISSUER` 等场景会失败并输出友好错误。
- 验证容器启动日志固定包含“`AUTH_ISSUER` 必须与 Cloudflare Dashboard 公网 hostname 一致”的提醒文案。
- 验证 GitHub Actions 只在 `package.json` 的 `version` 发生变化时才进入发布判定，并且不会在同版本下重复推送新版本标签。
- 验证 README / docs 中的 `docker run`、Tunnel 配置步骤与排障文案与实际镜像行为一致。

## 风险与控制

- 风险：用户误以为 `TUNNEL_TOKEN` 已经包含 hostname 与 upstream 配置。
  - 控制：文档明确说明 token 只负责运行 tunnel，仍需在 Dashboard 中完成 hostname 与固定 service URL 配置。
- 风险：`AUTH_ISSUER` 与最终 tunnel hostname 不一致，导致 JWT、WebAuthn 与文档示例错位。
  - 控制：入口脚本做严格 URL 格式校验；文档与排障说明显式强调必须与公网域名一致；不承诺自动探测 Cloudflare 侧 hostname。
- 风险：旧文档或历史讨论中的 origin 启动指引会误导用户，以为首次 `docker run` 前还需要额外前置操作。
  - 控制：更新部署文档与排障说明，明确空卷首次启动是成功路径，并移除过时的 origin 启动前置表述。
- 风险：双进程容器出现半启动状态，用户误判服务可用。
  - 控制：先等待本地 `auth-mini` 就绪再启动 `cloudflared`；任一关键进程退出时整体退出。
- 风险：把 Docker/Cloudflare 逻辑侵入主程序，扩大改动面。
  - 控制：所有新增实现限制在 Dockerfile、shell 入口脚本、GitHub Actions 与文档层。
