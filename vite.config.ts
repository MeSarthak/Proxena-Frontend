import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Fall back to localhost:3000 when VITE_API_BASE_URL is not set
  const backendUrl = env.VITE_API_BASE_URL || 'http://localhost:3000'
  const backendWs  = backendUrl.replace(/^http/, 'ws')

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/v1': backendUrl,
        '/ws': { target: backendWs, ws: true },
      },
    },
  }
})
