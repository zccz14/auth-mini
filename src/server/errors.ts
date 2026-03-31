export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string
  ) {
    super(code)
  }
}

export function invalidRequestError(): HttpError {
  return new HttpError(400, 'invalid_request')
}

export function invalidAccessTokenError(): HttpError {
  return new HttpError(401, 'invalid_access_token')
}

export function invalidRefreshTokenError(): HttpError {
  return new HttpError(401, 'invalid_refresh_token')
}

export function invalidEmailOtpError(): HttpError {
  return new HttpError(401, 'invalid_email_otp')
}

export function smtpNotConfiguredError(): HttpError {
  return new HttpError(503, 'smtp_not_configured')
}

export function smtpTemporarilyUnavailableError(): HttpError {
  return new HttpError(503, 'smtp_temporarily_unavailable')
}
