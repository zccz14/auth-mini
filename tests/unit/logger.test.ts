import { describe, expect, it } from 'vitest';
import * as loggerModule from '../../src/shared/logger.js';

const { createRootLogger, withErrorFields } = loggerModule;

type MemoryLoggerSink = {
  entries: Record<string, unknown>[];
  lines: string[];
  write(line: string): void;
};

function createMemoryLoggerSink(): MemoryLoggerSink {
  return {
    entries: [],
    lines: [],
    write(line: string) {
      const trimmedLine = line.trim();
      if (trimmedLine.length === 0) {
        return;
      }

      this.lines.push(trimmedLine);
      this.entries.push(JSON.parse(trimmedLine) as Record<string, unknown>);
    },
  };
}

describe('shared logger', () => {
  it('does not expose test-only memory sink helpers from the shared logger API', () => {
    expect(loggerModule).not.toHaveProperty('createMemoryLoggerSink');
  });

  it('writes JSON entries with base service fields', () => {
    const sink = createMemoryLoggerSink();
    const logger = createRootLogger({ sink });

    logger.info({ event: 'test.event' }, 'hello');

    expect(sink.entries[0]).toMatchObject({
      service: 'auth-mini',
      event: 'test.event',
      msg: 'hello',
    });
  });

  it('creates child loggers that preserve parent bindings', () => {
    const sink = createMemoryLoggerSink();
    const logger = createRootLogger({ sink }).child({ request_id: 'req-1' });

    logger.info({ event: 'child.event', email: 'user@example.com' }, 'ok');

    expect(sink.entries[0]).toMatchObject({
      service: 'auth-mini',
      request_id: 'req-1',
      event: 'child.event',
      email: 'user@example.com',
    });
  });

  it('serializes known error fields without dumping arbitrary objects', () => {
    const error = new Error('boom');

    expect(withErrorFields(error)).toMatchObject({
      error_name: 'Error',
      error_message: 'boom',
    });
    expect(withErrorFields(error)).not.toHaveProperty('cause');
  });

  it('ignores non-Error values even if they look error-like', () => {
    expect(
      withErrorFields({
        name: 'Error',
        message: 'boom',
        stack: 'stack',
        cause: new Error('nested'),
      }),
    ).toEqual({});
  });
});
