import { spawnSync } from 'node:child_process';

const vitestArgs = process.argv.slice(2);

const run = (command, args) => {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

run('npm', ['run', 'build']);

if (vitestArgs.length > 0) {
  run('npx', ['vitest', 'run', ...vitestArgs]);
  process.exit(0);
}

run('npx', ['vitest', 'run', 'tests', '--maxWorkers=1']);
run('npx', ['tsc', '-p', 'tests/fixtures/sdk-dts-consumer/tsconfig.json']);
