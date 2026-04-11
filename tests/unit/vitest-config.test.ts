import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('vitest config', () => {
  it('excludes nested git worktrees from test discovery', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'vitest.config.ts'),
      'utf8',
    );

    expect(source).toContain("'.worktrees/**'");
  });
});
