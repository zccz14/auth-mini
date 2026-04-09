# Drop Session Revoked At Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the legacy `sessions.revoked_at` column from the codebase and physically migrate `auth.zccz14.com.sqlite` so the database schema matches runtime behavior.

**Architecture:** Keep session invalidation semantics solely on `expires_at`, remove the dead schema/test references, and migrate the target SQLite database by rebuilding the `sessions` table inside a transaction after creating a timestamped backup.

**Tech Stack:** TypeScript, SQLite, better-sqlite3, Vitest

---

## File Map

- Modify: `sql/schema.sql`
  - Remove the dead `revoked_at` column from the canonical schema.
- Modify: `tests/helpers/db.ts`
  - Keep legacy test schema aligned with the canonical `sessions` table.
- Modify: `tests/integration/sessions.test.ts`
  - Keep coverage for `active_sessions` filtering by `expires_at` only, without using `revoked_at` fixtures.
- Operate on: `auth.zccz14.com.sqlite`
  - Backup and migrate the real database by rebuilding `sessions` without `revoked_at`.

## Chunk 1: Code And Tests

### Task 1: Remove `revoked_at` From Source Of Truth

**Files:**

- Modify: `sql/schema.sql`
- Modify: `tests/helpers/db.ts`
- Modify: `tests/integration/sessions.test.ts`

- [ ] **Step 1: Update the focused integration test to the final fixture shape**

Change `tests/integration/sessions.test.ts` so the `active_sessions` case seeds only one extra unexpired session and one expired session, then asserts that the response includes only the unexpired rows. Remove any insert that mentions `revoked_at` and change the expected session ids accordingly.

- [ ] **Step 2: Run the focused test as a safety check**

Run: `npm test -- tests/integration/sessions.test.ts`
Expected: PASS or FAIL are both actionable here because this task removes dead schema/test references rather than changing runtime behavior. If it fails, the failure should point at stale `revoked_at` usage; if it passes, keep the result as the pre-change behavior baseline.

- [ ] **Step 3: Apply the minimal schema changes**

Delete `revoked_at TEXT,` from both `sql/schema.sql` and `tests/helpers/db.ts`.

- [ ] **Step 4: Run the targeted test to verify it passes**

Run: `npm test -- tests/integration/sessions.test.ts`
Expected: PASS with `active_sessions` still filtered only by `expires_at`.

## Chunk 2: Database Migration

### Task 2: Backup And Rebuild `auth.zccz14.com.sqlite`

**Files:**

- Operate on: `auth.zccz14.com.sqlite`

- [ ] **Step 1: Create a timestamped backup**

Run a filesystem copy in the same directory, producing `auth.zccz14.com.sqlite.bak-<timestamp>`.

- [ ] **Step 2: Verify the database is not busy**

Run: `sqlite3 auth.zccz14.com.sqlite "PRAGMA schema_version;"`
Expected: a single integer. If SQLite reports `database is locked` or `database is busy`, abort before starting the migration transaction.

- [ ] **Step 3: Record pre-migration row count**

Run: `sqlite3 auth.zccz14.com.sqlite "SELECT COUNT(*) FROM sessions;"`
Expected: a single integer for later comparison.

- [ ] **Step 4: Rebuild the table in a transaction**

Run SQL equivalent to:

```sql
BEGIN TRANSACTION;
CREATE TABLE sessions_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  refresh_token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
INSERT INTO sessions_new (id, user_id, refresh_token_hash, expires_at, created_at)
SELECT id, user_id, refresh_token_hash, expires_at, created_at
FROM sessions;
DROP TABLE sessions;
ALTER TABLE sessions_new RENAME TO sessions;
COMMIT;
```

- [ ] **Step 5: Verify structure and row count**

Run:

- `sqlite3 auth.zccz14.com.sqlite "PRAGMA table_info(sessions);"`
- `sqlite3 auth.zccz14.com.sqlite "SELECT COUNT(*) FROM sessions;"`
- `sqlite3 auth.zccz14.com.sqlite "PRAGMA foreign_key_check;"`
- `sqlite3 auth.zccz14.com.sqlite "PRAGMA integrity_check;"`

Expected:

- `table_info(sessions)` shows only `id`, `user_id`, `refresh_token_hash`, `expires_at`, `created_at`
- row count matches the pre-migration value
- `foreign_key_check` returns no rows
- `integrity_check` returns exactly `ok`

- [ ] **Step 6: Restore backup if verification fails**

If Step 5 fails, stop using the migrated database and restore the backup file over `auth.zccz14.com.sqlite` before reporting failure.

## Chunk 3: Final Verification

### Task 3: Confirm No References Remain

**Files:**

- Modify: none

- [ ] **Step 1: Search for remaining references**

Search the exact acceptance surface for `revoked_at`: `sql/schema.sql`, `tests/helpers/db.ts`, `tests/integration/sessions.test.ts`, plus any runtime code touched by the change. Exclude `docs/superpowers/**`.

- [ ] **Step 2: Run focused verification**

Run: `npm test -- tests/integration/sessions.test.ts`
Expected: PASS.

- [ ] **Step 3: Summarize backup path and migration result**

Capture the created backup filename, final `sessions` columns, and final row count in the handoff.
