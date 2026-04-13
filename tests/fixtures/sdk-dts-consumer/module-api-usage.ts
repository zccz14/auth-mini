import { createApiSdk } from 'auth-mini/sdk/api';
import type { ApiSdkOptions } from 'auth-mini/sdk/api';

const options: ApiSdkOptions = {
  baseUrl: 'https://auth.example.com',
};

const sdk = createApiSdk(options);

void sdk.email.start({ email: 'user@example.com' });
void sdk.session.refresh({
  refresh_token: 'refresh-token',
  session_id: 'session-id',
});
