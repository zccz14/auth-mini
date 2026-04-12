# PR Docker 构建检查设计

## 背景/目标

- 当前仓库已有发布镜像相关工作流，但缺少一个面向 Pull Request 的最小 Docker 构建检查，无法在合并前尽早发现 Dockerfile 或构建上下文回归。
- 本轮目标是在不改变现有 `release-image.yml` 语义的前提下，为 PR 新增一个独立 CI 检查，只验证镜像可以成功构建。

## 范围

- 新增一个独立的 GitHub Actions workflow，用于 PR 场景下执行最小 Docker build 检查。
- 工作流仅在 `pull_request` 事件触发。
- 工作流运行环境固定为 `ubuntu-latest`。
- 工作流步骤固定为 checkout 后执行：`docker build --platform linux/amd64 -t auth-mini:pr-check .`。

## 非目标

- 不修改 `release-image.yml` 的触发条件、步骤顺序、发布语义或职责边界。
- 不执行 GHCR 登录、镜像推送、tag 管理或任何 publish 行为。
- 不新增 smoke tests、容器启动验证、运行时健康检查或额外脚本校验。
- 不把该检查扩展为通用 Docker 发布流程重构。

## 方案设计

- 在 `.github/workflows/` 下新增独立 workflow 文件，职责仅为 PR Docker 构建检查。
- 该 workflow 与 `release-image.yml` 并行存在：前者只验证“能否构建”，后者继续承担发布镜像相关职责。
- workflow 仅包含一个运行于 `ubuntu-latest` 的 job，不引入矩阵、多平台拆分或额外依赖关系。
- job 中先使用 `actions/checkout@v4` 检出仓库，再直接执行 `docker build --platform linux/amd64 -t auth-mini:pr-check .`。

## CI 触发与步骤

### 触发条件

- 事件：`pull_request`
- 本轮不扩展到 `push`、`workflow_dispatch`、tag 或 release 事件。

### 执行步骤

1. 使用 `actions/checkout@v4` 检出代码。
2. 在 `ubuntu-latest` runner 上执行：`docker build --platform linux/amd64 -t auth-mini:pr-check .`

### 边界约束

- 不执行 `docker login` 或任何 GHCR 认证步骤。
- 不追加 `docker run`、HTTP 探测、CLI smoke test 或产物上传步骤。
- 不在 workflow 中复用或改写 `release-image.yml` 的发布逻辑。

## 失败信号

- `actions/checkout@v4` 失败时，workflow 直接失败。
- `docker build --platform linux/amd64 -t auth-mini:pr-check .` 返回非零退出码时，workflow 直接失败。
- 本轮不引入 `continue-on-error`、失败后补偿步骤或软失败机制。

## 验证方式

- 评审 workflow 文件时，确认其位于 `.github/workflows/` 且为独立文件，而不是修改 `release-image.yml`。
- 确认 workflow 触发事件仅为 `pull_request`。
- 确认 job 运行环境为 `ubuntu-latest`，并且 checkout 后只执行最小 Docker build 命令。
- 确认 workflow 中不存在 GHCR 登录、push、smoke test 或 publish 相关步骤。

## 验收标准

- 仓库新增一份独立的 PR Docker 构建检查 workflow。
- workflow 与 `release-image.yml` 职责分离，不改变后者现有语义。
- workflow 仅在 `pull_request` 事件触发。
- workflow 在 `ubuntu-latest` 上执行 checkout 与 `docker build --platform linux/amd64 -t auth-mini:pr-check .`。
- Docker build 失败时，该检查明确失败；构建成功时，该检查通过。
- workflow 不包含 GHCR 登录、镜像推送、smoke tests 或其他超出最小范围的行为。

## 风险/取舍

- 风险：实现时顺手把逻辑并入 `release-image.yml`，导致 PR 检查与发布职责耦合。
  - 取舍：坚持使用独立 workflow，保持“PR 构建检查”和“发布镜像”两条路径分离。
- 风险：为追求覆盖面而加入登录、推送或运行态验证，造成 scope drift。
  - 取舍：本轮只验证 build 成功，放弃运行态覆盖，以换取更低维护成本和更清晰边界。
- 风险：仅验证 `linux/amd64` 构建，不能覆盖所有平台差异。
  - 取舍：按当前批准范围只检查 `linux/amd64`，先保证最小且稳定的 PR 门槛。
