import { Args, Flags } from '@oclif/core';
import { runSmtpAddCommand } from '../../app/commands/smtp/add.js';
import { BaseCommand, withCliErrorMetadata } from '../../oclif/base-command.js';

export default class SmtpAddCommand extends BaseCommand {
  static summary = 'Add an SMTP config for an auth-mini instance';

  static args = {
    instance: Args.string({
      required: true,
      description: 'Auth-mini instance (currently a SQLite database path)',
    }),
  };

  static flags = {
    host: Flags.string({ required: true, description: 'SMTP host' }),
    port: Flags.integer({ required: true, description: 'SMTP port' }),
    username: Flags.string({ required: true, description: 'SMTP username' }),
    password: Flags.string({ required: true, description: 'SMTP password' }),
    'from-email': Flags.string({
      required: true,
      description: 'Sender email address',
    }),
    'from-name': Flags.string({ description: 'Sender display name' }),
    secure: Flags.boolean({ description: 'Use SMTPS / secure transport' }),
    weight: Flags.integer({ description: 'Selection weight' }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(SmtpAddCommand);

    try {
      const config = await runSmtpAddCommand({
        dbPath: args.instance,
        host: flags.host,
        port: flags.port,
        username: flags.username,
        password: flags.password,
        fromEmail: flags['from-email'],
        fromName: flags['from-name'] ?? '',
        secure: flags.secure ?? false,
        weight: flags.weight ?? 1,
      });

      this.log(formatSmtpConfig(config));
    } catch (error) {
      throw withCliErrorMetadata(error, {
        see: 'auth-mini smtp add --help',
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
