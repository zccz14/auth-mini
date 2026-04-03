export type SdkStatus = 'recovering' | 'authenticated' | 'anonymous';

export type MeResponse = {
  user_id: string;
  email: string;
  webauthn_credentials: Array<unknown>;
  active_sessions: Array<unknown>;
};

export type SessionSnapshot = {
  status: SdkStatus;
  authenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: string | null;
  me: MeResponse | null;
};

export type PersistedSdkState = {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: string | null;
  me: MeResponse | null;
};

export type AuthenticatedStateInput = PersistedSdkState;
