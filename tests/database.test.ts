import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pbkdf2Sync } from 'node:crypto';
import { database as db, withDatabase, type Storage } from '../lib/netlify-database';

function memory(): Storage {
  let version = 0, value: Uint8Array | null = null;
  return {
    async get() { return value ? { data: value.slice().buffer as ArrayBuffer, etag: String(version) } : null; },
    async put(data, expected) {
      if (expected ? expected !== String(version) : value !== null) return false;
      value = data.slice(); version++; return true;
    },
  };
}
test('initial admin/admin is hashed, initialized once, and persistent changes survive a fresh request', async () => {
  const store = memory();
  await withDatabase(async () => {
    const c = await db.prepare('SELECT * FROM credentials WHERE username=?').bind('admin').first();
    assert.equal(c.password_hash, pbkdf2Sync('admin', c.salt, 100000, 32, 'sha256').toString('hex'));
    const m = await db.prepare('SELECT role FROM members WHERE user_id=?').bind(c.id).first();
    assert.equal(m.role, 'admin');
    await db.prepare('UPDATE credentials SET password_hash=? WHERE id=?').bind('changed', c.id).run();
    return Response.json({ ok: true });
  }, store);
  await withDatabase(async () => {
    assert.equal((await db.prepare("SELECT password_hash FROM credentials WHERE username='admin'").first()).password_hash, 'changed');
    assert.equal((await db.prepare("SELECT count(*) as n FROM credentials WHERE username='admin'").first()).n, 1);
    return Response.json({ ok: true });
  }, store);
});
test('concurrent writes return a conflict and do not overwrite another request', async () => {
  const store = memory();
  await withDatabase(async () => Response.json({}), store);
  let release!: () => void, entered!: () => void;
  const gate = new Promise<void>(r => { release = r; });
  const ready = new Promise<void>(r => { entered = r; });
  const slow = withDatabase(async () => {
    await db.prepare('INSERT INTO settings(key,value) VALUES (?,?)').bind('conflict-test', 'slow').run();
    entered(); await gate; return Response.json({});
  }, store);
  await ready;
  assert.equal((await withDatabase(async () => {
    await db.prepare('INSERT INTO settings(key,value) VALUES (?,?)').bind('conflict-test', 'winner').run();
    return Response.json({});
  }, store)).status, 200);
  release(); assert.equal((await slow).status, 409);
  await withDatabase(async () => {
    assert.equal((await db.prepare("SELECT value FROM settings WHERE key='conflict-test'").first()).value, 'winner');
    return Response.json({});
  }, store);
});
test('batch rollback leaves no partial content', async () => {
  const store = memory();
  await withDatabase(async () => {
    await assert.rejects(db.batch([
      db.prepare('INSERT INTO settings(key,value) VALUES (?,?)').bind('rollback', 'a'),
      db.prepare('INSERT INTO settings(key,value) VALUES (?,?)').bind('rollback', 'b'),
    ]));
    assert.equal(await db.prepare("SELECT * FROM settings WHERE key='rollback'").first(), null);
    return Response.json({});
  }, store);
});
