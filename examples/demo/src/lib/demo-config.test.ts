import { describe, expect, it } from 'vitest';
import { getInitialDemoConfig } from './demo-config';

describe('getInitialDemoConfig', () => {
  it('uses the parent path of the embedded web app as the auth server base', () => {
    expect(
      getInitialDemoConfig({
        pageHref: 'http://127.0.0.1:7788/web/#/setup',
        pageOrigin: 'http://127.0.0.1:7788',
      }),
    ).toEqual({
      configError: '',
      pageOrigin: 'http://127.0.0.1:7788',
      resolvedServerBaseUrl: 'http://127.0.0.1:7788/',
      serverBaseUrl: '..',
      status: 'ready',
    });
  });
});
