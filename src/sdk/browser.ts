import { createBrowserSdkInternal } from './browser-runtime.js';
import type { AuthMiniApi } from './types.js';

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

export function createBrowserSdk(serverBaseUrl: string): AuthMiniApi {
  return createBrowserSdkInternal(serverBaseUrl);
}
