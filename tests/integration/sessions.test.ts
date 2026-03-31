import { afterEach, describe, expect, it } from 'vitest'
import { runStartCommand } from '../../src/cli/start.js'
import { hashValue } from '../../src/shared/crypto.js'
import { createTestApp } from '../helpers/app.js'
import { extractOtpCode } from '../helpers/mock-smtp.js'

const json = (value: unknown) => JSON.stringify(value)

const openApps: Array<{ close(): void }> = []

afterEach(() => {
  while (openApps.length > 0) {
    openApps.pop()?.close()
  }
})

describe('session routes', () => {
  it('refresh rotates the refresh token', async () => {
    const testApp = await createSignedInApp('rotate@example.com')
    openApps.push(testApp)

    const response = await testApp.app.request('/session/refresh', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: json({ refresh_token: testApp.tokens.refresh_token })
    })

    const body = await response.json()
    const sessions = testApp.db
      .prepare(
        'SELECT id, revoked_at FROM sessions ORDER BY created_at ASC, id ASC'
      )
      .all() as Array<{ id: string; revoked_at: string | null }>

    expect(response.status).toBe(200)
    expect(body.refresh_token).not.toBe(testApp.tokens.refresh_token)
    expect(sessions).toHaveLength(2)
    expect(sessions[0]?.revoked_at).toBeTruthy()
    expect(sessions[1]?.revoked_at).toBeNull()
  })

  it('logout revokes the session referenced by sid', async () => {
    const testApp = await createSignedInApp('logout@example.com')
    openApps.push(testApp)

    const response = await testApp.app.request('/session/logout', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${testApp.tokens.access_token}`
      }
    })

    const session = testApp.db
      .prepare('SELECT revoked_at FROM sessions WHERE id = ?')
      .get(testApp.sessionId) as { revoked_at: string | null }

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(session.revoked_at).toBeTruthy()
  })

  it('me returns user id, email, credentials, and active sessions', async () => {
    const testApp = await createSignedInApp('me@example.com')
    openApps.push(testApp)

    const response = await testApp.app.request('/me', {
      headers: {
        authorization: `Bearer ${testApp.tokens.access_token}`
      }
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      user_id: testApp.userId,
      email: 'me@example.com',
      webauthn_credentials: [],
      active_sessions: [
        {
          id: testApp.sessionId,
          created_at: expect.any(String),
          expires_at: expect.any(String)
        }
      ]
    })
  })

  it('me excludes revoked and expired sessions from active_sessions', async () => {
    const testApp = await createSignedInApp('active@example.com')
    openApps.push(testApp)

    testApp.db
      .prepare(
        [
          'INSERT INTO sessions (id, user_id, refresh_token_hash, expires_at, revoked_at)',
          'VALUES (?, ?, ?, ?, ?)'
        ].join(' ')
      )
      .run(
        'session-revoked',
        testApp.userId,
        hashValue('revoked-token'),
        '2099-01-01T00:00:00.000Z',
        '2026-04-01T00:00:00.000Z'
      )
    testApp.db
      .prepare(
        'INSERT INTO sessions (id, user_id, refresh_token_hash, expires_at) VALUES (?, ?, ?, ?)'
      )
      .run(
        'session-expired',
        testApp.userId,
        hashValue('expired-token'),
        '2020-01-01T00:00:00.000Z'
      )

    const response = await testApp.app.request('/me', {
      headers: {
        authorization: `Bearer ${testApp.tokens.access_token}`
      }
    })

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.active_sessions).toHaveLength(1)
    expect(body.active_sessions[0]?.id).toBe(testApp.sessionId)
  })

  it('me rejects missing or invalid bearer token', async () => {
    const testApp = await createSignedInApp('reject@example.com')
    openApps.push(testApp)

    const missingResponse = await testApp.app.request('/me')
    const invalidResponse = await testApp.app.request('/me', {
      headers: {
        authorization: 'Bearer not-a-token'
      }
    })

    expect(missingResponse.status).toBe(401)
    expect(await missingResponse.json()).toEqual({
      error: 'invalid_access_token'
    })
    expect(invalidResponse.status).toBe(401)
    expect(await invalidResponse.json()).toEqual({
      error: 'invalid_access_token'
    })
  })

  it('jwks returns public keys only', async () => {
    const testApp = await createSignedInApp('jwks@example.com')
    openApps.push(testApp)

    const response = await testApp.app.request('/jwks')
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.keys).toHaveLength(1)
    expect(body.keys[0]).toMatchObject({
      alg: 'EdDSA',
      crv: 'Ed25519',
      kty: 'OKP',
      use: 'sig'
    })
    expect(body.keys[0]).not.toHaveProperty('d')
  })

  it('start fails fast when required webauthn config is missing', async () => {
    await expect(
      runStartCommand({
        dbPath: '/tmp/mini-auth.sqlite',
        issuer: 'https://issuer.example'
      })
    ).rejects.toThrowError()
  })
})

async function createSignedInApp(email: string) {
  const testApp = await createTestApp()

  await testApp.app.request('/email/start', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: json({ email })
  })

  const code = extractOtpCode(testApp.mailbox[0]?.text ?? '')
  const verifyResponse = await testApp.app.request('/email/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: json({ email, code })
  })

  const tokens = (await verifyResponse.json()) as {
    access_token: string
    refresh_token: string
  }
  const user = testApp.db
    .prepare('SELECT id FROM users WHERE email = ?')
    .get(email) as { id: string }
  const session = testApp.db
    .prepare(
      'SELECT id FROM sessions WHERE user_id = ? AND revoked_at IS NULL ORDER BY created_at DESC LIMIT 1'
    )
    .get(user.id) as { id: string }

  return {
    ...testApp,
    tokens,
    userId: user.id,
    sessionId: session.id
  }
}
