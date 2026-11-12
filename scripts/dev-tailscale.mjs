// 用 Tailscale 在手機上開發/預覽:開發伺服器「只綁在這台電腦的 Tailscale 位址」(100.64.0.0/10),
// 不綁「所有網卡」,所以一般區網、公開網路都連不到;只有 Tailscale 網路內(且 ACL 允許)的裝置能連。
// 用法:npm run dev:tailscale   →  手機打開 http://<這台電腦的 Tailscale IP>:5174/
import { execFileSync } from 'node:child_process';
import { createServer } from 'vite';

const ip = execFileSync('tailscale', ['ip', '-4'], { encoding: 'utf8' }).trim().split(/\s+/)[0];
const m = /^100\.(\d+)\.\d+\.\d+$/.exec(ip || '');
if (!m || +m[1] < 64 || +m[1] > 127) {            // Tailscale 位址一定在 100.64.0.0/10;不是就拒絕啟動,避免綁到別的網卡
  console.error(`取得的位址 "${ip}" 不是 Tailscale 位址(100.64.0.0/10),不啟動。請確認 Tailscale 已登入。`);
  process.exit(1);
}
const server = await createServer({ server: { host: ip, port: 5174, strictPort: true } });   // 其餘設定沿用 vite.config.js
await server.listen();
console.log(`\n  手機請打開(需先開啟 Tailscale App 並連線):  http://${ip}:5174/\n  只綁定在 Tailscale 網卡 ${ip},區網與公開網路連不到。按 Ctrl+C 停止。\n`);
