import { createApiSdk } from 'auth-mini/sdk/api';
import type {
  ApiSdk,
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
const sdk: ApiSdk = createApiSdk({
  auth: () => 'access-token',
  baseUrl: 'https://auth.example.com',
});
const me: MeResponse | null = null;

void auth;
void me;
void sdk.email.start({ body: emailStartRequest });
void sdk.session.refresh({ body: refreshRequest });
void sdk.jwks.list();
