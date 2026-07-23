import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export default defineConfig(({ command }) => {
  const base =
    command === 'serve' ? '/' : process.env.VITE_BASE_PATH || '/move-quest/'

  return {
    plugins: [react()],
    base,
    envDir: rootDir,
    server: {
      host: true,
      port: 5173,
    },
  }
})
