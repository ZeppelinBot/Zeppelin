import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import adonisjs from '@adonisjs/vite/client'
import { rootEnv } from '#start/env'

const allowedHosts = rootEnv.get("DEVELOPMENT_VITE_ALLOWED_HOSTS", "")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);

export default defineConfig({
  plugins: [
    vue(),
    adonisjs({ entryPoints: ['inertia/app.ts'], reload: ['resources/views/**/*.edge'] }),
  ],

  server: {
    watch: {
      ignored: ['**/storage/**', '**/tmp/**'],
    },
    allowedHosts,
  },
})
