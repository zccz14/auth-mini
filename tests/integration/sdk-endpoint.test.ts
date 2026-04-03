import { describe, expect, it } from 'vitest';
import { createTestApp } from '../helpers/app.js';
import { executeServedSdk, fakeStorage } from '../helpers/sdk.js';

describe('singleton sdk endpoint', () => {
  it('serves the singleton sdk as javascript with no-cache headers', async () => {
    const testApp = await createTestApp();

    try {
      const response = await testApp.app.request('/sdk/singleton-iife.js');
      const body = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain(
        'application/javascript',
      );
      expect(response.headers.get('cache-control')).toContain('no-cache');
      expect(body).toContain('window.MiniAuth');
      expect(body).toContain('bootstrapSingletonSdk');
    } finally {
      testApp.close();
    }
  });

  it('returns cors headers for allowed origins on the singleton sdk endpoint', async () => {
    const testApp = await createTestApp();

    try {
      const response = await testApp.app.request('/sdk/singleton-iife.js', {
        headers: { origin: 'https://app.example.com' },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('access-control-allow-origin')).toBe(
        'https://app.example.com',
      );
      expect(response.headers.get('vary')).toBe('Origin');
    } finally {
      testApp.close();
    }
  });

  it('bootstraps window.MiniAuth from the served source', async () => {
    const testApp = await createTestApp();

    try {
      const response = await testApp.app.request('/sdk/singleton-iife.js');
      const body = await response.text();
      const storage = fakeStorage({
        refreshToken: 'rt',
        expiresAt: '2026-04-03T00:00:00.000Z',
      });

      const windowObject = executeServedSdk(body, { storage });

      expect(windowObject.MiniAuth.session.getState()).toMatchObject({
        status: 'recovering',
        refreshToken: 'rt',
      });
      expect(typeof windowObject.MiniAuth.session.onChange).toBe('function');
    } finally {
      testApp.close();
    }
  });

  it('surfaces sdk init failure from the served source when currentScript is unavailable', async () => {
    const testApp = await createTestApp();

    try {
      const response = await testApp.app.request('/sdk/singleton-iife.js');
      const body = await response.text();

      expect(() => executeServedSdk(body, { currentScriptSrc: null })).toThrow(
        'sdk_init_failed',
      );
    } finally {
      testApp.close();
    }
  });

  it('surfaces sdk init failure from the served source when localStorage is unavailable', async () => {
    const testApp = await createTestApp();

    try {
      const response = await testApp.app.request('/sdk/singleton-iife.js');
      const body = await response.text();

      expect(() =>
        executeServedSdk(body, { storageUnavailable: true }),
      ).toThrow('sdk_init_failed');
    } finally {
      testApp.close();
    }
  });

  it('does not describe the served source as same-origin-only', async () => {
    const testApp = await createTestApp();

    try {
      const response = await testApp.app.request('/sdk/singleton-iife.js');

      expect(await response.text()).not.toContain('same-origin');
    } finally {
      testApp.close();
    }
  });
});
