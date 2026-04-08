import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const vitestArgs = process.argv.slice(2);
const narrowingFlags = new Set(['-t', '--testNamePattern', '--dir']);

const run = (command, args) => {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

export const isTargetedVitestRun = (args) => {
  for (const arg of args) {
    if (narrowingFlags.has(arg)) {
      return true;
    }

    if (!arg.startsWith('-')) {
      return true;
    }
  }

  return false;
};

export const main = (args) => {
  run('npm', ['run', 'build']);

  if (isTargetedVitestRun(args)) {
    run('npx', ['vitest', 'run', ...args]);
    return;
  }

  run('npx', ['vitest', 'run', 'tests', ...args]);
  run('npx', ['tsc', '-p', 'tests/fixtures/sdk-dts-consumer/tsconfig.json']);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(vitestArgs);
}
