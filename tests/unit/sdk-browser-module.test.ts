import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createBrowserSdk } from '../../src/sdk/browser.js';
import { fakeStorage, jsonResponse } from '../helpers/sdk.js';

describe('browser module sdk', () => {
  it('uses the explicit base URL for browser sdk requests without window side effects', async () => {
    const storage = fakeStorage();
    const fetch = vi.fn(async () => jsonResponse({ ok: true }));
    const sdk = createBrowserSdk('https://sdk.example.test:9443', {
      fetch,
      storage,
    });

    expect(typeof sdk.email.start).toBe('function');
    expect(typeof sdk.session.onChange).toBe('function');
    expect('AuthMini' in globalThis).toBe(false);

    await expect(
      sdk.email.start({ email: 'user@example.com' }),
    ).resolves.toEqual({ ok: true });

    expect(fetch).toHaveBeenCalledTimes(1);

    const [requestUrl, requestInit] = fetch.mock.calls[0] ?? [];

    expect(requestUrl).toBeInstanceOf(URL);
    expect(requestUrl.href).toBe('https://sdk.example.test:9443/email/start');
    expect(requestInit).toMatchObject({
      method: 'POST',
    });
  });

  it('keeps the browser module declaration free of singleton global typings', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/sdk/browser.ts'),
      'utf8',
    );

    expect(source).not.toMatch(
      /type\s+BrowserSdkFactoryOptions[\s\S]*from '\.\/singleton-entry\.js'/,
    );
    expect(source).toContain('createBrowserSdkInternal');
    expect(source).toContain('BrowserSdkFactoryOptions');
    expect(source).toContain("from './types.js'");
    expect(source).toContain(
      'export type {\n  AuthMiniApi,\n  BrowserSdkFactoryOptions,',
    );
  });
});
