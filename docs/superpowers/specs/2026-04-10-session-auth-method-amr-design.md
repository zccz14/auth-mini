# auth-mini Session 认证来源与 `amr` 设计

## 背景

- 当前 auth-mini 的 access token 只包含 `sub`、`sid`、`iss`、`typ`、`iat`、`exp`，不记录 session 是通过哪种认证方式建立的。
- 这会让 auth-mini 自己和下游后端服务都无法基于认证来源区分策略。例如，无法表达“Passkey 管理接口只接受人类可控登录态，而拒绝未来的机器登录态”。
- 用户明确希望后续可以引入 `ed25519` 这类非交互式机器认证，但不希望这类 session 天然拥有修改邮箱、增删 passkey 等根凭据管理能力。
- 当前仓库已经有稳定的 session 刷新模型：refresh token 轮换与 session 生命周期由 `sessions` 表持久化，`/session/refresh` 会从持久化 session 派生新的 access token。因此认证来源如果只写在 JWT 中，会在 refresh 链路里缺少稳定来源。

## 目标

- 让每条 session 持久化记录其认证来源。
- 让每个 access token 暴露可供 auth-mini 和业务后端消费的认证方式 claim。
- 让 auth-mini 现有 passkey 管理接口可以立即基于该 claim 做门禁。
- 把 `email_otp` 与 `webauthn` 定义为同一级的人类可控登录态。
- 为未来 `ed25519` 机器登录保留扩展位，但不在本轮实现其完整登录流程。

## 非目标

- 本轮不实现 `ed25519` 登录注册流程，不新增 `ed25519_credentials` 表。
- 本轮不实现完整的 `aud` 体系，不改变 access token 的受众模型。
- 本轮不引入 `acr`、recent-auth、step-up auth 或重新认证窗口。
- 本轮不新增邮箱修改接口；仅在现有 passkey 管理接口落地门禁。
- 本轮不把认证方式映射成应用级授权系统；业务权限仍由各业务后端自行决定。

## 方案对比

### 方案 1：只在 JWT 中新增 `amr`

- 登录成功时直接在 access token 中写入 `amr`。
- 不修改 `sessions` 表，不在 session 持久层记录认证来源。

优点：改动最小。

缺点：refresh 时没有稳定事实来源，只能依赖额外推断或复制旧 token 上下文；审计和服务端判断也无法基于 session 做一致裁决。

### 方案 2：推荐，session 持久化 `auth_method`，JWT 从 session 派生 `amr`

- `sessions` 表新增认证来源字段。
- Email OTP / passkey 登录在创建 session 时写入认证来源。
- `/session/refresh` 从 session 记录继承认证来源，再派生新的 JWT `amr`。
- auth-mini 的 passkey 管理接口直接基于 `amr` 做门禁。

优点：refresh 语义稳定，认证上下文可审计，auth-mini 与业务后端看到的是同一份事实来源，也为未来 `ed25519` 预留最自然的扩展面。

缺点：需要 schema 迁移、session repo 和 token 生成路径一起修改。

### 方案 3：一步到位实现完整认证上下文模型

- 除 `amr` 外，同时引入 `aud`、`auth_time`、`credential_id`、recent-auth 等能力。

优点：长期能力最完整。

缺点：当前 scope 过大，会把“记录认证来源并约束 passkey 管理”这个问题做散。

## 结论

- 采用方案 2。
- session 持久化新增 `auth_method`，access token 新增 `amr`。
- `email_otp` 与 `webauthn` 都视为人类可控登录态。
- 现有 passkey 管理接口立即接入基于 `amr` 的 guard。
- 未来新增 `ed25519` 登录时，默认通过同一 guard 被拒绝访问 passkey 管理接口，无需重写默认安全边界。

## 详细设计

### 数据模型

`sessions` 表新增：

- `auth_method TEXT NOT NULL`

本轮允许值固定为：

- `email_otp`
- `webauthn`

约束：

- 新字段对所有新 session 必填。
- refresh 不得修改 `auth_method`。
- 历史库升级后，已有 session 必须有确定值才能继续通过应用层读取；迁移策略应避免留下 `NULL`。

迁移原则：

- 现有仓库没有通用 migration 框架，因此继续沿用当前 SQLite schema 重建/迁移风格处理新增列。
- 对于已有 session 数据，本轮采用保守默认：将历史 session 回填为 `email_otp`。

采用该默认的原因：

- 历史数据中不存在足够信息来可靠区分该 session 原先来自 Email OTP 还是 passkey。
- 把历史 session 一律回填为 `email_otp` 会偏向兼容现有用户行为，不会把已有会话突然降级为不能管理 passkey。
- 该默认只影响迁移前已存在的 session；迁移后的新 session 都会由真实登录来源精确写入。

### 领域模型与 repo 变更

- `Session` 类型新增 `authMethod` 字段。
- `createSession(...)` 必须显式接收 `authMethod`。
- `getSessionById(...)`、`listActiveUserSessions(...)` 等任何读取 session 的路径都要把该字段带出，避免 repo 层和服务层对 session 形状产生漂移。
- refresh token 轮换逻辑只更新 refresh 相关字段和时间字段，不得覆盖 `authMethod`。

### Token claims

access token 在现有 claims 基础上新增：

- `amr`

本轮映射规则固定为：

- `auth_method = email_otp` -> `amr = ["email_otp"]`
- `auth_method = webauthn` -> `amr = ["webauthn"]`

保留现有 claims：

- `sub`
- `sid`
- `iss`
- `typ`
- `iat`
- `exp`

使用数组而不是单字符串的原因：

- `amr` 的标准语义就是认证方法集合。
- 这样未来若出现组合认证或 step-up，不需要再改 claim 结构。

本轮不新增：

- `aud`
- `auth_time`
- `credential_id`

这些能力可以在后续单独设计，不与本轮耦合。

### 登录与 refresh 路径

#### Email OTP 登录

- Email OTP 验证成功后创建 session。
- 创建 session 时必须写入 `auth_method = email_otp`。
- access token 的 `amr` 为 `["email_otp"]`。

#### passkey 登录

- WebAuthn 验证成功后创建 session。
- 创建 session 时必须写入 `auth_method = webauthn`。
- access token 的 `amr` 为 `["webauthn"]`。

#### Session refresh

- `/session/refresh` 成功时，必须从当前 session 记录读取 `auth_method`。
- refresh 不得重新判断当前请求“像不像某种认证方式”，也不得把 refresh 本身视为一种新的认证来源。
- 新 access token 的 `amr` 必须稳定继承 session 上的 `auth_method`。

### 服务端认证上下文

- `requireAccessToken` 在现有基础校验之外，还要校验 `amr` 是非空字符串数组，且当前值可映射回受支持的认证来源。
- 通过校验后，把 `amr` 放入 request auth context，供后续 route guard 使用。

基础 access token 校验仍保持：

- JWT 签名有效
- `typ === "access"`
- `sub` 为字符串
- `sid` 为字符串
- session 存在且未过期
- session `userId` 与 `sub` 一致

本轮不在 `requireAccessToken` 中耦合任何“敏感操作是否允许”的业务策略；该策略由单独的 guard 承担。

### passkey 管理接口门禁

本轮直接对现有 passkey 管理接口增加 `amr` guard：

- `POST /webauthn/register/options`
- `POST /webauthn/register/verify`
- `DELETE /webauthn/credentials/:id`

guard 规则固定为：

- 允许 `amr` 包含 `email_otp`
- 允许 `amr` 包含 `webauthn`
- 拒绝其他值

这样定义的安全意图是：

- 只有人类可控登录态可以修改用户的 passkey 根凭据。
- 未来若新增 `ed25519` 机器登录，且其 `amr = ["ed25519"]`，则会被当前 guard 自动拒绝，无需追加默认 deny 之外的新逻辑。

失败合同：

- 对不满足 guard 的请求返回 `403`。
- 错误码应明确可机器消费，例如 `insufficient_authentication_method`，避免与 access token 无效、session 失效等 `401` 语义混淆。

### 与未来 `aud` 的关系

本轮虽然不实现 `aud`，但设计边界保持清晰：

- `amr` 解决“这个 session 是怎么认证出来的”。
- `aud` 解决“这个 token 发给谁用”。

两者不能互相替代。

即使未来引入 `aud`，passkey 管理接口仍应继续依赖 `amr` 做最小认证方式门禁，而不是只看 audience。否则业务 origin token 一旦被 auth-mini 自己接受，仍然会把账户根凭据暴露给不应拥有该能力的会话。

### 与未来 `ed25519` 的关系

未来若新增 `ed25519` 登录：

- `sessions.auth_method` 新增允许值 `ed25519`
- access token `amr = ["ed25519"]`
- refresh 继续稳定继承该值
- 现有 passkey 管理接口 guard 默认拒绝这类 session

这样可以把“机器登录可以维护自己的应用 session”与“机器登录可以重写用户根认证凭据”明确分开。

## 代码影响范围

### 服务端与模块

- `sql/schema.sql`
- `src/modules/session/repo.ts`
- `src/modules/session/service.ts`
- `src/modules/email-auth/service.ts`
- `src/modules/webauthn/service.ts`
- `src/modules/jwks/service.ts`
- `src/server/auth.ts`
- `src/server/app.ts`

### 测试与文档

- session / token claim 相关单元与集成测试
- passkey 管理接口授权测试
- `docs/reference/http-api.md` 中相关 access token 行为说明

## 测试策略

至少覆盖：

1. Email OTP 登录创建的 session 持久化 `auth_method = email_otp`。
2. passkey 登录创建的 session 持久化 `auth_method = webauthn`。
3. Email OTP 登录拿到的 access token 含 `amr = ["email_otp"]`。
4. passkey 登录拿到的 access token 含 `amr = ["webauthn"]`。
5. refresh 后新 token 继承原 session 的 `amr`。
6. `requireAccessToken` 会把 `amr` 暴露给 route context。
7. `POST /webauthn/register/options` 对 `email_otp` 和 `webauthn` session 允许访问。
8. `POST /webauthn/register/verify` 对不允许的 `amr` 返回 `403`。
9. `DELETE /webauthn/credentials/:id` 对不允许的 `amr` 返回 `403`。
10. 历史 session 迁移后不出现 `NULL auth_method`。

## 风险与约束

- 历史 session 回填为 `email_otp` 是兼容性优先的保守默认，而不是对历史真实登录来源的精确还原。
- 若后续需要把“修改邮箱”也纳入同类保护，应复用同一类 `amr` guard，而不是复制散落的条件判断。
- 一旦未来同时实现 `aud`，必须避免把资源边界与认证强度边界混用；否则会出现 audience 正确但认证方法不足的会话仍能触达高敏感接口的问题。

## 验收

- session 持久层能够稳定记录并读取 `auth_method`。
- Email OTP / passkey 登录签发的 access token 都包含正确的 `amr`。
- `/session/refresh` 不改变 session 的认证来源，并继续签发对应 `amr`。
- 现有 passkey 管理接口仅接受 `email_otp` 或 `webauthn` session。
- 不满足 `amr` guard 的请求返回清晰的 `403` 错误。
- 设计为未来 `ed25519` 登录预留扩展位，但本轮不要求交付其登录流程。
