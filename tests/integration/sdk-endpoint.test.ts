import { describe, expect, it } from 'vitest';
import { createTestApp } from '../helpers/app.js';

describe('sdk endpoint removal', () => {
  it.each(['/sdk/singleton-iife.js', '/sdk/singleton-iife.d.ts'])(
    'returns 404 for %s',
    async (path) => {
      const testApp = await createTestApp();

      try {
        const response = await testApp.app.request(path);

        expect(response.status).toBe(404);
      } finally {
        testApp.close();
      }
    },
  );
});
