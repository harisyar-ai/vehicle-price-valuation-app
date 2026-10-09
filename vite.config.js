import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Local dev: run the python API separately and point it here,
      // e.g. VITE_API_URL=http://localhost:8000 — same-origin /api in prod.
    },
  },
})
