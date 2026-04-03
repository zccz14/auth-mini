import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { renderSingletonIifeSource } from './singleton-entry.js';

const outputPath = resolve(process.cwd(), 'dist/sdk/singleton-iife.js');

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, renderSingletonIifeSource(), 'utf8');
