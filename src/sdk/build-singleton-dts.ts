import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const repoRoot = process.cwd();
const entryPath = resolve(repoRoot, 'src/sdk/singleton-global.ts');
const outputPath = resolve(repoRoot, 'dist/sdk/singleton-iife.d.ts');

type InlineAliasDeclaration = {
  typeNode: ts.TypeNode;
  typeParameters?: readonly ts.TypeParameterDeclaration[];
};

type InlineAliasMap = Map<string, InlineAliasDeclaration>;

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

const hasExportModifier = (node: ts.Node) => {
  const modifiers = (node as ts.Node & { modifiers?: readonly ts.Modifier[] })
    .modifiers;

  return !!modifiers?.some(
    (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
  );
};

const parseTypeNode = (typeText: string) => {
  const file = ts.createSourceFile(
    'inline-type.d.ts',
    `type __Inline = ${typeText};`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const statement = file.statements[0];

  if (!statement || !ts.isTypeAliasDeclaration(statement)) {
    throw new Error(`failed to parse type node: ${typeText}`);
  }

  return statement.type;
};

const createInterfaceTypeNode = (
  statement: ts.InterfaceDeclaration,
  sourceFile: ts.SourceFile,
) => {
  const members = ts.factory.createTypeLiteralNode([...statement.members]);
  const heritageTypes =
    statement.heritageClauses
      ?.filter((clause) => clause.token === ts.SyntaxKind.ExtendsKeyword)
      .flatMap((clause) =>
        clause.types.map((heritageType) =>
          parseTypeNode(heritageType.getText(sourceFile)),
        ),
      ) ?? [];

  if (heritageTypes.length === 0) {
    return members;
  }

  return ts.factory.createIntersectionTypeNode([...heritageTypes, members]);
};

const collectTypeAliases = (file: ts.SourceFile) => {
  const aliases = new Map<string, InlineAliasDeclaration>();

  for (const statement of file.statements) {
    if (ts.isTypeAliasDeclaration(statement)) {
      aliases.set(statement.name.text, {
        typeNode: statement.type,
        typeParameters: statement.typeParameters,
      });
    }
  }

  return aliases;
};

const toDeclarationPath = (filePath: string) => {
  if (filePath.endsWith('.d.ts')) {
    return filePath;
  }

  if (filePath.endsWith('.js')) {
    return filePath.slice(0, -3) + '.d.ts';
  }

  if (filePath.endsWith('.ts')) {
    return filePath.slice(0, -3) + '.d.ts';
  }

  return `${filePath}.d.ts`;
};

const resolveDeclarationPath = (fromPath: string, specifier: string) =>
  resolve(dirname(fromPath), toDeclarationPath(specifier));

const collectExportedTypeDeclarations = (
  filePath: string,
  seen = new Set<string>(),
) => {
  if (seen.has(filePath)) {
    return new Map<string, InlineAliasDeclaration>();
  }

  seen.add(filePath);

  const file = ts.createSourceFile(
    filePath,
    readFileSync(filePath, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const aliases = new Map<string, InlineAliasDeclaration>();

  for (const statement of file.statements) {
    if (ts.isTypeAliasDeclaration(statement) && hasExportModifier(statement)) {
      aliases.set(statement.name.text, {
        typeNode: statement.type,
        typeParameters: statement.typeParameters,
      });
      continue;
    }

    if (ts.isInterfaceDeclaration(statement) && hasExportModifier(statement)) {
      aliases.set(statement.name.text, {
        typeNode: createInterfaceTypeNode(statement, file),
        typeParameters: statement.typeParameters,
      });
      continue;
    }

    if (!ts.isExportDeclaration(statement) || !statement.moduleSpecifier) {
      continue;
    }

    const targetPath = resolveDeclarationPath(
      filePath,
      (statement.moduleSpecifier as ts.StringLiteral).text,
    );
    const targetAliases = collectExportedTypeDeclarations(targetPath, seen);

    if (!statement.exportClause || !ts.isNamedExports(statement.exportClause)) {
      for (const [name, declaration] of targetAliases) {
        aliases.set(name, declaration);
      }
      continue;
    }

    for (const element of statement.exportClause.elements) {
      const targetName = (element.propertyName ?? element.name).text;
      const aliasName = element.name.text;
      const aliasTarget = targetAliases.get(targetName);

      if (aliasTarget) {
        aliases.set(aliasName, aliasTarget);
      }
    }
  }

  return aliases;
};

const collectImportedTypeAliases = (file: ts.SourceFile, filePath: string) => {
  const aliases = new Map<string, InlineAliasDeclaration>();

  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.importClause) {
      continue;
    }

    const bindings = statement.importClause.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) {
      continue;
    }

    const targetAliases = collectExportedTypeDeclarations(
      resolveDeclarationPath(
        filePath,
        (statement.moduleSpecifier as ts.StringLiteral).text,
      ),
    );

    for (const element of bindings.elements) {
      const targetName = (element.propertyName ?? element.name).text;
      const aliasTarget = targetAliases.get(targetName);

      if (aliasTarget) {
        aliases.set(element.name.text, aliasTarget);
      }
    }

    for (const [name, declaration] of targetAliases) {
      aliases.set(name, declaration);
    }
  }

  return aliases;
};

const substituteTypeParameters = (
  node: ts.TypeNode,
  typeParameters: readonly ts.TypeParameterDeclaration[] | undefined,
  typeArguments: readonly ts.TypeNode[] | undefined,
) => {
  if (!typeParameters || typeParameters.length === 0) {
    return node;
  }

  const replacements = new Map<string, ts.TypeNode>();

  for (const [index, typeParameter] of typeParameters.entries()) {
    const replacement = typeArguments?.[index] ?? typeParameter.default;

    if (replacement) {
      replacements.set(typeParameter.name.text, replacement);
    }
  }

  if (replacements.size === 0) {
    return node;
  }

  const result = ts.transform(node, [
    (context) => {
      const visitor: ts.Visitor = (current) => {
        if (
          ts.isTypeReferenceNode(current) &&
          ts.isIdentifier(current.typeName) &&
          !current.typeArguments?.length
        ) {
          const replacement = replacements.get(current.typeName.text);

          if (replacement) {
            return replacement;
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

export const inlineDeclarationType = (
  node: ts.TypeNode,
  aliases: InlineAliasMap,
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
            const nextSeen = new Set(seen).add(aliasName);
            const substitutedTarget = substituteTypeParameters(
              aliasTarget.typeNode,
              aliasTarget.typeParameters,
              current.typeArguments?.map((typeArgument) =>
                inlineDeclarationType(typeArgument, aliases, nextSeen),
              ),
            );

            return inlineDeclarationType(substitutedTarget, aliases, nextSeen);
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

export const buildInlineAliasMap = (
  sourceFile: ts.SourceFile,
  filePath: string,
) =>
  new Map([
    ...collectImportedTypeAliases(sourceFile, filePath),
    ...collectTypeAliases(sourceFile),
  ]);

export const isDirectExecution = (
  moduleUrl: string,
  argvEntry: string | undefined,
  cwd = process.cwd(),
) => {
  if (!argvEntry) {
    return false;
  }

  return moduleUrl === pathToFileURL(resolve(cwd, argvEntry)).href;
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
  const aliases = buildInlineAliasMap(typesSource, typesDtsPath);

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

  const inlinedAuthMiniType = inlineDeclarationType(
    authMiniMember.type,
    aliases,
  );
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

const run = () => {
  const tempDir = mkdtempSync(resolve(tmpdir(), 'auth-mini-sdk-dts-'));

  try {
    emitDeclarations(tempDir);
    buildArtifact(tempDir);
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
};

if (isDirectExecution(import.meta.url, process.argv[1])) {
  run();
}
