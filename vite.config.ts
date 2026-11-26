/// <reference types="node" />
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      preserveSymlinks: true,
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      }
    },
    server: {
      host: true
    }
  };
});
