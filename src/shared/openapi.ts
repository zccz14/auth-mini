import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';

export type OpenApiDocument = {
  yamlText: string;
  jsonDocument: Record<string, unknown>;
};

export async function loadOpenApiDocument(): Promise<OpenApiDocument> {
  const yamlText = await readOpenApiYamlText();
  const parsed = parse(yamlText);

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new TypeError('Packaged openapi.yaml must parse to an object document');
  }

  return {
    yamlText,
    jsonDocument: parsed as Record<string, unknown>,
  };
}

async function readOpenApiYamlText(): Promise<string> {
  try {
    return await readFile(new URL('../openapi.yaml', import.meta.url), 'utf8');
  } catch (error) {
    if (!isMissingFileError(error)) {
      throw error;
    }

    return readFile(new URL('../../openapi.yaml', import.meta.url), 'utf8');
  }
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
