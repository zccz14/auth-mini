import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import ts from 'typescript';

const repoRoot = process.cwd();
const entryPath = resolve(repoRoot, 'src/sdk/singleton-global.ts');
const outputPath = resolve(repoRoot, 'dist/sdk/singleton-iife.d.ts');

const parseConfig = (configPath: string) => {
  const parsed = ts.getParsedCommandLineOfConfigFile(
    configPath,
    {},
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic(diagnostic) {
        throw new Error(formatDiagnostic(diagnostic));
      },
    },
  );

  if (!parsed) {
    throw new Error(`failed to parse TypeScript config: ${configPath}`);
  }

  return parsed;
};

const formatDiagnostic = (diagnostic: ts.Diagnostic) =>
  ts.formatDiagnosticsWithColorAndContext([diagnostic], {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => repoRoot,
    getNewLine: () => '\n',
  });

const emitDeclarations = (tempDir: string) => {
  const parsed = parseConfig(resolve(repoRoot, 'tsconfig.build.json'));
  const program = ts.createProgram({
    rootNames: [entryPath],
    options: {
      ...parsed.options,
      declaration: true,
      emitDeclarationOnly: true,
      noEmit: false,
      outDir: tempDir,
    },
  });

  const emitResult = program.emit();
  const diagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics);

  if (diagnostics.length > 0) {
    throw new Error(
      ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCanonicalFileName: (fileName) => fileName,
        getCurrentDirectory: () => repoRoot,
        getNewLine: () => '\n',
      }),
    );
  }
};

const collectTypeAliases = (file: ts.SourceFile) => {
  const aliases = new Map<string, ts.TypeNode>();

  for (const statement of file.statements) {
    if (ts.isTypeAliasDeclaration(statement)) {
      aliases.set(statement.name.text, statement.type);
    }
  }

  return aliases;
};

const inlineTypeNode = (
  node: ts.TypeNode,
  aliases: Map<string, ts.TypeNode>,
  seen = new Set<string>(),
): ts.TypeNode => {
  const result = ts.transform(node, [
    (context) => {
      const visitor: ts.Visitor = (current) => {
        if (
          ts.isTypeReferenceNode(current) &&
          ts.isIdentifier(current.typeName)
        ) {
          const aliasName = current.typeName.text;
          const aliasTarget = aliases.get(aliasName);

          if (aliasTarget && !seen.has(aliasName)) {
            return inlineTypeNode(
              aliasTarget,
              aliases,
              new Set(seen).add(aliasName),
            );
          }
        }

        return ts.visitEachChild(current, visitor, context);
      };

      return (root) => ts.visitNode(root, visitor) as ts.TypeNode;
    },
  ]);
  const [transformed] = result.transformed;

  result.dispose();
  return transformed as ts.TypeNode;
};

const buildArtifact = (tempDir: string) => {
  const singletonDtsPath = resolve(tempDir, 'sdk/singleton-global.d.ts');
  const typesDtsPath = resolve(tempDir, 'sdk/types.d.ts');
  const singletonSource = ts.createSourceFile(
    singletonDtsPath,
    readFileSync(singletonDtsPath, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const typesSource = ts.createSourceFile(
    typesDtsPath,
    readFileSync(typesDtsPath, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const aliases = collectTypeAliases(typesSource);

  const globalBlock = singletonSource.statements.find(ts.isModuleDeclaration);
  if (!globalBlock || globalBlock.name.text !== 'global' || !globalBlock.body) {
    throw new Error('singleton-global.d.ts is missing declare global');
  }

  if (
    !ts.isModuleBlock(globalBlock.body) ||
    globalBlock.body.statements.length !== 1
  ) {
    throw new Error(
      'singleton-global.d.ts must contain exactly one global statement',
    );
  }

  const windowDecl = globalBlock.body.statements[0];
  if (
    !ts.isInterfaceDeclaration(windowDecl) ||
    windowDecl.members.length !== 1
  ) {
    throw new Error(
      'singleton-global.d.ts must contain a single Window.AuthMini member',
    );
  }

  const authMiniMember = windowDecl.members[0];
  if (
    !ts.isPropertySignature(authMiniMember) ||
    !authMiniMember.type ||
    authMiniMember.name.getText(singletonSource) !== 'AuthMini'
  ) {
    throw new Error('singleton-global.d.ts must expose Window.AuthMini');
  }

  const inlinedAuthMiniType = inlineTypeNode(authMiniMember.type, aliases);
  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
    removeComments: true,
  });
  const authMiniTypeText = printer.printNode(
    ts.EmitHint.Unspecified,
    inlinedAuthMiniType,
    typesSource,
  );
  const indentedTypeText = authMiniTypeText
    .split('\n')
    .map((line, index) => (index === 0 ? line : `        ${line}`))
    .join('\n');
  const output = [
    'export {};',
    'declare global {',
    '    interface Window {',
    `        AuthMini: ${indentedTypeText};`,
    '    }',
    '}',
    '',
  ].join('\n');

  validateOutput(output);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, output, 'utf8');
};

const validateOutput = (output: string) => {
  if (/from ['"][.]{1,2}\//.test(output)) {
    throw new Error('generated declaration still contains relative imports');
  }

  if (output.includes('src/sdk/')) {
    throw new Error('generated declaration leaked source paths');
  }

  const file = ts.createSourceFile(
    'singleton-iife.d.ts',
    output,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  if (file.statements.length !== 2) {
    throw new Error(
      'generated declaration must contain only export {} and declare global',
    );
  }

  if (!ts.isExportDeclaration(file.statements[0])) {
    throw new Error('generated declaration must start with export {}');
  }

  const globalBlock = file.statements[1];
  if (
    !ts.isModuleDeclaration(globalBlock) ||
    globalBlock.name.text !== 'global'
  ) {
    throw new Error('generated declaration must contain declare global');
  }

  const illegalTopLevel = file.statements.filter(
    (statement) =>
      !ts.isExportDeclaration(statement) && !ts.isModuleDeclaration(statement),
  );
  if (illegalTopLevel.length > 0) {
    throw new Error(
      'generated declaration contains extra top-level declarations',
    );
  }
};

const tempDir = mkdtempSync(resolve(tmpdir(), 'auth-mini-sdk-dts-'));

try {
  emitDeclarations(tempDir);
  buildArtifact(tempDir);
} finally {
  rmSync(tempDir, { force: true, recursive: true });
}
