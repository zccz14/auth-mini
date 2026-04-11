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
});
