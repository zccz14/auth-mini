# JWKS 双槽位轮换设计

## 背景

- 当前 `jwks_keys` 通过 `is_active` 表达“当前签发 key”，并用唯一索引限制同一时间只能有一条 active key。
- 现有实现会在轮换后立即让新 key 参与签发，这意味着下游 verifier 若尚未刷新 JWKS 缓存，可能收到带新 `kid` 的 token，出现短暂验签失败。
- 用户要求继续支持“下一把 key 先对外发布，再在后续轮换中启用”的无中断思路，但同时进一步简化数据模型：数据库中不保留 JWKS 历史，不增加额外排序字段，只保留两条固定槽位记录。

## 目标

- `/jwks` 始终返回 2 条 public JWK。
- JWT 签发始终使用固定槽位 `CURRENT`。
- 预发布的下一把 key 始终放在固定槽位 `STANDBY`，供下游提前拉取。
- `rotate jwks` 保持单命令运维体验：把 `STANDBY` 提升为新的 `CURRENT`，再生成新的 `STANDBY`。
- 清理 `is_active` 语义，不保留历史 JWKS 记录或审计用途数据。

## 非目标

- 不保留历史 key 记录作为审计用途。
- 不保证轮换后旧 `CURRENT` 所签发且尚未过期的 token 仍可继续通过本地验签。
- 不引入第三条槽位、保留窗口或额外 CLI 命令。
- 不改变 JWT header / payload 格式、签名算法或 `/jwks` 响应结构。
- 不为旧 schema 提供在线迁移；运行时应对不符合新 schema 的数据库 fail-fast。

## 决策

采用固定双槽位模型。

- `jwks_keys` 表中永远只有 2 条业务记录。
- 两条记录的 `id` 固定为：
  - `CURRENT`
  - `STANDBY`
- `/jwks` 永远返回这两条记录对应的 public JWK。
- JWT 签发永远使用 `CURRENT`。
- `rotate jwks` 的行为固定为：
  1. 用当前 `STANDBY` 的 key material 覆盖 `CURRENT`
  2. 为 `STANDBY` 生成一把全新的 key material
- `init` / bootstrap 时直接确保存在这两条固定记录。

这样 `STANDBY` 始终代表“下一把已经发布、但尚未启用签发的 key”。

## 数据模型

### `jwks_keys` 表

- 删除列：`is_active`
- 删除索引：`jwks_keys_one_active_idx`
- 保留列：`id`、`kid`、`alg`、`public_jwk`、`private_jwk`
- `id` 不再是随机 UUID，而是固定枚举值：`CURRENT` / `STANDBY`

说明：

- 本轮不再依赖 `created_at`、`rowid` 或新增 `sequence` 来表达新旧顺序。
- 新旧关系完全由槽位语义表达，而不是由时间排序表达。
- `kid` 仍保持每把 key material 的唯一标识，用于 JWT header 和 `/jwks` 对外暴露。

## 运行时语义

### 初始化

- `init` 与运行时 `bootstrapKeys` 都必须确保 `jwks_keys` 中存在 `CURRENT` 与 `STANDBY` 两条槽位记录。
- 当数据库为空时：
  - 生成一把 key 写入 `CURRENT`
  - 再生成一把不同的 key 写入 `STANDBY`
- 当数据库缺少 `CURRENT` 或 `STANDBY` 其中之一，但整体 schema 仍符合新双槽位模型时，bootstrap 负责补齐缺失槽位。
- 当数据库出现多余记录、错误槽位 id、缺字段，或仍依赖旧 `is_active` schema 时，视为不符合契约，应明确失败，而不是尝试部分修复。

### `/jwks`

- 固定返回 `CURRENT` 与 `STANDBY` 两条记录的 public JWK。
- 返回顺序固定为：
  - `CURRENT`
  - `STANDBY`
- 响应中不再包含任何历史 key。

### JWT 签发

- 始终使用 `CURRENT` 对应的 private JWK 签发 JWT。
- 不存在“次新 key 签发”或“按时间排序选择签发 key”的逻辑。

### JWT 验签

- 继续根据 token header 中的 `kid` 查库。
- 但由于库中只保留 `CURRENT` 和 `STANDBY` 两把 key，旧 `CURRENT` 在轮换后会立刻丢失。
- 用户已明确接受这一行为变化：轮换后，使用旧 `CURRENT` 签发但尚未过期的 token 可能立即无法再通过本地验签。

### 轮换命令

- `rotate jwks` 每次执行固定两步：
  1. 先在内存中读取并保存当前 `STANDBY` 的整套 key material，同时生成一把新的 standby key material
  2. 在单个事务内先把新的 key material 写入 `STANDBY`，再把保存下来的旧 `STANDBY` key material 写入 `CURRENT`
- 该过程必须在单个事务中完成，避免 `/jwks` 或签发路径读到中间状态。

说明：

- 之所以必须先更新 `STANDBY`、再更新 `CURRENT`，是因为 `kid` 仍保持唯一约束。
- 如果先把旧 `STANDBY.kid` 写入 `CURRENT`，会在 SQLite 的语句级 `UNIQUE` 检查下与现有 `STANDBY.kid` 冲突。
- 先把 `STANDBY` 切到全新 `kid` 后，再把旧 standby material 提升到 `CURRENT`，可以保持唯一约束始终成立。

## 运维语义

### 日常轮换

- 执行一次 `rotate jwks`。
- 原 `STANDBY` 晋升为新的 `CURRENT`，开始参与签发。
- 同时生成一把新的 `STANDBY`，继续作为“下一把预发布 key”。

这样每一把真正开始签发的 key，在成为 `CURRENT` 前，都已经以 `STANDBY` 身份提前暴露在 `/jwks` 中。

### 紧急轮换

- 连续执行两次 `rotate jwks`。
- 第一次轮换让当前 `STANDBY` 晋升为 `CURRENT`。
- 第二次轮换再次前推一格，等于快速丢弃上一轮刚启用的 `CURRENT`，并继续生成新的 `STANDBY`。

## 代码影响范围

### Schema / bootstrap

- `sql/schema.sql`
  - 移除 `jwks_keys.is_active`
  - 移除 `jwks_keys_one_active_idx`
  - 将 `jwks_keys.id` 的业务语义改为固定槽位主键：`CURRENT` / `STANDBY`
- `src/infra/db/bootstrap.ts`
  - 将新的 `jwks_keys` 槽位约束纳入运行时必需 schema 断言
  - 当检测到 `CURRENT` 或 `STANDBY` 缺失时，在新 schema 下补齐缺失槽位
  - 当检测到旧库仍依赖 `is_active` 语义、存在多余记录或错误槽位 id 时，像现有 breaking schema 场景一样 fail-fast，并给出“rebuild or migrate”级别的错误

### Repo 层

- `src/modules/jwks/repo.ts`
  - 删除 `getActiveKey` / `insertActiveKey` 语义
  - 改为显式槽位查询与更新，例如：
    - 读取 `CURRENT`
    - 读取 `STANDBY`
    - 同时读取两条已发布 key
    - 事务性执行 rotate：`STANDBY -> CURRENT`，再生成新 `STANDBY`

### Service 层

- `src/modules/jwks/service.ts`
  - `bootstrapKeys` 改为确保固定双槽位存在
  - `rotateKeys` 改为双槽位事务切换
  - `listPublicKeys` 改为返回 `CURRENT` + `STANDBY`
  - `signJwt` 改为始终使用 `CURRENT`
  - `verifyJwt` 保持按 `kid` 查找，但接受仅能验证当前两把 key 的新行为

### CLI / docs

- `rotate jwks` 命令入口无需新增参数，但 README / CLI 行为测试需要更新轮换语义描述。
- README 需要明确说明：
  - `/jwks` 始终发布 `CURRENT` 与 `STANDBY`
  - `rotate jwks` 会把 `STANDBY` 提升为 `CURRENT`
  - 然后再生成新的 `STANDBY`
  - 轮换后旧 `CURRENT` 不再保留

## 测试策略

严格采用先测后改。

### 必测行为

- 初始化后数据库中只有两条 JWKS 记录，且 `id` 分别为 `CURRENT` 与 `STANDBY`。
- 初始化后 `/jwks` 返回两条 key，且对应 `CURRENT` 与 `STANDBY`。
- 初始化后新签发 token 的 `kid` 来自 `CURRENT`。
- 单次轮换后：
  - 轮换前的 `STANDBY.kid` 变成新的 `CURRENT.kid`
  - 新的 `STANDBY.kid` 为全新生成值
  - `/jwks` 仍然只返回两条 key
  - 新签发 token 改为使用新的 `CURRENT.kid`
- 轮换后，上一轮旧 `CURRENT.kid` 已无法再通过本地 `verifyJwt` 验签。
- 轮换测试需要覆盖 `kid` 唯一约束始终成立，证明“先更新 `STANDBY`、再更新 `CURRENT`”的事务顺序可执行。
- 旧 schema 数据库若仍依赖 `is_active` 或不满足固定双槽位契约，bootstrap/init 会明确失败，而不是静默兼容。

### 需要删除或改写的旧断言

- 删除所有“最多一个 active key”的 schema / CLI / 集成测试断言。
- 删除所有历史 key 保留、按时间排序、最近两条窗口推进的测试断言。
- 将 CLI 断言改为固定双槽位切换语义。

### 验证命令

- 先运行受影响的 JWKS/CLI 测试并确认至少一项因旧语义失败。
- 实现后运行以下验收命令：
  - `npx vitest run tests/integration/jwks.test.ts`
  - `npx vitest run tests/integration/cli-create.test.ts`
  - `npx vitest run tests/integration/oclif-cli.test.ts`
  - `npm test`
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`

## 风险与控制

- 风险：repo/service 仍混用旧的 active 语义与新的槽位语义，导致 `CURRENT` / `STANDBY` 状态漂移。
  - 控制：统一移除 `is_active` 相关路径，所有 JWKS 读写都改为按固定 `id` 操作。
- 风险：rotate 不是事务性的，导致读到“CURRENT 已被覆盖但 STANDBY 尚未刷新”的中间状态。
  - 控制：将晋升 `STANDBY` 和生成新 `STANDBY` 放入单事务执行。
- 风险：调用方误以为旧 token 仍能在轮换后继续通过本地验签。
  - 控制：文档与测试明确锁定此行为变化，并在 spec 中将其标记为用户已接受的非目标。
- 风险：数据库中出现多余记录或缺槽位时，运行时尝试“自动修补”导致状态不可预测。
  - 控制：对不符合双槽位契约的数据库一律 fail-fast，要求 rebuild or migrate。
