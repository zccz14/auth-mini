import { Args } from '@oclif/core';
import { runCreateCommand } from '../app/commands/create.js';
import { BaseCommand, withCliErrorMetadata } from '../oclif/base-command.js';

export default class CreateCommand extends BaseCommand {
  static summary = 'Create a new auth-mini database';

  static args = {
    dbPath: Args.string({
      required: true,
      description: 'SQLite database path',
    }),
  };

  async run(): Promise<void> {
    const { args } = await this.parse(CreateCommand);

    try {
      await runCreateCommand({
        dbPath: args.dbPath,
      });
    } catch (error) {
      throw withCliErrorMetadata(error, {
        see: 'auth-mini create --help',
      });
    }
  }
}
