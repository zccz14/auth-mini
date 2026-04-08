import { describe, expect, it } from 'vitest';
import { createTestApp } from '../helpers/app.js';
import { executeServedSdk, fakeStorage } from '../helpers/sdk.js';

describe('singleton sdk endpoint', () => {
  const legacyGlobalName = ['Mini', 'Auth'].join('');

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
      expect(body).toContain('window.AuthMini');
      expect(body).not.toContain(`window.${legacyGlobalName}`);
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

  it('bootstraps window.AuthMini from the served source', async () => {
    const testApp = await createTestApp();

    try {
      const response = await testApp.app.request('/sdk/singleton-iife.js');
      const body = await response.text();
      const storage = fakeStorage({
        sessionId: 'session-1',
        refreshToken: 'rt',
        expiresAt: '2026-04-03T00:00:00.000Z',
      });

      const windowObject = executeServedSdk(body, { storage });

      expect(windowObject.AuthMini.session.getState()).toMatchObject({
        status: 'recovering',
        refreshToken: 'rt',
      });
      expect(typeof windowObject.AuthMini.session.onChange).toBe('function');
      expect(Reflect.get(windowObject, legacyGlobalName)).toBeUndefined();
    } finally {
      testApp.close();
    }
  });

  it('treats persisted singleton snapshots without sessionId as anonymous', async () => {
    const testApp = await createTestApp();

    try {
      const response = await testApp.app.request('/sdk/singleton-iife.js');
      const body = await response.text();
      const storage = fakeStorage({
        sessionId: null,
        refreshToken: 'rt',
        expiresAt: '2026-04-03T00:00:00.000Z',
      });

      const windowObject = executeServedSdk(body, { storage });

      expect(windowObject.AuthMini.session.getState()).toMatchObject({
        status: 'anonymous',
        sessionId: null,
        refreshToken: null,
      });
    } finally {
      testApp.close();
    }
  });

  it('reacts to storage events in the served singleton source', async () => {
    const testApp = await createTestApp();

    try {
      const response = await testApp.app.request('/sdk/singleton-iife.js');
      const body = await response.text();
      const storage = fakeStorage({
        sessionId: 'session-1',
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
        receivedAt: '2026-04-03T00:00:00.000Z',
        expiresAt: '2026-04-03T00:03:00.000Z',
      });

      const windowObject = executeServedSdk(body, { storage });

      storage.setItem(
        'auth-mini.sdk',
        JSON.stringify({
          sessionId: 'session-1',
          accessToken: 'access-2',
          refreshToken: 'refresh-2',
          receivedAt: '2026-04-03T00:02:00.000Z',
          expiresAt: '2026-04-03T00:17:00.000Z',
          me: null,
        }),
      );
      (
        windowObject as unknown as Window & {
          dispatchStorageEvent: (event: StorageEvent) => void;
        }
      ).dispatchStorageEvent({
        key: 'auth-mini.sdk',
        storageArea: storage,
      } as StorageEvent);

      expect(windowObject.AuthMini.session.getState()).toMatchObject({
        status: 'recovering',
        sessionId: 'session-1',
        accessToken: 'access-2',
        refreshToken: 'refresh-2',
      });
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
