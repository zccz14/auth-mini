import { createBrowserSdk } from 'auth-mini/sdk/browser';

export type DemoSdk = ReturnType<typeof createBrowserSdk>;

export function createDemoSdk(authOrigin: string): DemoSdk {
  return createBrowserSdk(authOrigin);
}
