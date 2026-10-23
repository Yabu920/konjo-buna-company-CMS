import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

// A fresh URL for every production JS chunk ensures browsers cannot reuse a
// stale immutable JS file from an earlier deployment, even when the source
// content happens to produce the same Vite content hash.
const jsAssetRelease = Date.now().toString(36);

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          entryFileNames: `assets/[name]-${jsAssetRelease}-[hash].js`,
          chunkFileNames: `assets/[name]-${jsAssetRelease}-[hash].js`,
        },
      },
    },
    server: {
      host: '0.0.0.0',
      hmr: {
        host: 'localhost',
        protocol: 'ws',
        overlay: true,
      },
      watch: {
        usePolling: true,
        ignored: ['**/node_modules/**', '**/dist/**'],
      },
    },
  };
});
