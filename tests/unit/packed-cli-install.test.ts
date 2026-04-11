import { describe, expect, it } from 'vitest';
import { getPackedInstallArgs } from '../helpers/cli.js';

describe('packed cli install args', () => {
  it('preserves npm lifecycle scripts during packed install verification', () => {
    expect(
      getPackedInstallArgs('/tmp/install-dir', '/tmp/auth-mini.tgz'),
    ).toEqual([
      'install',
      '--no-package-lock',
      '--prefix',
      '/tmp/install-dir',
      '/tmp/auth-mini.tgz',
    ]);
  });
});
