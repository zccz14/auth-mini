import { readFile } from 'node:fs/promises';
import { basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

export type OpenApiDocument = {
  yamlText: string;
  jsonDocument: Record<string, unknown>;
};

export async function loadOpenApiDocument(): Promise<OpenApiDocument> {
  return parseOpenApiDocument(await readOpenApiYaml());
}

export function parseOpenApiDocument(yamlText: string): OpenApiDocument {
  const parsed = parse(yamlText);

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new TypeError('openapi.yaml must parse to an object document');
  }

  return {
    yamlText,
    jsonDocument: parsed as Record<string, unknown>,
  };
}

async function readOpenApiYaml(): Promise<string> {
  return readFile(resolveOpenApiUrl(), 'utf8');
}

function resolveOpenApiUrl(): URL {
  const runtimeRoot = basename(
    dirname(dirname(fileURLToPath(import.meta.url))),
  );

  if (runtimeRoot === 'src') {
    return new URL('../../openapi.yaml', import.meta.url);
  }

  if (runtimeRoot === 'dist') {
    return new URL('../openapi.yaml', import.meta.url);
  }

  throw new Error(
    `Could not determine openapi.yaml location from runtime root: ${runtimeRoot}`,
  );
}
