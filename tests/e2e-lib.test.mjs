// E2E 用的小工具(不需要 Chrome 就能測):靜態伺服器的安全性、Chrome 路徑搜尋、E2E 腳本的結構。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { safeJoin, startStaticServer } from '../scripts/lib/static-server.mjs';
import { findChrome } from '../scripts/lib/cdp.mjs';

test('safeJoin:根目錄內的路徑可以,跑出根目錄(../、編碼過的 ..、絕對路徑、NUL)一律拒絕', () => {
  const root = path.resolve(os.tmpdir(), 'chem-root');
  assert.equal(safeJoin(root, '/index.html'), path.join(root, 'index.html'));
  assert.equal(safeJoin(root, '/assets/a.js?x=1#h'), path.join(root, 'assets', 'a.js'));
  assert.equal(safeJoin(root, '/'), root);
  for (const bad of ['/../secret', '/..%2fsecret', '/%2e%2e/secret', '/a/../../secret', '/..\\secret', '/%00']) {
    const r = safeJoin(root, bad);
    assert.ok(r === null || path.relative(root, r).split(path.sep)[0] !== '..', `${bad} → ${r}`);
    if (r) assert.ok(!path.relative(root, r).startsWith('..'), bad);
  }
  assert.equal(safeJoin(root, '/%E0%A4%A'), null);                       // 壞掉的百分比編碼
});

test('靜態伺服器:提供檔案與正確的類型、目錄預設 index.html、找不到 404、只接受 GET/HEAD、不會讀到根目錄外的檔案', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chem-static-'));
  const outside = path.join(os.tmpdir(), 'chem-outside-' + process.pid + '.txt');
  fs.writeFileSync(path.join(dir, 'index.html'), '<h1>hi</h1>'); fs.writeFileSync(path.join(dir, 'a.js'), 'x'); fs.writeFileSync(outside, 'SECRET');
  const srv = await startStaticServer(dir);
  try {
    assert.match(srv.url, /^http:\/\/127\.0\.0\.1:\d+$/);                 // 只綁本機
    const r1 = await fetch(srv.url + '/'); assert.equal(r1.status, 200); assert.match(r1.headers.get('content-type'), /text\/html/); assert.equal(await r1.text(), '<h1>hi</h1>');
    assert.match((await fetch(srv.url + '/a.js')).headers.get('content-type'), /javascript/);
    assert.equal((await fetch(srv.url + '/missing.html')).status, 404);
    assert.equal((await fetch(srv.url + '/', { method: 'POST' })).status, 405);
    for (const bad of ['/../' + path.basename(outside), '/..%2f' + path.basename(outside), '/%2e%2e/' + path.basename(outside)]) {
      const r = await fetch(srv.url + bad); assert.ok([403, 404].includes(r.status), `${bad} → ${r.status}`);
      assert.ok(!(await r.text()).includes('SECRET'), bad);
    }
  } finally { await srv.close(); fs.rmSync(dir, { recursive: true, force: true }); fs.rmSync(outside, { force: true }); }
});

test('findChrome:CHROME_PATH 指向存在的檔案時優先使用;不存在的會被略過', () => {
  const f = path.join(os.tmpdir(), 'fake-chrome-' + process.pid); fs.writeFileSync(f, '');
  const old = process.env.CHROME_PATH;
  try { process.env.CHROME_PATH = f; assert.equal(findChrome(), f); process.env.CHROME_PATH = f + '-nope'; assert.notEqual(findChrome(), f + '-nope'); }
  finally { if (old === undefined) delete process.env.CHROME_PATH; else process.env.CHROME_PATH = old; fs.rmSync(f, { force: true }); }
});

test('E2E 腳本與設定:npm run e2e 存在、e2e-out 不進版控、腳本不依賴任何第三方套件', () => {
  const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.scripts.e2e, 'node scripts/e2e.mjs');
  assert.deepEqual(Object.keys(pkg.dependencies).sort(), ['pinyin-pro', 'three']);                      // 沒有因為 E2E 新增任何套件
  assert.match(fs.readFileSync(new URL('../.gitignore', import.meta.url), 'utf8'), /^e2e-out\/?$/m);
  for (const f of ['scripts/e2e.mjs', 'scripts/lib/cdp.mjs', 'scripts/lib/static-server.mjs']) {
    const src = fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
    for (const m of src.matchAll(/from '([^']+)'/g)) assert.ok(m[1].startsWith('.') || m[1].startsWith('node:'), `${f} 引用了第三方套件 ${m[1]}`);
  }
});
