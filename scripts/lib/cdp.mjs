// 最小的 Chrome DevTools Protocol 用戶端(E2E 測試用,不需要任何 npm 套件):
// 以隨機埠、獨立的暫存使用者資料夾啟動 headless Chrome(只綁 127.0.0.1),用 Node 內建的 WebSocket 連線並操作頁面。
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const sleep = ms => new Promise(r => setTimeout(r, ms));

/** 找系統上的 Chrome / Chromium / Edge;環境變數 CHROME_PATH 優先 */
export function findChrome() {
  const env = process.env.CHROME_PATH;
  const c = [env,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean);
  return c.find(p => { try { return fs.statSync(p).isFile(); } catch { return false; } }) || null;
}

export async function launchChrome({ chrome = findChrome(), port = 9300 + Math.floor(Math.random() * 500) } = {}) {
  if (!chrome) throw new Error('找不到 Chrome(可以用環境變數 CHROME_PATH 指定路徑)');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chem-e2e-'));
  const proc = spawn(chrome, [
    '--headless=new', `--remote-debugging-port=${port}`, '--remote-debugging-address=127.0.0.1', `--user-data-dir=${dir}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-background-networking', '--mute-audio',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', 'about:blank',
  ], { stdio: 'ignore' });
  let exited = false; proc.once('exit', () => { exited = true; });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {                                       // 最多等 10 秒
    if (exited) throw new Error('Chrome 啟動後立刻結束了');
    try { if ((await fetch(base + '/json/version')).ok) break; } catch { /* 還沒好 */ }
    await sleep(100);
    if (i === 99) throw new Error('Chrome 沒有在時限內開好偵錯埠');
  }
  return {
    base,
    async newPage() {
      const r = await fetch(base + '/json/new?about:blank', { method: 'PUT' });
      const t = await r.json();
      return connectPage(t.webSocketDebuggerUrl);
    },
    async close() {
      try { proc.kill(); } catch { /* 已結束 */ }
      await sleep(300);
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* 暫存檔稍後會被系統清掉 */ }
    },
  };
}

function connectPage(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0; const pending = new Map(), handlers = new Map(), errors = [];
    const on = (ev, fn) => { (handlers.get(ev) || handlers.set(ev, []).get(ev)).push(fn); };
    ws.onmessage = e => {
      const m = JSON.parse(e.data);
      if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); }
      else if (m.method) (handlers.get(m.method) || []).forEach(fn => fn(m.params));
    };
    ws.onerror = e => reject(new Error('WebSocket 連線失敗'));
    ws.onopen = async () => {
      const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
      // 收集頁面的錯誤:未捕捉的例外、console.error、載入失敗的資源
      on('Runtime.exceptionThrown', p => errors.push('exception: ' + (p.exceptionDetails.exception?.description || p.exceptionDetails.text)));
      on('Runtime.consoleAPICalled', p => { if (p.type === 'error') errors.push('console.error: ' + p.args.map(a => a.value ?? a.description ?? '').join(' ')); });
      on('Log.entryAdded', p => { if (p.entry.level === 'error') errors.push('log: ' + p.entry.text + (p.entry.url ? ' ' + p.entry.url : '')); });
      await Promise.all([send('Page.enable'), send('Runtime.enable'), send('Log.enable')]);
      const page = {
        errors, send, on,
        /** 設定視窗:手機(mobile = true 時同時開啟觸控模擬)或桌機 */
        async viewport(width, height, mobile = false) {
          await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });
          await send('Emulation.setTouchEmulationEnabled', { enabled: mobile });
        },
        async goto(url, settle = 700) {
          // 只改網址的 # 部分(同一份文件內的導覽)不會觸發 load 事件,會白白等到逾時;先回到空白頁,保證每次都是完整載入
          await send('Page.navigate', { url: 'about:blank' }); await sleep(60);
          const loaded = new Promise(r => on('Page.loadEventFired', r));
          await send('Page.navigate', { url });
          await Promise.race([loaded, sleep(15000)]);
          await sleep(settle);
        },
        /** 在頁面裡執行(可以 await);回傳可序列化的值 */
        async eval(expr) {
          const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
          if (r.exceptionDetails) throw new Error('頁面內錯誤:' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
          return r.result.value;
        },
        async screenshot(file) { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(file, Buffer.from(r.data, 'base64')); },
        sleep,
        close() { try { ws.close(); } catch { /* 已關閉 */ } },
      };
      resolve(page);
    };
  });
}
