import { describe, expect, it } from 'vitest';
import { createTestApp } from '../helpers/app.js';

const retiredBrowserSdkAssetPaths = [
  `/sdk/${['singleton', 'iife'].join('-')}.js`,
  `/sdk/${['singleton', 'iife'].join('-')}.d.ts`,
];

describe('sdk endpoint removal', () => {
  it.each(retiredBrowserSdkAssetPaths)(
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
