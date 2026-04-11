import { spawn } from 'node:child_process';

const sdkBuildWatchCommand = 'npm run build -- --watch';
const demoDevCommand = 'npm --prefix examples/demo run dev';
const processes = [];
let shuttingDown = false;

function stopOthers(exitingChild) {
  for (const child of processes) {
    if (child !== exitingChild && !child.killed) {
      child.kill('SIGTERM');
    }
  }
}

function start(command) {
  const child = spawn(command, {
    stdio: 'inherit',
    shell: true,
  });

  processes.push(child);

  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    stopOthers(child);

    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 1);
  });

  return child;
}

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  stopOthers();

  if (signal) {
    process.kill(process.pid, signal);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start(sdkBuildWatchCommand);
start(demoDevCommand);
