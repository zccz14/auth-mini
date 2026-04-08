import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const vitestArgs = process.argv.slice(2);
const knownNonTargetValueOptions = new Set([
  '--config',
  '--project',
  '--reporter',
  '--coverage',
  '--shard',
  '--maxWorkers',
]);

const looksLikeTestTarget = (arg) =>
  /(^|[\\/])tests([\\/]|$)/.test(arg) ||
  /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(arg);

const run = (command, args) => {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

export const isTargetedVitestRun = (args) => {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '-t' || arg === '--testNamePattern') {
      return true;
    }

    if (arg.startsWith('--testNamePattern=')) {
      return true;
    }

    if (arg === '--dir') {
      return true;
    }

    if (arg.startsWith('--dir=')) {
      return true;
    }

    if (knownNonTargetValueOptions.has(arg)) {
      index += 1;
      continue;
    }

    if (
      [...knownNonTargetValueOptions].some((option) =>
        arg.startsWith(`${option}=`),
      )
    ) {
      continue;
    }

    if (arg.startsWith('-')) {
      continue;
    }

    if (looksLikeTestTarget(arg)) {
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
