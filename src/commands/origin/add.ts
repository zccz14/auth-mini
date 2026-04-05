import { Args, Flags } from '@oclif/core';
import { runOriginAddCommand } from '../../app/commands/origin/add.js';
import { BaseCommand, withCliErrorMetadata } from '../../oclif/base-command.js';

export default class OriginAddCommand extends BaseCommand {
  static summary = 'Add an allowed origin for an auth-mini instance';

  static args = {
    instance: Args.string({
      required: true,
      description: 'Auth-mini instance (currently a SQLite database path)',
    }),
  };

  static flags = {
    value: Flags.string({
      required: true,
      description: 'Allowed origin value',
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(OriginAddCommand);

    try {
      const origin = await runOriginAddCommand({
        dbPath: args.instance,
        value: flags.value,
      });

      this.log(`${origin.id}\t${origin.origin}\t${origin.createdAt}`);
    } catch (error) {
      throw withCliErrorMetadata(error, {
        see: 'auth-mini origin add --help',
      });
    }
  }
}
