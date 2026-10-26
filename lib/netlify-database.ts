import { AsyncLocalStorage } from 'node:async_hooks';
import { readFile, mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import initSqlJs, { type Database } from 'sql.js';
import { getStore } from '@netlify/blobs';

// Each request reads a consistent SQLite snapshot. Conditional writes reject
// concurrent changes instead of overwriting another administrator's work.
type Context = { db: Database; dirty: boolean };
const contexts = new AsyncLocalStorage<Context>();
const sql = initSqlJs({ locateFile: () => path.join(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm') });
const key = 'atlas.sqlite';
export type Snapshot = { data: ArrayBuffer; etag: string };
export interface Storage {
  get(): Promise<Snapshot | null>;
  put(data: Uint8Array, etag?: string): Promise<boolean>;
}
const etagOf = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');
let localQueue: Promise<unknown> = Promise.resolve();
function storage(): Storage {
  if (process.env.NETLIFY === 'true' || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY_BLOBS_CONTEXT) {
    const store = getStore({ name: 'mongil-atlas-v1', consistency: 'strong' });
    return {
      async get() {
        const r = await store.getWithMetadata(key, { type: 'arrayBuffer', consistency: 'strong' });
        if (!r) return null;
        if (!r.etag) throw new Error('Storage did not return a version for conditional writes.');
        return { data: r.data, etag: r.etag };
      },
      async put(data, etag) {
        const r = await store.set(key, data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer,
          etag ? { onlyIfMatch: etag } : { onlyIfNew: true });
        return r.modified;
      },
    };
  }
  const file = path.join(process.cwd(), '.local-data', key);
  const read = async () => { try { const b = await readFile(file); return { data: b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer, etag: etagOf(b) }; } catch (e: any) { if (e.code === 'ENOENT') return null; throw e; } };
  return {
    get: read,
    put(data, expected) {
      const op = localQueue.then(async () => {
        const previous = await read();
        if (expected ? previous?.etag !== expected : !!previous) return false;
        await mkdir(path.dirname(file), { recursive: true });
        const temp = file + '.' + crypto.randomUUID();
        await writeFile(temp, data); await rename(temp, file); return true;
      });
      localQueue = op.catch(() => {}); return op;
    },
  };
}
export async function withDatabase<T extends Response>(handler: () => Promise<T>, store: Storage = storage()): Promise<Response> {
  const SQL = await sql;
  let snapshot = await store.get();
  if (!snapshot) {
    const initial = new SQL.Database();
    try {
      initial.exec(await readFile(path.join(process.cwd(), 'export-data/restore-new-database.sql'), 'utf8'));
      await store.put(initial.export());
    } finally { initial.close(); }
    snapshot = await store.get();
    if (!snapshot) throw new Error('Không khởi tạo được dữ liệu.');
  }
  const db = new SQL.Database(new Uint8Array(snapshot.data));
  const ctx: Context = { db, dirty: false };
  try {
    return await contexts.run(ctx, async () => {
      const response = await handler();
      if (ctx.dirty) {
        // Expired security records are never allowed to accumulate indefinitely.
        db.run('DELETE FROM sessions WHERE expires <= ?', [new Date().toISOString()]);
        db.run('DELETE FROM attempts WHERE until <= ?', [new Date().toISOString()]);
        if (!await store.put(db.export(), snapshot!.etag)) {
          return Response.json({ error: 'Dữ liệu vừa được cập nhật ở phiên khác. Hãy thử lại thao tác.' }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
        }
      }
      return response;
    });
  } finally { db.close(); }
}
class Statement {
  constructor(readonly query: string, readonly values: any[] = []) {}
  bind(...values: any[]) { return new Statement(this.query, values); }
  rows() {
    const ctx = contexts.getStore(); if (!ctx) throw Error('Database must be used inside a request.');
    const s = ctx.db.prepare(this.query);
    try { s.bind(this.values.map(v => v === undefined ? null : v)); const rows: any[] = []; while (s.step()) rows.push(s.getAsObject()); return rows; }
    finally { s.free(); }
  }
  async first(): Promise<any> { return this.rows()[0] || null; }
  async all(): Promise<{ results: any[] }> { return { results: this.rows() }; }
  async run(): Promise<any> { this.rows(); contexts.getStore()!.dirty = true; return { success: true }; }
}
export const database = {
  prepare(query: string) { return new Statement(query); },
  async batch(statements: Statement[]) {
    const ctx = contexts.getStore(); if (!ctx) throw Error('No request database.');
    ctx.db.run('BEGIN');
    try { for (const statement of statements) statement.rows(); ctx.db.run('COMMIT'); ctx.dirty = true; return statements.map(() => ({ success: true })); }
    catch (e) { ctx.db.run('ROLLBACK'); throw e; }
  },
};
