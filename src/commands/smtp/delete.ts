import { Args, Flags } from '@oclif/core';
import { runSmtpDeleteCommand } from '../../app/commands/smtp/delete.js';
import { BaseCommand, withCliErrorMetadata } from '../../oclif/base-command.js';

export default class SmtpDeleteCommand extends BaseCommand {
  static summary = 'Delete an SMTP config for an auth-mini instance';

  static args = {
    instance: Args.string({
      required: true,
      description: 'Auth-mini instance (currently a SQLite database path)',
    }),
  };

  static flags = {
    id: Flags.integer({ required: true, description: 'SMTP config id' }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(SmtpDeleteCommand);

    try {
      await runSmtpDeleteCommand({
        dbPath: args.instance,
        id: flags.id,
      });
    } catch (error) {
      throw withCliErrorMetadata(error, {
        see: 'auth-mini smtp delete --help',
      });
    }
  }
}
