import { spawn } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { exists } from '../helpers/fs.js'

async function runCommand(command: string, args: string[]) {
  return new Promise<{ exitCode: number; stdout: string; stderr: string }>(
    (resolve, reject) => {
      const child = spawn(command, args, {
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe']
      })

      let stdout = ''
      let stderr = ''

      child.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString()
      })
      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString()
      })
      child.on('error', reject)
      child.on('close', (code) => {
        resolve({
          exitCode: code ?? 1,
          stdout,
          stderr
        })
      })
    }
  )
}

describe('workspace bootstrap', () => {
  it('exposes the mini-auth bin entry', async () => {
    const { default: pkg } = await import('../../package.json')

    expect(pkg.bin['mini-auth']).toBe('dist/index.js')
  })

  it('defines build, test, lint, format, and typecheck scripts', async () => {
    const { default: pkg } = await import('../../package.json')

    expect(pkg.scripts.build).toBeDefined()
    expect(pkg.scripts.test).toBeDefined()
    expect(pkg.scripts['test:integration']).toBeDefined()
    expect(pkg.scripts.lint).toBeDefined()
    expect(pkg.scripts.format).toBeDefined()
    expect(pkg.scripts.typecheck).toBeDefined()
  })

  it('defines lint, format, and integration scripts', async () => {
    const { default: pkg } = await import('../../package.json')

    expect(pkg.scripts.lint).toBeDefined()
    expect(pkg.scripts.format).toBeDefined()
    expect(pkg.scripts['test:integration']).toBeDefined()
  })

  it('defines expected lint-staged rules and pre-commit hook command', async () => {
    const lintStaged = await import('../../.lintstagedrc.json')
    const { readFile } = await import('node:fs/promises')

    const hook = await readFile('.husky/pre-commit', 'utf8')

    expect(await exists('.prettierrc.json')).toBe(true)
    expect(await exists('eslint.config.js')).toBe(true)
    expect(await exists('.lintstagedrc.json')).toBe(true)
    expect(await exists('.husky/pre-commit')).toBe(true)
    expect(lintStaged.default).toEqual({
      '*.{js,json,md}': 'prettier --write',
      '*.ts': ['prettier --write', 'eslint --fix']
    })
    expect(hook).toContain('npx lint-staged')
  })

  it('runs the built cli help smoke path', async () => {
    const { runCli } = await import('../helpers/cli.js')

    const build = await runCommand('npm', ['run', 'build'])

    expect(build.exitCode).toBe(0)
    expect(await exists('dist/index.js')).toBe(true)

    const result = await runCli(['--help'])

    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain('mini-auth')
    expect(result.stdout).toContain('--help')
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

  it('requires a user for register challenges but not authenticate challenges', async () => {
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
      ).run('user-1', 'user@example.com', '2026-03-31T00:00:00.000Z')

      expect(() => {
        db.prepare(
          [
            'INSERT INTO webauthn_challenges',
            '(request_id, type, challenge, user_id, expires_at)',
            'VALUES (?, ?, ?, ?, ?)'
          ].join(' ')
        ).run(
          'register-missing-user',
          'register',
          'challenge',
          null,
          '2030-01-01T00:00:00.000Z'
        )
      }).toThrowError(/CHECK constraint failed/)

      expect(() => {
        db.prepare(
          [
            'INSERT INTO webauthn_challenges',
            '(request_id, type, challenge, user_id, expires_at)',
            'VALUES (?, ?, ?, ?, ?)'
          ].join(' ')
        ).run(
          'authenticate-without-user',
          'authenticate',
          'challenge',
          null,
          '2030-01-01T00:00:00.000Z'
        )
      }).not.toThrow()

      expect(() => {
        db.prepare(
          [
            'INSERT INTO webauthn_challenges',
            '(request_id, type, challenge, user_id, expires_at)',
            'VALUES (?, ?, ?, ?, ?)'
          ].join(' ')
        ).run(
          'authenticate-with-user',
          'authenticate',
          'challenge',
          'user-1',
          '2030-01-01T00:00:00.000Z'
        )
      }).toThrowError(/CHECK constraint failed/)
    } finally {
      db.close()
    }
  })

  it('allows at most one active jwks key', async () => {
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
        [
          'INSERT INTO jwks_keys',
          '(id, kid, alg, public_jwk, private_jwk, is_active)',
          'VALUES (?, ?, ?, ?, ?, ?)'
        ].join(' ')
      ).run('key-1', 'kid-1', 'EdDSA', '{}', '{}', 1)

      expect(() => {
        db.prepare(
          [
            'INSERT INTO jwks_keys',
            '(id, kid, alg, public_jwk, private_jwk, is_active)',
            'VALUES (?, ?, ?, ?, ?, ?)'
          ].join(' ')
        ).run('key-2', 'kid-2', 'EdDSA', '{}', '{}', 1)
      }).toThrowError(/UNIQUE constraint failed/)

      expect(() => {
        db.prepare(
          [
            'INSERT INTO jwks_keys',
            '(id, kid, alg, public_jwk, private_jwk, is_active)',
            'VALUES (?, ?, ?, ?, ?, ?)'
          ].join(' ')
        ).run('key-3', 'kid-3', 'EdDSA', '{}', '{}', 0)
      }).not.toThrow()
    } finally {
      db.close()
    }
  })
})
