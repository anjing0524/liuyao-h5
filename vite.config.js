import { defineConfig } from 'vite';

// H5 项目：相对路径 base（部署到 CloudBase 静态托管后能在子路径下工作）
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    // 不把 wasm 强行 base64 内联（wasm 必须以独立文件存在，浏览器 fetch 需要）
    assetsInlineLimit: 0,
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    port: 5173,
    host: '0.0.0.0'  // 允许局域网真机访问
  }
});