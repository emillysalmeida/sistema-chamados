import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// VITE_BASE_PATH=/sistema-chamados/ → GitHub Pages
// VITE_BASE_PATH=/               → Vercel / local dev
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
})
