import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const envDir = path.resolve(process.cwd(), '..')
const env = loadEnv('', envDir, '')
const getEnv = (name, fallback) => process.env[name] || env[name] || fallback
const certDir = path.resolve(process.cwd(), '..', 'backend', 'certs')
const keyPath = getEnv('SSL_KEY_PATH') || getEnv('TLS_KEY_PATH') || path.join(certDir, 'buscapet-local-key.pem')
const certPath = getEnv('SSL_CERT_PATH') || getEnv('TLS_CERT_PATH') || path.join(certDir, 'buscapet-local-cert.pem')
const httpsDisabled = getEnv('BUSCAPET_DISABLE_HTTPS', '') === '1'
const httpsConfig = !httpsDisabled && keyPath && certPath && fs.existsSync(keyPath) && fs.existsSync(certPath)
  ? {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    }
  : undefined

// https://vite.dev/config/
export default defineConfig({
  envDir,
  plugins: [react()],
  server: {
    allowedHosts: ['.trycloudflare.com'],
    host: true,
    port: Number(getEnv('FRONTEND_PORT', '3001')),
    strictPort: true,
    https: httpsConfig
  }
})
