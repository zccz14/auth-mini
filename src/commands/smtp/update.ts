import { Args, Flags } from '@oclif/core';
import { runSmtpUpdateCommand } from '../../app/commands/smtp/update.js';
import { BaseCommand, withCliErrorMetadata } from '../../oclif/base-command.js';

export default class SmtpUpdateCommand extends BaseCommand {
  static summary = 'Update an SMTP config for an auth-mini instance';

  static args = {
    instance: Args.string({
      required: true,
      description: 'Auth-mini instance (currently a SQLite database path)',
    }),
  };

  static flags = {
    id: Flags.integer({ required: true, description: 'SMTP config id' }),
    host: Flags.string({ description: 'SMTP host' }),
    port: Flags.integer({ description: 'SMTP port' }),
    username: Flags.string({ description: 'SMTP username' }),
    password: Flags.string({ description: 'SMTP password' }),
    'from-email': Flags.string({ description: 'Sender email address' }),
    'from-name': Flags.string({ description: 'Sender display name' }),
    secure: Flags.string({
      options: ['true', 'false'],
      description: 'Set SMTPS / secure transport on or off',
    }),
    weight: Flags.integer({ description: 'Selection weight' }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(SmtpUpdateCommand);

    try {
      const config = await runSmtpUpdateCommand({
        dbPath: args.instance,
        id: flags.id,
        host: flags.host,
        port: flags.port,
        username: flags.username,
        password: flags.password,
        fromEmail: flags['from-email'],
        fromName: flags['from-name'],
        secure: parseSecureFlag(flags.secure),
        weight: flags.weight,
      });

      this.log(formatSmtpConfig(config));
    } catch (error) {
      throw withCliErrorMetadata(error, {
        see: 'auth-mini smtp update --help',
      });
    }
  }
}

function formatSmtpConfig(config: {
  id: number;
  host: string;
  port: number;
  username: string;
  fromEmail: string;
  fromName: string;
  secure: boolean;
  isActive: boolean;
  weight: number;
}): string {
  return [
    config.id,
    config.host,
    config.port,
    config.username,
    config.fromEmail,
    config.fromName,
    config.secure ? 1 : 0,
    config.isActive ? 1 : 0,
    config.weight,
  ].join('\t');
}

function parseSecureFlag(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  return value === 'true';
}
