import { createBrowserSdkInternal } from './singleton-entry.js';
import type { AuthMiniApi, BrowserSdkFactoryOptions } from './types.js';

export type {
  AuthMiniApi,
  EmailStartInput,
  EmailStartResponse,
  EmailVerifyInput,
  MeResponse,
  PasskeyOptionsInput,
  SessionResult,
  SessionSnapshot,
  SdkStatus,
  WebauthnVerifyResponse,
} from './types.js';

export function createBrowserSdk(
  serverBaseUrl: string,
  options: BrowserSdkFactoryOptions = {},
): AuthMiniApi {
  return createBrowserSdkInternal(serverBaseUrl, options);
}
