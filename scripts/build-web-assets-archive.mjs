import { gzipSync } from 'node:zlib';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const webDir = 'rust-backend/web';
const outputPath = 'rust-backend/web-assets.bin.gz';
const magic = Buffer.from('AUTHMINIWEB\0', 'utf8');
const version = 1;

function listFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      return listFiles(path);
    }

    if (!entry.isFile()) {
      return [];
    }

    return [path];
  });
}

function u16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16BE(value);
  return buffer;
}

function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value);
  return buffer;
}

function u64(value) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(value));
  return buffer;
}

const entries = listFiles(webDir)
  .map((path) => ({
    path: relative(webDir, path).split(sep).join('/'),
    body: readFileSync(path),
  }))
  .sort((left, right) => left.path.localeCompare(right.path));

const chunks = [magic, u16(version), u32(entries.length)];

for (const entry of entries) {
  const path = Buffer.from(entry.path, 'utf8');
  chunks.push(u16(path.length), u64(entry.body.length), path, entry.body);
}

writeFileSync(outputPath, gzipSync(Buffer.concat(chunks), { mtime: 0 }));
