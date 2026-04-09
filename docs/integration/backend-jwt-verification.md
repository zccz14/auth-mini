# Backend JWT verification

auth-mini separates frontend session recovery from backend API authorization.

- **Access tokens** are short-lived JWTs signed by auth-mini.
- **Refresh tokens** are database-backed secrets used only with auth-mini, together with `session_id`, to mint a new access/refresh pair.

That means your backend usually sees only the access token. It verifies the JWT locally, while the frontend handles refresh with auth-mini when needed.

## Verification chain

1. A user signs in with email OTP or a passkey.
2. auth-mini returns `session_id`, an access token, and a refresh token.
3. The frontend sends the access token to your backend as a bearer token.
4. Your backend fetches `GET /jwks` from auth-mini.
5. Your backend verifies the JWT signature and claims against those public keys.
6. The backend accepts or rejects the request.
7. When the access token expires, the frontend calls `POST /session/refresh` with both `session_id` and `refresh_token`, then retries with the new access token.

## Verifier guidance

- Fetch `GET /jwks` from auth-mini and cache the key set according to your verifier library's normal JWKS caching strategy instead of refetching on every request.
- Validate the JWT `iss` claim against the exact auth-mini issuer origin you configured.
- Validate `aud` when your backend uses audience boundaries; reject tokens minted for a different API audience.
- Authorize requests from the verified JWT claims your backend trusts, rather than calling `GET /me` on every protected request.
- Reserve `/me` for client-facing session/profile views, not as the per-request backend authorization source of truth.

## Why `/jwks` exists

`/jwks` lets API consumers verify access tokens without sharing auth-mini's private keys and without hitting the auth database for every protected request.

`rotate jwks` promotes `STANDBY` to `CURRENT`, then generates a fresh `STANDBY`. `/jwks` always publishes the `CURRENT` and `STANDBY` keys.

Because the previous `CURRENT` key is not retained after rotation, consumers that refresh JWKS after rotation may be unable to verify still-valid access tokens signed before rotation. Plan rotation timing and token lifetimes accordingly.

## Integration boundary

- Frontends talk to auth-mini for sign-in, `/me`, and refresh.
- Backends trust verified access tokens for API authorization and derive request authorization from the verified JWT.
- Refresh tokens should stay between the client and auth-mini; they are not backend bearer tokens.
