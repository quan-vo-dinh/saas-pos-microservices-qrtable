import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

const workspaceRoot = path.resolve(__dirname, '../..');

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@einvoice/types': path.resolve(workspaceRoot, 'libs/shared/types/src/index.ts'),
      '@einvoice/shared-constants': path.resolve(workspaceRoot, 'libs/shared/constants/src/index.ts'),
      '@einvoice/frontend-ui': path.resolve(workspaceRoot, 'libs/frontend/ui/src/index.ts'),
      '@einvoice/frontend-hooks': path.resolve(workspaceRoot, 'libs/frontend/hooks/src/index.ts'),
      '@einvoice/frontend-utils': path.resolve(workspaceRoot, 'libs/frontend/utils/src/index.ts'),
      '@einvoice/mock-data': path.resolve(workspaceRoot, 'libs/shared/mock-data/src/index.ts'),
    },
  },
});
