import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';

export type OpenApiDocument = {
  yamlText: string;
  jsonDocument: Record<string, unknown>;
};

export async function loadOpenApiDocument(): Promise<OpenApiDocument> {
  return parseOpenApiDocument(
    await readFile(new URL('../openapi.yaml', import.meta.url), 'utf8'),
  );
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
