import { spawn } from 'node:child_process';

const sdkBuildWatchCommand = 'npm run build -- --watch';
const demoDevCommand = 'npm --prefix examples/demo run dev';
const shutdownTimeoutMs = 3000;
const shutdownPollIntervalMs = 50;
const processes = [];
let shuttingDown = false;
let shutdownPromise;

function isMissingProcess(error) {
  return error instanceof Error && 'code' in error && error.code === 'ESRCH';
}

function isProcessGroupAlive(pid) {
  try {
    process.kill(-pid, 0);
    return true;
  } catch (error) {
    if (isMissingProcess(error)) {
      return false;
    }

    throw error;
  }
}

function signalProcessGroup(pid, signal) {
  try {
    process.kill(-pid, signal);
  } catch (error) {
    if (!isMissingProcess(error)) {
      throw error;
    }
  }
}

async function waitForChildExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.off('exit', handleExit);
      reject(new Error(`child did not exit within ${timeoutMs}ms`));
    }, timeoutMs);

    const handleExit = () => {
      clearTimeout(timer);
      resolve();
    };

    child.once('exit', handleExit);
  });
}

async function waitForProcessGroupExit(pid, timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (!isProcessGroupAlive(pid)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, shutdownPollIntervalMs));
  }

  throw new Error(`process group ${pid} did not exit within ${timeoutMs}ms`);
}

async function terminateChild(child) {
  const { pid } = child;

  if (!pid) {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGTERM');
      await waitForChildExit(child, shutdownTimeoutMs);
    }

    return;
  }

  if (!isProcessGroupAlive(pid) && child.exitCode !== null) {
    return;
  }

  const waitForShutdown = () =>
    Promise.all([
      waitForChildExit(child, shutdownTimeoutMs),
      waitForProcessGroupExit(pid, shutdownTimeoutMs),
    ]);

  signalProcessGroup(pid, 'SIGTERM');

  try {
    await waitForShutdown();
  } catch {
    if (!isProcessGroupAlive(pid) && child.exitCode !== null) {
      return;
    }

    signalProcessGroup(pid, 'SIGKILL');
    await waitForShutdown();
  }
}

function start(command) {
  const child = spawn(command, {
    detached: true,
    stdio: 'inherit',
    shell: true,
  });

  processes.push(child);

  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }

    void shutdown({ exitingChild: child, code, signal });
  });

  return child;
}

function forwardSignal(signal) {
  process.removeAllListeners('SIGINT');
  process.removeAllListeners('SIGTERM');
  process.kill(process.pid, signal);
}

function shutdown({ exitingChild, code, signal } = {}) {
  if (shutdownPromise) {
    return shutdownPromise;
  }

  shuttingDown = true;
  shutdownPromise = Promise.all(
    processes
      .filter((child) => child !== exitingChild)
      .map((child) => terminateChild(child)),
  ).finally(() => {
    if (signal) {
      forwardSignal(signal);
      return;
    }

    process.exit(code ?? 0);
  });

  return shutdownPromise;
}

process.on('SIGINT', () => {
  void shutdown({ signal: 'SIGINT' });
});

process.on('SIGTERM', () => {
  void shutdown({ signal: 'SIGTERM' });
});

start(sdkBuildWatchCommand);
start(demoDevCommand);
