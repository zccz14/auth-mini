import { createDeviceSdk } from 'auth-mini/sdk/device';
import type { DeviceSdkApi, SessionSnapshot } from 'auth-mini/sdk/device';

const privateKeySeed = '7rANewlCLceTsUo9feN0DLjnu-ayYsdhkVWvHT4FelM';

const sdk: DeviceSdkApi = createDeviceSdk({
  serverBaseUrl: 'https://auth.example.com',
  privateKeySeed,
});

const state: SessionSnapshot = sdk.session.getState();
const ready: Promise<void> = sdk.ready;
const dispose: Promise<void> = sdk.dispose();
const asyncDispose: Promise<void> = sdk[Symbol.asyncDispose]();

void state;
void ready;
void dispose;
void asyncDispose;
