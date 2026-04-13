# Me Active Sessions Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist session creation-time `ip` and `user_agent`, expose `auth_method`/`expires_at`/`ip`/`user_agent` on `GET /me.active_sessions[]`, and keep OpenAPI, generated types, SDK parsing, and demo rendering aligned with the same contract.

**Architecture:** Extend the `sessions` persistence model with nullable `ip` and `user_agent` columns, thread those values through the three session-creation flows, and read them back from `listActiveUserSessions(...)` so `/me` returns storage-backed snapshots instead of request-derived guesses. Keep refresh behavior unchanged except for preserving the new snapshot fields, regenerate the OpenAPI-derived client artifacts from `openapi.yaml`, then update the SDK parser/types and demo table to consume the expanded response shape without mutating stored values.

**Tech Stack:** TypeScript, SQLite (`sql/schema.sql` plus runtime bootstrap migrations in `src/infra/db/bootstrap.ts`), Hono server routes, Vitest integration/unit tests, `@hey-api/openapi-ts` generated API types, React demo UI

---

## File Structure

- Modify: `sql/schema.sql` - add nullable `sessions.ip` and `sessions.user_agent` to the canonical schema used by fresh databases.
- Modify: `src/infra/db/bootstrap.ts` - require the new columns at runtime and migrate existing databases by adding the nullable columns before schema assertions.
- Modify: `src/modules/session/repo.ts` - persist/read `ip` and `userAgent` on `Session`, keep refresh rotation from overwriting them, and return them after inserts/updates.
- Modify: `src/modules/session/service.ts` - accept `ip`/`userAgent` when minting sessions, pass them into `createSession(...)`, and keep refresh signed from the stored session row so snapshot fields remain creation-time only.
- Modify: `src/modules/users/repo.ts` - extend `ActiveSession` and `listActiveUserSessions(...)` to select `auth_method`, `ip`, and `user_agent` from `sessions`.
- Modify: `src/modules/email-auth/service.ts` - pass request snapshot metadata into `mintSessionTokens(...)` during Email OTP verification.
- Modify: `src/modules/webauthn/service.ts` - pass request snapshot metadata into `mintSessionTokens(...)` during WebAuthn authentication.
- Modify: `src/modules/ed25519/service.ts` - pass request snapshot metadata into `mintSessionTokens(...)` during ed25519 authentication.
- Modify: `src/server/app.ts` - thread `c.var.clientIp` and `c.req.header('User-Agent') ?? null` into the three session-creation handlers and return the expanded active-session payload from `/me`.
- Modify: `openapi.yaml` - add `auth_method`, `ip`, and `user_agent` to `SessionSummary`, keeping `ip` and `user_agent` nullable.
- Regenerate: `src/generated/api/types.gen.ts` - refresh generated response types from the updated OpenAPI contract.
- Regenerate: `src/generated/api/sdk.gen.ts` - keep generated operation return types aligned with the updated `MeResponse` schema.
- Modify: `src/sdk/types.ts` - extend `MeActiveSession` with `auth_method`, `ip`, and `user_agent`.
- Modify: `src/sdk/me.ts` - parse the three new fields and keep `null` handling strict for `ip` and `user_agent`.
- Modify: `tests/integration/sessions.test.ts` - cover schema/bootstrap migration behavior, `/me.active_sessions[]` shape, and refresh preserving stored snapshots.
- Modify: `tests/integration/email-auth.test.ts` - verify Email OTP login stores request `ip` and raw `User-Agent` and that `/me` returns them.
- Modify: `tests/integration/webauthn.test.ts` - verify WebAuthn login stores request `ip` and raw `User-Agent` and that `/me` returns them.
- Modify: `tests/integration/ed25519.test.ts` - verify ed25519 login stores request `ip` and raw `User-Agent` and that `/me` returns them.
- Modify: `tests/integration/openapi-contract.test.ts` - assert the OpenAPI contract documents the new fields and nullable semantics.
- Modify: `tests/unit/sdk-session.test.ts` - verify the SDK accepts `/me.active_sessions[]` entries with `auth_method`, `ip`, and `user_agent` and rejects payloads missing required additions.
- Modify: `tests/unit/sdk-dts-build.test.ts` - keep the built declaration surface aligned with the expanded `MeActiveSession` type after regeneration/build.
- Modify: `tests/fixtures/sdk-dts-consumer/module-browser-usage.ts` - assert browser SDK consumers can read `auth_method`, `ip`, and `user_agent`.
- Modify: `tests/fixtures/sdk-dts-consumer/global-usage.ts` - assert global SDK consumers can read `auth_method`, `ip`, and `user_agent`.
- Modify: `examples/demo/src/routes/session.tsx` - add display columns for `auth_method`, `ip`, and truncated `user_agent`, with human-friendly fallback text for `null`.
- Modify: `examples/demo/src/routes/session.test.tsx` - assert the demo renders the new fields, truncates long `user_agent` only in the UI, and does not print raw `null`.

## Task 1: Add DB columns and extend session reads

**Files:**

- Modify: `sql/schema.sql`
- Modify: `src/infra/db/bootstrap.ts`
- Modify: `src/modules/session/repo.ts`
- Modify: `src/modules/users/repo.ts`
- Test: `tests/integration/sessions.test.ts`

- [ ] **Step 1: Write failing persistence and migration tests**

Add integration coverage in `tests/integration/sessions.test.ts` for both fresh-schema and migrated-schema behavior. Use concrete row assertions so the test proves the database columns exist and that history stays `NULL` after bootstrap:

```ts
it('persists session snapshot fields and exposes them in active session rows', async () => {
  const dbPath = await createTempDbPath();
  await bootstrapDatabase(dbPath);
  const db = createDatabaseClient(dbPath);

  try {
    db.prepare(
      'INSERT INTO users (id, email, email_verified_at) VALUES (?, ?, ?)',
    ).run('user-1', 'user-1@example.com', '2030-01-01T00:00:00.000Z');

    const session = createSession(db, {
      userId: 'user-1',
      refreshTokenHash: 'refresh-hash',
      authMethod: 'email_otp',
      ip: '203.0.113.8',
      userAgent: 'Mozilla/5.0 test-agent',
      expiresAt: '2099-01-01T00:00:00.000Z',
    });

    expect(getSessionById(db, session.id)).toMatchObject({
      authMethod: 'email_otp',
      ip: '203.0.113.8',
      userAgent: 'Mozilla/5.0 test-agent',
    });
    expect(
      listActiveUserSessions(db, 'user-1', '2030-01-01T00:00:00.000Z'),
    ).toEqual([
      {
        id: session.id,
        auth_method: 'email_otp',
        created_at: expect.any(String),
        expires_at: '2099-01-01T00:00:00.000Z',
        ip: '203.0.113.8',
        user_agent: 'Mozilla/5.0 test-agent',
      },
    ]);
  } finally {
    db.close();
  }
});

it('bootstraps legacy sessions with null snapshot fields', async () => {
  const dbPath = await createTempDbPath();
  const db = createDatabaseClient(dbPath);

  try {
    db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        email_verified_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        refresh_token_hash TEXT NOT NULL,
        auth_method TEXT NOT NULL CHECK (auth_method IN ('email_otp', 'webauthn', 'ed25519')),
        expires_at TEXT NOT NULL,
        revoked_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE TABLE allowed_origins (origin TEXT PRIMARY KEY);
      CREATE TABLE jwks_keys (id TEXT PRIMARY KEY, kid TEXT NOT NULL, alg TEXT NOT NULL, public_jwk TEXT NOT NULL, private_jwk TEXT NOT NULL);
      CREATE TABLE webauthn_challenges (request_id TEXT PRIMARY KEY, user_id TEXT, challenge TEXT NOT NULL, rp_id TEXT NOT NULL, origin TEXT NOT NULL, expires_at TEXT NOT NULL, consumed_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE webauthn_credentials (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, credential_id TEXT NOT NULL UNIQUE, public_key TEXT NOT NULL, counter INTEGER NOT NULL, transports TEXT NOT NULL DEFAULT '', rp_id TEXT NOT NULL, last_used_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    `);
    db.prepare(
      'INSERT INTO users (id, email, email_verified_at) VALUES (?, ?, ?)',
    ).run('legacy-user', 'legacy@example.com', '2030-01-01T00:00:00.000Z');
    db.prepare(
      'INSERT INTO sessions (id, user_id, refresh_token_hash, auth_method, expires_at) VALUES (?, ?, ?, ?, ?)',
    ).run('legacy-session', 'legacy-user', 'legacy-hash', 'email_otp', '2099-01-01T00:00:00.000Z');
  } finally {
    db.close();
  }

  await bootstrapDatabase(dbPath);
  const migratedDb = createDatabaseClient(dbPath);

  try {
    expect(
      migratedDb.prepare('SELECT ip, user_agent FROM sessions WHERE id = ?').get('legacy-session'),
    ).toEqual({ ip: null, user_agent: null });
  } finally {
    migratedDb.close();
  }
});
```

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run: `npx vitest run tests/integration/sessions.test.ts --grep "snapshot fields|null snapshot fields"`
Expected: FAIL because `sessions.ip`/`sessions.user_agent` do not exist yet and `ActiveSession` does not expose `auth_method`, `ip`, or `user_agent`.

- [ ] **Step 3: Add the canonical schema columns**

Update `sql/schema.sql` so the `sessions` table definition contains nullable creation-snapshot columns directly next to `auth_method` and before `expires_at`:

```sql
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  refresh_token_hash TEXT NOT NULL,
  auth_method TEXT NOT NULL CHECK (auth_method IN ('email_otp', 'webauthn', 'ed25519')),
  ip TEXT,
  user_agent TEXT,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

- [ ] **Step 4: Add runtime bootstrap migration support**

Extend `src/infra/db/bootstrap.ts` so the runtime schema assertion requires `ip` and `user_agent`, and add two nullable-column migrations that leave existing rows untouched:

```ts
const requiredRuntimeSchema = {
  sessions: ['auth_method', 'ip', 'user_agent'],
  allowed_origins: ['origin'],
  jwks_keys: ['id', 'kid', 'alg', 'public_jwk', 'private_jwk'],
  webauthn_challenges: ['rp_id', 'origin'],
  webauthn_credentials: ['rp_id', 'last_used_at'],
} as const;

function addMissingSessionSnapshotColumns(db: ReturnType<typeof createDatabaseClient>): void {
  if (!tableExists(db, 'sessions')) {
    return;
  }

  if (!tableHasColumn(db, 'sessions', 'ip')) {
    db.exec('ALTER TABLE sessions ADD COLUMN ip TEXT');
  }

  if (!tableHasColumn(db, 'sessions', 'user_agent')) {
    db.exec('ALTER TABLE sessions ADD COLUMN user_agent TEXT');
  }
}
```

Call `addMissingSessionSnapshotColumns(db);` inside `bootstrapDatabase(...)` before `assertRequiredTablesAndColumns(...)`.

- [ ] **Step 5: Thread the new fields through repo and active-session reads**

Update `src/modules/session/repo.ts` and `src/modules/users/repo.ts` so the DB layer owns the new fields end-to-end:

```ts
export type Session = {
  id: string;
  userId: string;
  refreshTokenHash: string;
  authMethod: 'email_otp' | 'webauthn' | 'ed25519';
  ip: string | null;
  userAgent: string | null;
  expiresAt: string;
  createdAt: string;
};

db.prepare(
  'INSERT INTO sessions (id, user_id, refresh_token_hash, auth_method, ip, user_agent, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
).run(id, input.userId, input.refreshTokenHash, input.authMethod, input.ip ?? null, input.userAgent ?? null, input.expiresAt);
```

```ts
export type ActiveSession = {
  id: string;
  auth_method: 'email_otp' | 'webauthn' | 'ed25519';
  created_at: string;
  expires_at: string;
  ip: string | null;
  user_agent: string | null;
};

const rows = db.prepare([
  'SELECT id, auth_method, created_at, expires_at, ip, user_agent',
  'FROM sessions',
  'WHERE user_id = ? AND expires_at > ?',
  'ORDER BY created_at ASC, id ASC',
].join(' ')).all(userId, now) as SessionRow[];
```

Keep `rotateRefreshToken(...)` selecting `ip` and `user_agent` after the update so refresh returns the original snapshot intact.

- [ ] **Step 6: Re-run the targeted tests to verify they pass**

Run: `npx vitest run tests/integration/sessions.test.ts --grep "snapshot fields|null snapshot fields"`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add sql/schema.sql src/infra/db/bootstrap.ts src/modules/session/repo.ts src/modules/users/repo.ts tests/integration/sessions.test.ts
git commit -m "feat: persist session snapshot fields"
```

## Task 2: Capture `ip` and `user_agent` on all session-creation paths

**Files:**

- Modify: `src/modules/session/service.ts`
- Modify: `src/modules/email-auth/service.ts`
- Modify: `src/modules/webauthn/service.ts`
- Modify: `src/modules/ed25519/service.ts`
- Modify: `src/server/app.ts`
- Test: `tests/integration/email-auth.test.ts`
- Test: `tests/integration/webauthn.test.ts`
- Test: `tests/integration/ed25519.test.ts`
- Test: `tests/integration/sessions.test.ts`

- [ ] **Step 1: Write failing end-to-end snapshot tests for the three login flows plus refresh**

Add four focused tests.

In `tests/integration/email-auth.test.ts`, create the app with a concrete client IP and send the verification request with a concrete `User-Agent` header:

```ts
it('email verify stores request snapshot fields on the created session', async () => {
  otpSeam.current = createOtpMailSeam();
  const testApp = await createTestApp({ clientIp: '203.0.113.10' });
  openApps.push(testApp);

  await testApp.app.request('/email/start', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: json({ email: 'snapshot@example.com' }),
  });
  const code = extractOtpCode(
    findLatestOtpMail(otpSeam.current.mailbox, 'snapshot@example.com')?.text ?? '',
  );

  const response = await testApp.app.request('/email/verify', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'User-Agent': 'EmailAgent/1.0 (snapshot)',
    },
    body: json({ email: 'snapshot@example.com', code }),
  });

  const body = await response.json();
  expect(
    testApp.db.prepare('SELECT auth_method, ip, user_agent FROM sessions WHERE id = ?').get((body as { session_id: string }).session_id),
  ).toEqual({
    auth_method: 'email_otp',
    ip: '203.0.113.10',
    user_agent: 'EmailAgent/1.0 (snapshot)',
  });
});
```

Add the WebAuthn coverage in `tests/integration/webauthn.test.ts` with `const testApp = await createTestApp({ clientIp: '203.0.113.11' });`, send `/webauthn/authenticate/verify` with header `'User-Agent': 'WebAuthnAgent/2.0 (snapshot)'`, then assert `SELECT auth_method, ip, user_agent FROM sessions WHERE id = ?` returns `{ auth_method: 'webauthn', ip: '203.0.113.11', user_agent: 'WebAuthnAgent/2.0 (snapshot)' }`. Add the ed25519 coverage in `tests/integration/ed25519.test.ts` with `const testApp = await createTestApp({ clientIp: '203.0.113.12' });`, send `/ed25519/verify` with header `'User-Agent': 'Ed25519Agent/3.0 (snapshot)'`, then assert the row returns `{ auth_method: 'ed25519', ip: '203.0.113.12', user_agent: 'Ed25519Agent/3.0 (snapshot)' }`. Add a refresh regression in `tests/integration/sessions.test.ts` that creates a session with `{ ip: '198.51.100.5', userAgent: 'RefreshSource/1.0' }`, calls `POST /session/refresh`, and asserts the stored row still equals `{ ip: '198.51.100.5', user_agent: 'RefreshSource/1.0' }`.

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run: `npx vitest run tests/integration/email-auth.test.ts tests/integration/webauthn.test.ts tests/integration/ed25519.test.ts tests/integration/sessions.test.ts --grep "snapshot fields|stores request snapshot|refresh preserves session snapshot"`
Expected: FAIL because the route handlers and `mintSessionTokens(...)` do not yet pass `clientIp`/`User-Agent` into session creation.

- [ ] **Step 3: Extend the session mint API with snapshot inputs**

Update `src/modules/session/service.ts` so minting accepts nullable request metadata and passes it through to `createSession(...)`:

```ts
export async function mintSessionTokens(
  db: DatabaseClient,
  input: {
    userId: string;
    authMethod: Session['authMethod'];
    ip?: string | null;
    userAgent?: string | null;
    issuer: string;
    logger?: AppLogger;
  },
): Promise<TokenPair & { session: Session }> {
  const session = createSession(db, {
    userId: input.userId,
    refreshTokenHash: hashValue(refreshToken),
    authMethod: input.authMethod,
    ip: input.ip ?? null,
    userAgent: input.userAgent ?? null,
    expiresAt,
  });
```

Do not change `refreshSessionTokens(...)` beyond continuing to sign from `rotatedSession.authMethod`; the stored `rotatedSession.ip` and `rotatedSession.userAgent` must remain untouched.

- [ ] **Step 4: Thread request metadata through the three auth services**

Update the service inputs so each authentication success path passes through the snapshot fields:

```ts
export async function verifyEmailAuth(
  db: DatabaseClient,
  input: {
    email: string;
    code: string;
    issuer: string;
    ip?: string | null;
    userAgent?: string | null;
    logger?: AppLogger;
  },
): Promise<TokenPair> {
  const tokens = await mintSessionTokens(db, {
    userId: user.id,
    authMethod: 'email_otp',
    ip: input.ip ?? null,
    userAgent: input.userAgent ?? null,
    issuer: input.issuer,
    logger: input.logger,
  });
```

Update the WebAuthn success path in `src/modules/webauthn/service.ts` to:

```ts
const tokens = await mintSessionTokens(db, {
  userId: storedCredential.userId,
  authMethod: 'webauthn',
  ip: input.ip ?? null,
  userAgent: input.userAgent ?? null,
  issuer: input.issuer,
  logger: input.logger,
});
```

Update the ed25519 success path in `src/modules/ed25519/service.ts` to:

```ts
const tokens = await mintSessionTokens(db, {
  userId: credential.userId,
  authMethod: 'ed25519',
  ip: input.ip ?? null,
  userAgent: input.userAgent ?? null,
  issuer: input.issuer,
  logger: input.logger,
});
```

- [ ] **Step 5: Pass `clientIp` and raw `User-Agent` from the route handlers**

Update `src/server/app.ts` so only the three session-creation routes supply snapshot metadata:

```ts
const userAgent = c.req.header('User-Agent') ?? null;

const result = await verifyEmailAuth(c.var.db, {
  email: body.email,
  code: body.code,
  issuer: c.var.issuer,
  ip: c.var.clientIp,
  userAgent,
  logger: c.var.logger,
});
```

Update `/webauthn/authenticate/verify` to pass:

```ts
const result = await verifyAuthentication(c.var.db, {
  requestId: body.request_id,
  credential: body.credential,
  origin,
  issuer: c.var.issuer,
  ip: c.var.clientIp,
  userAgent: c.req.header('User-Agent') ?? null,
  logger: c.var.logger,
});
```

Update `/ed25519/verify` to pass:

```ts
const result = await verifyEd25519Authentication(c.var.db, {
  requestId: body.request_id,
  signature: body.signature,
  issuer: c.var.issuer,
  ip: c.var.clientIp,
  userAgent: c.req.header('User-Agent') ?? null,
  logger: c.var.logger,
});
```

Do not thread `ip` or `userAgent` into `/session/refresh`.

- [ ] **Step 6: Re-run the targeted tests to verify they pass**

Run: `npx vitest run tests/integration/email-auth.test.ts tests/integration/webauthn.test.ts tests/integration/ed25519.test.ts tests/integration/sessions.test.ts --grep "snapshot fields|stores request snapshot|refresh preserves session snapshot"`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/modules/session/service.ts src/modules/email-auth/service.ts src/modules/webauthn/service.ts src/modules/ed25519/service.ts src/server/app.ts tests/integration/email-auth.test.ts tests/integration/webauthn.test.ts tests/integration/ed25519.test.ts tests/integration/sessions.test.ts
git commit -m "feat: capture session request snapshots"
```

## Task 3: Expand `/me` and the OpenAPI/generated contract

**Files:**

- Modify: `src/server/app.ts`
- Modify: `openapi.yaml`
- Regenerate: `src/generated/api/types.gen.ts`
- Regenerate: `src/generated/api/sdk.gen.ts`
- Test: `tests/integration/sessions.test.ts`
- Test: `tests/integration/openapi-contract.test.ts`

- [ ] **Step 1: Write failing `/me` response and contract tests**

In `tests/integration/sessions.test.ts`, update the existing `/me` assertions so each `active_sessions[]` element requires the full contract:

```ts
expect(await response.json()).toEqual({
  user_id: testApp.userId,
  email: 'me@example.com',
  webauthn_credentials: [
    {
      id: 'webauthn-credential-1',
      credential_id: 'device-1',
      transports: ['usb'],
      rp_id: 'app.example.com',
      last_used_at: null,
      created_at: expect.any(String),
    },
  ],
  ed25519_credentials: [],
  active_sessions: [
    {
      id: testApp.sessionId,
      auth_method: 'email_otp',
      created_at: expect.any(String),
      expires_at: expect.any(String),
      ip: null,
      user_agent: null,
    },
  ],
});
```

In `tests/integration/openapi-contract.test.ts`, assert the schema shape directly:

```ts
expect(document.components?.schemas?.SessionSummary).toMatchObject({
  required: ['id', 'auth_method', 'created_at', 'expires_at', 'ip', 'user_agent'],
  properties: {
    auth_method: { type: 'string' },
    ip: { type: ['string', 'null'] },
    user_agent: { type: ['string', 'null'] },
  },
});
```

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run: `npx vitest run tests/integration/sessions.test.ts tests/integration/openapi-contract.test.ts --grep "me returns user id|legacy-me|SessionSummary|active session"`
Expected: FAIL because `/me` and `openapi.yaml` still expose the smaller session shape.

- [ ] **Step 3: Return the expanded session object from `/me`**

Keep the `/me` route simple in `src/server/app.ts`: once `listActiveUserSessions(...)` returns the expanded rows from Task 1, return them as-is instead of remapping them back down.

```ts
return c.json({
  user_id: user.id,
  email: user.email,
  webauthn_credentials: listUserWebauthnCredentials(c.var.db, user.id),
  ed25519_credentials: listUserEd25519Credentials(c.var.db, user.id),
  active_sessions: listActiveUserSessions(
    c.var.db,
    user.id,
    new Date().toISOString(),
  ),
});
```

- [ ] **Step 4: Update OpenAPI and regenerate generated files**

Change `openapi.yaml` so `SessionSummary` becomes:

```yaml
SessionSummary:
  type: object
  additionalProperties: false
  required:
    - id
    - auth_method
    - created_at
    - expires_at
    - ip
    - user_agent
  properties:
    id:
      type: string
      format: uuid
    auth_method:
      type: string
    created_at:
      type: string
      format: date-time
    expires_at:
      type: string
      format: date-time
    ip:
      type:
        - 'string'
        - 'null'
    user_agent:
      type:
        - 'string'
        - 'null'
```

Then regenerate and capture the produced artifacts:

Run: `npm run generate:api`
Expected: `src/generated/api/types.gen.ts` and `src/generated/api/sdk.gen.ts` update so `SessionSummary`/`MeResponse` include `auth_method`, `ip`, and `user_agent`.

- [ ] **Step 5: Re-run the targeted tests plus generated-artifact drift check**

Run: `npx vitest run tests/integration/sessions.test.ts tests/integration/openapi-contract.test.ts --grep "me returns user id|legacy-me|SessionSummary|active session" && npm run check:generated:api`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/server/app.ts openapi.yaml src/generated/api/types.gen.ts src/generated/api/sdk.gen.ts tests/integration/sessions.test.ts tests/integration/openapi-contract.test.ts
git commit -m "feat: expose session snapshot fields in me contract"
```

## Task 4: Update SDK types, parser, and declaration consumers

**Files:**

- Modify: `src/sdk/types.ts`
- Modify: `src/sdk/me.ts`
- Modify: `tests/unit/sdk-session.test.ts`
- Modify: `tests/unit/sdk-dts-build.test.ts`
- Modify: `tests/fixtures/sdk-dts-consumer/module-browser-usage.ts`
- Modify: `tests/fixtures/sdk-dts-consumer/global-usage.ts`

- [ ] **Step 1: Write failing parser and consumer tests**

In `tests/unit/sdk-session.test.ts`, add one success case and one strictness case:

```ts
it('me.fetch returns active session snapshot fields', async () => {
  const sdk = createAuthMiniForTest({
    storage: fakeAuthenticatedStorage(),
    fetch: vi.fn().mockResolvedValueOnce(
      jsonResponse({
        user_id: 'u1',
        email: 'updated@example.com',
        webauthn_credentials: [],
        ed25519_credentials: [],
        active_sessions: [
          {
            id: 'session-1',
            auth_method: 'webauthn',
            created_at: '2026-04-13T00:00:00.000Z',
            expires_at: '2026-04-13T01:00:00.000Z',
            ip: '203.0.113.20',
            user_agent: 'SDKAgent/1.0',
          },
        ],
      }),
    ),
  });

  const me = await sdk.me.fetch();
  expect(me.active_sessions[0]).toEqual({
    id: 'session-1',
    auth_method: 'webauthn',
    created_at: '2026-04-13T00:00:00.000Z',
    expires_at: '2026-04-13T01:00:00.000Z',
    ip: '203.0.113.20',
    user_agent: 'SDKAgent/1.0',
  });
});

it('rejects /me payloads that omit active_sessions auth_method', async () => {
  const sdk = createAuthMiniForTest({
    storage: fakeAuthenticatedStorage(),
    fetch: vi.fn().mockResolvedValueOnce(
      jsonResponse({
        user_id: 'u1',
        email: 'updated@example.com',
        webauthn_credentials: [],
        ed25519_credentials: [],
        active_sessions: [{ id: 'session-1', created_at: '...', expires_at: '...', ip: null, user_agent: null }],
      }),
    ),
  });

  await expect(sdk.me.fetch()).rejects.toMatchObject({ error: 'request_failed' });
});
```

Extend `tests/fixtures/sdk-dts-consumer/module-browser-usage.ts` and `tests/fixtures/sdk-dts-consumer/global-usage.ts` with concrete type reads:

```ts
const authMethod: string = me.active_sessions[0].auth_method;
const ip: string | null = me.active_sessions[0].ip;
const userAgent: string | null = me.active_sessions[0].user_agent;
```

- [ ] **Step 2: Run the targeted SDK tests to verify they fail**

Run: `npx vitest run tests/unit/sdk-session.test.ts tests/unit/sdk-dts-build.test.ts --grep "active session snapshot fields|sdk d.ts build artifact"`
Expected: FAIL because `MeActiveSession` and `parseActiveSession(...)` do not yet require or expose the new fields.

- [ ] **Step 3: Extend the SDK runtime types and parser**

Update `src/sdk/types.ts`:

```ts
export type MeActiveSession = {
  id: string;
  auth_method: string;
  created_at: string;
  expires_at: string;
  ip: string | null;
  user_agent: string | null;
};
```

Update `src/sdk/me.ts` so `parseActiveSession(...)` becomes:

```ts
function parseActiveSession(value: unknown): MeActiveSession {
  const record = asRecord(value);

  if (!record) {
    throw createInvalidMeError();
  }

  return {
    id: requireString(record.id),
    auth_method: requireString(record.auth_method),
    created_at: requireString(record.created_at),
    expires_at: requireString(record.expires_at),
    ip: requireNullableString(record.ip),
    user_agent: requireNullableString(record.user_agent),
  };
}
```

- [ ] **Step 4: Re-run the targeted SDK tests to verify they pass**

Run: `npx vitest run tests/unit/sdk-session.test.ts tests/unit/sdk-dts-build.test.ts --grep "active session snapshot fields|sdk d.ts build artifact"`
Expected: PASS.

- [ ] **Step 5: Run the consumer compile and focused build verification**

Run: `npm run build && npx tsc -p tests/fixtures/sdk-dts-consumer/tsconfig.json --noEmit`
Expected: PASS, and the consumer fixtures type-check with `auth_method`, `ip`, and `user_agent` available on `me.active_sessions[0]`.

- [ ] **Step 6: Commit**

```bash
git add src/sdk/types.ts src/sdk/me.ts tests/unit/sdk-session.test.ts tests/unit/sdk-dts-build.test.ts tests/fixtures/sdk-dts-consumer/module-browser-usage.ts tests/fixtures/sdk-dts-consumer/global-usage.ts
git commit -m "feat: expose session snapshot fields in sdk me response"
```

## Task 5: Render the new fields in the demo session table

**Files:**

- Modify: `examples/demo/src/routes/session.tsx`
- Modify: `examples/demo/src/routes/session.test.tsx`

- [ ] **Step 1: Write failing demo rendering tests**

Update `examples/demo/src/routes/session.test.tsx` so the mocked `/me` payload includes the new fields and the UI assertions verify truncation/fallback behavior:

```ts
sdkMocks.meFetch.mockResolvedValueOnce({
  user_id: 'user-1',
  email: 'user@example.com',
  webauthn_credentials: [],
  ed25519_credentials: [],
  active_sessions: [
    {
      id: 'session-current',
      auth_method: 'email_otp',
      created_at: '2026-04-12T00:00:00.000Z',
      expires_at: '2026-04-12T01:00:00.000Z',
      ip: '203.0.113.30',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/537.36 SnapshotBrowser/123.45',
    },
    {
      id: 'session-peer',
      auth_method: 'webauthn',
      created_at: '2026-04-12T00:05:00.000Z',
      expires_at: '2026-04-12T01:05:00.000Z',
      ip: null,
      user_agent: null,
    },
  ],
});

expect(screen.getByText('email_otp')).toBeInTheDocument();
expect(screen.getByText('203.0.113.30')).toBeInTheDocument();
expect(screen.getByText(/Mozilla\/5\.0 .*\.\.\./)).toBeInTheDocument();
expect(screen.getAllByText('Unavailable')).not.toHaveLength(0);
expect(screen.queryByText('null')).not.toBeInTheDocument();
```

- [ ] **Step 2: Run the targeted demo tests to verify they fail**

Run: `npm --prefix examples/demo exec vitest run src/routes/session.test.tsx`
Expected: FAIL because the current table only renders session id, created_at, expires_at, and action columns.

- [ ] **Step 3: Add table columns plus display-only truncation helpers**

Update `examples/demo/src/routes/session.tsx` with small display helpers and new columns. Keep the stored data untouched and only shorten the rendered string:

```tsx
function formatNullable(value: string | null) {
  return value === null ? 'Unavailable' : value;
}

function truncateUserAgent(value: string | null) {
  if (value === null) {
    return 'Unavailable';
  }

  return value.length > 48 ? `${value.slice(0, 45)}...` : value;
}
```

Add `Auth Method`, `IP`, and `User-Agent` table headers, render `activeSession.auth_method`, `formatNullable(activeSession.ip)`, and `truncateUserAgent(activeSession.user_agent)`, and keep the raw `activeSession.id`-based kick action unchanged.

- [ ] **Step 4: Re-run the targeted demo tests to verify they pass**

Run: `npm --prefix examples/demo exec vitest run src/routes/session.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add examples/demo/src/routes/session.tsx examples/demo/src/routes/session.test.tsx
git commit -m "feat: show session snapshot fields in demo"
```

## Task 6: Final verification sweep

**Files:**

- Test: `tests/integration/sessions.test.ts`
- Test: `tests/integration/email-auth.test.ts`
- Test: `tests/integration/webauthn.test.ts`
- Test: `tests/integration/ed25519.test.ts`
- Test: `tests/integration/openapi-contract.test.ts`
- Test: `tests/unit/sdk-session.test.ts`
- Test: `tests/unit/sdk-dts-build.test.ts`
- Test: `examples/demo/src/routes/session.test.tsx`

- [ ] **Step 1: Run the focused red-green confirmation slice**

Run: `npx vitest run tests/integration/sessions.test.ts tests/integration/email-auth.test.ts tests/integration/webauthn.test.ts tests/integration/ed25519.test.ts tests/integration/openapi-contract.test.ts tests/unit/sdk-session.test.ts tests/unit/sdk-dts-build.test.ts`
Expected: PASS.

- [ ] **Step 2: Run generated-artifact and consumer verification**

Run: `npm run check:generated:api && npm run build && npx tsc -p tests/fixtures/sdk-dts-consumer/tsconfig.json --noEmit`
Expected: PASS.

- [ ] **Step 3: Run demo verification**

Run: `npm --prefix examples/demo run typecheck && npm --prefix examples/demo exec vitest run src/routes/session.test.tsx`
Expected: PASS.

- [ ] **Step 4: Run the repo-level confidence sweep**

Run: `npm test && npm run lint && npm run demo:build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add sql src openapi.yaml tests examples/demo/src/routes/session.tsx examples/demo/src/routes/session.test.tsx
git commit -m "test: verify me session snapshot field rollout"
```

## Self-Review

- Spec coverage: covered schema/bootstrap migration plus `NULL` backfill in Task 1; Email OTP/WebAuthn/ed25519 writes plus refresh non-overwrite in Task 2; `/me`, OpenAPI, and generated types in Task 3; SDK parser/types in Task 4; demo rendering and truncation/fallback semantics in Task 5; cross-layer verification in Task 6.
- Placeholder scan: no placeholder markers remain; each task lists exact file paths, concrete test files, explicit commands, and expected outcomes.
- Type consistency: the plan uses `auth_method`, `ip`, and `user_agent` for `/me`/OpenAPI/SDK outward-facing fields, and `authMethod`, `ip`, and `userAgent` for internal TypeScript repo/service fields, matching the current snake_case-over-the-wire and camelCase-internal pattern.
