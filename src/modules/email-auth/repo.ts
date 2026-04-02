import type { DatabaseClient } from '../../infra/db/client.js';

type EmailOtpRow = {
  email: string;
  code_hash: string;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
};

export type EmailOtp = {
  email: string;
  codeHash: string;
  expiresAt: string;
  consumedAt: string | null;
  createdAt: string;
};

export function upsertEmailOtp(
  db: DatabaseClient,
  input: { email: string; codeHash: string; expiresAt: string },
): void {
  db.prepare(
    [
      'INSERT INTO email_otps (email, code_hash, expires_at, consumed_at)',
      'VALUES (?, ?, ?, NULL)',
      'ON CONFLICT(email) DO UPDATE SET',
      'code_hash = excluded.code_hash,',
      'expires_at = excluded.expires_at,',
      'consumed_at = NULL,',
      'created_at = CURRENT_TIMESTAMP',
    ].join(' '),
  ).run(input.email, input.codeHash, input.expiresAt);
}

export function getEmailOtp(
  db: DatabaseClient,
  email: string,
): EmailOtp | null {
  const row = db
    .prepare(
      'SELECT email, code_hash, expires_at, consumed_at, created_at FROM email_otps WHERE email = ? LIMIT 1',
    )
    .get(email) as EmailOtpRow | undefined;

  return row
    ? {
        email: row.email,
        codeHash: row.code_hash,
        expiresAt: row.expires_at,
        consumedAt: row.consumed_at,
        createdAt: row.created_at,
      }
    : null;
}

export function consumeEmailOtp(
  db: DatabaseClient,
  email: string,
  now: string,
): boolean {
  const result = db
    .prepare(
      'UPDATE email_otps SET consumed_at = ? WHERE email = ? AND consumed_at IS NULL',
    )
    .run(now, email);

  return result.changes > 0;
}

export function invalidateEmailOtp(
  db: DatabaseClient,
  email: string,
  now: string,
): void {
  db.prepare('UPDATE email_otps SET consumed_at = ? WHERE email = ?').run(
    now,
    email,
  );
}
