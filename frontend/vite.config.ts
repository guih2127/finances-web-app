import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Em dev, o front roda em :5173 e faz proxy de /api pro backend em :3001.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3001' },
  },
});
