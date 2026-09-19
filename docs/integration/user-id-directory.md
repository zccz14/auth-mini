# User ID directory for backend integrations

The user ID directory lets a trusted backend such as Linkit discover every Auth
Mini user without receiving any other user information. It uses a dedicated
opaque bearer token, independent of user sessions and administrator JWTs.

## Administrator workflow

1. Sign in to Auth Mini as the configured administrator.
2. Open **Admin → Users → User ID directory token**.
3. Choose **Generate token** and immediately copy the once-displayed `am_uid_…`
   value into the backend's protected integration settings.
4. For Linkit, open **System → Auth Mini user sync**, paste the token and choose
   **Save and sync**. Linkit then polls on startup and every 60 seconds.

There is one directory token per Auth Mini instance. **Replace token** immediately
invalidates the previous one, and **Revoke token** disables access. Existing
clients must be reconfigured after replacement. The token has no automatic
expiration; it remains valid until it is replaced or revoked.

Auth Mini stores only the SHA-256 hash. The 256-bit secret is generated using the
operating system's random source and is returned only by the creation/replacement
operation. The status endpoint never returns the token or its hash. Keep it in
server-side secret storage and use HTTPS. Do not send it to a frontend SDK or put
it in a URL, logs or browser storage.

## Read the complete directory

```http
GET /integration/user-ids
Authorization: Bearer am_uid_<secret>
```

```json
{ "user_ids": ["00000000-0000-4000-8000-000000000001"] }
```

The object has exactly one field, `user_ids`: every current user ID sorted in
ascending order, including accounts without an email. There is no pagination,
implicit limit or filter. An empty database returns `{"user_ids":[]}`. No email,
profile, timestamp, authentication method, session, credential or administrative
status is included.

Successful responses use `Cache-Control: no-store`. This endpoint is intended
for server-to-server requests and does not return CORS permission headers.

Missing, invalid, replaced or revoked directory tokens return HTTP 401:

```json
{ "error": "invalid_directory_token" }
```

User and administrator JWTs are not accepted at this endpoint. Conversely, the
directory token cannot access `/me`, `/admin/users`, `/admin/config`, database
exports, session management or any other authenticated route.

## Management API

These operations require an administrator JWT for Auth Mini's own audience, not
a downstream application's JWT.

| Method | Path                          | Response                                                      |
| ------ | ----------------------------- | ------------------------------------------------------------- |
| GET    | `/admin/user-directory-token` | `{"configured":true,"created_at":"…"}`; no secret             |
| POST   | `/admin/user-directory-token` | HTTP 201, `{"token":"am_uid_…"}`; replaces any previous token |
| DELETE | `/admin/user-directory-token` | HTTP 204; idempotent revocation                               |

Management responses use `Cache-Control: no-store`. Missing/invalid sessions get
401 and non-administrators get 403. Authentication state, administrator roles,
JWKS rotation and refresh tokens are unchanged by these operations.

## Synchronization semantics

Each response is a complete snapshot at query time. Polling clients should
validate the entire response before changing local state and retain their last
successful state on failure. Revocation prevents subsequent reads but cannot
remove IDs already copied to another application's database. User removal,
local profile retention and application authorization are downstream decisions.

## Verification and complexity

Tests cover hash-only storage, rotation, revocation, no-email users, empty lists,
exact response fields, administrator/self-audience checks and rejection of
cross-purpose tokens. GUI tests cover one-time display, confirmation and load
failure. New branches represent token lifecycle, administrator access and
credential validity. No compatibility fallback is introduced.
