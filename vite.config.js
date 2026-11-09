import { defineConfig } from 'vite';
// 開發固定使用 5174;若被占用就直接報錯,不要自動換埠
export default defineConfig({
  base: './',
  server: { port: 5174, strictPort: true, host: '127.0.0.1' },
  preview: { port: 5174, strictPort: true, host: '127.0.0.1' },
  build: { chunkSizeWarningLimit: 1500 },
});
