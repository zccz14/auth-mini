export type SdkErrorCode = 'sdk_init_failed';

export type SdkError = Error & {
  code: SdkErrorCode;
};

export function createSdkError(code: SdkErrorCode, message: string): SdkError {
  const error = new Error(`${code}: ${message}`) as SdkError;
  error.name = 'MiniAuthSdkError';
  error.code = code;
  return error;
}
