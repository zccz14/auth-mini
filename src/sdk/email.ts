import type { HttpClient } from './http.js';
import type {
  EmailStartInput,
  EmailStartResponse,
  EmailVerifyInput,
  SessionResult,
} from './types.js';

type SessionController = {
  acceptSessionResponse(response: unknown): Promise<SessionResult>;
};

export function createEmailModule(input: {
  http: HttpClient;
  session: SessionController;
}) {
  return {
    start(payload: EmailStartInput): Promise<EmailStartResponse> {
      return input.http.postJson<EmailStartResponse>('/email/start', payload);
    },
    async verify(payload: EmailVerifyInput): Promise<SessionResult> {
      const response = await input.http.postJson<unknown>(
        '/email/verify',
        payload,
      );

      return await input.session.acceptSessionResponse(response);
    },
  };
}
