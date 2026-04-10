export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(code);
  }
}

export function invalidRequestError(): HttpError {
  return new HttpError(400, 'invalid_request');
}

export function invalidAccessTokenError(): HttpError {
  return new HttpError(401, 'invalid_access_token');
}

export function insufficientAuthenticationMethodError(): HttpError {
  return new HttpError(403, 'insufficient_authentication_method');
}

export function sessionInvalidatedError(): HttpError {
  return new HttpError(401, 'session_invalidated');
}

export function sessionSupersededError(): HttpError {
  return new HttpError(401, 'session_superseded');
}

export function invalidEmailOtpError(): HttpError {
  return new HttpError(401, 'invalid_email_otp');
}

export function invalidWebauthnRegistrationError(): HttpError {
  return new HttpError(400, 'invalid_webauthn_registration');
}

export function invalidWebauthnAuthenticationError(): HttpError {
  return new HttpError(400, 'invalid_webauthn_authentication');
}

export function duplicateCredentialError(): HttpError {
  return new HttpError(409, 'duplicate_credential');
}

export function credentialNotFoundError(): HttpError {
  return new HttpError(404, 'credential_not_found');
}

export function smtpNotConfiguredError(): HttpError {
  return new HttpError(503, 'smtp_not_configured');
}

export function smtpTemporarilyUnavailableError(): HttpError {
  return new HttpError(503, 'smtp_temporarily_unavailable');
}
