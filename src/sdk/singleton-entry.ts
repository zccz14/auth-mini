/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { renderMeParserSource } from './me.js';
export {
  createAuthMiniInternal,
  createBrowserSdkInternal,
  renderBrowserRuntimeSource,
} from './browser-runtime.js';
import { renderBrowserRuntimeSource } from './browser-runtime.js';

export function renderSingletonIifeSource(): string {
  return `(()=>{${renderMeParserSource()}const runtime=${renderBrowserRuntimeSource()};return (${installOnWindow.toString()})(window, document, runtime);})()`;
}

function installOnWindow(window, document, runtime) {
  const SDK_PATH_SUFFIX = '/sdk/singleton-iife.js';

  function createSdkError(code, message) {
    const error = new Error(`${code}: ${message}`);
    error.name = 'AuthMiniSdkError';
    error.code = code;
    return error;
  }

  function inferBaseUrl(scriptUrl) {
    const url = new URL(scriptUrl);
    if (!url.pathname.endsWith(SDK_PATH_SUFFIX)) {
      throw createSdkError('sdk_init_failed', 'Cannot infer SDK base URL');
    }
    const basePath = url.pathname.slice(0, -SDK_PATH_SUFFIX.length);
    return `${url.origin}${basePath}`;
  }

  function bootstrapWindowSdk(input) {
    const scriptUrl = input.currentScript?.src;
    if (!scriptUrl) {
      throw createSdkError(
        'sdk_init_failed',
        'Cannot determine SDK script URL',
      );
    }
    const baseUrl = inferBaseUrl(scriptUrl);
    return {
      baseUrl,
      sdk: runtime.createBrowserSdkInternal({
        baseUrl,
        fetch: input.fetch,
        now: input.now,
        storage: input.storage,
      }),
    };
  }

  window.AuthMini = bootstrapWindowSdk({
    currentScript: document.currentScript,
    fetch: window.fetch?.bind(window),
  }).sdk;
  /* v1 supports direct browser loading from allowed origins. */
}
