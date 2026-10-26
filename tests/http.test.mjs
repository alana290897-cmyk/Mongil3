import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';

test('production API: guest permissions, admin/admin, published build/team CRUD, images and logout', { timeout: 60000, skip: !process.env.ATLAS_HTTP_TEST }, async () => {
  const port = 4193, origin = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--port', String(port), '--hostname', '127.0.0.1'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = '';
  server.stdout.on('data', b => { logs += b; }); server.stderr.on('data', b => { logs += b; });
  let cookie = '';
  async function call(path, data, authenticated = true, headers = {}) {
    const r = await fetch(origin + path, { method: data === undefined ? 'GET' : 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...(authenticated && cookie ? { Cookie: cookie } : {}), ...headers }, body: data === undefined ? undefined : JSON.stringify(data) });
    if (authenticated && r.headers.get('set-cookie')) cookie = r.headers.get('set-cookie').split(';')[0];
    const body = r.headers.get('content-type')?.includes('json') ? await r.json() : await r.arrayBuffer();
    return { status: r.status, body };
  }
  try {
    let ready = false;
    for (let n = 0; n < 100; n++) { try { if ((await call('/')).status === 200) { ready = true; break; } } catch {} await new Promise(r => setTimeout(r, 100)); }
    assert.ok(ready, logs);
    const guest = (await call('/api/data')).body;
    assert.equal(guest.role, 'viewer'); assert.equal(guest.user, null);
    const chars = guest.items.filter(x => x.kind === 'character'); assert.equal(chars.length, 29);
    assert.equal(chars.reduce((n, x) => n + (x.payload.skillData?.length || 0), 0), 145);
    assert.equal((await call('/api/manage', { action: 'save', item: {} }, false)).status, 401);
    assert.equal((await call('/api/auth', { action: 'login', username: 'admin', password: 'wrong' })).status, 401);
    assert.equal((await call('/api/auth', { action: 'login', username: 'admin', password: 'admin' })).status, 200);
    assert.equal((await call('/api/data')).body.role, 'admin');
    const catalog = (await call('/api/catalog')).body.items; assert.equal(catalog.length, 395);
    const equipment = ['head', 'chest', 'hands', 'feet'].map(slot => catalog.find(a => a.kind === 'equipment' && a.slot === slot)?.id);
    assert.ok(equipment.every(Boolean));
    const selection = { equipment, monsterlings: catalog.filter(a => a.kind === 'monsterling').slice(0, 3).map(a => a.id), legend: catalog.find(a => a.kind === 'legend').id, artifact: catalog.find(a => a.kind === 'artifact').id };
    for (const [kind, payload] of [['build', { character: chars[0].id, selection }], ['team', { team: chars.slice(0, 3).map(c => c.id) }]]) {
      const item = { id: 'integration-' + kind + '-' + Date.now(), kind, title: 'Integration ' + kind, status: 'published', payload };
      const saved = await call('/api/manage', { action: 'save', item }); assert.equal(saved.status, 200, JSON.stringify(saved));
      item.title = 'Edited ' + kind; assert.equal((await call('/api/manage', { action: 'save', item })).status, 200);
      const found = (await call('/api/data', undefined, false)).body.items.find(x => x.id === item.id); assert.equal(found.title, item.title);
      if (kind === 'build') { assert.equal(found.payload.loadoutSnapshot.equipment.length, 4); assert.ok(found.payload.loadoutSnapshot.legend.image); }
      assert.equal((await call('/api/manage', { action: 'delete', item }, false)).status, 401);
      assert.equal((await call('/api/manage', { action: 'delete', item })).status, 200);
      assert.ok(!(await call('/api/data', undefined, false)).body.items.some(x => x.id === item.id));
      assert.equal((await call('/api/manage', { action: 'delete', item })).status, 404);
    }
    assert.equal((await call('/api/data', undefined, false, { 'oai-authenticated-user-id': 'local:atlas-export-admin', 'oai-authenticated-user-email': 'chungndtq001@gmail.com' })).body.role, 'viewer');
    const image = await call('/images/sangun.png'); assert.equal(image.status, 200); assert.deepEqual(Buffer.from(image.body), await readFile('public/images/sangun.png'));
    assert.equal((await call('/api/auth', { action: 'logout' })).status, 200);
    assert.equal((await call('/api/data')).body.role, 'viewer');
  } finally { server.kill('SIGTERM'); await once(server, 'exit'); }
});
