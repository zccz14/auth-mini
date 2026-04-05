import { Args } from '@oclif/core';
import { runCreateCommand } from '../app/commands/create.js';
import { BaseCommand, withCliErrorMetadata } from '../oclif/base-command.js';

export default class InitCommand extends BaseCommand {
  static summary = 'Initialize a new auth-mini instance';

  static aliases = ['create'];

  static args = {
    instance: Args.string({
      required: true,
      description: 'Auth-mini instance (currently a SQLite database path)',
    }),
  };

  async run(): Promise<void> {
    const { args } = await this.parse(InitCommand);

    try {
      await runCreateCommand({
        dbPath: args.instance,
      });
    } catch (error) {
      throw withCliErrorMetadata(error, {
        see: 'auth-mini init --help',
      });
    }
  }
}
