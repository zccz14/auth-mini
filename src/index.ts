#!/usr/bin/env node

import { pathToFileURL } from 'node:url';
import { cac } from 'cac';
import type { CAC } from 'cac';
import { runCreateCommand } from './app/commands/create.js';
import { normalizeOriginOption } from './app/commands/options.js';
import { runStartCommand } from './app/commands/start.js';
import { runRotateJwksCommand } from './app/commands/rotate-jwks.js';

export function createCli(): CAC {
  const cli = cac('auth-mini');

  registerCommands(cli);
  cli.version('0.1.0');
  cli.help();

  return cli;
}

export function registerCommands(cli: CAC): CAC {
  cli
    .command('create <dbPath>')
    .option('--smtp-config <file>', 'SMTP config JSON file')
    .action(async (dbPath: string, options: { smtpConfig?: string }) => {
      await executeCommand(() =>
        runCreateCommand({ dbPath, smtpConfig: options.smtpConfig }),
      );
    });

  cli.command('rotate-jwks <dbPath>').action(async (dbPath: string) => {
    await executeCommand(() => runRotateJwksCommand({ dbPath }));
  });

  cli
    .command('start <dbPath>')
    .option('--host <host>', 'Listen host')
    .option('--port <port>', 'Listen port')
    .option('--issuer <url>', 'JWT issuer URL')
    .option('--rp-id <rpId>', 'WebAuthn relying party ID')
    .option('--origin <origin>', 'Allowed WebAuthn origin')
    .action(
      async (
        dbPath: string,
        options: {
          host?: string;
          port?: string;
          issuer?: string;
          rpId?: string;
          origin?: string | string[];
        },
      ) => {
        await executeCommand(async () => {
          await runStartCommand({
            dbPath,
            host: options.host,
            port: options.port,
            issuer: options.issuer,
            rpId: options.rpId,
            origin: normalizeOriginOption(options.origin),
          });
        });
      },
    );

  return cli;
}

export async function runCli(argv = process.argv): Promise<CAC> {
  const cli = createCli();

  cli.parse(argv, { run: false });
  await cli.runMatchedCommand();

  return cli;
}

async function executeCommand(run: () => Promise<void>): Promise<void> {
  try {
    await run();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(message);
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await runCli();
}
