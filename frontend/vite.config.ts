import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      // User-uploaded files are served by Django; proxy them in dev so a
      // relative media URL (empty VITE_API_BASE_URL) still resolves.
      '/media': 'http://127.0.0.1:8000',
    },
  },
})
