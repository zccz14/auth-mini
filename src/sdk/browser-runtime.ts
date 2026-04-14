import {
  createAuthMiniInternal as createAuthMiniInternalFromSingletonEntry,
  createBrowserSdkInternal as createBrowserSdkInternalFromSingletonEntry,
} from './singleton-entry.js';
import type {
  AuthMiniInternal,
  FetchLike,
  InternalSdkDeps,
} from './types.js';

export type BrowserSdkFactoryOptions = {
  fetch?: FetchLike;
  now?: () => number;
  storage?: Storage;
};

export function createAuthMiniInternal(
  input: InternalSdkDeps,
): AuthMiniInternal {
  return createAuthMiniInternalFromSingletonEntry(input);
}

export function createBrowserSdkInternal(
  baseUrl: string,
  options: BrowserSdkFactoryOptions = {},
): AuthMiniInternal {
  return createBrowserSdkInternalFromSingletonEntry(baseUrl, options);
}
