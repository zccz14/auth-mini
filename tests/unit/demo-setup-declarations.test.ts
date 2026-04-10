import { getDemoSetupState } from '../../demo/setup.js';

type Expect<T extends true> = T;
type HasKey<T, K extends PropertyKey> = K extends keyof T ? true : false;

const state = getDemoSetupState({
  origin: 'https://docs.example.com',
  protocol: 'https:',
  hostname: 'docs.example.com',
  sdkOriginInput: 'https://auth.example.com',
});

type State = typeof state;

const hasSdkOrigin: Expect<HasKey<State, 'sdkOrigin'>> = true;
const hasJwksUrl: Expect<HasKey<State, 'jwksUrl'>> = true;
const doesNotExposeSdkScriptUrl: Expect<
  HasKey<State, 'sdkScriptUrl'> extends false ? true : false
> = true;

getDemoSetupState({
  origin: 'https://docs.example.com',
  protocol: 'https:',
  hostname: 'docs.example.com',
  // @ts-expect-error sdkUrl is a legacy input and should not be part of the declaration contract.
  sdkUrl: 'https://auth.example.com/sdk.js',
});

void state;
void hasSdkOrigin;
void hasJwksUrl;
void doesNotExposeSdkScriptUrl;
