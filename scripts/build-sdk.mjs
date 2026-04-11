import { spawn } from 'node:child_process';

const isWatchMode = process.argv.includes('--watch');
const buildCommand = 'tsc -p tsconfig.build.json --declaration';
const watchCommand =
  'tsc -p tsconfig.build.json --declaration --watch --preserveWatchOutput';
const postBuildCommands = [
  'node dist/sdk/build-singleton-iife.js',
  'node dist/sdk/build-singleton-dts.js',
];

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

async function runPostBuild() {
  for (const command of postBuildCommands) {
    await runCommand(command);
  }
}

async function runBuild() {
  await runCommand(buildCommand);
  await runPostBuild();
}

function runWatch() {
  const child = spawn(watchCommand, {
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true,
  });

  let runningPostBuild = false;
  let rerunPostBuild = false;
  let statusBuffer = '';
  let shuttingDown = false;

  const maybeRunPostBuild = async () => {
    if (runningPostBuild || shuttingDown) {
      rerunPostBuild = true;
      return;
    }

    runningPostBuild = true;

    try {
      await runPostBuild();
    } catch (error) {
      shuttingDown = true;
      child.kill('SIGTERM');
      throw error;
    } finally {
      runningPostBuild = false;
    }

    if (rerunPostBuild && !shuttingDown) {
      rerunPostBuild = false;
      await maybeRunPostBuild();
    }
  };

  const readStatus = async (chunk, writer) => {
    const text = chunk.toString();
    writer.write(text);
    statusBuffer += text;

    const lines = statusBuffer.split(/\r?\n/);
    statusBuffer = lines.pop() ?? '';

    for (const line of lines) {
      if (line.includes('Found 0 errors. Watching for file changes.')) {
        await maybeRunPostBuild();
      }
    }
  };

  child.stdout.on('data', (chunk) => {
    void readStatus(chunk, process.stdout).catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
  });

  child.stderr.on('data', (chunk) => {
    void readStatus(chunk, process.stderr).catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
  });

  const shutdown = (signal) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
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
  runWatch();
} else {
  runBuild().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
