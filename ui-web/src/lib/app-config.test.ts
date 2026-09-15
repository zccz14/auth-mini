import { describe, expect, it } from 'vitest';
import { resolveServerBaseUrl } from './app-config';

describe('resolveServerBaseUrl', () => {
  it('uses the parent path of the embedded GUI as the auth server base', () => {
    expect(resolveServerBaseUrl('http://127.0.0.1:7788/web/#/initialize')).toBe(
      'http://127.0.0.1:7788/',
    );
  });
});
