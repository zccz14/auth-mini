import { Args, Flags } from '@oclif/core';
import { runOriginDeleteCommand } from '../../app/commands/origin/delete.js';
import { BaseCommand, withCliErrorMetadata } from '../../oclif/base-command.js';

export default class OriginDeleteCommand extends BaseCommand {
  static summary = 'Delete an allowed origin for an auth-mini instance';

  static args = {
    instance: Args.string({
      required: true,
      description: 'Auth-mini instance (currently a SQLite database path)',
    }),
  };

  static flags = {
    id: Flags.integer({
      required: true,
      description: 'Allowed origin id',
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(OriginDeleteCommand);

    try {
      await runOriginDeleteCommand({
        dbPath: args.instance,
        id: flags.id,
      });
    } catch (error) {
      throw withCliErrorMetadata(error, {
        see: 'auth-mini origin delete --help',
      });
    }
  }
}
