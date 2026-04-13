import { mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { createClient } from '@hey-api/openapi-ts';
import { createJiti } from 'jiti';

const root = process.cwd();
const loadConfig = createJiti(import.meta.url);
const { default: loadedOpenapiTsConfig } = await loadConfig.import(
  '../openapi-ts.config.ts',
);
const openapiTsConfig = await loadedOpenapiTsConfig;
const output = resolve(root, openapiTsConfig.output);
const tempRoot = mkdtempSync(resolve(root, '.tmp-openapi-check-'));

try {
  await createClient({
    ...openapiTsConfig,
    output: tempRoot,
  });

  const diff = spawnSync(
    'git',
    ['diff', '--no-index', '--exit-code', output, tempRoot],
    {
      cwd: root,
      stdio: 'inherit',
    },
  );

  if (diff.status !== 0) {
    process.exit(diff.status ?? 1);
  }
} finally {
  rmSync(tempRoot, { force: true, recursive: true });
}
