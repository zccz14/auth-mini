# Docker runtime slim + entrypoint 评估 RFC

## 摘要

- 本轮实现固定采用 `node:24.14.1-trixie-slim` 作为 builder/runtime 基础镜像。
- runtime stage 去掉 `apt-get update` / `apt-get install`，把 `cloudflared` 下载与校验前移到非 runtime 阶段。
- 本轮**不移除** `docker/entrypoint.sh`；仅输出“为什么现在不能移除”及未来移除前置条件。
- 验证除现有 entrypoint/smoke tests 外，新增“最终镜像内真实 `cloudflared --version` 可执行”断言。

## 背景 / 问题

当前 `Dockerfile` 的 builder/runtime 都使用浮动 tag `node:20-slim`，runtime 还依赖 `apt-get update && apt-get install curl ca-certificates` 后再下载 `cloudflared`。这带来三个问题：

1. **基础镜像不可复现**：浮动 tag 会让同一 Dockerfile 在不同时间拿到不同底座。
2. **runtime 面过宽**：运行阶段引入包管理器与索引更新，增加构建时间、供应链面与失败点。
3. **entrypoint 去留不清晰**：`docker/entrypoint.sh` 目前承载参数校验、初始化、readiness、双进程监督与退出码传递，不能在未拆清职责前直接删除。

本 RFC 的目标是为本轮 Docker/runtime 收敛出一个**简洁、可执行、可验证**的实现方案，并给出 entrypoint 是否可移除的判定标准；本轮不强制移除 entrypoint。

## 目标与非目标

### 目标

- 将 builder/runtime 基础镜像锁定到 `node:24.14.1` 的 Debian slim 具体 tag。
- 让 runtime stage 不再执行 `apt-get update` / `apt-get install`。
- 保持当前容器契约：镜像内继续提供 `auth-mini`、`cloudflared`、`/data` volume，以及现有启动/退出语义。
- 明确 `docker/entrypoint.sh` 的职责边界，给出去留评估标准和后续前置条件。
- 让关键行为都能映射到现有或补充后的 Docker 验证脚本。

### 非目标

- 不修改 `src/` 业务代码。
- 不在本轮改变“单容器内同时运行 `auth-mini + cloudflared`”这一运行模型。
- 不在本轮强制移除 `docker/entrypoint.sh`。
- 不引入额外 sidecar、supervisor、s6、init system 或多容器编排改造。

## 定义

- **builder stage**：负责 `npm ci`、构建 `dist/`、准备运行产物的阶段。
- **runtime stage**：最终对外发布的镜像阶段。
- **entrypoint**：当前 `docker/entrypoint.sh`，负责容器启动前校验和进程编排。
- **去 apt**：runtime stage 不再使用 Debian 包管理器安装工具；若需要下载/校验工具，转移到 builder 或通过多阶段复制完成。

## 现状分析

### 现有镜像与下载路径

- `Dockerfile:1`、`Dockerfile:19` 当前 builder/runtime 都是 `node:20-slim`。
- `Dockerfile:26-33` 在 runtime 内安装 `curl ca-certificates`，随后下载并校验 `cloudflared`。
- 这意味着最终镜像构建依赖 Debian 软件源可用性与 `apt` 索引状态，而不是只依赖 Node 官方镜像与 cloudflared 二进制下载。

### 当前 entrypoint 的实际职责

`docker/entrypoint.sh` 当前不是“薄壳”，而是运行时契约的主要承载体：

- `entrypoint.sh:56-65`：校验 `TUNNEL_TOKEN` / `AUTH_ISSUER`。
- `entrypoint.sh:67-71`：首次运行时初始化 `/data/auth.sqlite`。
- `entrypoint.sh:73-94`：启动 `auth-mini` 并轮询 `/jwks` readiness。
- `entrypoint.sh:96-98`：在 readiness 成功后再启动 `cloudflared`。
- `entrypoint.sh:100-113`：监督两个子进程，保证谁先退出，容器就按既定语义停止并尽量保留首个关键退出码。
- `entrypoint.sh:50-54`：响应 TERM/INT/HUP，确保容器停止时两个子进程一起退出。

### 现有测试覆盖的契约

- `docker/test-entrypoint.sh` 已覆盖参数校验、首次 init、已有数据跳过 init、readiness 重试/超时、子进程提前退出、TERM 联动清理。
- `docker/test-image-smoke.sh` 已覆盖真实镜像构建后的相同主路径。
- 因此本轮最稳妥路径应是：**只改变基础镜像与 cloudflared 获取方式，不主动改变 entrypoint 行为面**。

## 方案

### 1. 基础镜像选择

采用 `node:24.14.1-trixie-slim` 这种**带 Node 补丁版本 + Debian slim 变体**的明确 tag。

本轮固定目标为：

- builder：`node:24.14.1-trixie-slim`
- runtime：`node:24.14.1-trixie-slim`

选择同一底座的原因：降低 ABI / TLS / CA 差异导致的复制运行时不一致风险，减少跨阶段排障成本。

架构边界：本轮继续沿用当前镜像契约中的 `linux/amd64` 假设；`cloudflared-linux-amd64` 下载路径和现有 smoke test 都依赖该前提。

### 2. runtime 去 apt 的实现

推荐方案：**将 cloudflared 的下载与校验移动到独立前置阶段或 builder 阶段，再把已校验的二进制复制到 runtime**。

建议结构：

1. 在 builder 之前或之间增加 `cloudflared-fetch` 阶段；
2. 该阶段使用带下载能力的基础镜像拉取 `cloudflared-linux-amd64`；
3. 在该阶段完成 SHA256 校验与 `chmod 0755`；
4. runtime 仅 `COPY --from=cloudflared-fetch /usr/local/bin/cloudflared /usr/local/bin/cloudflared`；
5. runtime 保留 `cloudflared --version` 级别的轻量自检，但不执行 `apt-get`。

约束与假设：

- 如果选用的 Node slim 镜像本身已经具备满足下载需求的工具，可直接在非 runtime 阶段复用；否则增加一个专用下载阶段即可。
- runtime 最终不应再依赖 Debian 包管理器，也不应保留仅为下载 cloudflared 引入的构建工具。

### 3. entrypoint 去留评估标准

本轮结论：**默认保留 entrypoint；只有在以下职责都有明确替代时，才可进入下一轮“移除 entrypoint”设计。**

#### 当前轮判定表

| 职责           | 当前承载点                                                 | 是否已有替代 | 主要缺口                                              | 本轮结论 |
| -------------- | ---------------------------------------------------------- | ------------ | ----------------------------------------------------- | -------- |
| 参数校验       | `docker/entrypoint.sh:56-65`                               | 否           | Docker `ENV` / `CMD` 无法提供同等错误提示与格式约束   | 不可移除 |
| 首次初始化     | `docker/entrypoint.sh:67-71`                               | 否           | 需要保留空卷首次 `auth-mini init` 与已有库跳过逻辑    | 不可移除 |
| readiness 门控 | `docker/entrypoint.sh:73-94`                               | 否           | 需保证 `/jwks` 200 后才启动 `cloudflared`             | 不可移除 |
| 双进程监督     | `docker/entrypoint.sh:100-113`                             | 否           | 需保留首个关键退出码与 sibling cleanup 语义           | 不可移除 |
| 信号处理       | `docker/entrypoint.sh:50-54`                               | 否           | 需在容器 TERM 时同时清理 `auth-mini` 与 `cloudflared` | 不可移除 |
| 测试映射       | `docker/test-entrypoint.sh` / `docker/test-image-smoke.sh` | 否           | 现有测试都围绕 entrypoint 契约构建                    | 不可移除 |

**正式结论**：本轮 `docker/entrypoint.sh` **不可移除**。原因不是“习惯保留”，而是上表 6 项职责当前都没有等价替代实现；若强行删除，会直接回退容器契约与测试覆盖。

必须同时满足的移除条件：

1. **参数校验有替代**：`TUNNEL_TOKEN` / `AUTH_ISSUER` 的错误提示不能退化为晦涩的下游报错。
2. **首次初始化有替代**：`auth-mini init` 与已有 `/data/auth.sqlite` 的跳过逻辑必须保留。
3. **readiness 门控有替代**：必须继续保证 `auth-mini` ready 后才启动 `cloudflared`，否则会改变外部可观测行为。
4. **双进程监督有替代**：谁先退出、容器如何退出、退出码如何保留，必须继续可预测。
5. **信号处理有替代**：容器收到 TERM 时，两个子进程都能被可靠清理。
6. **测试可迁移**：`docker/test-entrypoint.sh` 与 `docker/test-image-smoke.sh` 对应行为要么保持通过，要么等价重写。

只要其中任一条件不满足，就不应在本轮移除 entrypoint。

## 备选方案

### 备选 1：继续在 runtime 里 `apt-get install curl ca-certificates`

不选原因：与“runtime 去 apt”目标冲突；同时保留了额外供应链面、构建抖动与外部软件源依赖。

### 备选 2：直接删除 entrypoint，改为 Docker `CMD` 串联命令

不选原因：当前 entrypoint 承担 readiness 门控、双进程监督、信号处理和退出码保留；直接下沉成 shell one-liner 会显著削弱可维护性与可测试性。

### 备选 3：改用外部 supervisor（如 s6/tini + 自定义脚本）

不选原因：超出本轮 scope，会引入新的运行时依赖与学习/维护成本；当前问题核心是瘦身 runtime，而不是重做进程模型。

## 数据模型 / 接口

### 构建期接口

- `ARG CLOUDFLARED_VERSION`：继续显式声明 cloudflared 版本。
- `ARG CLOUDFLARED_SHA256`：继续显式声明对应校验值。
- Dockerfile 新增的下载阶段只能输出一个经过校验的 `cloudflared` 可执行文件到 runtime。

兼容策略：保持现有 ARG 名称不变，避免调用方或 CI 脚本失配。

### 运行期接口

保留现有环境变量契约：

- `TUNNEL_TOKEN`：必填。
- `AUTH_ISSUER`：必填，且必须为纯 `https` origin。
- `AUTH_INSTANCE`：可选，默认 `/data/auth.sqlite`。

保留现有容器接口：

- `/data` volume 继续存在；
- `auth-mini` 继续位于 PATH；
- `ENTRYPOINT` 暂保持 `/app/docker/entrypoint.sh`。

## 错误语义

- **配置错误**（缺 `TUNNEL_TOKEN`、`AUTH_ISSUER` 非法）：快速失败，退出码延续当前 shell fail-fast 语义，不重试。
- **readiness 暂未成功**：按既定次数重试；超过阈值后失败退出，并停止已启动的 `auth-mini`。
- **`auth-mini` 提前退出**：容器应透传其退出码，不继续拉起 `cloudflared`。
- **`cloudflared` 提前退出**：容器应停止 `auth-mini`，并保留 `cloudflared` 的首个关键退出码。
- **镜像构建期下载失败 / 校验失败**：构建直接失败，不进入 runtime。

可恢复性约定：

- 构建期失败通过重新构建恢复；
- 运行期配置错误依赖修正 env 后重启容器；
- 本轮不引入自动重试或自愈机制，避免掩盖配置/发布问题。

## 安全性考虑

- **输入校验**：继续严格校验 `AUTH_ISSUER` 必须是纯 `https` origin，避免将 path/query/hash 注入启动参数。
- **权限与秘密**：`TUNNEL_TOKEN` 仍只通过环境变量传入，不落盘到文档或镜像层。
- **供应链**：cloudflared 必须继续做 SHA256 校验；去 apt 后减少一个外部软件源面。
- **资源耗尽**：runtime 去掉包管理器与下载工具后，可减少镜像层大小与构建时临时缓存面。
- **滥用面**：不新增 shell 拼接执行，不把用户输入直接拼接成任意命令。

## 向后兼容 / 发布 / 回滚

### 向后兼容

- 保持 `ENTRYPOINT`、环境变量、`/data` volume、`auth-mini` PATH、cloudflared 启动时机不变。
- 若仅调整基础镜像 tag 与 cloudflared 获取阶段，调用者无需更改启动命令。

### 发布策略

1. 先更新 Dockerfile 与测试脚本中的基础镜像基线/提示文案；
2. 本地跑 entrypoint 验证与 image smoke；
3. CI 通过后再进入镜像发布链路。

### 回滚策略

若出现兼容性或构建稳定性问题，可按以下最小步骤回滚：

1. 回退 Dockerfile 到旧的 Node tag 与 runtime 下载方式；
2. 保持 `docker/entrypoint.sh` 不动；
3. 重新执行 `docker/test-entrypoint.sh` 与 `docker/test-image-smoke.sh` 验证恢复。

因为本轮不涉及数据迁移，回滚只需恢复镜像构建逻辑。

## 验证计划

关键行为与验证映射如下：

1. **基础镜像已锁定具体 tag**
   - 检查 `Dockerfile` 不再使用 `node:20-slim` 或其它 floating tag。
2. **runtime 不再执行 apt**
   - 检查 `Dockerfile` runtime stage 不包含 `apt-get update/install`。
3. **cloudflared 仍被正确复制并可执行**
   - 构建阶段保留 `cloudflared --version` 自检。
   - 额外执行 `docker run --rm --entrypoint /usr/local/bin/cloudflared auth-mini:test --version`，验证最终镜像内真实二进制可执行。
4. **entrypoint 现有契约未回退**
   - `bash docker/test-entrypoint.sh validation`
   - `bash docker/test-entrypoint.sh supervision`
5. **真实镜像在 fresh/existing data 情况下行为不变**
   - `bash docker/test-image-smoke.sh`
6. **entrypoint 去留结论可审阅**
   - 在交付文档或 PR 描述中记录“本轮保留 / 可移除前置条件”。

验收标准：以上验证全部通过，且没有为了去 apt 而删减现有运行时语义。

## 开放问题

1. cloudflared 下载阶段应复用 Node 镜像还是单独引入更小的下载镜像；本 RFC 倾向“以实现复杂度更低、runtime 零 apt 为优先”。

## 落地计划

### 文件变更点

- `Dockerfile`
  - 锁定 builder/runtime 到 `node:24.14.1-<具体 slim 变体>`。
  - 去掉 runtime stage 的 `apt-get` 安装。
  - 将 cloudflared 下载/校验移动到非 runtime 阶段，并从该阶段复制到 runtime。
- `docker/entrypoint.sh`
  - 本轮默认不改行为；仅在实现需要时做最小注释或兼容性调整。
- `docker/test-entrypoint.sh`
  - 如有必要，同步更新基础镜像常量或断言提示，保持契约测试仍对齐。
- `docker/test-image-smoke.sh`
  - 如有必要，同步更新构建提示文案或检查点，确认镜像 smoke 仍覆盖 cloudflared 与 entrypoint 路径。
- `.legion/tasks/docker-runtime-slim-entrypoint/docs/rfc.md`
  - 记录设计、判定标准、验证映射与回滚策略。

### 实施顺序

1. 确认 `node:24.14.1` 的官方 Debian slim 具体 tag。
2. 改造 Dockerfile：新增 cloudflared 下载阶段或将下载前移。
3. 保持 entrypoint 逻辑不变，先让现有测试通过。
4. 如测试脚本内有硬编码基线/提示，同步更新。
5. 形成 entrypoint 去留结论并写入交付文档。

### 验证步骤

- `bash docker/test-entrypoint.sh validation`
- `bash docker/test-entrypoint.sh supervision`
- `bash docker/test-image-smoke.sh`

若任一步失败，优先判断是：

1. 新基础镜像差异；
2. cloudflared 复制路径/权限问题；
3. runtime 去 apt 后缺失了此前被隐式依赖的工具。
