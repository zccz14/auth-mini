import { Args } from '@oclif/core';
import { runSmtpListCommand } from '../../app/commands/smtp/list.js';
import { BaseCommand, withCliErrorMetadata } from '../../oclif/base-command.js';

export default class SmtpListCommand extends BaseCommand {
  static summary = 'List SMTP configs for an auth-mini instance';

  static args = {
    instance: Args.string({
      required: true,
      description: 'Auth-mini instance (currently a SQLite database path)',
    }),
  };

  async run(): Promise<void> {
    const { args } = await this.parse(SmtpListCommand);

    try {
      const configs = await runSmtpListCommand({ dbPath: args.instance });

      for (const config of configs) {
        this.log(formatSmtpConfig(config));
      }
    } catch (error) {
      throw withCliErrorMetadata(error, {
        see: 'auth-mini smtp list --help',
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
