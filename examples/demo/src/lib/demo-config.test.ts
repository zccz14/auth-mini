import { describe, expect, it } from 'vitest';
import { getInitialDemoConfig } from './demo-config';

describe('getInitialDemoConfig', () => {
  it('returns waiting status when no auth origin is present', () => {
    expect(
      getInitialDemoConfig({
        hash: '#/',
        search: '',
        storageOrigin: '',
        pageOrigin: 'https://demo.example.com',
      }),
    ).toEqual({
      authOrigin: '',
      configError:
        'auth-origin must be configured before interactive flows are enabled.',
      pageOrigin: 'https://demo.example.com',
      status: 'waiting',
    });
  });

  it('prefers the hash auth-origin query over storage', () => {
    expect(
      getInitialDemoConfig({
        hash: '#/setup?auth-origin=https://auth.example.com',
        search: '',
        storageOrigin: 'https://stale.example.com',
        pageOrigin: 'https://demo.example.com',
      }),
    ).toMatchObject({
      authOrigin: 'https://auth.example.com',
      status: 'ready',
    });
  });
});
