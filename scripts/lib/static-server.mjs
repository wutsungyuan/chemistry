// 極簡的靜態檔案伺服器(只給 E2E 測試用,沒有任何套件):把 dist/ 當成網站根目錄,只綁 127.0.0.1。
// 安全:路徑一律解析後必須落在根目錄之內(擋 ../ 與編碼過的 ..),只允許 GET/HEAD。
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};

/** URL 路徑 → 根目錄內的檔案路徑;跑出根目錄就回傳 null */
export function safeJoin(root, urlPath) {
  let p;
  try { p = decodeURIComponent(urlPath.split('?')[0].split('#')[0]); } catch { return null; }
  if (p.includes('\0')) return null;
  const full = path.resolve(root, '.' + path.posix.normalize('/' + p));
  const rel = path.relative(path.resolve(root), full);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return full;
}

/** 啟動伺服器;port 0 = 隨機埠。回傳 { url, close() } */
export function startStaticServer(root, port = 0) {
  const server = http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
    let file = safeJoin(root, req.url || '/');
    if (!file) { res.writeHead(403).end('forbidden'); return; }
    try { if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html'); } catch { res.writeHead(404).end('not found'); return; }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404).end('not found'); return; }
      res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(req.method === 'HEAD' ? undefined : buf);
    });
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(r => server.close(r)) }));
  });
}
