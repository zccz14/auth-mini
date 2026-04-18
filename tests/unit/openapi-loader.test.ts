import { describe, expect, it } from 'vitest';
import { parseOpenApiDocument } from '../../src/shared/openapi.js';

describe('parseOpenApiDocument', () => {
  it('returns the parsed object document for valid yaml', () => {
    expect(parseOpenApiDocument('openapi: 3.1.0\npaths: {}\n')).toEqual({
      yamlText: 'openapi: 3.1.0\npaths: {}\n',
      jsonDocument: {
        openapi: '3.1.0',
        paths: {},
      },
    });
  });

  it('throws when yaml does not parse to an object document', () => {
    expect(() => parseOpenApiDocument('true\n')).toThrowError(
      new TypeError('openapi.yaml must parse to an object document'),
    );
  });
});
