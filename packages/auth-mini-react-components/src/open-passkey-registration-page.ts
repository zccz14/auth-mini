const passkeyRegistrationPopupName = 'auth-mini-passkey-registration';
const passkeyRegistrationPopupFeatures =
  'popup,width=520,height=720,resizable=yes,scrollbars=yes';

/**
 * Opens Auth Mini's dedicated passkey-registration page in a named popup.
 *
 * The page establishes its own Auth Mini session and runs the WebAuthn
 * ceremony on the Auth Mini origin. No downstream application token is passed
 * to the popup.
 */
export function openPasskeyRegistrationPage(
  authMiniBaseUrl: string,
): Window | null {
  const url = new URL('/web/', authMiniBaseUrl);
  url.hash = '/passkey/register';

  const popup = window.open(
    url.toString(),
    passkeyRegistrationPopupName,
    passkeyRegistrationPopupFeatures,
  );
  popup?.focus();
  return popup;
}
