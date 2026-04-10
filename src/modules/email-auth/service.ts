import { randomInt } from 'node:crypto';
import type { DatabaseClient } from '../../infra/db/client.js';
import {
  listSmtpConfigs,
  selectSmtpConfig,
  sendOtpMail,
} from '../../infra/smtp/mailer.js';
import { hashValue } from '../../shared/crypto.js';
import type { AppLogger } from '../../shared/logger.js';
import {
  TTLS,
  getExpiresAtUnixSeconds,
  getUnixTimeSeconds,
} from '../../shared/time.js';
import {
  createUser,
  getUserByEmail,
  markUserEmailVerified,
} from '../users/repo.js';
import { mintSessionTokens, type TokenPair } from '../session/service.js';
import {
  consumeEmailOtp,
  getEmailOtp,
  invalidateEmailOtp,
  upsertEmailOtp,
} from './repo.js';

export class SmtpNotConfiguredError extends Error {
  constructor() {
    super('smtp_not_configured');
  }
}

export class SmtpDeliveryError extends Error {
  constructor() {
    super('smtp_temporarily_unavailable');
  }
}

export class InvalidEmailOtpError extends Error {
  constructor() {
    super('invalid_email_otp');
  }
}

export async function startEmailAuth(
  db: DatabaseClient,
  input: { email: string; logger?: AppLogger; ip?: string | null },
): Promise<{ ok: true }> {
  const email = normalizeEmail(input.email);
  input.logger?.info(
    {
      event: 'email.start.requested',
      email,
      ...(input.ip ? { ip: input.ip } : {}),
    },
    'Email auth start requested',
  );
  const smtpConfig = selectSmtpConfig(listSmtpConfigs(db));

  if (!smtpConfig) {
    input.logger?.warn(
      { event: 'email.start.failed', email, reason: 'smtp_not_configured' },
      'Email auth start failed',
    );
    throw new SmtpNotConfiguredError();
  }

  const code = generateOtpCode();

  upsertEmailOtp(db, {
    email,
    codeHash: hashValue(code),
    expiresAt: new Date(
      getExpiresAtUnixSeconds(getUnixTimeSeconds(), TTLS.otpSeconds) * 1000,
    ).toISOString(),
  });

  try {
    await sendOtpMail(smtpConfig, email, code, { logger: input.logger });
  } catch (err) {
    invalidateEmailOtp(db, email, new Date().toISOString());
    input.logger?.warn(
      {
        event: 'email.start.failed',
        email,
        reason: 'smtp_temporarily_unavailable',
        message: err instanceof Error ? err.message : String(err),
        smtp_config_id: smtpConfig.id,
      },
      'Email auth start failed',
    );
    throw new SmtpDeliveryError();
  }

  input.logger?.info(
    {
      event: 'email.start.sent',
      email,
      smtp_config_id: smtpConfig.id,
    },
    'Email auth start sent',
  );

  return { ok: true };
}

export async function verifyEmailAuth(
  db: DatabaseClient,
  input: { email: string; code: string; issuer: string; logger?: AppLogger },
): Promise<TokenPair> {
  const email = normalizeEmail(input.email);
  const otp = getEmailOtp(db, email);
  const now = new Date().toISOString();

  if (
    !otp ||
    otp.consumedAt ||
    otp.expiresAt <= now ||
    otp.codeHash !== hashValue(input.code)
  ) {
    input.logger?.warn(
      { event: 'email.verify.failed', email, reason: 'invalid_email_otp' },
      'Email auth verify failed',
    );
    throw new InvalidEmailOtpError();
  }

  if (!consumeEmailOtp(db, email, now)) {
    input.logger?.warn(
      { event: 'email.verify.failed', email, reason: 'invalid_email_otp' },
      'Email auth verify failed',
    );
    throw new InvalidEmailOtpError();
  }

  let user = getUserByEmail(db, email);

  if (!user) {
    user = createUser(db, email, now);
  } else if (!user.emailVerifiedAt) {
    markUserEmailVerified(db, user.id, now);
  }

  const tokens = await mintSessionTokens(db, {
    userId: user.id,
    authMethod: 'email_otp',
    issuer: input.issuer,
    logger: input.logger,
  });

  input.logger?.info(
    {
      event: 'email.verify.succeeded',
      email,
      user_id: user.id,
      session_id: tokens.session.id,
    },
    'Email auth verify succeeded',
  );

  return {
    session_id: tokens.session_id,
    access_token: tokens.access_token,
    token_type: tokens.token_type,
    expires_in: tokens.expires_in,
    refresh_token: tokens.refresh_token,
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}
