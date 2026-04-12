import { describe, expect, it } from 'vitest';
import { importPackedModule } from '../helpers/cli.js';

describe('browser sdk package export', () => {
  it('imports createBrowserSdk from the packed browser subpath', async () => {
    const mod = await importPackedModule('auth-mini/sdk/browser');

    expect(mod.createBrowserSdk).toBe('function');
  }, 60000);

  it('imports createDeviceSdk from the packed device subpath', async () => {
    const mod = await importPackedModule('auth-mini/sdk/device');

    expect(mod.createDeviceSdk).toBe('function');
  }, 60000);
});
