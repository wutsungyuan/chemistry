// 供應鏈與執行安全的自動檢查(npm test)。目的:新增或升級套件時,不小心放寬防護就會失敗。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const pkg = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
const walk = (dir, out = []) => { for (const f of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, f.name); f.isDirectory() ? walk(p, out) : out.push(p); } return out; };

// 在安裝時會執行腳本的套件白名單(fsevents 只在 macOS 才會裝,是 vite 的選用依賴)
const INSTALL_SCRIPT_ALLOWLIST = ['fsevents'];

test('package.json:所有直接依賴都鎖定確切版本(沒有 ^ ~ * latest)', () => {
  for (const group of ['dependencies', 'devDependencies']) {
    for (const [name, ver] of Object.entries(pkg[group] || {})) assert.match(ver, /^\d+\.\d+\.\d+$/, `${name}@${ver} 不是確切版本`);
  }
});

test('package.json 與 package-lock.json 一致', () => {
  const rootLock = lock.packages[''];
  assert.deepEqual(rootLock.dependencies || {}, pkg.dependencies || {});
  assert.deepEqual(rootLock.devDependencies || {}, pkg.devDependencies || {});
  for (const group of ['dependencies', 'devDependencies']) {
    for (const [name, ver] of Object.entries(pkg[group] || {})) assert.equal(lock.packages['node_modules/' + name]?.version, ver, `${name} 鎖檔版本不同`);
  }
});

test('lockfile:每個套件都有完整性雜湊,且只來自官方 npm registry', () => {
  for (const [key, v] of Object.entries(lock.packages)) {
    if (!key || v.link) continue;
    assert.ok(v.integrity, `${key} 缺少 integrity`);
    assert.ok(String(v.resolved).startsWith('https://registry.npmjs.org/'), `${key} 來源不是官方 registry:${v.resolved}`);
  }
});

test('lockfile:只有白名單內的套件會在安裝時執行腳本', () => {
  const withScripts = Object.entries(lock.packages).filter(([, v]) => v.hasInstallScript).map(([k]) => k.replace(/^.*node_modules\//, ''));
  for (const n of withScripts) assert.ok(INSTALL_SCRIPT_ALLOWLIST.includes(n), `${n} 會在安裝時執行腳本,請先審查再加入白名單`);
});

test('.npmrc:停用安裝腳本、鎖定確切版本', () => {
  const npmrc = read('.npmrc');
  assert.match(npmrc, /^ignore-scripts=true$/m);
  assert.match(npmrc, /^save-exact=true$/m);
});

test('建置專用套件(crystcif-parse 與它的依賴)只能是 devDependency,且不能被網頁程式碼引用', () => {
  assert.ok(!pkg.dependencies['crystcif-parse'], 'crystcif-parse 不該是執行時依賴');
  for (const name of ['crystcif-parse', 'mathjs', 'mendeleev']) {
    assert.ok(lock.packages['node_modules/' + name]?.dev, `${name} 應標記為 dev`);
  }
  const offenders = walk(path.join(root, 'src')).filter(f => /\.(js|mjs)$/.test(f))
    .filter(f => /from\s+['"](crystcif-parse|mathjs|mendeleev)['"]|require\(['"](crystcif-parse|mathjs|mendeleev)['"]\)/.test(fs.readFileSync(f, 'utf8')));
  assert.deepEqual(offenders, [], '網頁程式碼不能引用建置專用套件');
});

test('網頁原始碼沒有 eval / new Function / 動態載入外部腳本', () => {
  const bad = [];
  for (const f of walk(path.join(root, 'src')).filter(f => /\.js$/.test(f) && !f.includes(`${path.sep}generated${path.sep}`))) {
    const s = fs.readFileSync(f, 'utf8');
    if (/\beval\s*\(|new\s+Function\s*\(|document\.write\s*\(|importScripts\s*\(/.test(s)) bad.push(path.relative(root, f));
  }
  assert.deepEqual(bad, []);
});

test('建置腳本在 Node 權限沙盒內執行(--permission,只允許寫入產生檔資料夾)', () => {
  const s = pkg.scripts['build-db'];
  assert.match(s, /--permission/);
  assert.match(s, /--allow-fs-write=src\/data\/generated/);
  assert.ok(!/--allow-child-process|--allow-worker|--allow-addons|--allow-fs-write=\.(\s|$)/.test(s), '不應放行子程序、Worker、原生外掛或整個專案的寫入');
});

test('開發伺服器只綁定本機 127.0.0.1', () => {
  const cfg = read('vite.config.js');
  assert.match(cfg, /host:\s*'127\.0\.0\.1'/);
  assert.ok(!/host:\s*(true|'0\.0\.0\.0')/.test(cfg));
});

test('已建置的網頁程式包裡沒有混進建置專用套件(若已建置才檢查)', () => {
  const assets = path.join(root, 'dist/assets');
  if (!fs.existsSync(assets)) return;
  for (const f of fs.readdirSync(assets).filter(f => f.endsWith('.js'))) {
    const s = fs.readFileSync(path.join(assets, f), 'utf8');
    assert.ok(!/crystcif|typed-function|decimal\.js/i.test(s), `${f} 含有建置專用套件的程式碼`);
  }
});

test('外部資料(CIF)進入頁面前必須跳脫:escapeHtml 行為正確,且圖鑑顯示出處時有使用', async () => {
  const { escapeHtml } = await import('../src/ui/util.js');
  assert.equal(escapeHtml('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
  assert.equal(escapeHtml(`a&b"c'd`), 'a&amp;b&quot;c&#39;d');
  const gal = read('src/scenes/MoleculeGallery.js');
  assert.match(gal, /escapeHtml\(src\)/);
  assert.ok(gal.includes("const src = state.lang === 'en' && m.sourceEn ? m.sourceEn : m.source;"));       // src 只會是 m.source 或 m.sourceEn,而且顯示前一定跳脫
});

test('產生的資料庫裡,CIF 衍生的出處不含 HTML 特殊字元', async () => {
  const { STRUCTURES } = await import('../src/data/generated/db.js');
  for (const [id, s] of Object.entries(STRUCTURES)) assert.ok(!/[<>]/.test(s.source), `${id} 的出處含有 < 或 >`);
});

test('手機用的 Tailscale 開發伺服器:只綁 Tailscale 位址(100.64.0.0/10),不綁 0.0.0.0,不對外', () => {
  const s = read('scripts/dev-tailscale.mjs');
  assert.match(s, /host:\s*ip/);
  assert.match(s, /\+m\[1\]\s*<\s*64\s*\|\|\s*\+m\[1\]\s*>\s*127/);        // 位址不在 100.64.0.0/10 就拒絕啟動
  assert.ok(!/0\.0\.0\.0|host:\s*true/.test(s));
  assert.equal(pkg.scripts['dev:tailscale'], 'node scripts/dev-tailscale.mjs');
});
