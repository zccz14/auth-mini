import { z } from 'zod';
import type { DatabaseClient } from '../db/client.js';

const smtpCreateSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().positive(),
  username: z.string().min(1),
  password: z.string().min(1),
  fromEmail: z.string().min(1),
  fromName: z.string().default(''),
  secure: z.boolean().default(false),
  weight: z.number().int().positive().default(1),
});

const smtpUpdateSchema = smtpCreateSchema.partial().extend({
  id: z.number().int().positive(),
});

type SmtpConfigRow = {
  id: number;
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
  secure: number;
  is_active: number;
  weight: number;
};

export type SmtpConfigRecord = {
  id: number;
  host: string;
  port: number;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
  secure: boolean;
  isActive: boolean;
  weight: number;
};

export type InsertSmtpConfigInput = z.infer<typeof smtpCreateSchema>;
export type UpdateSmtpConfigInput = z.infer<typeof smtpUpdateSchema>;

export function listSmtpConfigRecords(db: DatabaseClient): SmtpConfigRecord[] {
  const rows = db
    .prepare(
      [
        'SELECT id, host, port, username, password, from_email, from_name, secure, is_active, weight',
        'FROM smtp_configs',
        'ORDER BY id ASC',
      ].join(' '),
    )
    .all() as SmtpConfigRow[];

  return rows.map(mapSmtpConfigRow);
}

export function insertSmtpConfig(
  db: DatabaseClient,
  input: InsertSmtpConfigInput,
): SmtpConfigRecord {
  const parsed = smtpCreateSchema.parse(input);
  const result = db
    .prepare(
      [
        'INSERT INTO smtp_configs',
        '(host, port, username, password, from_email, from_name, secure, weight)',
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ].join(' '),
    )
    .run(
      parsed.host,
      parsed.port,
      parsed.username,
      parsed.password,
      parsed.fromEmail,
      parsed.fromName,
      parsed.secure ? 1 : 0,
      parsed.weight,
    );

  return getSmtpConfigById(
    db,
    Number(result.lastInsertRowid),
  ) as SmtpConfigRecord;
}

export function updateSmtpConfig(
  db: DatabaseClient,
  input: UpdateSmtpConfigInput,
): SmtpConfigRecord | null {
  const parsed = smtpUpdateSchema.parse(input);
  const current = getSmtpConfigById(db, parsed.id);

  if (!current) {
    return null;
  }

  const next = smtpCreateSchema.parse({
    host: parsed.host ?? current.host,
    port: parsed.port ?? current.port,
    username: parsed.username ?? current.username,
    password: parsed.password ?? current.password,
    fromEmail: parsed.fromEmail ?? current.fromEmail,
    fromName: parsed.fromName ?? current.fromName,
    secure: parsed.secure ?? current.secure,
    weight: parsed.weight ?? current.weight,
  });

  db.prepare(
    [
      'UPDATE smtp_configs',
      'SET host = ?, port = ?, username = ?, password = ?, from_email = ?, from_name = ?, secure = ?, weight = ?',
      'WHERE id = ?',
    ].join(' '),
  ).run(
    next.host,
    next.port,
    next.username,
    next.password,
    next.fromEmail,
    next.fromName,
    next.secure ? 1 : 0,
    next.weight,
    parsed.id,
  );

  return getSmtpConfigById(db, parsed.id);
}

export function deleteSmtpConfig(db: DatabaseClient, id: number): boolean {
  const result = db.prepare('DELETE FROM smtp_configs WHERE id = ?').run(id);

  return result.changes > 0;
}

function getSmtpConfigById(
  db: DatabaseClient,
  id: number,
): SmtpConfigRecord | null {
  const row = db
    .prepare(
      [
        'SELECT id, host, port, username, password, from_email, from_name, secure, is_active, weight',
        'FROM smtp_configs WHERE id = ? LIMIT 1',
      ].join(' '),
    )
    .get(id) as SmtpConfigRow | undefined;

  return row ? mapSmtpConfigRow(row) : null;
}

function mapSmtpConfigRow(row: SmtpConfigRow): SmtpConfigRecord {
  return {
    id: row.id,
    host: row.host,
    port: row.port,
    username: row.username,
    password: row.password,
    fromEmail: row.from_email,
    fromName: row.from_name,
    secure: row.secure === 1,
    isActive: row.is_active === 1,
    weight: row.weight,
  };
}
