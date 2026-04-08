# auth-mini SDK 多标签页 Session 协调设计

## 背景

- 当前浏览器 SDK 会把 session 持久化到 `localStorage`，但 refresh 只在单个 SDK 实例内通过 in-flight promise 去重。
- 当多个 tab 共享同一份浏览器存储并同时触发 `/session/refresh` 时，它们会携带同一个旧 refresh token 并发请求；winner 会轮换到新 token，loser 则可能把当前 tab 直接清成 `anonymous`。
- README 已把这个行为定义为已知 SDK bug，而不是产品合同，因此本轮目标不是为现状辩护，而是把多标签页 session 协调补成正式能力。

## 目标

- 让多个 tab 共享同一浏览器 session 时，可以稳定完成 login、refresh、logout 的跨 tab 收敛。
- 让 `/session/refresh` 能明确区分“整条 session 已失效”和“当前 tab 只是拿着非当前 refresh token 落后于最新 session”。
- 保持 refresh token 的单次轮换语义，不引入 refresh 幂等窗口。
- 保持服务端 session 持久化结构紧凑，只保留当前最新 refresh token，不因 refresh 历史膨胀 `sessions` 表。
- 以最小机制完成浏览器端同步：继续使用 `localStorage` 与 `storage` event，不引入 `BroadcastChannel` 或更重的协调层。

## 非目标

- 不引入 refresh lock 或浏览器端租约锁。
- 不把 refresh 设计成幂等接口，不允许“已过期 refresh token 在短窗口内仍可重放成功”。
- 不保留 refresh token 历史链作为持久化审计表。
- 不承诺所有 tab 的瞬时强一致；本轮只承诺最终一致收敛。
- 不借机重写 SDK 整体状态管理架构。

## 方案对比

### 方案 1：客户端锁 + 现有 refresh 语义

- 浏览器端通过 `localStorage` 短租约锁串行化 refresh。
- 其他 tab 不发 refresh，只等待 winner 回写结果。

优点：服务端改动小，时序容易理解。

缺点：问题被推到浏览器锁实现上，仍缺少服务端级错误语义；这更像补丁，而不是多 tab session 的正式合同。

### 方案 2：推荐，`session_id + refresh_token` + 服务端错误分流 + 跨 tab 同步

- `/session/refresh` 同时提交 `session_id` 与 `refresh_token`。
- 服务端按 `session_id` 查当前 session，并根据“session 是否仍存活、token 是否命中当前值”区分 `session_invalidated` 与 `session_superseded`。
- SDK 继续把共享 session 放在 `localStorage`，并通过 `storage` event 把 login / refresh / logout 的结果同步到其他 tab。

优点：错误语义清晰，不污染 refresh token 的一次性语义，不需要浏览器锁，且 `sessions` 表只需保留当前最新 token。

缺点：需要同时升级服务端 refresh 协议与 SDK 的跨 tab 状态同步，并引入最小单调字段裁决新旧快照。

### 方案 3：方案 2 再加完整版本协议

- 在方案 2 基础上，为 session 引入额外版本裁决与事件协议。

优点：更利于诊断和后续扩展。

缺点：当前问题下属于额外复杂度；在服务端已保证单 winner refresh 的前提下，不是第一阶段必需。

## 结论

- 采用方案 2。
- 服务端把 refresh 协议升级为 `session_id + refresh_token`，并把失败明确拆成 `session_invalidated` 与 `session_superseded`。
- 服务端 session 仅保留 `current_refresh_token_hash`，不引入 refresh token 历史链。
- 不引入 `sessionGeneration`。原因是：服务端已经保证同一个旧 refresh token 并发使用时最多只有一个请求成功，因此客户端不会遇到“多个 refresh success 结果并发写回，需要按 generation 裁决谁更新”的场景；其余请求只会收到 `session_superseded` 并等待 winner 写回共享 session。
- 浏览器 SDK 增加最小跨 tab 会话同步：共享状态继续存于 `localStorage`，各实例监听 `storage` event 并 adopt 外部写入的最新 session，或在全局终态路径下清空共享 session。

## 服务端设计

### 数据模型

每条 session 需要稳定持久化这些核心字段：

- `session_id`
- `current_refresh_token_hash`
- `user_id`
- session 生命周期字段 `expires_at`

关键约束：

- `session_id` 在 session 生命周期内保持稳定。
- refresh token 会在每次 refresh 成功后轮换。
- 数据库只保留当前最新 refresh token，不保留历史 refresh token 链。
- 因此 session 表大小不会随 refresh 次数线性膨胀。

### `/session/refresh` 请求合同

请求体改为：

```json
{
  "session_id": "...",
  "refresh_token": "..."
}
```

成功响应继续返回新的 session payload，包括新的 `session_id`、access token、refresh token 与过期信息。

### `/session/refresh` 错误合同

服务端必须按以下语义区分失败：

1. `session_invalidated`
   - `session_id` 不存在，或对应 session 已登出、已过期、已硬失效。
   - 客户端必须把本地 session 清空并收敛到 `anonymous`。

2. `session_superseded`
   - `session_id` 仍有效，但请求里的 `refresh_token` 不是该 session 当前最新 token。
   - 这说明当前实例持有的 token 已不是服务端当前值；常见原因是别的 tab 或别的执行路径已经把 session 推进到了更晚的状态，也可能是本地状态损坏。
   - 客户端不得登出，而应保持可恢复状态，等待共享 session 更新。

传输层合同固定为：

- HTTP status 使用 `401`
- response body 使用现有 `error` 字段承载机器可消费错误码
- 允许自动恢复的只有 `session_superseded`
- `session_invalidated` 不允许自动恢复，必须清空本地 session

### 并发语义

- 对同一个 `session_id` 的并发 refresh，请求以数据库原子更新为准。
- 最多只有一个请求能在校验时命中当前 refresh token 并成功完成轮换。
- winner 提交时，服务端生成新的 current token 并返回新的 session payload。
- 其他并发请求在 winner 提交后再次校验时，会发现请求 token 已不是当前值，因此返回 `session_superseded`。
- 若 session 在并发过程中被 logout 或因 `expires_at` 到期而失效，则相关 refresh 请求返回 `session_invalidated`。

### `logout` 语义

- `logout` 使整条 `session_id` 失效，而不是仅作废某一个 refresh token。
- `logout` 成功后，服务端把该 session 的 `expires_at` 改为当前时间戳；该 `session_id` 上任何旧 refresh token 都只能得到 `session_invalidated`。
- 浏览器端应把它视为全局终态，并让所有 tab 最终收敛到 `anonymous`。

## 客户端设计

### 公开状态保持不变

SDK 继续只暴露 3 个状态：

- `authenticated`
- `recovering`
- `anonymous`

含义定义：

- `authenticated`：当前 tab 持有可用 access token，且 `me` 已完成装载。
- `recovering`：当前 tab 知道 session 仍可能有效，但本地 token 可能过期、落后，或正在等待其他 tab 写入新的共享 session。
- `anonymous`：本地确认没有可恢复 session，或服务端已明确判定 session 失效。

### 最小跨 tab 同步层

SDK 新增的同步层保持最小：

- 共享 session 继续使用当前 `localStorage` key 持久化。
- 每个浏览器 SDK 实例额外监听 `storage` event`。
- 当其他 tab 写入新的 session 或清空共享 session 时，当前 tab 读取共享快照并把内存状态同步到最新值。

不引入：

- `BroadcastChannel`
- 独立事件总线
- 浏览器端 refresh lock
- 完整版本裁决协议

### 持久化快照

共享 session 快照至少包括：

- `sessionId`
- `accessToken`
- `refreshToken`
- `receivedAt`
- `expiresAt`
- `me`

logout 继续通过清空共享 session 传播到其他 tab，而不是引入额外 tombstone 或 generation 裁决机制。

同步规则采用整份 adopt，而不是字段级 merge。对于 refresh 场景，不需要客户端 generation 裁决：

- 服务端已经保证同一个旧 refresh token 并发时最多只有一个请求成功
- 因此共享存储里最多只会出现一份 winner 写回的新 session
- 其他 tab 收到 `session_superseded` 后只需要等待这份唯一的新共享 session，而不需要在多个成功结果间择优

### 状态转换规则

1. 启动恢复
   - 若本地存储存在 `sessionId + refreshToken`，SDK 初始进入 `recovering`。

2. login 成功
   - 当前 tab 写入新的共享 session。
   - 当前 tab 进入 `authenticated`。
   - 其他 tab 收到 `storage` 事件后 adopt 这份共享 session，并进入 `authenticated` 或 `recovering` 后再完成装载。

3. refresh 成功
   - 当前 tab 用新的 access token / refresh token / session metadata 覆盖共享 session。
   - 当前 tab 进入 `authenticated`。
   - 其他 tab 收到外部更新后 adopt 新共享 session，并收敛到最新状态。

4. refresh 返回 `session_superseded`
   - 当前 tab 不得进入 `anonymous`。
   - 当前 tab 保持 `recovering`。
   - 当前 tab 随后只等待其他 tab 写回的新共享 session。
   - 若在 `recoveryTimeoutMs` 窗口内观察到新的外部快照，即 adopt 并进入 `authenticated`。
   - 若超时后仍未观察到新共享 session，则重新读取一次共享快照；若仍无可恢复 session，则只把当前实例的内存状态转为 `anonymous`，不得清空共享快照。
   - timeout 后实例仍继续监听外部共享快照；若后续观察到新的共享 session，允许重新进入 `authenticated`。

5. refresh 返回 `session_invalidated`
   - 当前 tab 立即清空共享 session。
   - 当前 tab 进入 `anonymous`。
   - 其他 tab 收到外部清空事件后，也最终收敛到 `anonymous`。

6. logout 成功或本地确定退出
   - 当前 tab 清空共享 session。
   - 当前 tab 进入 `anonymous`。
   - 其他 tab 收到同步后进入 `anonymous`。

### 收敛原则

- `session_superseded` 不是失败终态，而是“本 tab 落后于同一条仍然存活的 session”。
- `session_invalidated` 与 `logout` 是终态优先级最高的事件；一旦成立，最终所有 tab 都应收敛到 `anonymous`。
- SDK 只承诺最终一致，不承诺所有 tab 的瞬时强一致。
- 本地内存状态不保留“本 tab 私有 token 分支”；共享快照一旦更新，所有 tab 都应向最新的共享 session 收敛。

## 代码影响范围

### 服务端

- session 创建逻辑：需要稳定产出 `session_id` 并写入初始 `expires_at`
- refresh handler：从“只靠 refresh token”改成按 `session_id + refresh_token` 判定
- logout handler：按整条 `session_id` 失效处理，并把 `expires_at` 更新为当前时间戳
- 相关数据访问层：支持“按 session_id 取当前 refresh token 并原子轮换”

### SDK

- `src/sdk/types.ts`
  - 持久化与运行时 session 类型新增 `sessionId`
- `src/sdk/storage.ts`
  - 读写共享 session 时包含 `sessionId`
- `src/sdk/state.ts`
  - 增加“从外部持久化快照重载内存状态”的入口
- `src/sdk/session.ts`
  - refresh 请求体改为提交 `session_id + refresh_token`
  - `session_superseded` 不再触发本地登出，并增加有界恢复出口
- `src/sdk/singleton-entry.ts`
  - 浏览器环境注册 `storage` listener，把其他 tab 的写入同步回当前实例

## 测试策略

### 服务端测试

- refresh 成功时会轮换到新的 refresh token
- 同一个 `session_id` 下，并发使用同一个旧 refresh token 时：
  - 最多一个请求成功
  - 其余请求返回 `session_superseded`
- session 已 logout / expire 后，refresh 返回 `session_invalidated`

### SDK 单元测试

- 持久化状态与 session snapshot 读写包含 `sessionId`
- 两个 SDK 实例共享同一底层存储时：
  - winner refresh 成功写入新 session
  - loser 收到 `session_superseded` 后保持 `recovering`
  - loser 只在观察到 winner 写回的新共享 session 后收敛到最新 `authenticated` session
  - loser 在 `recoveryTimeoutMs` 内未观察到更高 generation 时会只把本地内存态降级为 `anonymous`
- logout 从任一实例触发后，其他实例最终同步为 `anonymous`
- 外部 tab 写入新 session 时，当前 tab 会 adopt 新共享 session

### 最小验证命令

- `npm test -- tests/unit/sdk-session.test.ts`
- `npm test -- tests/unit/sdk-state.test.ts`
- 相关服务端 session / refresh / logout 测试文件

## 风险与约束

- `storage` event 只会通知其他 tab，不会通知发起写入的当前 tab；当前 tab 仍需在本地写入路径中立即更新自身内存状态。
- 最终一致依赖多个 tab 共享同一浏览器存储上下文；不同 profile、不同站点存储隔离不在本合同范围内。
- 只要 `session_id` 仍有效，任何非当前 refresh token 都视为 `session_superseded`。
- `receivedAt` 只用于 token 刷新阈值计算与诊断，不参与新旧裁决。
- 失效语义统一收敛到 `expires_at`；本轮不再单独维护 `revoked_at`。logout 的服务端实现等价于把 `expires_at` 更新为当前时间戳。

## 验收

- `/session/refresh` 请求合同升级为 `session_id + refresh_token`。
- refresh 失败能明确区分 `session_invalidated` 与 `session_superseded`。
- 并发 refresh 时最多一个请求成功；其余请求返回 `session_superseded`。
- SDK 在 `session_superseded` 时不登出，并能在观察到 winner 写回的共享 session 后收敛到最新 session。
- `session_superseded` 的恢复等待必须有界，超时后只降级当前实例的内存态，不得把共享状态升级成全局 tombstone。
- 任一 tab logout 后，其他 tab 最终同步为 `anonymous`。
- `sessions` 表只保留当前最新 refresh token，不引入 refresh 历史膨胀。
