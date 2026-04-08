import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const readBuiltDeclaration = () =>
  readFileSync(resolve(process.cwd(), 'dist/sdk/singleton-iife.d.ts'), 'utf8');

describe('sdk d.ts build artifact', () => {
  it('contains only a global Window.AuthMini declaration surface', () => {
    const source = readBuiltDeclaration();

    expect(source).toContain('declare global');
    expect(source).toContain('interface Window');
    expect(source).toContain('AuthMini:');
    expect(source).not.toMatch(/from ['"][.]{1,2}\//);
    expect(source).not.toContain('src/sdk/');

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

    expect(source).toBe(
      [
        'export {};',
        'declare global {',
        '    interface Window {',
        '        AuthMini: {',
        '            email: {',
        '                start(input: {',
        '                    email: string;',
        '                }): Promise<{',
        '                    ok?: boolean;',
        '                } & Record<string, unknown>>;',
        '                verify(input: {',
        '                    email: string;',
        '                    code: string;',
        '                }): Promise<{',
        '                    sessionId: string;',
        '                    accessToken: string | null;',
        '                    refreshToken: string;',
        '                    receivedAt: string;',
        '                    expiresAt: string;',
        '                } & {',
        '                    me: {',
        '                        user_id: string;',
        '                        email: string;',
        '                        webauthn_credentials: Array<unknown>;',
        '                        active_sessions: Array<unknown>;',
        '                    };',
        '                }>;',
        '            };',
        '            passkey: {',
        '                authenticate(input?: {',
        '                    rpId?: string;',
        '                }): Promise<{',
        '                    sessionId: string;',
        '                    accessToken: string | null;',
        '                    refreshToken: string;',
        '                    receivedAt: string;',
        '                    expiresAt: string;',
        '                } & {',
        '                    me: {',
        '                        user_id: string;',
        '                        email: string;',
        '                        webauthn_credentials: Array<unknown>;',
        '                        active_sessions: Array<unknown>;',
        '                    };',
        '                }>;',
        '                register(input?: {',
        '                    rpId?: string;',
        '                }): Promise<Record<string, unknown>>;',
        '            };',
        '            me: {',
        '                get(): {',
        '                    user_id: string;',
        '                    email: string;',
        '                    webauthn_credentials: Array<unknown>;',
        '                    active_sessions: Array<unknown>;',
        '                } | null;',
        '                reload(): Promise<{',
        '                    user_id: string;',
        '                    email: string;',
        '                    webauthn_credentials: Array<unknown>;',
        '                    active_sessions: Array<unknown>;',
        '                }>;',
        '            };',
        '            session: {',
        '                getState(): {',
        "                    status: 'recovering' | 'authenticated' | 'anonymous';",
        '                    authenticated: boolean;',
        '                    sessionId: string | null;',
        '                    accessToken: string | null;',
        '                    refreshToken: string | null;',
        '                    receivedAt: string | null;',
        '                    expiresAt: string | null;',
        '                    me: {',
        '                        user_id: string;',
        '                        email: string;',
        '                        webauthn_credentials: Array<unknown>;',
        '                        active_sessions: Array<unknown>;',
        '                    } | null;',
        '                };',
        '                onChange(listener: (state: {',
        "                    status: 'recovering' | 'authenticated' | 'anonymous';",
        '                    authenticated: boolean;',
        '                    sessionId: string | null;',
        '                    accessToken: string | null;',
        '                    refreshToken: string | null;',
        '                    receivedAt: string | null;',
        '                    expiresAt: string | null;',
        '                    me: {',
        '                        user_id: string;',
        '                        email: string;',
        '                        webauthn_credentials: Array<unknown>;',
        '                        active_sessions: Array<unknown>;',
        '                    } | null;',
        '                }) => void): () => void;',
        '                refresh(): Promise<{',
        '                    sessionId: string;',
        '                    accessToken: string | null;',
        '                    refreshToken: string;',
        '                    receivedAt: string;',
        '                    expiresAt: string;',
        '                } & {',
        '                    me: {',
        '                        user_id: string;',
        '                        email: string;',
        '                        webauthn_credentials: Array<unknown>;',
        '                        active_sessions: Array<unknown>;',
        '                    };',
        '                }>;',
        '                logout(): Promise<void>;',
        '            };',
        '            webauthn: {',
        '                authenticate(input?: {',
        '                    rpId?: string;',
        '                }): Promise<{',
        '                    sessionId: string;',
        '                    accessToken: string | null;',
        '                    refreshToken: string;',
        '                    receivedAt: string;',
        '                    expiresAt: string;',
        '                } & {',
        '                    me: {',
        '                        user_id: string;',
        '                        email: string;',
        '                        webauthn_credentials: Array<unknown>;',
        '                        active_sessions: Array<unknown>;',
        '                    };',
        '                }>;',
        '                register(input?: {',
        '                    rpId?: string;',
        '                }): Promise<Record<string, unknown>>;',
        '            };',
        '        };',
        '    }',
        '}',
        '',
      ].join('\n'),
    );
  });
});
