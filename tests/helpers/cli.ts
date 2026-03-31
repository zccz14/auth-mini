import { spawn } from 'node:child_process'
import { resolve } from 'node:path'

export async function runCli(
  args: string[]
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const cliEntrypoint = resolve(process.cwd(), 'dist/index.js')

  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, [cliEntrypoint, ...args], {
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
      resolveRun({
        exitCode: code ?? 1,
        stdout,
        stderr
      })
    })
  })
}
