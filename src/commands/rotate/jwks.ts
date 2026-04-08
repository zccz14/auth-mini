import { Args } from '@oclif/core';
import { runRotateJwksCommand } from '../../app/commands/rotate-jwks.js';
import { BaseCommand } from '../../oclif/base-command.js';

export default class RotateJwksCommand extends BaseCommand {
  static summary =
    'Promote the standby JWKS signing key and generate a new standby key';

  static aliases = ['rotate-jwks'];

  static args = {
    dbPath: Args.string({
      required: true,
      description: 'SQLite database path',
    }),
  };

  async run(): Promise<void> {
    const { args } = await this.parse(RotateJwksCommand);

    await runRotateJwksCommand({ dbPath: args.dbPath });
  }
}
