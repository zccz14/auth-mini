# auth-mini Logging Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add structured JSON logging to `auth-mini` with `pino`, covering HTTP, CLI, auth flows, SMTP, and key runtime events without leaking secrets.

**Architecture:** Introduce a thin shared logger module backed by `pino`, then thread request-scoped and command-scoped loggers through the existing composition points instead of calling `console.*` directly. Request middleware emits one canonical terminal request event per request, while business modules emit focused domain events with allowlisted fields only.

**Tech Stack:** TypeScript, Node.js, Hono, pino, Vitest, better-sqlite3

---

## File Structure

- Create: `src/shared/logger.ts` - `pino` setup, base bindings, child logger helpers, error-field helper, request id helper
- Modify: `src/server/app.ts` - logger-aware app variables, request middleware, request completion logging, error boundary logging
- Modify: `src/cli/start.ts` - root logger creation, socket remote address plumbing, server lifecycle logs
- Modify: `src/cli/create.ts` - command lifecycle logs
- Modify: `src/cli/rotate-jwks.ts` - command lifecycle logs
- Modify: `src/modules/email-auth/service.ts` - replace `console.*`, emit OTP lifecycle events without logging OTP values
- Modify: `src/modules/session/service.ts` - emit refresh/logout/session mint events
- Modify: `src/modules/webauthn/service.ts` - emit register/authenticate option and verify outcome events without raw payload dumps
- Modify: `src/modules/jwks/service.ts` - emit bootstrap/read/rotate/signing-key lifecycle events
- Modify: `src/infra/smtp/mailer.ts` - emit SMTP selection and send outcome events without transport secrets
- Modify: `src/infra/db/bootstrap.ts` - emit DB bootstrap or migration lifecycle logs if composition allows
- Modify: `tests/helpers/app.ts` - inject deterministic logger sink for integration tests
- Create: `tests/helpers/logging.ts` - capture JSON log lines in memory and parse them for assertions
- Create: `tests/unit/logger.test.ts` - logger module unit tests
- Create: `tests/integration/http-logging.test.ts` - request lifecycle and client-IP logging tests
- Modify: `tests/integration/email-auth.test.ts` - assert email auth and SMTP events
- Modify: `tests/integration/sessions.test.ts` - assert session and request events
- Modify: `tests/integration/webauthn.test.ts` - assert WebAuthn events
- Modify: `tests/integration/jwks.test.ts` - assert JWKS events
- Modify: `tests/unit/cli.test.ts` or create `tests/integration/cli-logging.test.ts` - assert CLI/server lifecycle logs at the correct boundary
- Modify: `package.json` - add `pino` dependency and any matching type package only if needed
- Modify: `README.md` - add a short section describing JSON log behavior and file redirection usage

## Chunk 1: Logger Foundation And HTTP Plumbing

### Task 1: Add `pino` and create the shared logger module

**Files:**

- Modify: `package.json`
- Create: `src/shared/logger.ts`
- Create: `tests/unit/logger.test.ts`

- [ ] **Step 1: Write the failing logger unit tests**

Create `tests/unit/logger.test.ts` with coverage for:

```ts
import { describe, expect, it } from 'vitest';
import {
  createRootLogger,
  createMemoryLoggerSink,
  withErrorFields,
} from '../../src/shared/logger.js';

describe('shared logger', () => {
  it('writes JSON entries with base service fields', () => {
    const sink = createMemoryLoggerSink();
    const logger = createRootLogger({ sink });

    logger.info({ event: 'test.event' }, 'hello');

    expect(sink.entries[0]).toMatchObject({
      service: 'auth-mini',
      event: 'test.event',
      msg: 'hello',
    });
  });

  it('creates child loggers that preserve parent bindings', () => {
    const sink = createMemoryLoggerSink();
    const logger = createRootLogger({ sink }).child({ request_id: 'req-1' });

    logger.info({ event: 'child.event', email: 'user@example.com' }, 'ok');

    expect(sink.entries[0]).toMatchObject({
      service: 'auth-mini',
      request_id: 'req-1',
      event: 'child.event',
      email: 'user@example.com',
    });
  });

  it('serializes known error fields without dumping arbitrary objects', () => {
    const error = new Error('boom');
    expect(withErrorFields(error)).toMatchObject({
      error_name: 'Error',
      error_message: 'boom',
    });
  });
});
```

- [ ] **Step 2: Run the logger unit tests to verify they fail**

Run: `npm test -- --run tests/unit/logger.test.ts`
Expected: FAIL because `src/shared/logger.ts` does not exist yet.

- [ ] **Step 3: Add `pino` to dependencies**

Update `package.json` dependencies with `pino` and install it with `npm install`.

- [ ] **Step 4: Implement `src/shared/logger.ts`**

Build a minimal wrapper around `pino` with these exports:

```ts
export type AppLogger = {
  child(bindings: Record<string, unknown>): AppLogger;
  info(bindings: Record<string, unknown>, msg: string): void;
  warn(bindings: Record<string, unknown>, msg: string): void;
  error(bindings: Record<string, unknown>, msg: string): void;
};

export function createRootLogger(options?: {
  sink?: { write(line: string): void };
}): AppLogger;

export function createRequestId(): string;

export function withErrorFields(error: unknown): Record<string, unknown>;
```

Implementation rules:

- default base bindings include `service: 'auth-mini'`
- output stays JSON-only with no pretty transport
- `withErrorFields` returns only allowlisted error metadata such as `error_name`, `error_message`, and optionally `stack`
- do not export raw `pino` instances from the module
- include a memory sink helper for tests if that keeps assertions simple

- [ ] **Step 5: Run the logger unit tests to verify they pass**

Run: `npm test -- --run tests/unit/logger.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit the foundation change**

```bash
git add package.json package-lock.json src/shared/logger.ts tests/unit/logger.test.ts
git commit -m "feat: add shared structured logger"
```

### Task 2: Thread logger context through the app and emit canonical request logs

**Files:**

- Modify: `src/server/app.ts`
- Modify: `src/cli/start.ts`
- Modify: `tests/helpers/app.ts`
- Create: `tests/helpers/logging.ts`
- Create: `tests/integration/http-logging.test.ts`

- [ ] **Step 1: Write failing integration tests for request lifecycle logs**

Add `tests/helpers/logging.ts` with a reusable memory sink + parsed-entry helper, then use it from both `tests/helpers/app.ts` and a new `tests/integration/http-logging.test.ts` file so request logging assertions do not depend on email-auth fixture details.

Create these focused tests in `tests/integration/http-logging.test.ts`:

1. a success-path request test against `/jwks` that asserts `http.request.started` and exactly one `http.request.completed` for the same `request_id`, and that the completed event includes `status_code: 200` and `duration_ms: expect.any(Number)`
2. a handled-error test using `/email/start` with no active SMTP config that asserts:
   - response status is `503`
   - exactly one `http.request.completed` exists for that request
   - that terminal event includes `status_code: 503` and `duration_ms: expect.any(Number)`
   - no second terminal request event is emitted
3. an unhandled-exception test using a minimal throw-only app fixture that asserts:
   - one diagnostic error log with `error_name` and `error_message`
   - still exactly one `http.request.completed` for that `request_id`
   - that terminal event includes `status_code: 500` and `duration_ms: expect.any(Number)`

Example success-path skeleton:

```ts
it('emits request start and one terminal completion event', async () => {
  const testApp = await createTestApp();

  const response = await testApp.app.request('/jwks', {
    method: 'GET',
    headers: {
      'x-auth-mini-remote-address': '203.0.113.5',
    },
  });

  expect(response.status).toBe(200);
  const requestId = testApp.logs.find(
    (entry) => entry.event === 'http.request.started',
  )?.request_id;
  const completed = testApp.logs.find(
    (entry) =>
      entry.request_id === requestId &&
      entry.event === 'http.request.completed',
  );

  expect(testApp.logs).toContainEqual(
    expect.objectContaining({
      event: 'http.request.started',
      method: 'GET',
      path: '/jwks',
    }),
  );
  expect(
    testApp.logs.filter(
      (entry) =>
        entry.request_id === requestId &&
        entry.event === 'http.request.completed',
    ),
  ).toHaveLength(1);
  expect(completed).toMatchObject({
    event: 'http.request.completed',
    status_code: 200,
    duration_ms: expect.any(Number),
  });
});
```

Use a single internal remote-address mechanism for both runtime adapter code and tests: `src/cli/start.ts` populates `x-auth-mini-remote-address` from `req.socket.remoteAddress`, and test helpers may populate the same header explicitly. Do not read `X-Forwarded-For`.

- [ ] **Step 2: Run the focused request-logging tests to verify they fail**

Run: `npm test -- --run tests/integration/http-logging.test.ts`
Expected: FAIL because request logs are not emitted or cannot yet be captured.

- [ ] **Step 3: Add request logger plumbing in `src/server/app.ts`**

Make these structural changes:

- extend `AppVariables` with `logger: AppLogger`, `requestId: string`, and `clientIp: string | null`
- update `createApp()` input to accept a root `logger`
- add the first middleware to bind `db`, config, root logger, request id, and client ip
- add a request middleware that records:
  - `http.request.started`
  - exactly one terminal `http.request.completed`
- log allowlisted request fields only: `request_id`, `method`, `path`, `route`, `status_code`, `duration_ms`, `ip`
- if an unhandled exception bubbles, emit one diagnostic error log with `withErrorFields(error)` and still return a single terminal `http.request.completed`
- correlate per-request log entries by `request_id`, and make tests assert terminal-event count by filtering `event === 'http.request.completed'` for the same `request_id`

Suggested field flow:

```ts
const requestId = createRequestId();
const logger = input.logger.child({ request_id: requestId });
const startedAt = Date.now();
```

- [ ] **Step 4: Write a failing runtime test for direct-socket client IP capture**

Add a runtime integration test using `runStartCommand(...)` and a real network request, then assert the captured `http.request.completed` log includes an `ip` derived from the direct socket path even when the request sends `X-Forwarded-For`.

Suggested shape:

```ts
it('captures client ip from the direct socket path', async () => {
  const runtime = await startLoggedServer();

  const response = await fetch(runtime.url + '/jwks', {
    headers: { 'x-forwarded-for': '198.51.100.9' },
  });

  expect(response.status).toBe(200);
  const completed = runtime.logs.find(
    (entry) => entry.event === 'http.request.completed',
  );

  expect(completed).toMatchObject({
    event: 'http.request.completed',
    status_code: 200,
    ip: expect.any(String),
  });
  expect(completed?.ip).not.toBe('198.51.100.9');
});
```

Run: `npm test -- --run tests/integration/http-logging.test.ts`
Expected: FAIL before `src/cli/start.ts` is updated.

- [ ] **Step 5: Update `src/cli/start.ts` to create the root logger and pass client IP explicitly**

Implement:

- `const logger = createRootLogger()` near config parsing
- `createApp({ db, issuer, origins, rpId, logger })`
- attach the direct socket remote address to the synthesized `Request`, for example by setting a private request header like `x-auth-mini-remote-address` before `app.fetch(request)` or by passing it through an app adapter hook
- log `cli.start.started`, `server.listening`, and `server.shutdown.completed`
- never log request or response bodies

Use only the Node socket remote address by default. Do not read `X-Forwarded-For`.

- [ ] **Step 6: Update test app creation to inject a memory sink logger**

In `tests/helpers/app.ts`:

- create a memory sink logger with `createRootLogger({ sink })`
- pass the logger into `createApp`
- return `logs` from parsed sink entries to test callers

- [ ] **Step 7: Run the focused logger tests again**

Run:

- `npm test -- --run tests/unit/logger.test.ts`
- `npm test -- --run tests/integration/http-logging.test.ts`

Expected: PASS for the new request lifecycle assertions.

- [ ] **Step 8: Commit the request logging plumbing**

```bash
git add src/server/app.ts src/cli/start.ts tests/helpers/app.ts tests/helpers/logging.ts tests/integration/http-logging.test.ts
git commit -m "feat: add request lifecycle logging"
```

## Chunk 2: Domain Events, CLI Coverage, And Documentation

### Task 3: Replace ad hoc console logging and add domain-level events

**Files:**

- Modify: `src/modules/email-auth/service.ts`
- Modify: `src/infra/smtp/mailer.ts`
- Modify: `src/modules/session/service.ts`
- Modify: `src/modules/webauthn/service.ts`
- Modify: `src/modules/jwks/service.ts`
- Modify: `tests/integration/email-auth.test.ts`
- Modify: `tests/integration/sessions.test.ts`
- Modify: `tests/integration/webauthn.test.ts`
- Modify: `tests/integration/jwks.test.ts`

- [ ] **Step 1: Write failing integration assertions for domain events**

Add assertions that logs include these events with allowlisted fields only:

- email flow: `email.start.requested`, `email.start.sent`, `email.start.failed`, `email.verify.succeeded`, `email.verify.failed`
- SMTP flow: `smtp.send.attempted`, `smtp.send.succeeded`, `smtp.send.failed`
- session flow: `session.refresh.succeeded`, `session.refresh.failed`, `session.logout.succeeded`
- WebAuthn flow: `webauthn.register.options.created`, `webauthn.register.verify.succeeded`, `webauthn.register.verify.failed`, `webauthn.authenticate.options.created`, `webauthn.authenticate.verify.succeeded`, `webauthn.authenticate.verify.failed`
- JWKS flow: `jwks.read`, `jwks.rotated`

Add negative assertions where useful, for example:

```ts
expect(JSON.stringify(testApp.logs)).not.toContain('verification code is');
expect(JSON.stringify(testApp.logs)).not.toContain(
  testApp.tokens.refresh_token,
);
```

Use existing scenarios instead of inventing new fixtures:

- `tests/integration/email-auth.test.ts`
  - `captures outgoing otp email in mock mailbox` => assert `email.start.requested` + `email.start.sent`
  - `email/start returns 503 smtp_not_configured when no active smtp exists` => assert `email.start.failed`
  - `email/start invalidates the pending otp if smtp send fails` => assert `smtp.send.attempted` + `smtp.send.failed`
  - one successful verify test => assert `email.verify.succeeded`
  - one invalid or expired verify test => assert `email.verify.failed`
- `tests/integration/sessions.test.ts`
  - `refresh rotates the refresh token` => assert `session.refresh.succeeded`
  - `refresh rejects revoked session reuse` or `refresh rejects expired session` => assert `session.refresh.failed`
  - `logout revokes the session referenced by sid` => assert `session.logout.succeeded`
- `tests/integration/webauthn.test.ts`
  - registration options => assert `webauthn.register.options.created`
  - successful registration verify => assert `webauthn.register.verify.succeeded`
  - invalid registration verify => assert `webauthn.register.verify.failed`
  - authentication options => assert `webauthn.authenticate.options.created`
  - successful authentication verify => assert `webauthn.authenticate.verify.succeeded`
  - invalid authentication verify => assert `webauthn.authenticate.verify.failed`
- `tests/integration/jwks.test.ts`
  - public key listing path => assert `jwks.read`
  - key rotation path => assert `jwks.rotated`

- [ ] **Step 2: Run the relevant integration suites to verify they fail**

Run:

- `npm test -- --run tests/integration/email-auth.test.ts`
- `npm test -- --run tests/integration/sessions.test.ts`
- `npm test -- --run tests/integration/webauthn.test.ts`
- `npm test -- --run tests/integration/jwks.test.ts`

Expected: FAIL because the domain events do not exist yet.

- [ ] **Step 3: Refactor service entry points to accept logger context**

Apply the smallest change that keeps call sites readable. Prefer adding a `logger` field to service input objects rather than introducing global state.

Examples:

```ts
await startEmailAuth(c.var.db, {
  email: body.email,
  logger: c.var.logger,
  ip: c.var.clientIp,
});

await refreshSessionTokens(c.var.db, {
  refreshToken: body.refresh_token,
  issuer: c.var.issuer,
  logger: c.var.logger,
});
```

Only add logger to service input objects at composition boundaries already touched by HTTP handlers or CLI commands; do not refactor repo-layer functions to accept loggers.

Implementation rules:

- remove `console.log`, `console.info`, and `console.error`
- never log OTP code, access token, refresh token, SMTP password, or raw WebAuthn payloads
- log only explicit allowlisted fields such as `email`, `ip`, `session_id`, `credential_id`, `kid`, `smtp_config_id`, `smtp_host`, `smtp_port`
- `src/infra/smtp/mailer.ts` must not log raw Nodemailer transport options because they contain credentials

- [ ] **Step 4: Add focused event emission in each module**

Use these minimum placements:

- `src/modules/email-auth/service.ts`
  - before OTP issue: `email.start.requested`
  - after successful send: `email.start.sent`
  - on send failure: `email.start.failed`
  - after successful verify/session mint: `email.verify.succeeded`
  - on invalid OTP: `email.verify.failed`
- `src/infra/smtp/mailer.ts`
  - before send: `smtp.send.attempted`
  - after accepted recipient check: `smtp.send.succeeded`
  - on transport or delivery error: `smtp.send.failed`
- `src/modules/session/service.ts`
  - on refresh success/failure: `session.refresh.succeeded` / `session.refresh.failed`
  - on logout: `session.logout.succeeded`
- `src/modules/webauthn/service.ts`
  - registration/authentication option creation and verify outcomes
- `src/modules/jwks/service.ts`
  - on the JWKS public key read or listing path: `jwks.read`
  - in `rotateKeys`: `jwks.rotated`
  - do not treat `jwks.read` as optional; it is part of the required event contract

- [ ] **Step 5: Run the domain integration suites until they pass**

Run the same four commands from Step 2.
Expected: PASS.

- [ ] **Step 6: Commit the domain logging changes**

```bash
git add src/modules/email-auth/service.ts src/infra/smtp/mailer.ts src/modules/session/service.ts src/modules/webauthn/service.ts src/modules/jwks/service.ts tests/integration/email-auth.test.ts tests/integration/sessions.test.ts tests/integration/webauthn.test.ts tests/integration/jwks.test.ts
git commit -m "feat: log auth and infrastructure events"
```

### Task 4: Finish CLI/runtime coverage, document behavior, and run full verification

**Files:**

- Modify: `src/cli/create.ts`
- Modify: `src/cli/rotate-jwks.ts`
- Modify: `src/cli/start.ts`
- Modify: `src/infra/db/bootstrap.ts`
- Modify: `tests/helpers/cli.ts`
- Create: `tests/integration/cli-logging.test.ts`
- Modify: `README.md`

- [ ] **Step 1: Write failing tests for CLI/runtime lifecycle logging**

Add test coverage for:

- `cli.create.started` and `cli.create.completed`
- `cli.rotate_jwks.started` and `cli.rotate_jwks.completed`
- DB migration lifecycle events from `src/infra/db/bootstrap.ts`: `db.migration.started` and `db.migration.completed`

Do not re-test start lifecycle events here; they belong to Chunk 1 because Chunk 1 already implements them in `src/cli/start.ts`.

Use a memory sink logger or injected output hook rather than asserting on stdout text.

- [ ] **Step 2: Run the CLI-focused tests to verify they fail**

Run: `npm test -- --run tests/integration/cli-logging.test.ts`
Expected: FAIL or incomplete coverage for the new lifecycle events.

- [ ] **Step 3: Implement CLI and DB lifecycle logs**

Make sure command handlers:

- create child loggers with `command`, `db_path`, and other safe context
- emit start/completion logs at command boundaries
- do not imply a long-running `start` command has “completed” before shutdown; use `server.listening` and `server.shutdown.completed`
- emit `db.migration.started` immediately before the schema bootstrap or migration execution in `src/infra/db/bootstrap.ts`, and emit `db.migration.completed` after it succeeds
- do not emit duplicate per-table or per-statement migration logs

- [ ] **Step 4: Document the logging contract in `README.md`**

Add a short section that states:

- `auth-mini` writes structured JSON logs by default
- logs are suitable for redirection to a file
- example usage:

```bash
npx auth-mini start ./auth-mini.sqlite --issuer https://auth.example.com --rp-id example.com --origin https://app.example.com >> auth-mini.log
```

- logs may contain plaintext email and client IP in the current version
- logs intentionally exclude OTP values, tokens, and SMTP passwords

- [ ] **Step 5: Run full verification**

Run:

- `npm run lint`
- `npm run typecheck`
- `npm test -- --run tests/integration/cli-logging.test.ts`
- `npm test`

Expected: all commands PASS.

- [ ] **Step 6: Commit the final logging rollout**

```bash
git add src/cli/create.ts src/cli/rotate-jwks.ts src/cli/start.ts src/infra/db/bootstrap.ts tests/helpers/cli.ts tests/integration/cli-logging.test.ts README.md
git commit -m "docs: document structured logging behavior"
```

## Notes For Execution

- Preserve any unrelated user changes already present in `src/infra/smtp/mailer.ts` and `src/modules/email-auth/service.ts`; integrate with them rather than reverting them.
- Keep all logging allowlisted. Never pass arbitrary request objects, response objects, or raw thrown third-party objects directly into the logger.
- Prefer one focused logger parameter per composition boundary over adding global singleton state.
- If the plan reveals a cleaner split for test helpers, create the helper file rather than overloading existing test setup.
