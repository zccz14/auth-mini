import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readConsumerFixture = (fileName: string) =>
  readFileSync(
    resolve(process.cwd(), 'tests/fixtures/sdk-dts-consumer', fileName),
    'utf8',
  );

const readBrowserModuleDeclaration = () =>
  readFileSync(resolve(process.cwd(), 'dist/sdk/browser.d.ts'), 'utf8');

const readDeviceModuleDeclaration = () =>
  readFileSync(resolve(process.cwd(), 'dist/sdk/device.d.ts'), 'utf8');

const readSharedTypesDeclaration = () =>
  readFileSync(resolve(process.cwd(), 'dist/sdk/types.d.ts'), 'utf8');

const readSdkErrorsDeclaration = () =>
  readFileSync(resolve(process.cwd(), 'dist/sdk/errors.d.ts'), 'utf8');

const readApiModuleDeclaration = () =>
  readFileSync(resolve(process.cwd(), 'dist/sdk/api.d.ts'), 'utf8');

const readApiModuleRuntime = () =>
  readFileSync(resolve(process.cwd(), 'dist/sdk/api.js'), 'utf8');

const loadTestRunnerModule = async () =>
  import(resolve(process.cwd(), 'scripts/run-tests.js'));

describe('sdk d.ts build artifact', () => {
  it('is enforced by the automated repo test command', () => {
    const testRunnerSource = readFileSync(
      resolve(process.cwd(), 'scripts/run-tests.js'),
      'utf8',
    );

    expect(testRunnerSource).toContain("run('npx', ['tsc'");
    expect(testRunnerSource).toContain(
      "'tests/fixtures/sdk-dts-consumer/tsconfig.json'",
    );
    expect(testRunnerSource).toContain('process.argv.slice(2)');
    expect(testRunnerSource).toContain('isTargetedVitestRun');
    expect(testRunnerSource).toContain('fileURLToPath(import.meta.url)');
  });

  it('runs generated artifact drift checks before the standard test suite and dts compile', () => {
    const buildScriptSource = readFileSync(
      resolve(process.cwd(), 'scripts/build-sdk.mjs'),
      'utf8',
    );
    const testRunnerSource = readFileSync(
      resolve(process.cwd(), 'scripts/run-tests.js'),
      'utf8',
    );

    expect(buildScriptSource).toContain('npm run generate:api');
    expect(buildScriptSource.indexOf('npm run generate:api')).toBeLessThan(
      buildScriptSource.indexOf('tsc -p tsconfig.build.json --declaration'),
    );
    expect(buildScriptSource.match(/await runCommand\(/g)).toHaveLength(3);
    expect(buildScriptSource).toContain('await runCommand(generateApiCommand);');
    expect(buildScriptSource).toContain('await runCommand(buildCommand);');
    expect(buildScriptSource).toContain('const child = spawn(watchCommand, {');
    expect(testRunnerSource).toContain(
      "run('npm', ['run', 'check:generated:api'])",
    );
    expect(
      testRunnerSource.indexOf("run('npm', ['run', 'check:generated:api'])"),
    ).toBeLessThan(
      testRunnerSource.indexOf(
        "run('npx', ['vitest', 'run', 'tests', ...args])",
      ),
    );
    expect(
      testRunnerSource.indexOf(
        "run('npx', ['vitest', 'run', 'tests', ...args])",
      ),
    ).toBeLessThan(
      testRunnerSource.indexOf('tests/fixtures/sdk-dts-consumer/tsconfig.json'),
    );
  });

  it('keeps explicit targeted signals while allowing bare coverage-following test paths', async () => {
    const { isTargetedVitestRun } = await loadTestRunnerModule();

    expect(isTargetedVitestRun(['--maxWorkers=1'])).toBe(false);
    expect(isTargetedVitestRun(['--maxWorkers', '1'])).toBe(false);
    expect(isTargetedVitestRun(['--project', 'default'])).toBe(false);
    expect(isTargetedVitestRun(['--shard', '1/2'])).toBe(false);
    expect(isTargetedVitestRun(['--config', 'tests/vitest.config.ts'])).toBe(
      false,
    );
    expect(isTargetedVitestRun(['--config', 'vitest.config.ts'])).toBe(false);
    expect(isTargetedVitestRun(['--coverage=text'])).toBe(false);
    expect(isTargetedVitestRun(['--coverage', 'text'])).toBe(false);
    expect(isTargetedVitestRun(['--reporter', 'dot'])).toBe(false);
    expect(
      isTargetedVitestRun(['--coverage', 'tests/unit/sdk-dts-build.test.ts']),
    ).toBe(true);
    expect(isTargetedVitestRun(['tests/unit/sdk-dts-build.test.ts'])).toBe(
      true,
    );
    expect(isTargetedVitestRun(['-t', 'sdk d.ts build artifact'])).toBe(true);
    expect(
      isTargetedVitestRun(['--testNamePattern', 'sdk d.ts build artifact']),
    ).toBe(true);
    expect(
      isTargetedVitestRun(['--testNamePattern=sdk d.ts build artifact']),
    ).toBe(true);
    expect(isTargetedVitestRun(['--dir', 'tests/unit'])).toBe(true);
    expect(isTargetedVitestRun(['--dir=tests/unit'])).toBe(true);
  });

  it('keeps the dts consumer fixture focused on maintained module entrypoints', () => {
    const tsconfig = JSON.parse(
      readFileSync(
        resolve(process.cwd(), 'tests/fixtures/sdk-dts-consumer/tsconfig.json'),
        'utf8',
      ),
    ) as {
      files?: string[];
    };

    expect(tsconfig.files).toEqual([
      './module-api-usage.ts',
      './module-browser-usage.ts',
      './module-device-usage.ts',
    ]);
  });

  it('aliases only the structurally equivalent browser sdk public types', () => {
    const sharedTypes = readSharedTypesDeclaration();
    const browserOutput = readBrowserModuleDeclaration();

    expect(sharedTypes).toContain(
      'import type { Ed25519Credential as GeneratedMeEd25519Credential',
    );
    expect(sharedTypes).toContain(
      'EmailStartRequest as GeneratedEmailStartInput',
    );
    expect(sharedTypes).toContain(
      'EmailVerifyRequest as GeneratedEmailVerifyInput',
    );
    expect(sharedTypes).toContain('MeResponse as GeneratedMeResponse');
    expect(sharedTypes).toContain('SessionSummary as GeneratedMeActiveSession');
    expect(sharedTypes).toContain(
      'WebauthnCredential as GeneratedMeWebauthnCredential',
    );
    expect(sharedTypes).toContain(
      'export type MeWebauthnCredential = GeneratedMeWebauthnCredential;',
    );
    expect(sharedTypes).toContain(
      'export type MeEd25519Credential = GeneratedMeEd25519Credential;',
    );
    expect(sharedTypes).toContain(
      'export type MeActiveSession = GeneratedMeActiveSession;',
    );
    expect(sharedTypes).toContain(
      'export type MeResponse = GeneratedMeResponse;',
    );
    expect(sharedTypes).toContain(
      'export type EmailStartInput = GeneratedEmailStartInput;',
    );
    expect(sharedTypes).toContain(
      'export type EmailVerifyInput = GeneratedEmailVerifyInput;',
    );
    expect(sharedTypes).toContain('export type EmailStartResponse = {');
    expect(sharedTypes).toContain('export type PasskeyOptionsInput = {');
    expect(sharedTypes).toContain(
      'export type WebauthnVerifyResponse = Record<string, unknown>;',
    );
    expect(browserOutput).toContain("} from './types.js';");
    expect(browserOutput).not.toContain('../generated/api');
  });

  it('emits browser sdk module declarations', () => {
    const output = readBrowserModuleDeclaration();

    expect(output).toContain('export declare function createBrowserSdk');
    expect(output).toContain('createBrowserSdk');
    expect(output).toContain('AuthMiniApi');
    expect(output).toContain('SessionSnapshot');
  });

  it('emits api sdk wrapper module artifacts', () => {
    const declarationOutput = readApiModuleDeclaration();
    const runtimeOutput = readApiModuleRuntime();

    expect(declarationOutput).toContain('export declare function createApiSdk');
    expect(declarationOutput).toContain('export type ApiSdkOptions = {');
    expect(declarationOutput).toContain(
      "export type * from '../generated/api/index.js'",
    );
    expect(runtimeOutput).toContain('export function createApiSdk');
    expect(runtimeOutput).toContain('if (!options.baseUrl)');
    expect(runtimeOutput).toContain("from '../generated/api/client/index.js'");
  });

  it('emits device sdk module declarations with seed input only', () => {
    const output = readDeviceModuleDeclaration();
    const sharedTypes = readSharedTypesDeclaration();
    const errors = readSdkErrorsDeclaration();

    expect(output).toContain('export declare function createDeviceSdk');
    expect(output).toContain('DeviceSdkApi');
    expect(sharedTypes).toContain('privateKeySeed: string');
    expect(sharedTypes).not.toContain('DevicePrivateKeyJwk');
    expect(sharedTypes).not.toContain('privateKey: DevicePrivateKeyJwk');
    expect(sharedTypes).toContain('dispose(): Promise<void>');
    expect(sharedTypes).toContain('[Symbol.asyncDispose](): Promise<void>');
    expect(errors).toContain("'disposed_session'");
  });

  it('keeps active session snapshot fields readable from declaration consumers', () => {
    for (const fixture of ['module-browser-usage.ts']) {
      const source = readConsumerFixture(fixture);

      expect(source).toContain('me.active_sessions[0].auth_method');
      expect(source).toContain('me.active_sessions[0].ip');
      expect(source).toContain('me.active_sessions[0].user_agent');
      expect(source).toContain(
        'type IsAny<T> = 0 extends 1 & T ? true : false;',
      );
      expect(source).toContain('type AssertNotAny<T extends false> = T;');
      expect(source).toContain(
        'type ActiveSession = (typeof me.active_sessions)[number];',
      );
      expect(source).toContain('type AuthMethodIsNotAny = AssertNotAny<');
      expect(source).toContain(
        "type IpIsNotAny = AssertNotAny<IsAny<ActiveSession['ip']>>;",
      );
      expect(source).toContain(
        "type UserAgentIsNotAny = AssertNotAny<IsAny<ActiveSession['user_agent']>>;",
      );
    }
  });
});
