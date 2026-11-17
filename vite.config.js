import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the static build works on GitHub Pages under /bby-product-design-studio/
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { target: 'es2022', chunkSizeWarningLimit: 1500, sourcemap: false },
});
