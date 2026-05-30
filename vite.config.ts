import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/talpas-invoice/',
  plugins: [react(), tailwindcss()],
});
