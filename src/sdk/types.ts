import type {
  Ed25519Credential as GeneratedMeEd25519Credential,
  EmailStartRequest as GeneratedEmailStartInput,
  EmailVerifyRequest as GeneratedEmailVerifyInput,
  MeResponse as GeneratedMeResponse,
  SessionSummary as GeneratedMeActiveSession,
  WebauthnCredential as GeneratedMeWebauthnCredential,
} from '../generated/api/index.js';

export type SdkStatus = 'recovering' | 'authenticated' | 'anonymous';

export type FetchLike = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;

export type MeWebauthnCredential = GeneratedMeWebauthnCredential;

export type MeEd25519Credential = GeneratedMeEd25519Credential;

export type MeActiveSession = GeneratedMeActiveSession;

export type MeResponse = GeneratedMeResponse;

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

export type EmailVerifyInput = GeneratedEmailVerifyInput;

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
    fetch(): Promise<MeResponse>;
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
    fetch(): Promise<MeResponse>;
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
