# ED25519 设备登录设计

## 背景

- 当前 auth-mini 已支持 `email_otp` 与 `webauthn` 两种登录方式，并在成功登录后统一签发标准 Session、Refresh Token 与 Access Token。
- 用户希望增加一条面向设备/机器的登录路径：先由已经登录的人类 Session 预注册稳定的 ED25519 公钥，之后机器使用该密钥完成登录，无需每次人工参与。
- 机器登录完成后，后续服务侧仍沿用当前 Session + JWT 模型，不引入新的令牌体系或验证协议。

## 目标

- 增加一套与 WebAuthn 平行的 ED25519 凭证管理能力，允许已登录的人类 Session 管理自己的设备公钥。
- 提供基于 challenge 的 ED25519 登录流程：`/ed25519/start` 生成 challenge，`/ed25519/verify` 验签并签发标准 Session。
- 让 ED25519 登录产生的 Session 与现有登录方式共享 Refresh Token、Access Token 与 JWT 验证路径。
- 在 `/me` 中平行暴露 ED25519 凭证信息，便于用户查看和管理自己的设备凭证。

## 非目标

- 不把 ED25519 设计成新的长期 bearer token 或 API key 体系；登录成功后仍只返回标准 Session token pair。
- 不把 ED25519 与 WebAuthn 抽象成统一 credential 表或统一接口模型；本轮保持平行实现。
- 不在本轮引入私钥生成、导出、托管或 CLI 密钥管理能力；设备如何生成私钥不属于本次服务端设计范围。
- 不提供纯 `ed25519` Session 的凭证管理能力；设备登录只负责换取 Session，不负责继续管理凭证。

## 决策

采用与 WebAuthn 平行的独立 ED25519 模块：增加独立的凭证表、challenge 表、HTTP schema、service 与 repo，并复用现有 Session/JWT 签发路径。已登录的人类 Session 可以对自己的 ED25519 凭证执行 CRUD；设备登录时先使用 `credential_id` 请求 challenge，再对 challenge 原文做 ED25519 签名，服务端验证成功后签发 `auth_method = 'ed25519'` 的标准 Session，Access Token 中的 `amr` 为 `['ed25519']`。

## 方案对比

### 方案 A：独立 ED25519 模块（采用）

- 优点：与现有 WebAuthn 结构最一致；改动边界清晰；不需要重写 `/me` 与现有 WebAuthn 存储模型。
- 缺点：需要新增一套 credential/challenge repo 与 service。

### 方案 B：统一 credential/challenge 基础设施

- 优点：长期看数据模型更统一。
- 缺点：会侵入现有 WebAuthn 实现与 `/me` 返回结构，超出本轮最小改动范围。

### 方案 C：无 challenge 的单请求签名登录

- 优点：设备侧接入更轻。
- 缺点：需要自定义签名规范与重放防护，安全边界不如 challenge 明确；已被本轮需求否决。

## 架构

### 资源模型

- `webauthn_credentials` 继续保持不变。
- 新增 `ed25519_credentials`，作为用户可管理的设备凭证资源。
- 新增 `ed25519_challenges`，作为设备登录的短期一次性 challenge 资源。
- `sessions.auth_method` 扩展支持 `ed25519`，但 Session 存储、Refresh Token 轮换、JWT 验证继续沿用现有模块。

### 认证边界

- ED25519 凭证的创建、查看、更新、删除都要求已有 access token，且必须是“人类参与”的登录方式。
- 本轮沿用现有 `requirePasskeyManagementAuth` 语义：`email_otp`、`webauthn` 以及包含它们的复合 `amr` 可以管理 ED25519 凭证。
- 纯 `ed25519` Session 不允许管理 ED25519 凭证，也不允许管理 WebAuthn 凭证。

### 登录拓扑

1. 人类先通过 `email_otp` 或 `webauthn` 登录。
2. 人类 Session 调用 ED25519 CRUD 接口，为某台设备登记 `name` 与 `public_key`。
3. 设备持有 `credential_id` 与对应私钥，调用 `/ed25519/start` 请求 challenge。
4. 服务端为该 `credential_id` 创建一次性 challenge。
5. 设备对 challenge 原文做 ED25519 签名，调用 `/ed25519/verify` 提交签名。
6. 服务端验证成功后更新 `last_used_at`，并签发标准 Session token pair。

## 数据模型

### `ed25519_credentials`

字段：

- `id`：主键，UUID。
- `user_id`：所属用户，外键到 `users.id`。
- `name`：用户可读的设备名称。
- `public_key`：以 `base64url` 表示的 32-byte ED25519 原始公钥。
- `last_used_at`：最近一次成功完成 ED25519 登录的时间，可为空。
- `created_at`：创建时间。

约束：

- `name` 与 `public_key` 都必填。
- 不对 `public_key` 做唯一约束；同一公钥允许注册为多条逻辑凭证。
- 删除用户时级联删除其 ED25519 凭证。

### `ed25519_challenges`

字段：

- `request_id`：主键，UUID。
- `credential_id`：外键到 `ed25519_credentials.id`。
- `challenge`：随机 challenge 原文，供设备直接签名。
- `expires_at`：过期时间。
- `consumed_at`：消费时间，可为空。
- `created_at`：创建时间。

约束：

- 每条 challenge 只绑定一个 `credential_id`。
- challenge 必须是一次性的，成功验证后立刻写入 `consumed_at`。
- challenge 过期或已消费后不可再次使用。

### Session 扩展

- `sessions.auth_method` 的 CHECK 约束扩展为 `('email_otp', 'webauthn', 'ed25519')`。
- `mintSessionTokens` 与 refresh 流程继续从 `auth_method` 推导 `amr`。
- ED25519 登录产生的 access token `amr` 固定为 `['ed25519']`。

## HTTP 接口

### `/me`

- 保持现有返回结构，并新增 `ed25519_credentials` 字段。
- `ed25519_credentials` 为数组，元素包含：`id`、`name`、`public_key`、`last_used_at`、`created_at`。
- 仍保留现有的 `webauthn_credentials` 与 `active_sessions`，不合并成统一 `credentials` 数组。

### `POST /ed25519/credentials`

- 需要 access token + 人类参与登录方式。
- 请求体包含：
  - `name`
  - `public_key`
- `public_key` 只接受 `base64url` 编码的 32-byte ED25519 原始公钥。
- 成功后返回创建后的凭证对象。

### `GET /ed25519/credentials`

- 需要 access token + 人类参与登录方式。
- 返回当前用户的 ED25519 凭证列表。
- 返回元素 shape 与 `/me.ed25519_credentials` 一致。

### `PATCH /ed25519/credentials/:id`

- 需要 access token + 人类参与登录方式。
- 本轮只允许更新 `name`。
- 不允许通过 update 改写 `public_key`；更换公钥通过删除旧凭证并重新创建完成。
- 成功后返回更新后的凭证对象。

### `DELETE /ed25519/credentials/:id`

- 需要 access token + 人类参与登录方式。
- 只允许删除当前用户自己的凭证。
- 成功后返回 `{ ok: true }`。

### `POST /ed25519/start`

- 无需已有 Session；这是设备登录入口。
- 请求体包含：
  - `credential_id`
- 服务端根据 `credential_id` 找到已注册凭证后创建 challenge，并返回：
  - `request_id`
  - `challenge`
- challenge 生命周期与当前 WebAuthn challenge TTL 保持一致，避免引入新的时间语义。
- 出于安全考虑，找不到 credential、credential 已失效、challenge 创建失败等情况统一返回认证失败错误，不泄露更多资源存在性细节。

### `POST /ed25519/verify`

- 无需已有 Session。
- 请求体包含：
  - `request_id`
  - `signature`
- `signature` 为设备对 challenge 原文做 ED25519 签名后的 `base64url` 编码结果。
- 服务端通过 `request_id` 读取 challenge，再由 challenge 绑定的 `credential_id` 找到公钥并完成验签。
- 验签成功后：
  - 消费 challenge
  - 更新对应 credential 的 `last_used_at`
  - 为 credential 所属用户签发标准 Session token pair

## 验签与安全规则

### 公钥与签名格式

- `public_key` 与 `signature` 的外部接口格式统一为 `base64url`。
- `public_key` 解码后必须恰好是 32-byte ED25519 原始公钥。
- `signature` 解码后必须满足 ED25519 签名验签所需的长度要求；长度不合法直接视为认证失败。

### Challenge 语义

- challenge 原文直接作为签名消息，不额外拼接 method、path 或时间戳字段。
- challenge 必须随机、短时有效、一次性消费。
- 任何已过期、已消费或不存在的 challenge 都统一返回 `invalid_ed25519_authentication`。

### 失败收敛

- `POST /ed25519/start` 与 `POST /ed25519/verify` 的失败默认收敛为 `invalid_ed25519_authentication`。
- 设备登录流程不暴露 credential 是否存在、属于哪个用户或签名具体为何失败。
- 凭证管理接口仍采用面向已登录用户的明确错误语义。

### 管理权限

- 纯 `ed25519` Session 无法创建、修改或删除 ED25519 凭证。
- 纯 `ed25519` Session 同样无法调用现有 WebAuthn 管理接口。
- 这样可保证机器登录只能换取应用 Session，不能独立提升到“管理凭证”的权限级别。

## 错误语义

- `invalid_access_token`：沿用现有 access token 校验失败语义。
- `insufficient_authentication_method`：沿用现有“非人类参与登录方式不能管理凭证”的语义。
- `invalid_ed25519_credential`：创建 ED25519 凭证时公钥格式非法、长度不对或不是有效 ED25519 公钥材料。
- `credential_not_found`：更新或删除当前用户不存在的 ED25519 凭证。
- `invalid_ed25519_authentication`：`/ed25519/start` 或 `/ed25519/verify` 中所有登录失败场景的统一错误。

## 日志与审计

建议新增与 WebAuthn 风格平行的日志事件：

- `ed25519.credential.created`
- `ed25519.credential.updated`
- `ed25519.credential.deleted`
- `ed25519.authenticate.started`
- `ed25519.authenticate.succeeded`
- `ed25519.authenticate.failed`

日志约束：

- 不记录私钥。
- 不记录 challenge 原文。
- 不记录 signature 原文。
- 可以记录 `request_id`、`credential_id`、`user_id` 以及成功/失败事件名，便于审计。

## 代码边界

- 在 `src/modules/` 下新增独立的 `ed25519` 模块，职责与 `webauthn` 模块平行。
- 在 `src/shared/http-schemas.ts` 中增加 ED25519 相关请求 schema。
- 在 `src/server/app.ts` 中增加 ED25519 CRUD 与登录路由。
- 在 `src/modules/users/repo.ts` 中增加列出用户 ED25519 凭证的查询，并扩展 `/me` 返回。
- 在 `src/server/auth.ts` 中保持当前“人类参与登录方式才能管理凭证”的 gate 语义，同时让 `ed25519` 成为合法的 access token `amr` 值。
- 不重构现有 WebAuthn 存储与 service 结构；本轮只做必要复用。

## 验证策略

- 先增加或更新 integration tests，覆盖 ED25519 凭证 CRUD 与 challenge 登录失败/成功路径，确保至少有测试先因缺失实现而失败。
- 验证 `/me` 会返回 `ed25519_credentials`，且结构与独立列表接口一致。
- 验证 `email_otp` 与 `webauthn` Session 可以管理 ED25519 凭证。
- 验证纯 `ed25519` Session 不能管理 ED25519 凭证，也不能管理 WebAuthn 凭证。
- 验证 `POST /ed25519/start` 能为指定 `credential_id` 创建一次性 challenge。
- 验证 `POST /ed25519/verify` 能正确验签并签发 Session，返回的 access token `amr` 为 `['ed25519']`。
- 验证 challenge 过期、重复消费、签名错误、`request_id` 不存在等场景都会返回 `invalid_ed25519_authentication`。
- 验证登录成功后会更新对应 credential 的 `last_used_at`。
- 验证允许同一 `public_key` 被多次注册成不同 credential。

## 风险与控制

- 风险：把 ED25519 设计成独立长期凭证体系，绕开现有 Session/JWT 语义。
  - 控制：ED25519 只用于换取标准 Session，不新增另一套 bearer token 协议。
- 风险：设备登录错误泄露 credential 存在性或归属信息。
  - 控制：`/ed25519/start` 与 `/ed25519/verify` 的失败统一收敛为 `invalid_ed25519_authentication`。
- 风险：纯 `ed25519` Session 反过来管理凭证，放大机器凭证权限。
  - 控制：继续沿用人类参与登录 gate，明确禁止 `ed25519` Session 管理凭证。
- 风险：公钥重复注册被误判为数据异常。
  - 控制：明确不对 `public_key` 做唯一约束，登录时始终以 `credential_id` 定位凭证。
