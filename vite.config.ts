import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    electron({
      entry: 'electron/main.ts',
      vite: {
        build: {
          outDir: 'dist-electron',
          rollupOptions: {
            external: ['electron', 'better-sqlite3', 'electron-store', 'electron-log', 'electron-window-state', 'express', 'node:events', 'node:path', 'node:fs', 'node:url', 'node:os']
          }
        }
      }
    }),
    electron({
      entry: 'electron/preload.ts',
      onstart(args) {
        args.reload();
      },
      vite: {
        build: {
          outDir: 'dist-electron'
        }
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173
  },
  build: {
    outDir: 'dist'
  }
});
