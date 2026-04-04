# auth-mini Logging Design

## Context

- Repository state: `auth-mini` already ships the core auth flows and recently switched SMTP delivery to `nodemailer`.
- Current product gap: the service lacks consistent structured logging across HTTP, CLI, auth flows, and infrastructure events.
- Scope decision: defer OTP rate limiting for now because there is not enough production usage data to choose the right policy yet.
- Primary goal: add machine-readable logs that are useful for local file capture, operational debugging, and future observability work.

## Confirmed Decisions

- Logging backend: `pino`
- Output format: structured JSON only
- Output behavior: do not prefer pretty output when attached to a TTY
- Intended usage: logs should be safe to redirect to a file or collect with an external process supervisor
- Initial observability scope: full service coverage rather than only OTP endpoints
- PII policy for v1 logging: email and client IP may be logged in plaintext
- High-risk secret policy: never log OTP values, tokens, SMTP passwords, or full raw WebAuthn payloads

## Goals

- Provide one consistent structured logging surface across the service
- Make request and business flow debugging possible without ad hoc `console.log` usage
- Keep the integration lightweight and aligned with the current codebase size
- Preserve a clean abstraction so business modules do not depend directly on `pino`

## Non-Goals

- No rate limiting in this change set
- No metrics backend or Prometheus integration yet
- No distributed tracing yet
- No file rotation, shipping agent, or external log transport management
- No environment-specific pretty-print mode by default

## Architecture

The service will use `pino` as the concrete logger implementation, but application code should depend on a thin shared logging module rather than importing `pino` directly everywhere. That keeps event names, base fields, and request context handling centralized.

### Shared logger module

Create a shared logger module, for example `src/shared/logger.ts`, that owns:

- logger creation
- base bindings such as service identity
- a minimal project logger interface backed by `pino`
- creation of child loggers with request or command context
- safe serialization helpers for known error shapes

This module is the only place that knows about `pino` specifics. Application code should depend on the project logger interface and child loggers rather than importing `pino` directly.

### Request logging

`src/server/app.ts` should add request logging middleware that:

- creates or attaches a `request_id` for every request
- captures method, path, matched route if available, client IP, status code, and duration
- emits an `http.request.started` event when request handling begins
- emits exactly one terminal `http.request.completed` event for every request that reaches the app, including 4xx and 5xx responses

The request logger should be attached to the request context so downstream handlers and services can log with the same `request_id`.

Client IP must come from one explicit source only:

- default: the direct socket remote address exposed by the Node HTTP server
- if the service is later deployed behind a trusted proxy, add an explicit trusted-proxy configuration before using `X-Forwarded-For`

Do not read `X-Forwarded-For` by default.

`http.request.completed` is the canonical terminal request event. It should include `status_code` and `duration_ms`, and may include `error_name` for handled error responses. Avoid a separate `http.request.failed` event for normal application errors to prevent duplicate terminal logs.

If a separate diagnostic error log is emitted for an unhandled exception, it is not a second terminal request event and must not be used as a substitute for `http.request.completed`.

### Service-wide coverage

The first version should add structured logs across the main runtime surfaces:

- CLI lifecycle: create, start, rotate-jwks
- HTTP request lifecycle
- email auth service events
- session service events
- WebAuthn service events
- JWKS service events
- SMTP delivery events
- key database startup or migration events that matter operationally

Coverage should focus on meaningful lifecycle points and outcomes, not noisy line-by-line internal tracing.

For long-running processes, prefer runtime lifecycle events such as `server.listening` and `server.shutdown.completed` over `completed` names that imply the command exited.

## Event Model

Logs are structured around a stable `event` field rather than around freeform message text. The `msg` field stays human-readable, but downstream filtering and alerting should rely on `event` plus structured fields.

### Base fields

Every log entry should use the standard `pino` fields and also include these stable application fields where relevant:

- `service`: `auth-mini`
- `event`: stable event name
- `msg`: short readable description
- `request_id`: request correlation id when inside an HTTP flow

### Request fields

Attach when relevant:

- `method`
- `path`
- `route`
- `status_code`
- `duration_ms`
- `ip`
- `user_id`
- `email`

### Command and runtime fields

Attach when relevant:

- `command`
- `db_path`
- `issuer`
- `rp_id`
- `origin_count`

### Infrastructure and domain fields

Attach when relevant:

- `smtp_host`
- `smtp_port`
- `smtp_config_id`
- `kid`
- `session_id`
- `credential_id`

## Event Naming

Event names should use stable dotted identifiers. The first version should cover at least these families:

- `server.listening`
- `http.request.started`
- `http.request.completed`
- `cli.create.started`
- `cli.create.completed`
- `cli.start.started`
- `server.shutdown.completed`
- `cli.rotate_jwks.started`
- `cli.rotate_jwks.completed`
- `email.start.requested`
- `email.start.sent`
- `email.start.failed`
- `email.verify.succeeded`
- `email.verify.failed`
- `session.refresh.succeeded`
- `session.refresh.failed`
- `session.logout.succeeded`
- `webauthn.register.options.created`
- `webauthn.register.verify.succeeded`
- `webauthn.register.verify.failed`
- `webauthn.authenticate.options.created`
- `webauthn.authenticate.verify.succeeded`
- `webauthn.authenticate.verify.failed`
- `jwks.rotated`
- `jwks.read`
- `smtp.send.attempted`
- `smtp.send.succeeded`
- `smtp.send.failed`
- `db.migration.started`
- `db.migration.completed`

Event names should be treated as part of the operational contract. Once introduced, they should remain stable unless there is a strong reason to change them.

## Error Handling

The logging design should avoid duplicate noise while still preserving the right debugging surface.

- Request middleware logs the final HTTP outcome for every request
- Business services log domain outcomes where those outcomes are semantically meaningful
- Unexpected uncaught failures may emit one additional diagnostic error log at the request boundary with request context. This does not replace the canonical terminal `http.request.completed` event, which must still be emitted exactly once per request.
- Expected domain failures may also emit a domain-specific failure event when that helps distinguish auth problems from infrastructure problems

Error logs should include concise structured error fields such as:

- `error_name`
- `error_message`
- a trimmed `stack` when useful

Full raw thrown objects should not be dumped blindly if they may contain secrets or noisy payloads.

## Sensitive Data Policy

The agreed first version allows plaintext email addresses and client IPs in logs. This is useful for operational debugging in the project's expected deployment style.

Even with that allowance, the logger must never emit:

- OTP plaintext values
- access tokens
- refresh tokens
- SMTP passwords
- full raw WebAuthn challenge or credential payloads

The logger must also never emit, even indirectly:

- HTTP `Authorization` headers
- cookies or `Set-Cookie` headers
- refresh or access tokens from request or response bodies
- full request or response bodies by default
- raw Nodemailer transport options or raw error objects when they may include auth credentials
- raw WebAuthn `clientDataJSON`, `attestationObject`, `authenticatorData`, `signature`, or full credential objects

Default rule: log only explicit allowlisted fields. Do not log arbitrary objects, request bodies, response bodies, or headers.

When troubleshooting needs identifiers, prefer safe handles such as `session_id`, `credential_id`, and `kid`.

## Testing Strategy

Testing should validate both the logger abstraction and the observable behavior.

### Unit coverage

- logger creation includes expected base bindings
- child loggers preserve parent context and add new bindings correctly
- known errors are serialized into the expected structured shape

### Integration coverage

- HTTP tests assert request lifecycle logs exist and include expected fields
- auth flow tests assert success and failure events are emitted at key points
- SMTP tests assert attempted, succeeded, and failed delivery events
- CLI tests assert command lifecycle events for create, start, and rotate-jwks

Tests should parse JSON log lines and assert fields, not compare full raw strings or exact timestamps.

## Implementation Shape

The change should remain incremental and follow existing repository structure.

- Add `pino` dependency and types if needed
- Add a shared logger module
- Thread logger access through server context and runtime composition points
- Add request middleware in `src/server/app.ts`
- Add focused logging statements to existing services and infrastructure modules
- Add or update tests to validate emitted events

## Risks and Trade-offs

- Logging plaintext email and IP improves debugging but increases sensitivity of stored logs
- Full-service coverage improves observability quickly but requires care to avoid log spam
- A thin abstraction adds one small indirection layer, but it protects the codebase from direct logger coupling
- JSON-only output is ideal for file capture and machine parsing, but less friendly for ad hoc terminal inspection unless a separate pretty-printer is used manually

## Future Follow-ups

- Add explicit pretty-print tooling as an opt-in local developer workflow if needed
- Revisit OTP rate limiting after real usage data exists
- Extend the event model into dedicated audit logs or metrics if operational needs grow
- Consider redaction or environment-specific privacy controls once deployment patterns become clearer
