import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        onstart(args) {
          args.startup();
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              output: {
                format: 'cjs'
              },
              external: (id) => {
                return ['electron', 'better-sqlite3', 'electron-store', 'electron-log', 'electron-window-state', 'express', 'pdf-parse', '@anthropic-ai/sdk', 'openai', 'winston', 'colors', 'logform', 'onnxruntime-node', 'onnxruntime-web', '@xenova/transformers', 'sharp', 'mammoth', 'file-type'].includes(id) ||
                       id.startsWith('node:') ||
                       id === 'util';
              }
            }
          }
        }
      },
      {
        entry: 'electron/preload.ts',
        onstart(args) {
          args.reload();
        },
        vite: {
          build: {
            outDir: 'dist-electron'
          }
        }
      }
    ])
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
