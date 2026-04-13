import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const readBuiltDeclaration = () =>
  readFileSync(resolve(process.cwd(), 'dist/sdk/singleton-iife.d.ts'), 'utf8');

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

const getWindowAuthMiniType = (source: string) => {
  const file = ts.createSourceFile(
    'singleton-iife.d.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  const globalBlock = file.statements.find(ts.isModuleDeclaration);
  if (!globalBlock || globalBlock.name.text !== 'global' || !globalBlock.body) {
    throw new Error('expected declare global block');
  }

  if (!ts.isModuleBlock(globalBlock.body)) {
    throw new Error('expected declare global body');
  }

  const windowDecl = globalBlock.body.statements[0];
  if (!ts.isInterfaceDeclaration(windowDecl)) {
    throw new Error('expected Window interface declaration');
  }

  const authMiniMember = windowDecl.members[0];
  if (!ts.isPropertySignature(authMiniMember) || !authMiniMember.type) {
    throw new Error('expected Window.AuthMini property');
  }

  if (!ts.isTypeLiteralNode(authMiniMember.type)) {
    throw new Error('expected Window.AuthMini to be a type literal');
  }

  return { authMiniType: authMiniMember.type, file };
};

const getTypeLiteralMemberNames = (typeLiteral: ts.TypeLiteralNode) =>
  typeLiteral.members.map((member) => member.name?.getText() ?? '<anonymous>');

const loadTestRunnerModule = async () =>
  import(resolve(process.cwd(), 'scripts/run-tests.js'));

const loadSingletonDtsModule = async () =>
  import(
    pathToFileURL(resolve(process.cwd(), 'src/sdk/build-singleton-dts.ts')).href
  );

const readSourceFile = (relativePath: string) => {
  const filePath = resolve(process.cwd(), relativePath);

  return {
    filePath,
    sourceFile: ts.createSourceFile(
      filePath,
      readFileSync(filePath, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    ),
  };
};

const printTypeNode = (node: ts.TypeNode, sourceFile: ts.SourceFile) =>
  ts
    .createPrinter({
      newLine: ts.NewLineKind.LineFeed,
      removeComments: true,
    })
    .printNode(ts.EmitHint.Unspecified, node, sourceFile);

const getNamedAliasType = (sourceFile: ts.SourceFile, aliasName: string) => {
  const statement = sourceFile.statements.find(
    (candidate): candidate is ts.TypeAliasDeclaration =>
      ts.isTypeAliasDeclaration(candidate) && candidate.name.text === aliasName,
  );

  if (!statement) {
    throw new Error(`expected type alias ${aliasName}`);
  }

  return statement.type;
};

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

  it('contains only a global Window.AuthMini declaration surface', () => {
    const source = readBuiltDeclaration();

    expect(source).toContain('declare global');
    expect(source).toContain('interface Window');
    expect(source).toContain('AuthMini:');
    expect(source).not.toMatch(/from ['"][.]{1,2}\//);
    expect(source).not.toContain('src/sdk/');
    expect(source).not.toContain('ready:');

    const file = ts.createSourceFile(
      'singleton-iife.d.ts',
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );

    expect(file.statements).toHaveLength(2);
    expect(ts.isExportDeclaration(file.statements[0])).toBe(true);
    expect(ts.isModuleDeclaration(file.statements[1])).toBe(true);

    const globalBlock = file.statements[1];
    if (!ts.isModuleDeclaration(globalBlock)) {
      throw new Error('expected declare global block');
    }

    expect(globalBlock.name.text).toBe('global');
    expect(globalBlock.body).toBeTruthy();
    if (!globalBlock.body) {
      throw new Error('expected declare global body');
    }
    expect(ts.isModuleBlock(globalBlock.body)).toBe(true);

    const body = globalBlock.body;
    if (!ts.isModuleBlock(body)) {
      throw new Error('expected declare global body');
    }

    expect(body.statements).toHaveLength(1);
    expect(ts.isInterfaceDeclaration(body.statements[0])).toBe(true);

    const windowDecl = body.statements[0];
    if (!ts.isInterfaceDeclaration(windowDecl)) {
      throw new Error('expected Window interface declaration');
    }

    expect(windowDecl.name.text).toBe('Window');
    expect(windowDecl.members).toHaveLength(1);
    expect(ts.isPropertySignature(windowDecl.members[0])).toBe(true);

    const authMiniMember = windowDecl.members[0];
    if (!ts.isPropertySignature(authMiniMember)) {
      throw new Error('expected Window.AuthMini property');
    }

    expect(authMiniMember.name.getText(file)).toBe('AuthMini');
  });

  it('matches the approved Window.AuthMini contract', () => {
    const source = readBuiltDeclaration();
    const { authMiniType } = getWindowAuthMiniType(source);

    expect(getTypeLiteralMemberNames(authMiniType)).toEqual([
      'email',
      'passkey',
      'me',
      'session',
      'webauthn',
    ]);

    for (const name of [
      'email:',
      'verify(',
      'passkey:',
      'register(',
      'webauthn:',
      'session:',
      'onChange(',
      'refresh(',
      'logout(',
    ]) {
      expect(source).toContain(name);
    }

    expect(source).not.toContain('GeneratedEmailStartInput');
    expect(source).not.toContain('GeneratedEmailVerifyInput');
    expect(source).not.toContain('GeneratedMeResponse');
  });

  it('inlines inherited members from imported exported interfaces', async () => {
    const module = (await loadSingletonDtsModule()) as {
      buildInlineAliasMap?: (
        sourceFile: ts.SourceFile,
        filePath: string,
      ) => Map<string, ts.TypeNode>;
      inlineDeclarationType?: (
        node: ts.TypeNode,
        aliases: Map<string, ts.TypeNode>,
      ) => ts.TypeNode;
    };
    const { filePath, sourceFile } = readSourceFile(
      'tests/fixtures/sdk-dts-build/types.d.ts',
    );

    const aliases = module.buildInlineAliasMap?.(sourceFile, filePath);
    const inlined = aliases
      ? module.inlineDeclarationType?.(
          getNamedAliasType(sourceFile, 'UsesImportedInterface'),
          aliases,
        )
      : undefined;
    const printed = inlined ? printTypeNode(inlined, sourceFile) : '';

    expect(printed).toContain('created_at: string;');
    expect(printed).toContain('id: string;');
    expect(printed).not.toContain('BaseImportedSessionSummary');
  });

  it('substitutes type arguments when inlining imported generic aliases', async () => {
    const module = (await loadSingletonDtsModule()) as {
      buildInlineAliasMap?: (
        sourceFile: ts.SourceFile,
        filePath: string,
      ) => Map<string, ts.TypeNode>;
      inlineDeclarationType?: (
        node: ts.TypeNode,
        aliases: Map<string, ts.TypeNode>,
      ) => ts.TypeNode;
    };
    const { filePath, sourceFile } = readSourceFile(
      'tests/fixtures/sdk-dts-build/types.d.ts',
    );

    const aliases = module.buildInlineAliasMap?.(sourceFile, filePath);
    const inlined = aliases
      ? module.inlineDeclarationType?.(
          getNamedAliasType(sourceFile, 'UsesImportedGeneric'),
          aliases,
        )
      : undefined;
    const printed = inlined ? printTypeNode(inlined, sourceFile) : '';

    expect(printed).toContain('value: string;');
    expect(printed).toContain('list: string[];');
    expect(printed).not.toContain('value: T;');
    expect(printed).not.toContain('ImportedGenericBox');
  });

  it('matches the cli entrypoint guard against relative argv paths', async () => {
    const module = (await loadSingletonDtsModule()) as {
      isDirectExecution?: (
        moduleUrl: string,
        argvEntry: string | undefined,
        cwd?: string,
      ) => boolean;
    };

    expect(
      module.isDirectExecution?.(
        'file:///repo/dist/sdk/build-singleton-dts.js',
        'dist/sdk/build-singleton-dts.js',
        '/repo',
      ),
    ).toBe(true);
    expect(
      module.isDirectExecution?.(
        'file:///repo/dist/sdk/build-singleton-dts.js',
        'dist/sdk/other.js',
        '/repo',
      ),
    ).toBe(false);
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
});
