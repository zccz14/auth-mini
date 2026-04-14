import { spawn } from 'node:child_process';

const isWatchMode = process.argv.includes('--watch');
const generateApiCommand = 'npm run generate:api';
const buildCommand = 'tsc -p tsconfig.build.json --declaration';
const watchCommand =
  'tsc -p tsconfig.build.json --declaration --watch --preserveWatchOutput';

async function runCommand(command) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, {
      stdio: 'inherit',
      shell: true,
    });

    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`command exited with signal ${signal}: ${command}`));
        return;
      }

      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`command exited with code ${code ?? 1}: ${command}`));
    });
  });
}

async function runBuild() {
  await runCommand(generateApiCommand);
  await runCommand(buildCommand);
}

async function runWatch() {
  await runCommand(generateApiCommand);

  const child = spawn(watchCommand, {
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true,
  });

  let statusBuffer = '';

  const readStatus = (chunk, writer) => {
    const text = chunk.toString();
    writer.write(text);
    statusBuffer += text;

    const lines = statusBuffer.split(/\r?\n/);
    statusBuffer = lines.pop() ?? '';
  };

  child.stdout.on('data', (chunk) => {
    try {
      readStatus(chunk, process.stdout);
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
  });

  child.stderr.on('data', (chunk) => {
    try {
      readStatus(chunk, process.stderr);
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
  });

  const shutdown = (signal) => {
    child.kill(signal);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? process.exitCode ?? 1);
  });
}

if (isWatchMode) {
  runWatch().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
} else {
  runBuild().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
