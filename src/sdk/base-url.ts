import { createSdkError } from './errors.js';

const SDK_PATH_SUFFIX = '/sdk/singleton-iife.js';

export function inferBaseUrl(scriptUrl: string): string {
  const url = new URL(scriptUrl);

  if (!url.pathname.endsWith(SDK_PATH_SUFFIX)) {
    throw createSdkError('sdk_init_failed', 'Cannot infer SDK base URL');
  }

  const basePath = url.pathname.slice(0, -SDK_PATH_SUFFIX.length);
  return `${url.origin}${basePath}`;
}
