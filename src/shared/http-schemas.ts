import { z } from 'zod';

export const emailStartSchema = z.object({
  email: z.email(),
});

export const emailVerifySchema = z.object({
  email: z.email(),
  code: z.string().regex(/^\d{6}$/),
});

export const refreshSchema = z.object({
  session_id: z.uuid(),
  refresh_token: z.string().min(1),
});

export const webauthnOptionsSchema = z.object({
  rp_id: z.string().min(1),
});

const baseCredentialSchema = z.object({
  id: z.string().min(1),
  rawId: z.string().min(1),
  type: z.literal('public-key'),
});

export const webauthnRegisterVerifySchema = z.object({
  request_id: z.uuid(),
  credential: baseCredentialSchema.extend({
    clientExtensionResults: z.record(z.string(), z.unknown()).optional(),
    response: z.object({
      clientDataJSON: z.string().min(1),
      attestationObject: z.string().min(1),
      transports: z.array(z.string().min(1)).optional(),
    }),
  }),
});

export const webauthnAuthenticateVerifySchema = z.object({
  request_id: z.uuid(),
  credential: baseCredentialSchema.extend({
    response: z.object({
      clientDataJSON: z.string().min(1),
      authenticatorData: z.string().min(1),
      signature: z.string().min(1),
      userHandle: z.string().nullable().optional(),
    }),
  }),
});

export const ed25519CredentialCreateSchema = z.object({
  name: z.string().min(1),
  public_key: z.string().min(1),
});

export const ed25519CredentialUpdateSchema = z.object({
  name: z.string().min(1),
});
