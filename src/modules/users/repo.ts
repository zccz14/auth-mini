import { randomUUID } from 'node:crypto'
import type { DatabaseClient } from '../../infra/db/client.js'

type UserRow = {
  id: string
  email: string
  email_verified_at: string | null
  created_at: string
}

type WebauthnCredentialRow = {
  id: string
  credential_id: string
  transports: string
  created_at: string
}

type SessionRow = {
  id: string
  created_at: string
  expires_at: string
}

export type User = {
  id: string
  email: string
  emailVerifiedAt: string | null
  createdAt: string
}

export type MeCredential = {
  id: string
  credential_id: string
  transports: string[]
  created_at: string
}

export type ActiveSession = {
  id: string
  created_at: string
  expires_at: string
}

export function getUserByEmail(db: DatabaseClient, email: string): User | null {
  const row = db
    .prepare(
      'SELECT id, email, email_verified_at, created_at FROM users WHERE email = ? LIMIT 1'
    )
    .get(email) as UserRow | undefined

  return row ? mapUser(row) : null
}

export function getUserById(db: DatabaseClient, id: string): User | null {
  const row = db
    .prepare(
      'SELECT id, email, email_verified_at, created_at FROM users WHERE id = ? LIMIT 1'
    )
    .get(id) as UserRow | undefined

  return row ? mapUser(row) : null
}

export function createUser(
  db: DatabaseClient,
  email: string,
  now: string
): User {
  const id = randomUUID()

  db.prepare(
    'INSERT INTO users (id, email, email_verified_at) VALUES (?, ?, ?)'
  ).run(id, email, now)

  return getUserById(db, id) as User
}

export function markUserEmailVerified(
  db: DatabaseClient,
  id: string,
  now: string
): void {
  db.prepare('UPDATE users SET email_verified_at = ? WHERE id = ?').run(now, id)
}

export function listUserWebauthnCredentials(
  db: DatabaseClient,
  userId: string
): MeCredential[] {
  const rows = db
    .prepare(
      [
        'SELECT id, credential_id, transports, created_at',
        'FROM webauthn_credentials',
        'WHERE user_id = ?',
        'ORDER BY created_at ASC, id ASC'
      ].join(' ')
    )
    .all(userId) as WebauthnCredentialRow[]

  return rows.map((row) => ({
    id: row.id,
    credential_id: row.credential_id,
    transports: row.transports ? row.transports.split(',').filter(Boolean) : [],
    created_at: row.created_at
  }))
}

export function listActiveUserSessions(
  db: DatabaseClient,
  userId: string,
  now: string
): ActiveSession[] {
  const rows = db
    .prepare(
      [
        'SELECT id, created_at, expires_at',
        'FROM sessions',
        'WHERE user_id = ? AND revoked_at IS NULL AND expires_at > ?',
        'ORDER BY created_at ASC, id ASC'
      ].join(' ')
    )
    .all(userId, now) as SessionRow[]

  return rows.map((row) => ({
    id: row.id,
    created_at: row.created_at,
    expires_at: row.expires_at
  }))
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    emailVerifiedAt: row.email_verified_at,
    createdAt: row.created_at
  }
}
