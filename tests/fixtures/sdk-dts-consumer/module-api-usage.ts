import { createApiSdk } from 'auth-mini/sdk/api';
import type {
  ApiSdk,
  ApiSdkOptions,
  Auth,
  EmailStartRequest,
  MeResponse,
  RefreshRequest,
} from 'auth-mini/sdk/api';

const auth: Auth = {
  scheme: 'bearer',
  type: 'http',
};
const emailStartRequest: EmailStartRequest = {
  email: 'user@example.com',
};
const refreshRequest: RefreshRequest = {
  refresh_token: 'refresh-token',
  session_id: 'session-1',
};
const options: ApiSdkOptions = {
  auth: () => 'access-token',
  baseUrl: 'https://auth.example.com',
};
const sdk: ApiSdk = createApiSdk(options);
const me: MeResponse | null = null;

void auth;
void me;
void options;
void sdk.email.start({ body: emailStartRequest });
void sdk.session.refresh({ body: refreshRequest });
void sdk.jwks.list();
