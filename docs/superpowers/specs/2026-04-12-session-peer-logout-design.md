# Session 多会话定向登出设计

## 背景

- 当前 `POST /session/logout` 只负责注销当前 access token 对应的 session。
- `GET /me` 已经向客户端暴露 `active_sessions`，客户端具备展示“其他活跃会话”并发起定向登出的基础数据来源。
- 仓库已经引入基于 session `auth_method` / access token `amr` 的认证方式边界：`email_otp` 与 `webauthn` 属于人类可控登录态，`ed25519` 不属于可管理其他敏感资源的登录态。
- 本轮需要补齐“注销某一个其他活跃 session”的服务端合同，但不能改变现有当前会话登出语义，也不能泄露目标 session 是否存在或归属谁。

## 目标

- 保持现有 `POST /session/logout` 语义不变，继续只处理当前 session 登出。
- 新增 `POST /session/:session_id/logout`，用于注销当前用户的一个其他活跃 session。
- 新接口必须要求 Bearer access token，并只允许 `email_otp` 或 `webauthn` 会话调用。
- 对不存在、已过期或不属于当前用户的目标 session 统一返回幂等成功，不泄露存在性与归属信息。
- 让 HTTP 文档与测试范围完整覆盖新行为。

## 非目标

- 不把 `POST /session/logout` 改造成“可同时处理当前 session 与其他 session”的多态接口。
- 不新增批量注销、全部设备登出、分页 session 管理或 session 标签能力。
- 不改变 `GET /me` 的 `active_sessions` 数据来源与结构；客户端仍只能从该字段获取可展示的 session id。
- 不为 `ed25519` 新增例外权限；它仍只能注销自己当前的 session。

## 接口设计

### 现有接口：`POST /session/logout`

- 继续保持现状，只注销当前 access token 中 `sid` 对应的 session。
- `ed25519` session 仍然允许调用该接口注销自己。
- 本轮不修改其请求、响应与职责边界。

### 新接口：`POST /session/:session_id/logout`

- 路由参数 `:session_id` 表示要注销的目标 session id。
- 该接口只负责“其他 session”的定向登出，不承担当前 session 登出责任。
- 请求必须带 `Authorization: Bearer <access_token>`。
- 成功响应固定为：

```json
{ "ok": true }
```

## 鉴权与授权规则

### Access token 要求

- 新接口必须复用现有 Bearer access token 校验链路。
- 未提供 token、token 无效、token 对应 session 无效时，继续沿用现有 `401` 语义。

### 允许的认证方式

- 仅当当前 session 的 `amr` 包含 `email_otp` 或 `webauthn` 时，允许调用 `POST /session/:session_id/logout`。
- 若当前 session 的 `amr` 为 `ed25519`，则必须返回现有 `403` 语义：

```json
{ "error": "insufficient_authentication_method" }
```

- 不为 `ed25519` 增加“可注销其他 session”的特判；其权限边界与现有凭据管理接口保持一致。

## 目标 session 裁决规则

### 目标必须满足的条件

只有同时满足以下条件时，服务端才真正使目标 session 失效：

- 目标 session 存在。
- 目标 session 归属于当前 access token 对应的同一用户。
- 目标 session 当前仍处于 active 状态。
- 目标 session id 不等于当前 access token 的 `sid`。

### 同用户其他活跃 session

- 当目标 session 属于当前用户、且当前仍 active、且不是当前 session 时，服务端应使该目标 session 失效。
- 当前调用用的 session 自身必须保持可继续使用；本接口不能顺带让当前 access token 失效，也不能把当前 session 一并登出。
- 目标 session 失效后，该目标 session 后续无论用于 access token 对应的受保护接口，还是用于 refresh，都应表现为不可继续使用。

### 不存在 / 非本人 / 已过期

- 若目标 session 不存在，或属于其他用户，或已经 expired，统一返回：

```json
{ "ok": true }
```

- 这三类情况都必须视为幂等成功，禁止通过状态码、错误码或响应体差异泄露目标 session 的存在性、归属关系或生命周期状态。

### `targetSessionId === currentSessionId`

- 当路由参数中的 `session_id` 与当前 access token 的 `sid` 相同，`POST /session/:session_id/logout` 不得承担当前 session 登出职责。
- 该请求必须返回 `400`，并明确要求客户端使用现有 `POST /session/logout` 完成当前 session 登出。
- 该场景不适用“目标不存在/非本人/已过期时返回 `{ ok: true }`”的幂等成功语义，因为当前 session 登出责任必须继续由专用接口承载，避免两个路由对同一职责产生重叠。

## 与 `GET /me` 的关系

- 客户端仍通过 `GET /me` 的 `active_sessions` 获取可展示、可操作的 session id。
- 新接口不新增 session 列表来源，也不改变 `active_sessions` 的字段结构。
- 某个其他活跃 session 被成功定向登出后，后续 `GET /me` 返回的 `active_sessions` 应不再包含该 session id。
- 当前调用 session 在上述场景中仍应继续出现在 `active_sessions` 中，直到它自身失效或被当前 session 登出接口注销。

## HTTP 文档要求

`docs/reference/http-api.md` 需要新增或更新以下说明：

- `POST /session/:session_id/logout` 的用途是注销一个其他活跃 session。
- 请求必须带 Bearer access token。
- 仅 `email_otp` / `webauthn` 会话允许调用。
- `ed25519` 调用时返回 `403 { "error": "insufficient_authentication_method" }`。
- 成功响应形状为 `200 { "ok": true }`。
- 对不存在、外部用户、已过期的目标 session 统一返回同样的幂等成功响应。
- 若 `session_id` 等于当前 session id，该接口返回 `400`，客户端必须改用 `POST /session/logout`，以维持两个路由的职责边界。

## 测试范围

实现阶段至少覆盖以下测试：

1. `email_otp` 当前 session 可以成功注销同用户的另一个活跃 session。
2. `webauthn` 当前 session 可以成功注销同用户的另一个活跃 session。
3. `ed25519` 当前 session 调用新接口时返回 `403 { "error": "insufficient_authentication_method" }`。
4. 目标 session id 属于其他用户时，返回 `200 { "ok": true }`，且不泄露存在性。
5. 目标 session id 不存在时，返回 `200 { "ok": true }`。
6. 目标 session 已过期时，返回 `200 { "ok": true }`。
7. 成功注销其他 session 后，当前调用 session 仍可继续访问受保护接口，而目标 session 变为不可用。
8. 成功注销其他 session 后，`GET /me` 返回的 `active_sessions` 数组会缩减并移除目标 session id。

## 验收标准

- `POST /session/logout` 继续只负责当前 session 登出。
- 新增 `POST /session/:session_id/logout`，且必须要求 Bearer token。
- 只有 `email_otp` 与 `webauthn` 会话可以注销其他 session。
- `ed25519` 会话仍可通过 `POST /session/logout` 注销自己，但不能通过新接口注销其他 session。
- 目标 session 只有在“同用户 + active + 非当前 session”时才真正失效。
- 对不存在、外部用户、已过期目标 session 的响应统一为 `200 { "ok": true }`。
- 当目标 session id 等于当前 session id 时，新接口不接管当前 session 登出职责，并要求客户端使用 `POST /session/logout`。
- HTTP 文档与测试清单覆盖上述全部行为。

## 风险与控制

- 风险：实现把新接口做成可同时处理当前 session 与其他 session，导致职责漂移。
  - 控制：spec 明确要求 `targetSessionId === currentSessionId` 时保持路由分责，不允许通过新接口完成当前 session 登出。
- 风险：通过错误差异泄露目标 session 的存在性或归属。
  - 控制：对不存在、外部用户、已过期三类情况统一返回 `200 { "ok": true }`。
- 风险：`ed25519` 获得超出既有安全边界的 session 管理能力。
  - 控制：沿用现有 `403 insufficient_authentication_method` 语义，明确禁止其注销其他 session。
