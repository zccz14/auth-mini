import { describe, expect, it } from 'vitest';
import { createTestApp } from '../helpers/app.js';

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
    } finally {
      testApp.close();
    }
  });

  it('documents the same-origin deployment limitation in served source', async () => {
    const testApp = await createTestApp();

    try {
      const response = await testApp.app.request('/sdk/singleton-iife.js');

      expect(await response.text()).toContain('same-origin');
    } finally {
      testApp.close();
    }
  });
});
