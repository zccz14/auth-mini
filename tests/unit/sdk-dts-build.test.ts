import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const readBuiltDeclaration = () =>
  readFileSync(resolve(process.cwd(), 'dist/sdk/singleton-iife.d.ts'), 'utf8');

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

describe('sdk d.ts build artifact', () => {
  it('is enforced by the automated repo test command', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
    ) as {
      scripts?: Record<string, string>;
    };
    const testRunnerSource = readFileSync(
      resolve(process.cwd(), 'scripts/run-tests.js'),
      'utf8',
    );

    expect(packageJson.scripts?.test).toBe('node scripts/run-tests.js');
    expect(testRunnerSource).toContain("run('npx', ['tsc'");
    expect(testRunnerSource).toContain(
      "'tests/fixtures/sdk-dts-consumer/tsconfig.json'",
    );
    expect(testRunnerSource).toContain('process.argv.slice(2)');
    expect(testRunnerSource).toContain('isTargetedVitestRun');
    expect(testRunnerSource).toContain('fileURLToPath(import.meta.url)');
  });

  it('keeps fixture enforcement for full-run vitest options only', async () => {
    const { isTargetedVitestRun } = await loadTestRunnerModule();

    expect(isTargetedVitestRun(['--maxWorkers=1'])).toBe(false);
    expect(isTargetedVitestRun(['--maxWorkers', '1'])).toBe(false);
    expect(isTargetedVitestRun(['--project', 'default'])).toBe(false);
    expect(isTargetedVitestRun(['--shard', '1/2'])).toBe(false);
    expect(isTargetedVitestRun(['--config', 'vitest.config.ts'])).toBe(false);
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

    expect(source).toMatchInlineSnapshot(`
      "export {};
      declare global {
          interface Window {
              AuthMini: {
                  email: {
                      start(input: {
                          email: string;
                      }): Promise<{
                          ok?: boolean;
                      } & Record<string, unknown>>;
                      verify(input: {
                          email: string;
                          code: string;
                      }): Promise<{
                          sessionId: string;
                          accessToken: string | null;
                          refreshToken: string;
                          receivedAt: string;
                          expiresAt: string;
                      } & {
                          me: {
                              user_id: string;
                              email: string;
                              webauthn_credentials: Array<unknown>;
                              active_sessions: Array<unknown>;
                          };
                      }>;
                  };
                  passkey: {
                      authenticate(input?: {
                          rpId?: string;
                      }): Promise<{
                          sessionId: string;
                          accessToken: string | null;
                          refreshToken: string;
                          receivedAt: string;
                          expiresAt: string;
                      } & {
                          me: {
                              user_id: string;
                              email: string;
                              webauthn_credentials: Array<unknown>;
                              active_sessions: Array<unknown>;
                          };
                      }>;
                      register(input?: {
                          rpId?: string;
                      }): Promise<Record<string, unknown>>;
                  };
                  me: {
                      get(): {
                          user_id: string;
                          email: string;
                          webauthn_credentials: Array<unknown>;
                          active_sessions: Array<unknown>;
                      } | null;
                      reload(): Promise<{
                          user_id: string;
                          email: string;
                          webauthn_credentials: Array<unknown>;
                          active_sessions: Array<unknown>;
                      }>;
                  };
                  session: {
                      getState(): {
                          status: 'recovering' | 'authenticated' | 'anonymous';
                          authenticated: boolean;
                          sessionId: string | null;
                          accessToken: string | null;
                          refreshToken: string | null;
                          receivedAt: string | null;
                          expiresAt: string | null;
                          me: {
                              user_id: string;
                              email: string;
                              webauthn_credentials: Array<unknown>;
                              active_sessions: Array<unknown>;
                          } | null;
                      };
                      onChange(listener: (state: {
                          status: 'recovering' | 'authenticated' | 'anonymous';
                          authenticated: boolean;
                          sessionId: string | null;
                          accessToken: string | null;
                          refreshToken: string | null;
                          receivedAt: string | null;
                          expiresAt: string | null;
                          me: {
                              user_id: string;
                              email: string;
                              webauthn_credentials: Array<unknown>;
                              active_sessions: Array<unknown>;
                          } | null;
                      }) => void): () => void;
                      refresh(): Promise<{
                          sessionId: string;
                          accessToken: string | null;
                          refreshToken: string;
                          receivedAt: string;
                          expiresAt: string;
                      } & {
                          me: {
                              user_id: string;
                              email: string;
                              webauthn_credentials: Array<unknown>;
                              active_sessions: Array<unknown>;
                          };
                      }>;
                      logout(): Promise<void>;
                  };
                  webauthn: {
                      authenticate(input?: {
                          rpId?: string;
                      }): Promise<{
                          sessionId: string;
                          accessToken: string | null;
                          refreshToken: string;
                          receivedAt: string;
                          expiresAt: string;
                      } & {
                          me: {
                              user_id: string;
                              email: string;
                              webauthn_credentials: Array<unknown>;
                              active_sessions: Array<unknown>;
                          };
                      }>;
                      register(input?: {
                          rpId?: string;
                      }): Promise<Record<string, unknown>>;
                  };
              };
          }
      }
      "
    `);
  });
});
