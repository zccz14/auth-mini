import { describe, expect, it } from 'vitest'
import { exists } from '../helpers/fs.js'

describe('workspace bootstrap', () => {
  it('exposes the mini-auth bin entry', async () => {
    const { default: pkg } = await import('../../package.json')

    expect(pkg.bin['mini-auth']).toBe('dist/index.js')
  })

  it('defines build, test, lint, format, and typecheck scripts', async () => {
    const { default: pkg } = await import('../../package.json')

    expect(pkg.scripts.build).toBeDefined()
    expect(pkg.scripts.test).toBeDefined()
    expect(pkg.scripts.lint).toBeDefined()
    expect(pkg.scripts.format).toBeDefined()
    expect(pkg.scripts.typecheck).toBeDefined()
  })

  it('defines lint and format scripts plus lint-staged hook files', async () => {
    expect(await exists('.prettierrc.json')).toBe(true)
    expect(await exists('eslint.config.js')).toBe(true)
    expect(await exists('.lintstagedrc.json')).toBe(true)
    expect(await exists('.husky/pre-commit')).toBe(true)
  })

  it('creates all v1 tables', async () => {
    const { bootstrapDatabase } =
      await import('../../src/infra/db/bootstrap.js')
    const { countRows, createTempDbPath, listTables } =
      await import('../helpers/db.js')
    const tempDbPath = await createTempDbPath()

    await bootstrapDatabase(tempDbPath)

    expect(await listTables(tempDbPath)).toEqual([
      'email_otps',
      'jwks_keys',
      'sessions',
      'smtp_configs',
      'users',
      'webauthn_challenges',
      'webauthn_credentials'
    ])
    expect(await countRows(tempDbPath, 'users')).toBe(0)
  })

  it('enforces a globally unique webauthn credential id', async () => {
    const { bootstrapDatabase } =
      await import('../../src/infra/db/bootstrap.js')
    const { createDatabaseClient } =
      await import('../../src/infra/db/client.js')
    const { createTempDbPath } = await import('../helpers/db.js')
    const tempDbPath = await createTempDbPath()

    await bootstrapDatabase(tempDbPath)

    const db = createDatabaseClient(tempDbPath)

    try {
      db.prepare(
        'INSERT INTO users (id, email, email_verified_at) VALUES (?, ?, ?)'
      ).run('user-1', 'first@example.com', '2026-03-31T00:00:00.000Z')
      db.prepare(
        'INSERT INTO users (id, email, email_verified_at) VALUES (?, ?, ?)'
      ).run('user-2', 'second@example.com', '2026-03-31T00:00:00.000Z')

      db.prepare(
        [
          'INSERT INTO webauthn_credentials',
          '(id, user_id, credential_id, public_key, counter, transports)',
          'VALUES (?, ?, ?, ?, ?, ?)'
        ].join(' ')
      ).run('cred-1', 'user-1', 'shared-credential', 'pk-1', 0, 'internal')

      expect(() => {
        db.prepare(
          [
            'INSERT INTO webauthn_credentials',
            '(id, user_id, credential_id, public_key, counter, transports)',
            'VALUES (?, ?, ?, ?, ?, ?)'
          ].join(' ')
        ).run('cred-2', 'user-2', 'shared-credential', 'pk-2', 0, 'usb')
      }).toThrowError(
        /UNIQUE constraint failed: webauthn_credentials.credential_id/
      )
    } finally {
      db.close()
    }
  })
})
