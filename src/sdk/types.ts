export type SdkStatus = 'recovering' | 'authenticated' | 'anonymous';

export type FetchLike = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;

export type MeWebauthnCredential = {
  id: string;
  credential_id: string;
  transports: string[];
  rp_id: string;
  last_used_at: string | null;
  created_at: string;
};

export type MeEd25519Credential = {
  id: string;
  name: string;
  public_key: string;
  last_used_at: string | null;
  created_at: string;
};

export type MeActiveSession = {
  id: string;
  created_at: string;
  expires_at: string;
};

export type MeResponse = {
  user_id: string;
  email: string;
  webauthn_credentials: MeWebauthnCredential[];
  ed25519_credentials: MeEd25519Credential[];
  active_sessions: MeActiveSession[];
};

export type SessionSnapshot = {
  status: SdkStatus;
  authenticated: boolean;
  sessionId: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  receivedAt: string | null;
  expiresAt: string | null;
  me: MeResponse | null;
};

export type PersistedSdkState = {
  sessionId: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  receivedAt: string | null;
  expiresAt: string | null;
  me: MeResponse | null;
};

export type AuthenticatedStateInput = PersistedSdkState;

export type SessionTokens = {
  sessionId: string;
  accessToken: string | null;
  refreshToken: string;
  receivedAt: string;
  expiresAt: string;
};

export type SessionResult = SessionTokens & {
  me: MeResponse;
};

export type EmailStartInput = {
  email: string;
};

export type EmailVerifyInput = {
  email: string;
  code: string;
};

export type EmailStartResponse = {
  ok?: boolean;
} & Record<string, unknown>;

export type WebauthnVerifyResponse = Record<string, unknown>;

export type PasskeyOptionsInput = {
  rpId?: string;
};

export type NavigatorCredentialsLike = {
  create?: (options?: CredentialCreationOptions) => Promise<unknown>;
  get?: (options?: CredentialRequestOptions) => Promise<unknown>;
};

export type Listener = (state: SessionSnapshot) => void;

export type DeviceSdkOptions = {
  serverBaseUrl: string;
  credentialId: string;
  privateKeySeed: string;
  fetch?: FetchLike;
  now?: () => number;
};

export type DeviceSdkApi = {
  ready: Promise<void>;
  dispose(): Promise<void>;
  [Symbol.asyncDispose](): Promise<void>;
  me: {
    get(): MeResponse | null;
    reload(): Promise<MeResponse>;
  };
  session: {
    getState(): SessionSnapshot;
    onChange(listener: Listener): () => void;
    refresh(): Promise<SessionResult>;
    logout(): Promise<void>;
  };
};

export type AuthMiniApi = {
  email: {
    start(input: EmailStartInput): Promise<EmailStartResponse>;
    verify(input: EmailVerifyInput): Promise<SessionResult>;
  };
  passkey: {
    authenticate(input?: PasskeyOptionsInput): Promise<SessionResult>;
    register(input?: PasskeyOptionsInput): Promise<WebauthnVerifyResponse>;
  };
  me: {
    get(): MeResponse | null;
    reload(): Promise<MeResponse>;
  };
  session: {
    getState(): SessionSnapshot;
    onChange(listener: Listener): () => void;
    refresh(): Promise<SessionResult>;
    logout(): Promise<void>;
  };
  webauthn: {
    authenticate(input?: PasskeyOptionsInput): Promise<SessionResult>;
    register(input?: PasskeyOptionsInput): Promise<WebauthnVerifyResponse>;
  };
};

export type AuthMiniInternal = AuthMiniApi & {
  ready: Promise<void>;
};

export type InternalSdkDeps = {
  autoRecover?: boolean;
  baseUrl: string;
  fetch: FetchLike;
  now?: () => number;
  navigatorCredentials?: NavigatorCredentialsLike;
  publicKeyCredential?: unknown;
  storage: Storage;
};

export type ServerErrorPayload = {
  error?: string;
} & Record<string, unknown>;
