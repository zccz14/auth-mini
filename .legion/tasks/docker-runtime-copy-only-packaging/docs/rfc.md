# RFC：Docker runtime copy-only packaging

## 摘要 / 动机

当前 `release-image` workflow 把 `npm ci`、`npm run build`、`npm prune` 放进 Docker build，导致镜像封装与应用编译耦合：失败信号混杂、缓存命中差、排障点不清晰，也让 `release-image` 的职责偏离“产出并发布镜像”。本 RFC 建议把“生成 Linux 可运行产物”前移到 CI 独立步骤，Dockerfile 仅负责校验基础 runtime、复制 runtime artifact、设置权限与入口；同时以 `build/docker-bake.json` 作为统一构建入口，并把当前复杂的 `Determine release gate` 收敛为简单可读的发布条件。

## 目标与非目标

### 目标

- 新建 `build/` 目录，承载 `build/Dockerfile` 与 `build/docker-bake.json`。
- Docker build 尽量只做 copy + runtime 封装，不再在 Dockerfile 内执行应用编译。
- 在 workflow 中先准备 **Linux/amd64 runtime artifact**，再通过 bake 执行 release-check、smoke、publish。
- 保持现有镜像契约：`ENTRYPOINT ["/tini", "--"]`、默认命令 `auth-mini start`、`USER node`、`sql/schema.sql` 可用。
- 保持真实容器 smoke test 继续通过。

### 非目标

- 不在本任务内引入多平台发布或新的发布渠道。
- 不重写应用启动契约，不改成 shell entrypoint 或自定义 launcher。
- 不把一次性 runtime artifact 提交到仓库。
- 不把 scope 扩展到 `src/**` 应用逻辑重构。

## 定义

- **runtime artifact**：可直接被 Linux 容器消费的最小运行时目录，至少包含 `dist/`、生产依赖 `node_modules/`、`package.json`、`package-lock.json`、`sql/`，并保证 native 依赖已针对目标 Linux 平台准备完成。
- **release-check**：只用于 CI 验证的本地镜像构建目标，不推送远端。
- **publish**：向 GHCR 推送版本 tag 与 `latest` 的 bake 目标。

## 推荐方案

### 1. `build/` 目录布局

建议引入如下布局：

- `build/Dockerfile`：仅负责 runtime 封装。
- `build/docker-bake.json`：定义 `release-check`、`release` 等目标。
- `scripts/prepare-linux-runtime-artifact.*`：在 CI 中生成 Linux runtime artifact。

关键原则：Docker 相关入口集中到 `build/`；artifact 准备逻辑留在 `scripts/**` 或 workflow step，避免再次塞回 Dockerfile。

### 2. runtime artifact 准备方式

推荐把“编译 + 生产依赖准备”放到 workflow 的独立步骤，并在 **与最终 runtime 同族的 Linux 容器环境** 中完成，而不是仅依赖“跑在 Linux runner 上”：

1. checkout 源码。
2. 通过固定版本 tag `node:24.14.1-trixie-slim`（或与 `build/Dockerfile` 保持同 Node major / distro / libc 的等价环境）执行 artifact 准备脚本。
3. 执行 `npm ci`。
4. 执行 `npm run build`。
5. 执行生产依赖收敛（如 `npm prune --omit=dev`，或等价的单独生产安装方案）。
6. 将运行时所需文件整理到单独目录：`build/runtime/linux-amd64/`。
7. 在 CI fresh 环境中直接把该目录作为 Docker build context 提供给 bake；本轮不额外引入 artifact manifest/verify 机制。

这里的关键约束是：`better-sqlite3` 等 native 依赖必须在与最终 runtime ABI 对齐的环境中产出，不能直接复用开发机或“任意 Linux runner”上的 `node_modules`。本 RFC 明确要求 artifact 生成环境与最终 runtime 至少对齐：

- Node major：与最终镜像一致
- distro/libc：与 `node:24.14.1-trixie-slim` 同族或等价
- platform：`linux/amd64`

若后续需要更强隔离，可把“准备 Linux artifact”封装为单独脚本，但职责仍应停留在 Docker build 之外。

### 3. `build/Dockerfile` 的职责边界

`build/Dockerfile` 应收敛为单阶段 runtime 封装，推荐职责如下：

- 基于现有 Node slim runtime 基础镜像。
- 下载并校验 `tini`，保留当前 checksum 校验策略。
- `COPY` 预先准备好的 runtime artifact 到 `/app`。
- 设置 `dist/index.js`、`sql/`、`/data`、符号链接 `/usr/local/bin/auth-mini` 的权限。
- 设置 `ENTRYPOINT ["/tini", "--"]`。
- 设置 `USER node`、`VOLUME ["/data"]`、默认 `CMD ["auth-mini", "start", "/data/auth.sqlite", "--port", "7777"]`。

Dockerfile 不再执行：

- `npm ci`
- `npm run build`
- `npm prune`
- 任何依赖源码树的应用编译逻辑

### 4. `build/docker-bake.json` 的目标设计

建议至少定义以下目标：

- `release-check`
  - 使用 `build/Dockerfile`
  - 指向 `build/runtime/linux-amd64/` 为 context
  - tags: `auth-mini:release-check`
  - 仅本地 load，用于 smoke test
- `release`
  - 与 `release-check` 共享 Dockerfile/context
  - 平台固定为 `linux/amd64`
  - tags 包含 `ghcr.io/<owner>/auth-mini:<version>` 与 `latest`
  - 用于正式 push

必要时可再加一个共享 target（例如 `_base`）承接公共参数，但应避免层层继承导致可读性下降。原则是：bake 负责目标编排，workflow 负责决定是否执行某个目标。

### 5. workflow 简化方式

`release-image.yml` 建议改为更线性的 3 段：

1. **判定是否发布**
   - push 到 `main` 时始终执行 artifact 准备 + release-check + smoke。
   - 仅在 `push main + package.json version bump` 时自动 publish。
   - `workflow_dispatch` 允许显式指定 `release_ref` 触发补发，但要求 ref 位于 `main` 可达历史上，且必须先通过同一套 `release-check + smoke`。
   - rerun 不再走复杂“自动恢复”分支判断；若需要补发，显式用 `workflow_dispatch`。

2. **准备并验证 runtime artifact**
   - 在 Linux runner 上执行 `npm ci` / `npm run build` / 生产依赖收敛。
   - 生成 runtime artifact。
   - 执行 `docker bake release-check --load`。
   - 执行 `bash docker/test-entrypoint.sh validation`。
   - 执行 `bash docker/test-entrypoint.sh supervision`。
   - 执行 `bash docker/test-image-smoke.sh`。

3. **发布**
   - 登录 GHCR。
   - 使用 `docker bake release --push` 发布。

这会把旧的 `Determine release gate` 从“高复杂恢复逻辑”降为“少量显式条件 + 人工触发兜底”。可读性优先于自动猜测恢复路径。

最小条件矩阵如下：

| 场景                                       | 是否执行 build/test | 是否 publish | 说明                               |
| ------------------------------------------ | ------------------- | ------------ | ---------------------------------- |
| `push` 到 `main` 且版本变化                | 是                  | 是           | 正常发布路径                       |
| `push` 到 `main` 但版本未变化              | 是                  | 否           | 继续验证镜像契约，但不覆盖版本 tag |
| `workflow_dispatch` 指定合法 `release_ref` | 是                  | 是           | 明确的人工补发路径                 |
| rerun 旧 run                               | 是                  | 否           | 只重跑验证，不隐式推断补发         |

## 为什么不继续在 Dockerfile 内 `npm ci`

1. **职责错位**：Docker build 应聚焦 runtime 封装；`npm ci` 与 TypeScript build 属于应用构建。
2. **失败语义混杂**：依赖安装失败、编译失败、native 模块失败、镜像封装失败目前都表现为“docker build 失败”，定位慢。
3. **缓存与变更面过大**：源码或 lockfile 的微小变化会使 Docker 层失效，发布链路成本高。
4. **测试复用差**：如果 artifact 已在 CI 准备完成，后续 entrypoint/smoke 与 publish 都应复用同一份产物，而不是在镜像构建中重复编译。
5. **不利于 native 依赖治理**：真正需要保证的是“产物与目标 Linux 兼容”，而不是“必须在 Dockerfile 里编译”。把 Linux artifact 准备前移后，仍能满足 `better-sqlite3` 兼容要求，同时把问题更早暴露在 CI 构建阶段。

## 替代方案

### 方案 A：继续沿用当前多阶段 Dockerfile，在 builder stage 执行 `npm ci`

不选原因：

- 与用户“copy-only packaging”目标相违背。
- `release-image` 仍然过重，难以把“构建失败”和“封装失败”分层。
- 无法把 `build/docker-bake.json` 真正作为统一入口，只是给旧模型套一层壳。

### 方案 B：在非 Linux 宿主机先打包 artifact，直接 copy 进 Linux 镜像

不选原因：

- `better-sqlite3` 等 native 依赖存在 ABI / 平台兼容风险。
- 产物来源不稳定，容易出现“本地可用、容器内不可用”的假阳性。
- 与当前任务明确约束冲突：不能假设宿主机产物可直接进入 Linux 镜像。

## 数据模型 / 接口

### runtime artifact 目录契约

建议约定 Docker build 只读取一个显式目录：`build/runtime/linux-amd64/`；其最小内容为：

- `dist/index.js`
- `dist/sdk/singleton-iife.js`
- `dist/commands/**`（若 CLI 运行依赖）
- `node_modules/**`（仅生产依赖）
- `package.json`
- `package-lock.json`
- `sql/schema.sql`

约束：

- 必须在 Linux 环境中生成。
- 必须来自与最终 runtime 同族的 Node + distro/libc 环境。
- 目录缺项时，进入 Docker build 前即失败。
- Dockerfile 不直接从源码目录推导这些文件，而只依赖 artifact 契约。
- 除上述白名单内容外，任何额外文件进入该目录都视为失败。

### bake 接口契约

- `docker buildx bake -f build/docker-bake.json release-check --load`
- `docker buildx bake -f build/docker-bake.json release --push`

兼容策略：

- 保留镜像内 `/app` 布局与默认命令，避免影响现有 smoke tests 与用户运行方式。
- 若测试脚本此前假定根目录 `Dockerfile`，需改为显式指向 `build/Dockerfile` 或 bake 目标，但镜像行为契约不变。

## 错误语义

- **artifact 准备失败**：视为可重试的 CI 构建失败；应在 Docker build 前终止。
- **native 依赖不兼容**：视为阻断失败；不得回退到“直接用宿主机产物”绕过。
- **bake release-check 失败**：视为镜像封装失败；应保留构建日志并停止发布。
- **smoke test 失败**：视为阻断失败；不得发布。
- **GHCR tag 已存在**：可视为幂等跳过，不算失败。
- **manual recovery ref 非法**：直接失败，并提示使用 main 上可达的版本提交。

## 安全考虑

- 仅复制经过显式整理的 runtime artifact，避免把源码、测试数据、`.legion`、本地缓存等误打入镜像。
- 对 artifact 内容做白名单校验，避免 `COPY . .` 带入多余文件。
- 保留 `tini` checksum 校验，防止下载的 init 二进制被污染。
- workflow 的发布条件应显式、可审计，避免复杂自动恢复逻辑误发布错误提交。
- artifact 准备目录应限制大小与内容，避免依赖膨胀造成构建资源耗尽。
- 发布前必须通过“最终镜像内 native 加载验证”，至少覆盖 `auth-mini init /data/auth.sqlite` 成功这一条阻断门禁。

## 向后兼容、发布与回滚

### 向后兼容

- 保持镜像入口、默认命令、运行用户、`/data` 卷与 SQL 资产路径不变。
- 保持现有 smoke 脚本验证真实容器启动链路。

### 发布/灰度

- 先在 `release-check` 中只构建本地镜像并跑完全部测试。
- 测试通过后再执行 `release` push。
- 首次合入后，建议观察至少一次真实 `main` 版本 bump 发布，确认 GHCR tag 与本地 smoke 一致。

### 回滚

- **触发条件**：出现以下任一情况即回滚：
  1. `release-check` 连续失败且定位到 artifact / bake 迁移本身；
  2. publish 后 smoke 失败；
  3. 真实镜像内 native 模块加载失败（至少 `auth-mini init` 失败）。
- **回滚动作**：执行 `git revert <本次迁移提交>`，恢复以下入口到上一已知良好版本：
  - `.github/workflows/release-image.yml`
  - 根目录 `Dockerfile`（若本次删除/迁移）
  - `docker/test-entrypoint.sh`
  - `docker/test-image-smoke.sh`
  - `build/**`（移除）
- **回滚验证**：重新执行：
  - `bash docker/test-entrypoint.sh validation`
  - `bash docker/test-entrypoint.sh supervision`
  - `bash docker/test-image-smoke.sh`
- **回滚结果要求**：恢复旧发布路径，不保留“半迁移”状态；随后再记录失败原因，避免反复震荡。

## 验证计划

关键行为与验证映射如下：

- `build/` 成为唯一 Docker 构建入口：检查 workflow 与测试脚本均使用 `build/docker-bake.json` 或 `build/Dockerfile`。
- Dockerfile 不再执行应用编译：静态检查 `build/Dockerfile` 中不存在 `npm ci`、`npm run build`、`npm prune`。
- Linux runtime artifact 完整：对 `build/runtime/linux-amd64/` 执行结构与白名单校验，确认仅包含 `dist/`、生产依赖、`sql/`、package 元数据。
- `tini` 契约保留：沿用现有 checksum 断言与容器内 `/tini --version` 检查。
- 入口与默认命令保留：继续使用 `docker/test-image-smoke.sh` 对 `ENTRYPOINT`/`CMD` 做 inspect 断言。
- `USER node` 保留：继续在 smoke test 中校验容器内非 root 身份。
- SQL 资产与 native 模块可用：真实镜像内执行 `auth-mini init /data/auth.sqlite`，并把它作为 blocking native load gate。
- 真实运行时功能正常：`docker/test-image-smoke.sh` 继续验证 `/jwks`、`/sdk/singleton-iife.js`、`/me` 401 行为。
- 监督/退出语义保留：`bash docker/test-entrypoint.sh validation` 与 `bash docker/test-entrypoint.sh supervision` 继续通过。
- 发布门禁简化且可读：对 push main version bump、普通 push、manual recovery 三类路径做 workflow 条件覆盖。

## 待定问题

- 生产依赖收敛是否继续沿用 `npm prune --omit=dev`，还是改为独立生产安装；只要发生在 Linux artifact 准备阶段即可。

## 落地计划

### 预计文件变更点

- `build/Dockerfile`：从根目录 Dockerfile 迁入并收敛为 copy-only runtime 封装。
- `build/docker-bake.json`：定义 `release-check` / `release` 目标。
- `.github/workflows/release-image.yml`：改为“gate -> prepare artifact -> bake verify -> publish”的线性流程，并删除复杂 `Determine release gate`。
- `docker/test-entrypoint.sh`：改为使用 `build/Dockerfile` 或 bake 入口构建测试镜像。
- `docker/test-image-smoke.sh`：同上，并保留镜像契约断言。
- `.dockerignore`：更新为适配新的 build context 与 artifact 目录白名单/黑名单。
- `scripts/**`：新增或调整 Linux runtime artifact 准备/校验脚本。
- `package.json` / `package-lock.json`：仅在实现需要新增脚本命令时调整；不改变运行时契约。

### 实施顺序

1. 先设计并实现 runtime artifact 准备脚本与目录契约。
2. 新增 `build/Dockerfile` 与 `build/docker-bake.json`。
3. 重构 smoke / entrypoint 测试入口。
4. 简化 `release-image.yml`。
5. 运行完整验证后再启用正式发布路径。

### 验证步骤

- 在 Linux 环境执行 runtime artifact 准备。
- 执行 `docker buildx bake -f build/docker-bake.json release-check --load`。
- 执行 `bash docker/test-entrypoint.sh validation`。
- 执行 `bash docker/test-entrypoint.sh supervision`。
- 执行 `bash docker/test-image-smoke.sh`。
- 使用一个版本 bump 场景验证 workflow 可进入 publish；使用非版本 bump 场景验证其不会误发布。
