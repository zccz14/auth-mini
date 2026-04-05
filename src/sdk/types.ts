export type SdkStatus = 'recovering' | 'authenticated' | 'anonymous';

export type FetchLike = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;

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
  receivedAt: string | null;
  expiresAt: string | null;
  me: MeResponse | null;
};

export type PersistedSdkState = {
  accessToken: string | null;
  refreshToken: string | null;
  receivedAt: string | null;
  expiresAt: string | null;
  me: MeResponse | null;
};

export type AuthenticatedStateInput = PersistedSdkState;

export type SessionTokens = {
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

export type MiniAuthApi = {
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

export type MiniAuthInternal = MiniAuthApi & {
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
