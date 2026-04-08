# JWKS Slot Rotation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current active-key JWKS model with fixed `CURRENT` / `STANDBY` slots so `/jwks` always publishes two keys and `rotate jwks` promotes `STANDBY` before generating a new standby key.

**Architecture:** Keep the existing JWKS module boundaries, but replace active/history semantics with explicit slot semantics keyed by `jwks_keys.id`. Schema, bootstrap, repo, service, CLI tests, and README move together in small slices so each task lands a coherent contract instead of leaving half-migrated active-key behavior behind. Rotation must stay transactional and preserve `UNIQUE(kid)` by writing the new standby first, then promoting the saved old standby into `CURRENT`.

**Tech Stack:** TypeScript, SQLite, Vitest, oclif CLI, Node.js

---

## File Map

- Modify: `sql/schema.sql` - remove `is_active` from `jwks_keys` and define the fixed-slot table shape.
- Modify: `src/infra/db/bootstrap.ts` - require the new slot schema so old `is_active` databases fail fast.
- Modify: `src/modules/jwks/repo.ts` - replace active/history queries with `CURRENT` / `STANDBY` slot reads, slot validation, slot bootstrap helpers, and transactional rotate.
- Modify: `src/modules/jwks/service.ts` - ensure bootstrap creates or fills the two slots, sign with `CURRENT`, list `CURRENT` + `STANDBY`, and rotate via the new slot transaction.
- Modify: `src/commands/rotate/jwks.ts` - update help text so it no longer promises “active key” semantics.
- Modify: `tests/helpers/db.ts` - add malformed JWKS schema fixtures if needed for invalid-slot / extra-row coverage.
- Modify: `tests/integration/jwks.test.ts` - rewrite integration tests to lock the slot-based runtime contract.
- Modify: `tests/integration/cli-create.test.ts` - rewrite schema/bootstrap assertions away from `is_active` and toward the two-slot contract, including malformed-state failures.
- Modify: `tests/integration/oclif-cli.test.ts` - rewrite CLI rotation and README assertions to use `CURRENT` / `STANDBY` semantics.
- Modify: `README.md` - document slot-based rotation behavior and the immediate loss of the old `CURRENT` key.

## Chunk 1: Schema, bootstrap, and service contract

### Task 1: Replace schema and bootstrap with the slot contract

**Files:**

- Modify: `tests/helpers/db.ts`
- Modify: `tests/integration/cli-create.test.ts`
- Modify: `sql/schema.sql`
- Modify: `src/infra/db/bootstrap.ts`
- Modify: `src/modules/jwks/repo.ts`
- Modify: `src/modules/jwks/service.ts`

- [ ] **Step 1: Write the failing bootstrap and malformed-schema tests**

Update `tests/integration/cli-create.test.ts` so the JWKS-related cases expect the new schema contract, for example:

```ts
const rows = db
  .prepare('SELECT id, kid FROM jwks_keys ORDER BY id ASC')
  .all() as Array<{ id: string; kid: string }>;

expect(rows.map((row) => row.id)).toEqual(['CURRENT', 'STANDBY']);
expect(rows).toHaveLength(2);
expect(rows[0]?.kid).toBeTruthy();
expect(rows[1]?.kid).toBeTruthy();
expect(rows[0]?.kid).not.toBe(rows[1]?.kid);
```

Add failing cases that require:

- `init`/`create` leaves exactly two rows: `CURRENT` and `STANDBY`
- old `is_active` schema fails with a schema/rebuild-or-migrate style error
- malformed new-schema databases fail fast when they contain:
  - an extra third JWKS row
  - an invalid slot id
  - duplicate/missing slot combinations other than the allowed “missing one slot in an otherwise valid new schema” case

If fixtures become repetitive, add focused helpers to `tests/helpers/db.ts` for building malformed JWKS databases.

- [ ] **Step 2: Run the targeted tests to verify failure**

Run: `npx vitest run tests/integration/cli-create.test.ts`
Expected: FAIL because the schema and JWKS bootstrap path still use `is_active` and seed only one active key.

- [ ] **Step 3: Write the minimal schema/bootstrap/service implementation**

Update `sql/schema.sql` and the JWKS bootstrap path to define and satisfy the new shape:

```sql
CREATE TABLE IF NOT EXISTS jwks_keys (
  id TEXT PRIMARY KEY CHECK (id IN ('CURRENT', 'STANDBY')),
  kid TEXT NOT NULL UNIQUE,
  alg TEXT NOT NULL,
  public_jwk TEXT NOT NULL,
  private_jwk TEXT NOT NULL
);
```

Implement the minimum production changes needed so `init`/`create` can actually pass these tests:

- remove `is_active` assumptions from `src/infra/db/bootstrap.ts`
- add repo helpers that validate the slot set and detect malformed new-schema states
- make `bootstrapKeys` create/fill missing `CURRENT` / `STANDBY` slots when the schema is valid
- reject extra rows, bad slot ids, and old-schema databases with the existing fail-fast style

- [ ] **Step 4: Run the targeted tests to verify pass**

Run: `npx vitest run tests/integration/cli-create.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/helpers/db.ts tests/integration/cli-create.test.ts sql/schema.sql src/infra/db/bootstrap.ts src/modules/jwks/repo.ts src/modules/jwks/service.ts
git commit -m "feat: adopt jwks slot bootstrap contract"
```

### Task 2: Rewrite the JWKS runtime service around `CURRENT` / `STANDBY`

**Files:**

- Modify: `tests/integration/jwks.test.ts`
- Modify: `src/modules/jwks/repo.ts`
- Modify: `src/modules/jwks/service.ts`

- [ ] **Step 1: Write the failing runtime contract tests**

Update `tests/integration/jwks.test.ts` so it requires all slot-based runtime behavior:

```ts
const publicKeys = await listPublicKeys(db, { logger: logCollector.logger });
expect(publicKeys).toHaveLength(2);

const rows = db
  .prepare('SELECT id, kid FROM jwks_keys ORDER BY id ASC')
  .all() as Array<{ id: string; kid: string }>;

expect(rows.map((row) => row.id)).toEqual(['CURRENT', 'STANDBY']);
```

Add/adjust cases that assert:

- `signJwt` always emits the `CURRENT.kid`
- `/jwks` always publishes exactly `CURRENT` + `STANDBY`
- after rotation, the pre-rotate `STANDBY.kid` becomes the new `CURRENT.kid`
- the new `STANDBY.kid` is fresh and different from both pre-rotate kids
- the old `CURRENT.kid` can no longer be verified after rotation
- rotation preserves `UNIQUE(kid)` by succeeding through the “write new standby first, then promote saved old standby” transaction order

- [ ] **Step 2: Run the targeted tests to verify failure**

Run: `npx vitest run tests/integration/jwks.test.ts`
Expected: FAIL because `signJwt`, `rotateKeys`, `listPublicKeys`, and `verifyJwt` still assume active/history behavior.

- [ ] **Step 3: Write the minimal runtime implementation**

Replace the old repo/service API with slot-oriented helpers and service usage, for example:

```ts
export function getJwksSlot(db: DatabaseClient, id: 'CURRENT' | 'STANDBY') {
  // SELECT ... FROM jwks_keys WHERE id = ?
}

export function listJwksSlots(db: DatabaseClient) {
  // SELECT ... FROM jwks_keys ORDER BY id ASC
}

export function rotateJwksSlots(db: DatabaseClient, nextStandby: KeyRecord) {
  // transaction: save old STANDBY, write nextStandby into STANDBY, then copy saved old STANDBY into CURRENT
}
```

Update `src/modules/jwks/service.ts` so:

- `listPublicKeys` returns the two slots only
- `signJwt` always uses `CURRENT`
- `rotateKeys` uses the repo transaction above
- `verifyJwt` remains a `kid` lookup against the remaining two slots

- [ ] **Step 4: Run the targeted tests to verify pass**

Run: `npx vitest run tests/integration/jwks.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/integration/jwks.test.ts src/modules/jwks/repo.ts src/modules/jwks/service.ts
git commit -m "feat: switch jwks runtime to slots"
```

## Chunk 2: CLI contract and docs

### Task 3: Update CLI rotation tests and command copy

**Files:**

- Modify: `tests/integration/oclif-cli.test.ts`
- Modify: `src/commands/rotate/jwks.ts`

- [ ] **Step 1: Write the failing CLI assertions first**

Update `tests/integration/oclif-cli.test.ts` so it locks the slot contract instead of `is_active`, for example:

```ts
expect(await countRows(dbPath, 'jwks_keys')).toBe(2);

const rows = db
  .prepare('SELECT id, kid FROM jwks_keys ORDER BY id ASC')
  .all() as Array<{ id: string; kid: string }>;

expect(rows.map((row) => row.id)).toEqual(['CURRENT', 'STANDBY']);
```

For `rotate jwks`, assert that:

- row count stays `2`
- the pre-rotate standby kid becomes the new current kid
- a fresh standby kid is generated

Also update help-text assertions if needed so they no longer describe the command as rotating an “active” key.

- [ ] **Step 2: Run the targeted tests to verify failure**

Run: `npx vitest run tests/integration/oclif-cli.test.ts`
Expected: FAIL because the CLI tests and help text still describe the old active-key contract.

- [ ] **Step 3: Write the minimal CLI-aligned implementation**

Update `src/commands/rotate/jwks.ts` help/summary text only as needed, for example:

```ts
static summary = 'Promote the standby JWKS signing key and generate a new standby key';
```

Only change command wiring if the targeted tests reveal a real behavior gap.

- [ ] **Step 4: Run the targeted tests to verify pass**

Run: `npx vitest run tests/integration/oclif-cli.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/integration/oclif-cli.test.ts src/commands/rotate/jwks.ts
git commit -m "test: update jwks cli slot contract"
```

### Task 4: Update README semantics and run final verification

**Files:**

- Modify: `README.md`
- Modify: `tests/integration/oclif-cli.test.ts`

- [ ] **Step 1: Write the failing README-backed assertions first**

Update the README-related assertions in `tests/integration/oclif-cli.test.ts` so they require wording equivalent to:

```ts
expect(readme).toContain(
  '`/jwks` always publishes the `CURRENT` and `STANDBY` keys.',
);
expect(readme).toContain(
  '`rotate jwks` promotes `STANDBY` to `CURRENT`, then generates a fresh `STANDBY`.',
);
expect(readme).toContain(
  'After rotation, the previous `CURRENT` key is no longer retained.',
);
```

- [ ] **Step 2: Run the targeted tests to verify failure**

Run: `npx vitest run tests/integration/oclif-cli.test.ts`
Expected: FAIL because `README.md` still describes the old rotate semantics.

- [ ] **Step 3: Write the minimal README update**

Document the slot model in `README.md`, including:

- `/jwks` always publishes `CURRENT` and `STANDBY`
- `rotate jwks` promotes `STANDBY` to `CURRENT`
- a new `STANDBY` is generated immediately afterward
- the previous `CURRENT` key is no longer retained after rotation

- [ ] **Step 4: Run the targeted test to verify pass**

Run: `npx vitest run tests/integration/oclif-cli.test.ts`
Expected: PASS.

- [ ] **Step 5: Run full verification**

Run: `npm test`
Expected: PASS.

Run: `npm run typecheck`
Expected: PASS.

Run: `npm run lint`
Expected: PASS.

Run: `npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add README.md tests/integration/oclif-cli.test.ts
git commit -m "docs: explain jwks slot rotation"
```
