import { Args, Flags } from '@oclif/core';
import { runOriginUpdateCommand } from '../../app/commands/origin/update.js';
import { BaseCommand, withCliErrorMetadata } from '../../oclif/base-command.js';

export default class OriginUpdateCommand extends BaseCommand {
  static summary = 'Update a stored browser origin for WebAuthn policy';

  static args = {
    instance: Args.string({
      required: true,
      description: 'Auth-mini instance (currently a SQLite database path)',
    }),
  };

  static flags = {
    id: Flags.integer({
      required: true,
      description: 'Stored browser origin id',
    }),
    value: Flags.string({
      required: true,
      description: 'Browser page origin used for WebAuthn/browser origin checks',
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(OriginUpdateCommand);

    try {
      const origin = await runOriginUpdateCommand({
        dbPath: args.instance,
        id: flags.id,
        value: flags.value,
      });

      this.log(`${origin.id}\t${origin.origin}\t${origin.createdAt}`);
    } catch (error) {
      throw withCliErrorMetadata(error, {
        see: 'auth-mini origin update --help',
      });
    }
  }
}
