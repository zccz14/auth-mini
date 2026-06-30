# 业务 App 跳转登录接入

本文说明业务 App 如何把用户跳转到 Auth Mini 登录页，并在登录成功后回到业务 App。

这个方式适合业务 App 不想自己承载邮箱 OTP、Passkey 或 ED25519 登录页面，只希望把浏览器登录交给 Auth Mini，然后接收登录结果并继续业务流程。

## 核心流程

1. 业务 App 生成一次性 `state`，并记录到自己的会话存储中。
2. 业务 App 构造 Auth Mini 登录 URL，把回调地址放到 `redirect_uri`。
3. 用户在 Auth Mini 登录页完成邮箱 OTP、Passkey 或 ED25519 登录。
4. Auth Mini 登录成功后创建会话 token，并跳回 `redirect_uri`。
5. 业务 App 的回调页读取 URL fragment 中的 token 参数，校验 `state`，保存会话状态。
6. 业务 App 清理地址栏中的 token 参数，然后进入原本的业务页面。

## 发起登录

业务 App 跳转到 Auth Mini 登录页时，URL 形如：

```text
https://auth.example.com/web/#/login?redirect_uri=https%3A%2F%2Fapp.example.com%2Fauth%2Fcallback&state=state-123
```

参数：

- `redirect_uri`：必填。登录完成后要回到的业务 App 地址。应使用 `http:` 或 `https:` URL。
- `state`：推荐。业务 App 生成的随机值，用来防止回调被串用或伪造。

业务 App 示例：

```ts
const state = crypto.randomUUID();
sessionStorage.setItem('auth-mini.login.state', state);

const loginParams = new URLSearchParams();
loginParams.set('redirect_uri', 'https://app.example.com/auth/callback');
loginParams.set('state', state);

window.location.assign(
  'https://auth.example.com/web/#/login?' + loginParams.toString(),
);
```

生产环境还应在 Auth Mini 登录页或网关层校验 `redirect_uri` allowlist，避免任意站点拿到登录结果。

## 登录完成后的回调

Auth Mini 登录成功后，把结果放进 `redirect_uri` 的 URL fragment：

```text
https://app.example.com/auth/callback#access_token=...&token_type=Bearer&session_id=...&expires_at=...&state=state-123
```

回调参数：

- `access_token`：短期 JWT access token。
- `token_type`：通常是 `Bearer`。
- `session_id`：Auth Mini 会话 ID，用来标识这次登录创建的 Auth Mini session。仅有 `session_id` 不能刷新 access token；刷新还需要 refresh token 或业务 App 自己的后端会话。
- `expires_at`：access token 过期时间，ISO 字符串。
- `state`：原样带回业务 App，用来和本地保存的 `state` 对比。

业务 App 回调页应做这些事：

1. 从 `window.location.hash` 解析参数。
2. 对比回调里的 `state` 和本地保存的 `state`。
3. 保存 `access_token`、`token_type`、`session_id` 和过期时间，或调用自己的后端换成业务会话。
4. 使用 `history.replaceState` 清理地址栏中的 token 参数。
5. 跳转到业务 App 原本要进入的页面。

示例：

```ts
const params = new URLSearchParams(window.location.hash.slice(1));
const returnedState = params.get('state');
const expectedState = sessionStorage.getItem('auth-mini.login.state');

if (!expectedState || returnedState !== expectedState) {
  throw new Error('Invalid Auth Mini login state');
}

const accessToken = params.get('access_token');
const tokenType = params.get('token_type');
const sessionId = params.get('session_id');
const expiresAt = params.get('expires_at');

if (!accessToken || tokenType !== 'Bearer' || !sessionId) {
  throw new Error('Invalid Auth Mini login callback');
}

sessionStorage.removeItem('auth-mini.login.state');

sessionStorage.setItem(
  'auth-mini.session',
  JSON.stringify({ accessToken, tokenType, sessionId, expiresAt }),
);

window.history.replaceState(null, '', '/auth/callback');
window.location.assign('/app');
```

## Hash Router 回调

如果业务 App 本身使用 hash router，`redirect_uri` 可以指向 hash 内的回调路由：

```text
https://app.example.com/#/auth/callback?next=%2Fdashboard
```

Auth Mini 回跳时应保留原来的 hash route，并把 token 参数追加到这个 route 的 query 中：

```text
https://app.example.com/#/auth/callback?next=%2Fdashboard&access_token=...&token_type=Bearer&session_id=...&expires_at=...&state=state-123
```

这种情况下，业务 App 不应把整个 `location.hash.slice(1)` 当成 `URLSearchParams`。应先按自己的路由解析 `#/auth/callback?...`，再从该路由的 query 中取 token 参数。

## Auth Mini 负责什么

Auth Mini 登录页负责完成具体登录方式：

- 邮箱 OTP：`POST /email/start` 后调用 `POST /email/verify`。
- Passkey：调用 `POST /webauthn/authenticate/options` 和 `POST /webauthn/authenticate/verify`。
- ED25519：完成 start/verify 挑战签名流程。

这些登录成功后都会创建 Auth Mini session，并得到 `session_id`、`access_token`、`refresh_token`、`token_type` 和 `expires_in`。跳转回业务 App 时，只把业务 App 需要立刻采用的结果放进回调 URL；业务 App 是否直接保存这些 token，还是交给自己的后端换业务会话，由业务 App 决定。

## 业务后端如何信任 token

业务 App 调自己的后端 API 时，可以把 `access_token` 放进请求头：

```text
Authorization: Bearer <access_token>
```

业务后端应使用 Auth Mini 的 `GET /jwks` 验证 JWT 签名，并检查 issuer、过期时间和自己的业务约束。更多后端验证方式见 [Backend JWT verification](./backend-jwt-verification.md)。

## 安全边界

- `redirect_uri` 只应允许 `http:` 或 `https:`。
- 生产环境必须限制允许回跳的业务 App 地址。
- `state` 应是一次性随机值，回调校验成功后立即删除。
- token 不要放在 query string；query string 更容易出现在服务端日志、代理日志和分析系统中。
- fragment 不会随 HTTP 请求发送给服务器，但页面 JavaScript 可以读取，所以业务 App 要避免第三方脚本读取回调页。
- 这不是 OIDC/OAuth 流程；不要假设存在 `client_id`、`scope`、`authorization_code`、`id_token` 或 `grant_type` 语义。
