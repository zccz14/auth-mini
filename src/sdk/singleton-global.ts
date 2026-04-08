import type { AuthMiniApi } from './types.js';

export {};

declare global {
  interface Window {
    AuthMini: AuthMiniApi;
  }
}
