import { createDeviceSdk } from 'auth-mini/sdk/device';
import type {
  DevicePrivateKeyJwk,
  DeviceSdkApi,
  SessionSnapshot,
} from 'auth-mini/sdk/device';

const privateKey: DevicePrivateKeyJwk = {
  crv: 'Ed25519',
  d: '7rANewlCLceTsUo9feN0DLjnu-ayYsdhkVWvHT4FelM',
  kty: 'OKP',
  x: 'jt2HpVJxALeSteTe7QlqBRiOxVeloHMMImehYhZc9Rg',
};

const sdk: DeviceSdkApi = createDeviceSdk({
  serverBaseUrl: 'https://auth.example.com',
  credentialId: '550e8400-e29b-41d4-a716-446655440000',
  privateKey,
});

const state: SessionSnapshot = sdk.session.getState();
const ready: Promise<void> = sdk.ready;
const dispose: Promise<void> = sdk.dispose();
const asyncDispose: Promise<void> = sdk[Symbol.asyncDispose]();

void state;
void ready;
void dispose;
void asyncDispose;
