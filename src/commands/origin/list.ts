import { Args } from '@oclif/core';
import { runOriginListCommand } from '../../app/commands/origin/list.js';
import { BaseCommand, withCliErrorMetadata } from '../../oclif/base-command.js';

export default class OriginListCommand extends BaseCommand {
  static summary = 'List allowed origins for an auth-mini instance';

  static args = {
    instance: Args.string({
      required: true,
      description: 'Auth-mini instance (currently a SQLite database path)',
    }),
  };

  async run(): Promise<void> {
    const { args } = await this.parse(OriginListCommand);

    try {
      const origins = await runOriginListCommand({ dbPath: args.instance });

      for (const origin of origins) {
        this.log(`${origin.id}\t${origin.origin}\t${origin.createdAt}`);
      }
    } catch (error) {
      throw withCliErrorMetadata(error, {
        see: 'auth-mini origin list --help',
      });
    }
  }
}
