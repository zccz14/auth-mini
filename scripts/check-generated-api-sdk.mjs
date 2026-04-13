import { mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = process.cwd();
const output = resolve(root, 'src/generated/api');
const tempRoot = mkdtempSync(resolve(root, '.tmp-openapi-check-'));

try {
  const generate = spawnSync(
    'node',
    [
      '--input-type=module',
      '--eval',
      `import { createClient } from '@hey-api/openapi-ts';\nawait createClient({\n  input: './openapi.yaml',\n  output: ${JSON.stringify(tempRoot)},\n  plugins: ['@hey-api/client-fetch', { name: '@hey-api/sdk', auth: true, operations: { strategy: 'flat' } }],\n});`,
    ],
    { cwd: root, stdio: 'inherit' },
  );

  if (generate.status !== 0) {
    process.exit(generate.status ?? 1);
  }

  const diff = spawnSync('git', ['diff', '--no-index', '--exit-code', output, tempRoot], {
    cwd: root,
    stdio: 'inherit',
  });

  if (diff.status !== 0) {
    process.exit(diff.status ?? 1);
  }
} finally {
  rmSync(tempRoot, { force: true, recursive: true });
}
