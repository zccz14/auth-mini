import { inferBaseUrl } from './base-url.js';
import { createSdkError } from './errors.js';

type BootstrapInput = {
  currentScript: { src?: string | null } | null;
};

export function bootstrapSingletonSdk(input: BootstrapInput) {
  const scriptUrl = input.currentScript?.src;

  if (!scriptUrl) {
    throw createSdkError('sdk_init_failed', 'Cannot determine SDK script URL');
  }

  return {
    baseUrl: inferBaseUrl(scriptUrl),
    sdk: createSingletonSdk(),
  };
}

export function createSingletonSdk() {
  return {
    email: {},
    webauthn: {},
    me: {},
    session: {},
  };
}
