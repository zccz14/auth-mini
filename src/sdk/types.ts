import type {
  EmailStartRequest as GeneratedEmailStartInput,
  EmailVerifyRequest as GeneratedEmailVerifyInput,
} from '../generated/api/index.js';

export type SdkStatus = 'recovering' | 'authenticated' | 'anonymous';

export type FetchLike = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;

export type SessionSnapshot = {
  status: SdkStatus;
  authenticated: boolean;
  sessionId: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  receivedAt: string | null;
  expiresAt: string | null;
};

export type PersistedSdkState = {
  sessionId: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  receivedAt: string | null;
  expiresAt: string | null;
};

export type AuthenticatedStateInput = PersistedSdkState;

export type SessionTokens = {
  sessionId: string;
  accessToken: string | null;
  refreshToken: string;
  receivedAt: string;
  expiresAt: string;
};

export type SessionResult = SessionTokens;

export type EmailStartInput = GeneratedEmailStartInput;

export type AuthenticationTargetInput = {
  redirect_uri?: string;
  aud?: string;
};

export type EmailVerifyInput = GeneratedEmailVerifyInput;

export type EmailStartResponse = {
  ok?: boolean;
} & Record<string, unknown>;

export type WebauthnVerifyResponse = Record<string, unknown>;

export type NavigatorCredentialsLike = {
  create?: (options?: CredentialCreationOptions) => Promise<unknown>;
  get?: (options?: CredentialRequestOptions) => Promise<unknown>;
};

export type Listener = (state: SessionSnapshot) => void;

export type DeviceSdkOptions = {
  serverBaseUrl: string;
  privateKeySeed: string;
  fetch?: FetchLike;
  now?: () => number;
};

export type DeviceSdkApi = {
  ready: Promise<void>;
  dispose(): Promise<void>;
  [Symbol.asyncDispose](): Promise<void>;
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
    authenticate(input?: AuthenticationTargetInput): Promise<SessionResult>;
    register(): Promise<WebauthnVerifyResponse>;
  };
  session: {
    getState(): SessionSnapshot;
    onChange(listener: Listener): () => void;
    refresh(): Promise<SessionResult>;
    logout(): Promise<void>;
    clearLocal(): void;
  };
  webauthn: {
    authenticate(input?: AuthenticationTargetInput): Promise<SessionResult>;
    register(): Promise<WebauthnVerifyResponse>;
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
