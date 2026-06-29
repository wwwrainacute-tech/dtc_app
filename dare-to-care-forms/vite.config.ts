import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
const apiTarget = process.env.DTC_API_TARGET || 'http://localhost:3002'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': apiTarget
    }
  }
})
