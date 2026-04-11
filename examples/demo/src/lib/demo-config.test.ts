import { describe, expect, it } from 'vitest';
import { getInitialDemoConfig } from './demo-config';

describe('getInitialDemoConfig', () => {
  it('defaults to the hosted auth origin when no hash or stored origin is present', () => {
    expect(
      getInitialDemoConfig({
        hash: '#/',
        search: '',
        storageOrigin: '',
        pageOrigin: 'https://demo.example.com',
      }),
    ).toEqual({
      authOrigin: 'https://auth.zccz14.com',
      configError: '',
      pageOrigin: 'https://demo.example.com',
      status: 'ready',
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

  it('prefers the stored auth origin when the hash is absent', () => {
    expect(
      getInitialDemoConfig({
        hash: '#/setup',
        search: '',
        storageOrigin: 'https://self-hosted.example.com',
        pageOrigin: 'https://demo.example.com',
      }),
    ).toMatchObject({
      authOrigin: 'https://self-hosted.example.com',
      status: 'ready',
    });
  });

  it('treats an invalid hash auth-origin as blocking even when storage is valid', () => {
    expect(
      getInitialDemoConfig({
        hash: '#/setup?auth-origin=ftp://auth.example.com',
        search: '',
        storageOrigin: 'https://auth.example.com',
        pageOrigin: 'https://demo.example.com',
      }),
    ).toEqual({
      authOrigin: '',
      configError: 'auth-origin must be a valid http or https origin.',
      pageOrigin: 'https://demo.example.com',
      status: 'waiting',
    });
  });

  it('treats an empty hash auth-origin as blocking even when storage is valid', () => {
    expect(
      getInitialDemoConfig({
        hash: '#/setup?auth-origin=',
        search: '',
        storageOrigin: 'https://auth.example.com',
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

  it.each([
    ['not a url', 'auth-origin must be a valid http or https origin.'],
    [
      'ftp://auth.example.com',
      'auth-origin must be a valid http or https origin.',
    ],
    [
      'https://auth.example.com/path',
      'auth-origin must be an origin without a path, search, or hash.',
    ],
    [
      'https://auth.example.com?foo=bar',
      'auth-origin must be an origin without a path, search, or hash.',
    ],
    [
      'https://auth.example.com#fragment',
      'auth-origin must be an origin without a path, search, or hash.',
    ],
  ])('rejects invalid auth origin %p', (storageOrigin, configError) => {
    expect(
      getInitialDemoConfig({
        hash: '#/setup',
        search: '',
        storageOrigin,
        pageOrigin: 'https://demo.example.com',
      }),
    ).toEqual({
      authOrigin: '',
      configError,
      pageOrigin: 'https://demo.example.com',
      status: 'waiting',
    });
  });
});
