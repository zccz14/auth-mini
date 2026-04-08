import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const vitestArgs = process.argv.slice(2);
const looksLikePath = (arg) =>
  arg.includes('/') || arg.includes('\\') || /\.(?:[cm]?[jt]sx?)$/.test(arg);

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

    if (arg.startsWith('-')) {
      if (!arg.includes('=')) {
        index += 1;
      }

      continue;
    }

    if (looksLikePath(arg)) {
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
