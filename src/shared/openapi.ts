import { readFile } from 'node:fs/promises';
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
  for (const candidateUrl of [
    new URL('../../openapi.yaml', import.meta.url),
    new URL('../openapi.yaml', import.meta.url),
  ]) {
    try {
      return await readFile(candidateUrl, 'utf8');
    } catch (error) {
      if (!isMissingFileError(error)) {
        throw error;
      }
    }
  }

  throw new Error('Could not locate openapi.yaml from source or dist runtime');
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return (
    !!error &&
    typeof error === 'object' &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}
