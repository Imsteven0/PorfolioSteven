import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // El chunk de la escena (three.js) es grande por naturaleza y se carga de forma diferida.
  build: { chunkSizeWarningLimit: 1200 },
});
