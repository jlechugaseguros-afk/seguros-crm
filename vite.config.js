import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { resolve } from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Dos páginas: el CRM (index.html) y el portal de clientes (portal.html), independientes.
      input: { main: resolve(__dirname, 'index.html'), portal: resolve(__dirname, 'portal.html') },
    },
  },
})
