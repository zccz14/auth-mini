# 默认信任代理 IP 头的请求来源解析设计

## 背景

- 当前请求入口只记录 `req.socket.remoteAddress`，当服务运行在反向代理、tunnel 或本地转发之后时，session 与日志中常见的来源地址会退化成 `::1` 等代理 socket 地址。
- 仓库已新增 session `ip` 字段与相关展示链路，但如果入口 IP 判定仍只看 socket，后续落库与返回都会持续传播错误来源地址。
- 用户已批准本轮方向：只要请求里存在常见代理 IP 头，就默认信任并使用它们，不再额外引入 trusted-proxy 配置门禁。
- 本轮需要同时修正文档中“默认不读取代理链头”的旧表述，避免 spec 之间对同一行为给出互相矛盾的约束。

## 目标

- 仅调整请求入口的 client IP 提取逻辑，使其在存在代理 IP 头时优先使用代理头值。
- 在 `src/app/commands/start.ts` 的现有请求处理路径旁增加一个小型 resolver，集中解析 client IP。
- 固定解析优先级：`CF-Connecting-IP` -> `X-Forwarded-For` 首个 IP -> `Forwarded` 的 `for=` -> `req.socket.remoteAddress`。
- 当请求不存在上述代理头，保持当前 fallback 行为不变。
- 更新测试与 spec 文案，使 session / logging 相关预期与新策略一致。

## 非目标

- 不新增运行时配置项、CLI 参数或环境变量来控制是否信任代理头。
- 不引入 trusted proxy CIDR / allowlist、代理 hop 数限制、私网过滤或更复杂的代理链安全模型。
- 不重做 session、auth、logging 或 request context 的整体架构。
- 不在本轮扩展到 geo 解析、主机名反查、IP 规范化存储或代理厂商特定的更多 header。

## 方案对比

### 方案 A：继续只使用 socket remote address

- 优点：实现最小，不改变当前安全假设。
- 缺点：在已知部署拓扑里持续记录 `::1`、`127.0.0.1` 或反向代理容器地址，无法满足“记录真实客户端来源”的目标。
- 结论：不能满足已批准需求，放弃。

### 方案 B：检测到常见代理头时默认信任，否则回退 socket

- 优点：改动集中在请求入口；与 Cloudflare、常见 reverse proxy、tunnel 默认行为兼容；无代理场景继续保持当前行为。
- 缺点：会接受客户端或中间层传入的伪造头值；当前仓库不再额外校验 trusted proxy 边界。
- 结论：与用户已批准方向一致，采用本方案。

### 方案 C：新增 trusted-proxy 配置后再读取代理头

- 优点：安全边界更明确，适合复杂生产拓扑。
- 缺点：增加配置面与文档复杂度；超出本轮“默认信任存在的代理头”的批准范围；也会阻塞当前问题修复。
- 结论：保留为未来可能演进方向，本轮不采用。

## 结论

- 采用方案 B，在请求入口统一解析 client IP。
- 解析顺序固定为：`CF-Connecting-IP`、`X-Forwarded-For` 首项、`Forwarded` 的首个 `for=` 值、`req.socket.remoteAddress`。
- 解析逻辑集中封装为 `src/app/commands/start.ts` 附近的小型 resolver，由现有 request-entry IP 写入路径复用。
- 没有代理头时保持原样，不改变现有本地直连行为。
- 2026-04-01 logging spec 中“默认不读取 `X-Forwarded-For`”的旧约束需要被本 spec 覆盖更新为新的默认策略。

## 详细设计

### 入口解析边界

- 仅修改请求进入应用时写入 request context / session 输入的 client IP 提取逻辑。
- 不改变请求其他上下文装配方式，不在业务模块中分散解析 header。
- 现有所有依赖 request-entry IP 的下游链路继续消费同一份解析结果，而不是各自重新读取 header。

### resolver 位置与职责

- 在 `src/app/commands/start.ts` 中、靠近当前 `req` 处理路径的位置新增一个小型 helper，例如 `resolveClientIp(req)`。
- helper 只负责：读取候选 header、按既定顺序选值、做最小必要的字符串拆解 / 去包裹处理、在无可用 header 时回退 socket。
- helper 不负责记录日志、不负责做 trusted-proxy 判定、不负责修改 header 原值。

### 头部解析规则

#### 1. `CF-Connecting-IP`

- 若 header 存在且非空，优先直接采用其值。
- 若该 header 因 Node header 合并语义表现为数组或逗号拼接字符串，实现应取第一个非空值。

#### 2. `X-Forwarded-For`

- 当 `CF-Connecting-IP` 不可用时，读取 `X-Forwarded-For`。
- 按逗号分隔后取首个非空片段，去掉首尾空白后作为 client IP。
- 不在本轮解析第二跳及之后的代理链，也不做 hop 可信性判断。

#### 3. `Forwarded`

- 当 `CF-Connecting-IP` 与 `X-Forwarded-For` 都不可用时，读取标准 `Forwarded` header。
- 仅解析第一个可识别的 `for=` 参数值。
- 需要支持以下最小兼容处理：
  - 忽略参数名大小写差异。
  - 去掉值外围可选双引号。
  - 若值是 IPv6 方括号形式，如 `for="[2001:db8::1]:1234"`，返回去掉端口后的地址部分。
  - 若值是 `host:port` 形式，去掉端口，仅保留 host / IP 主体。
- 若 `for=` 缺失、为空、为 `unknown` 或无法稳定拆解，则视为不可用并继续 fallback。

#### 4. socket fallback

- 当前三类代理头都不存在或都不可用时，继续返回 `req.socket.remoteAddress ?? null`。
- 这保证本地直连、测试环境与无代理部署不发生行为倒退。

### 标准化约束

- 仅做最小必要的 trim、去引号、去方括号 / 端口处理，避免把明显带格式包裹的合法 header 原样落库。
- 不在本轮做 IP 格式合法性深校验；只要能按规则稳定提取出非空字符串，就可作为结果使用。
- 结果仍允许为 `null`，以兼容 socket 与 header 都不可用的极端场景。

### 对 session / logging 语义的影响

- session 创建时写入的 `ip` 应继承新的 request-entry 解析结果，因此在代理部署下优先记录真实客户端来源，而不是本地 loopback。
- HTTP request logging 中的 `ip` 字段也应与同一入口解析结果一致，避免日志与 session 看到不同来源地址。
- 本轮不新增额外日志字段来记录“命中的 header 来源”；只修正现有 `ip` 字段含义。

### 文档一致性要求

- `docs/superpowers/specs/2026-04-01-logging-design.md` 中“默认只信任 socket，不默认读取 `X-Forwarded-For`”的内容需要更新或在实现 spec 中明确被本 spec 替代。
- 后续任何引用 request IP 来源的 spec / 文档，都应以本次解析顺序为准，避免再声明“本轮不改变代理链解析策略”。
- `2026-04-13-me-active-sessions-fields-design.md` 中与代理链策略无变更相关的表述，需要同步修正为“session `ip` 复用新的默认代理头解析策略”。

## 影响范围

### 代码

- `src/app/commands/start.ts`
  - 新增并接入 request-entry IP resolver。
  - 保持其余请求装配逻辑不扩散重构。

### 测试

- `tests/unit/start-command.test.ts`
  - 新增或改写代理头优先级与 fallback 相关测试。
- `tests/integration/http-logging.test.ts`
  - 验证 request log 中的 `ip` 会优先采用代理头。
- `tests/integration/email-auth.test.ts`、`tests/integration/ed25519.test.ts`、`tests/integration/sessions.test.ts`
  - 根据当前 session IP 断言位置，改为验证代理头优先后的落库 / 返回结果。

### 文档

- `docs/superpowers/specs/2026-04-01-logging-design.md`
  - 移除“默认不读取 `X-Forwarded-For`”的旧约束。
- `docs/superpowers/specs/2026-04-13-me-active-sessions-fields-design.md`
  - 改写“本轮不额外重新定义代理链解析策略”的旧表述，使其指向本次默认信任策略。

## 测试策略

实现阶段至少覆盖以下验收测试：

1. 当请求带有 `CF-Connecting-IP` 时，无论 `X-Forwarded-For` 或 socket 值为何，都优先采用 `CF-Connecting-IP`。
2. 当没有 `CF-Connecting-IP`、但存在 `X-Forwarded-For` 时，采用首个 IP，而不是整串 header 或后续 hop。
3. 当仅存在 `Forwarded` header 时，可正确提取首个 `for=` 值，并处理引号、方括号 IPv6 与端口。
4. 当 `Forwarded` 为 `unknown`、空值或无法解析时，会继续回退到 socket 值。
5. 当没有任何代理头时，行为与当前实现一致，继续使用 `req.socket.remoteAddress`。
6. 代理头解析结果会贯通到 session IP 写入与 `/me.active_sessions[]` 返回值。
7. HTTP request logging 中的 `ip` 字段与 session / request context 使用同一解析结果。

## 风险与约束

- 风险：默认信任代理头意味着恶意直连请求可伪造来源 IP。
  - 约束：这是用户已批准的显式取舍；本轮不额外引入 trusted-proxy 防护，但需在 spec 中明确记录。
- 风险：`Forwarded` 格式解析过度扩展，导致实现复杂化或边界不清。
  - 约束：只支持首个 `for=` 的最小必要解析，不实现完整 RFC 语法树。
- 风险：session、logging、测试只更新其中一部分，导致不同链路看到不同 IP。
  - 约束：所有 request-entry IP 消费方必须共用同一 resolver，并补齐跨层测试。
- 风险：文档仍保留“默认不信任代理头”的旧描述，后续实现依据发生漂移。
  - 约束：本轮必须同步修正文档冲突点，尤其是 logging spec 与 active sessions spec。

## 验收

- 请求入口存在单一的 client IP resolver，且由 `src/app/commands/start.ts` 的现有 req 处理路径接入。
- 解析优先级固定为 `CF-Connecting-IP` -> `X-Forwarded-For` 首个 IP -> `Forwarded for=` -> `req.socket.remoteAddress`。
- 无代理头场景继续保持原有 socket fallback 行为。
- session 创建与返回的 `ip` 在代理部署场景下优先反映代理头中的客户端地址，而不是 loopback socket。
- HTTP request logging 的 `ip` 与同一次请求写入 session / context 的 `ip` 一致。
- 旧 spec 中与“默认不读取代理头”或“本轮不改变代理链策略”相冲突的文案已被更新到与本 spec 一致。
