import { createBrowserSdk } from 'auth-mini/sdk/browser';
import type {
  AuthMiniApi,
  MeResponse,
  SessionSnapshot,
} from 'auth-mini/sdk/browser';

const sdk: AuthMiniApi = createBrowserSdk('https://auth.example.com');

const state: SessionSnapshot = sdk.session.getState();
const me: MeResponse | null = sdk.me.get();

void state;
void me;
