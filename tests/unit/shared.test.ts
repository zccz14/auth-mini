import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createTempDbPath } from '../helpers/db.js'
import { exists } from '../helpers/fs.js'

describe('test helpers', () => {
  it('reports whether a path exists', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'mini-auth-fs-'))
    const filePath = join(tempDir, 'present.txt')

    await writeFile(filePath, 'ok', 'utf8')

    await expect(exists(filePath)).resolves.toBe(true)
    await expect(exists(join(tempDir, 'missing.txt'))).resolves.toBe(false)
  })

  it('creates a sqlite path inside a temp directory', async () => {
    const dbPath = await createTempDbPath()

    expect(dbPath.endsWith('.sqlite')).toBe(true)
    await expect(exists(dbPath)).resolves.toBe(false)
  })
})
