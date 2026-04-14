# Trust Proxy IP Headers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the request entry path trust proxy IP headers by default with the approved precedence (`CF-Connecting-IP` -> first `X-Forwarded-For` IP -> `Forwarded for=` -> `req.socket.remoteAddress`) and keep logging, session-facing tests, and conflicting specs aligned.

**Architecture:** Keep the change localized to `src/app/commands/start.ts` by adding a tiny resolver next to the existing Node HTTP request bridge, then store that resolved value in the existing `clientIps` `WeakMap` so every downstream consumer continues to read one canonical IP. Prove the behavior in two layers: focused start-command unit tests for precedence/parsing edge cases, then integration tests that hit the real runtime path for logging and session-visible behavior. Finish by updating the two conflicting spec docs so the repository now documents the new default.

**Tech Stack:** TypeScript, Node HTTP server, Vitest unit/integration tests, Markdown specs under `docs/superpowers/specs`

---

## File Structure

- Modify: `src/app/commands/start.ts` - add the request-entry client IP resolver and replace the direct `req.socket.remoteAddress` write with the resolved value.
- Modify: `tests/unit/start-command.test.ts` - add focused tests for header precedence, `Forwarded` parsing, and socket fallback through the real `handleRequest` path.
- Modify: `tests/integration/http-logging.test.ts` - prove request logs use proxy-derived IPs when the runtime is started through `runStartCommand(...)`.
- Modify: `tests/integration/sessions.test.ts` - prove runtime-created sessions and `/me.active_sessions[]` observe the same resolved IP when requests come through proxy headers.
- Modify: `tests/integration/email-auth.test.ts` - align existing session snapshot assertions and naming with the new “resolved client IP” meaning.
- Modify: `tests/integration/ed25519.test.ts` - align existing session snapshot assertions and naming with the new “resolved client IP” meaning.
- Modify: `docs/superpowers/specs/2026-04-01-logging-design.md` - remove the old “do not read `X-Forwarded-For` by default” wording and replace it with the approved precedence.
- Modify: `docs/superpowers/specs/2026-04-13-me-active-sessions-fields-design.md` - replace the old “do not redefine proxy parsing” wording so session `ip` clearly follows the new default resolver.

## Task 1: Add and wire the request-entry client IP resolver

**Files:**

- Modify: `tests/unit/start-command.test.ts`
- Modify: `src/app/commands/start.ts`

- [ ] **Step 1: Write the failing unit tests for precedence and fallback**

Add focused runtime-path tests to `tests/unit/start-command.test.ts` by capturing the `createServer(...)` handler and observing what `getClientIp(request)` returns inside `app.fetch(...)`:

```ts
function createMockResponse() {
  return {
    end: vi.fn(),
    headersSent: false,
    setHeader: vi.fn(),
    statusCode: 200,
  };
}

it('prefers CF-Connecting-IP over forwarded headers and socket address', async () => {
  let observedIp: string | null = null;
  const closeServer = vi.fn((callback?: (error?: Error) => void) =>
    callback?.(),
  );
  const listen = vi.fn((_port: number, _host: string, callback?: () => void) =>
    callback?.(),
  );
  const server = { close: closeServer, listen, off: vi.fn(), once: vi.fn() };

  createDatabaseClient.mockReturnValue({
    close: vi.fn(),
    prepare: vi.fn().mockReturnValue({ all: vi.fn().mockReturnValue([]) }),
  });
  bootstrapKeys.mockResolvedValue({ id: 'key-1', kid: 'kid-1' });
  createServer.mockImplementation((handler) => {
    (server as { handler?: (req: any, res: any) => void }).handler = handler;
    return server;
  });
  createApp.mockImplementation(
    (input: { getClientIp(request: Request): string | null }) => ({
      fetch: vi.fn(async (request: Request) => {
        observedIp = input.getClientIp(request);
        return new Response(null, { status: 204 });
      }),
    }),
  );

  const runStartCommand = await loadRunStartCommand();
  const runtime = await runStartCommand({ dbPath: '/tmp/auth-mini.db' });
  const requestHandler = (server as { handler: (req: any, res: any) => void })
    .handler;

  await requestHandler(
    {
      method: 'GET',
      url: '/jwks',
      headers: {
        host: 'auth-mini.test',
        'cf-connecting-ip': '203.0.113.40',
        'x-forwarded-for': '198.51.100.8, 10.0.0.2',
        forwarded: 'for="[2001:db8::8]:1234";proto=https',
      },
      socket: { remoteAddress: '127.0.0.1' },
      [Symbol.asyncIterator]: async function* () {},
    },
    createMockResponse(),
  );

  expect(observedIp).toBe('203.0.113.40');
  await runtime.close();
});

it('falls back from invalid Forwarded values to the socket address', async () => {
  let observedIp: string | null = null;
  const closeServer = vi.fn((callback?: (error?: Error) => void) =>
    callback?.(),
  );
  const listen = vi.fn((_port: number, _host: string, callback?: () => void) =>
    callback?.(),
  );
  const server = { close: closeServer, listen, off: vi.fn(), once: vi.fn() };

  createDatabaseClient.mockReturnValue({
    close: vi.fn(),
    prepare: vi.fn().mockReturnValue({ all: vi.fn().mockReturnValue([]) }),
  });
  bootstrapKeys.mockResolvedValue({ id: 'key-1', kid: 'kid-1' });
  createServer.mockImplementation((handler) => {
    (server as { handler?: (req: any, res: any) => void }).handler = handler;
    return server;
  });
  createApp.mockImplementation(
    (input: { getClientIp(request: Request): string | null }) => ({
      fetch: vi.fn(async (request: Request) => {
        observedIp = input.getClientIp(request);
        return new Response(null, { status: 204 });
      }),
    }),
  );

  const runStartCommand = await loadRunStartCommand();
  const runtime = await runStartCommand({ dbPath: '/tmp/auth-mini.db' });
  const requestHandler = (server as { handler: (req: any, res: any) => void })
    .handler;

  await requestHandler(
    {
      method: 'GET',
      url: '/jwks',
      headers: {
        host: 'auth-mini.test',
        forwarded: 'for=unknown;proto=https',
      },
      socket: { remoteAddress: '127.0.0.1' },
      [Symbol.asyncIterator]: async function* () {},
    },
    createMockResponse(),
  );

  expect(observedIp).toBe('127.0.0.1');
  await runtime.close();
});
```

- [ ] **Step 2: Run the unit tests to verify they fail**

Run: `npx vitest run tests/unit/start-command.test.ts --grep "client ip|Forwarded|socket address"`
Expected: FAIL because `handleRequest(...)` still writes `req.socket.remoteAddress ?? null` directly and has no header parsing.

- [ ] **Step 3: Add the minimal resolver implementation in `src/app/commands/start.ts`**

Add a small helper cluster directly above `handleRequest(...)`, then use it when populating `clientIps`:

```ts
function resolveClientIp(req: IncomingMessage): string | null {
  return (
    firstHeaderValue(req.headers['cf-connecting-ip']) ??
    firstCommaSeparatedValue(req.headers['x-forwarded-for']) ??
    firstForwardedForValue(req.headers.forwarded) ??
    req.socket.remoteAddress ??
    null
  );
}

function firstHeaderValue(value: string | string[] | undefined): string | null {
  const values = Array.isArray(value) ? value : value ? value.split(',') : [];
  for (const item of values) {
    const candidate = item.trim();
    if (candidate.length > 0) {
      return candidate;
    }
  }
  return null;
}

function firstCommaSeparatedValue(
  value: string | string[] | undefined,
): string | null {
  return firstHeaderValue(Array.isArray(value) ? value.join(',') : value);
}

function firstForwardedForValue(
  value: string | string[] | undefined,
): string | null {
  const entries = (
    Array.isArray(value) ? value.join(',') : (value ?? '')
  ).split(',');
  for (const entry of entries) {
    for (const part of entry.split(';')) {
      const [rawKey, rawValue] = part.split('=', 2);
      if (rawKey?.trim().toLowerCase() !== 'for') {
        continue;
      }

      const normalized = normalizeForwardedForValue(rawValue?.trim() ?? '');
      if (normalized) {
        return normalized;
      }
    }
  }
  return null;
}

function normalizeForwardedForValue(value: string): string | null {
  const unquoted = value.replace(/^"|"$/g, '').trim();
  if (!unquoted || unquoted.toLowerCase() === 'unknown') {
    return null;
  }
  if (unquoted.startsWith('[')) {
    const closing = unquoted.indexOf(']');
    return closing > 1 ? unquoted.slice(1, closing) : null;
  }
  const colonCount = [...unquoted].filter((char) => char === ':').length;
  if (colonCount === 1) {
    return unquoted.split(':', 1)[0]?.trim() ?? null;
  }
  return unquoted;
}
```

Then replace the direct socket assignment:

```ts
clientIps.set(request, resolveClientIp(req));
```

- [ ] **Step 4: Re-run the unit tests to verify they pass**

Run: `npx vitest run tests/unit/start-command.test.ts --grep "client ip|Forwarded|socket address"`
Expected: PASS.

- [ ] **Step 5: Commit the resolver slice**

```bash
git add src/app/commands/start.ts tests/unit/start-command.test.ts
git commit -m "feat: trust proxy client ip headers"
```

## Task 2: Prove HTTP request logging uses the resolved proxy IP

**Files:**

- Modify: `tests/integration/http-logging.test.ts`
- Modify: `src/app/commands/start.ts` (only if Task 1 still needs a tiny parsing fix after real runtime coverage)

- [ ] **Step 1: Replace the old socket-only logging assertion with proxy-aware integration coverage**

Update `tests/integration/http-logging.test.ts` so it exercises the real Node server path instead of the old “header is ignored” expectation:

```ts
it('prefers CF-Connecting-IP in runtime request logs', async () => {
  const runtime = await startLoggedServer();
  openResources.push(runtime);

  const response = await fetch(`${runtime.url}/jwks`, {
    headers: {
      'cf-connecting-ip': '203.0.113.61',
      'x-forwarded-for': '198.51.100.21, 10.0.0.2',
      forwarded: 'for="[2001:db8::5]:1234";proto=https',
    },
  });

  expect(response.status).toBe(200);
  expect(
    runtime.logs.find((entry) => entry.event === 'http.request.completed'),
  ).toMatchObject({
    event: 'http.request.completed',
    status_code: 200,
    ip: '203.0.113.61',
  });
});

it('falls back to Forwarded for= when CF-Connecting-IP and X-Forwarded-For are absent', async () => {
  const runtime = await startLoggedServer();
  openResources.push(runtime);

  const response = await fetch(`${runtime.url}/jwks`, {
    headers: {
      forwarded: 'for="[2001:db8::9]:4321";proto=https',
    },
  });

  expect(response.status).toBe(200);
  expect(
    runtime.logs.find((entry) => entry.event === 'http.request.completed')?.ip,
  ).toBe('2001:db8::9');
});
```

- [ ] **Step 2: Run the logging integration tests to verify they fail first**

Run: `npx vitest run tests/integration/http-logging.test.ts`
Expected: FAIL if the runtime still logs the socket address or if `Forwarded` parsing needs a small fix for quoted/bracketed IPv6 input.

- [ ] **Step 3: Make the smallest runtime fix needed by the integration tests**

If Task 1 already passes these assertions, keep `src/app/commands/start.ts` unchanged. If the integration test exposes a real-header edge case, tighten only the parsing branch that failed. For example, keep the `Forwarded` normalization minimal and local:

```ts
function normalizeForwardedForValue(value: string): string | null {
  const unquoted = value.replace(/^"|"$/g, '').trim();
  if (!unquoted || unquoted.toLowerCase() === 'unknown') {
    return null;
  }
  if (unquoted.startsWith('[')) {
    const closing = unquoted.indexOf(']');
    return closing > 1 ? unquoted.slice(1, closing) : null;
  }
  const colonCount = [...unquoted].filter((char) => char === ':').length;
  return colonCount === 1
    ? (unquoted.split(':', 1)[0]?.trim() ?? null)
    : unquoted;
}
```

- [ ] **Step 4: Re-run the logging integration tests to verify they pass**

Run: `npx vitest run tests/integration/http-logging.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit the logging verification slice**

```bash
git add src/app/commands/start.ts tests/integration/http-logging.test.ts
git commit -m "test: cover proxy-aware request logging"
```

## Task 3: Prove session-facing flows see the same resolved IP

**Files:**

- Modify: `tests/integration/sessions.test.ts`
- Modify: `tests/integration/email-auth.test.ts`
- Modify: `tests/integration/ed25519.test.ts`

- [ ] **Step 1: Add a failing end-to-end session test through `runStartCommand(...)`**

Add runtime coverage in `tests/integration/sessions.test.ts` that signs in through the real HTTP server, then asserts both the stored session row and `/me.active_sessions[]` use the proxy-derived IP:

```ts
async function startSessionServer() {
  otpSeam.current = createOtpMailSeam();
  const dbPath = await createTempDbPath();
  const port = await getAvailablePort();
  const logCollector = createMemoryLogCollector();

  await bootstrapDatabase(dbPath);
  const db = createDatabaseClient(dbPath);
  await bootstrapKeys(db);
  db.prepare('INSERT INTO allowed_origins (origin) VALUES (?)').run(
    'https://app.example.com',
  );
  db.prepare(
    [
      'INSERT INTO smtp_configs',
      '(host, port, username, password, from_email, from_name, secure, is_active, weight)',
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ].join(' '),
  ).run(
    'smtp.example.com',
    587,
    'mailer',
    'secret',
    'noreply@example.com',
    'auth-mini',
    0,
    1,
    1,
  );
  db.close();

  const server = await runStartCommand({
    dbPath,
    host: '127.0.0.1',
    port,
    issuer: 'https://issuer.example',
    loggerSink: logCollector.sink,
  });

  return {
    ...server,
    db: createDatabaseClient(dbPath),
    mailbox: otpSeam.current?.mailbox ?? [],
    url: `http://127.0.0.1:${port}`,
  };
}

it('stores the first X-Forwarded-For IP in sessions and /me active_sessions', async () => {
  const runtime = await startSessionServer();
  openApps.push(runtime);

  await fetch(`${runtime.url}/email/start`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '198.51.100.44, 10.0.0.2',
    },
    body: json({ email: 'proxy-session@example.com' }),
  });

  const code = extractOtpCode(
    findLatestOtpMail(runtime.mailbox, 'proxy-session@example.com')?.text ?? '',
  );
  const verifyResponse = await fetch(`${runtime.url}/email/verify`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '198.51.100.44, 10.0.0.2',
      'user-agent': 'ProxySession/1.0',
    },
    body: json({ email: 'proxy-session@example.com', code }),
  });
  const verifyBody = (await verifyResponse.json()) as {
    session_id: string;
    access_token: string;
  };

  expect(
    runtime.db
      .prepare('SELECT ip FROM sessions WHERE id = ?')
      .get(verifyBody.session_id),
  ).toEqual({ ip: '198.51.100.44' });

  const meResponse = await fetch(`${runtime.url}/me`, {
    headers: { authorization: `Bearer ${verifyBody.access_token}` },
  });

  expect((await meResponse.json()).active_sessions[0]).toMatchObject({
    id: verifyBody.session_id,
    ip: '198.51.100.44',
    user_agent: 'ProxySession/1.0',
  });
});
```

- [ ] **Step 2: Align the existing in-memory auth-flow tests with the new semantic meaning**

Rename the existing snapshot assertions in `tests/integration/email-auth.test.ts` and `tests/integration/ed25519.test.ts` so they explicitly assert the stored value is the already-resolved client IP, not a guaranteed socket IP. Keep the fixtures simple because these tests are validating downstream persistence only:

```ts
it('email verify stores the resolved client IP on the created session', async () => {
  otpSeam.current = createOtpMailSeam();
  const testApp = await createTestApp({ clientIp: '198.51.100.44' });
  openApps.push(testApp);

  await testApp.app.request('/email/start', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: json({ email: 'snapshot@example.com' }),
  });
  const code = extractOtpCode(
    findLatestOtpMail(otpSeam.current.mailbox, 'snapshot@example.com')?.text ??
      '',
  );

  const response = await testApp.app.request('/email/verify', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'User-Agent': 'EmailAgent/1.0 (snapshot)',
    },
    body: json({ email: 'snapshot@example.com', code }),
  });
  const body = (await response.json()) as { session_id: string };

  expect(
    testApp.db
      .prepare('SELECT auth_method, ip, user_agent FROM sessions WHERE id = ?')
      .get(body.session_id),
  ).toEqual({
    auth_method: 'email_otp',
    ip: '198.51.100.44',
    user_agent: 'EmailAgent/1.0 (snapshot)',
  });
});
```

```ts
it('ed25519 verify stores the resolved client IP on the created session', async () => {
  const testApp = await createSignedInApp('ed25519-snapshot@example.com', {
    clientIp: '198.51.100.55',
  });
  openApps.push(testApp);

  const deviceKey = createTestEd25519Keypair('snapshot');
  const credential = await createCredentialForDevice(testApp, {
    name: 'Snapshot device',
    publicKey: deviceKey.publicKey,
  });
  const startBody = await startAuthentication(testApp, credential.id);

  const response = await testApp.app.request('/ed25519/verify', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'User-Agent': 'Ed25519Agent/3.0 (snapshot)',
    },
    body: json({
      request_id: startBody.request_id,
      signature: deviceKey.signChallenge(startBody.challenge),
    }),
  });
  const body = (await response.json()) as { session_id: string };

  expect(
    testApp.db
      .prepare('SELECT auth_method, ip, user_agent FROM sessions WHERE id = ?')
      .get(body.session_id),
  ).toEqual({
    auth_method: 'ed25519',
    ip: '198.51.100.55',
    user_agent: 'Ed25519Agent/3.0 (snapshot)',
  });
});
```

- [ ] **Step 3: Run the session-facing tests to verify the new runtime case fails first**

Run: `npx vitest run tests/integration/sessions.test.ts tests/integration/email-auth.test.ts tests/integration/ed25519.test.ts`
Expected: FAIL in `tests/integration/sessions.test.ts` until the real runtime path stores the resolved header IP consistently; the email/ed25519 wording-only changes should not introduce new failures.

- [ ] **Step 4: Make the smallest fix needed to keep session consumers on the same resolver output**

If Task 1 already writes `clientIps.set(request, resolveClientIp(req));`, no production code change should be required here. If this test still fails, limit the fix to the request-entry assignment in `src/app/commands/start.ts` and do not add any new parsing logic elsewhere:

```ts
const request = new Request(new URL(req.url ?? '/', origin), {
  method: req.method,
  headers: toHeaders(req.headers),
  body:
    req.method === 'GET' || req.method === 'HEAD'
      ? undefined
      : await readRequestBody(req),
});

clientIps.set(request, resolveClientIp(req));
```

- [ ] **Step 5: Re-run the session-facing tests to verify they pass**

Run: `npx vitest run tests/integration/sessions.test.ts tests/integration/email-auth.test.ts tests/integration/ed25519.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit the session-facing verification slice**

```bash
git add tests/integration/sessions.test.ts tests/integration/email-auth.test.ts tests/integration/ed25519.test.ts src/app/commands/start.ts
git commit -m "test: cover proxy-aware session snapshots"
```

## Task 4: Update conflicting spec wording and run focused final verification

**Files:**

- Modify: `docs/superpowers/specs/2026-04-01-logging-design.md`
- Modify: `docs/superpowers/specs/2026-04-13-me-active-sessions-fields-design.md`

- [ ] **Step 1: Update the logging spec wording to match the approved resolver order**

Replace the old direct-socket-only guidance in `docs/superpowers/specs/2026-04-01-logging-design.md` with the new default strategy:

```md
Client IP must come from one explicit request-entry resolver using this precedence:

- `CF-Connecting-IP`
- first IP in `X-Forwarded-For`
- first valid `for=` value in `Forwarded`
- `req.socket.remoteAddress`

Do not add trusted-proxy configuration gates in this change; the current approved behavior is to trust these headers by default when present.
```

- [ ] **Step 2: Update the active-sessions spec wording to point at the new resolver**

Replace the old “do not redefine proxy parsing” sentence in `docs/superpowers/specs/2026-04-13-me-active-sessions-fields-design.md` with wording that explicitly reuses the new default resolver:

```md
- `ip` 按服务端请求入口的默认 client IP resolver 结果落库：`CF-Connecting-IP` -> `X-Forwarded-For` 首个 IP -> `Forwarded for=` -> `req.socket.remoteAddress`。
- session 创建链路不自行重新解析代理头，只复用该统一结果。
```

- [ ] **Step 3: Run the focused verification commands**

Run: `npx vitest run tests/unit/start-command.test.ts tests/integration/http-logging.test.ts tests/integration/sessions.test.ts tests/integration/email-auth.test.ts tests/integration/ed25519.test.ts`
Expected: PASS.

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit the doc alignment slice**

```bash
git add docs/superpowers/specs/2026-04-01-logging-design.md docs/superpowers/specs/2026-04-13-me-active-sessions-fields-design.md
git commit -m "docs: align proxy ip resolver specs"
```

## Self-Review Coverage

- Spec coverage checked: the plan now covers the exact resolver location (`src/app/commands/start.ts`), the approved parse order, logging verification, session-visible verification, and both conflicting spec docs.
- Gap fixed inline: added a real-runtime `tests/integration/sessions.test.ts` slice so the plan proves session storage and `/me.active_sessions[]` use the same request-entry resolver instead of relying only on in-memory `createTestApp(...)` fixtures.
- Gap fixed inline: explicitly limited production changes to `src/app/commands/start.ts` so the plan does not drift into config flags, trusted proxy lists, or extra observability fields.
- Placeholder scan checked: removed vague “update tests as needed” language and replaced it with exact files, commands, expected outcomes, and concrete code snippets.
- Type/behavior consistency checked: every downstream assertion treats `ip` as the already-resolved request-entry value, matching the approved design and avoiding any new per-feature header parsing.
