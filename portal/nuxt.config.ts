// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  app: {
    head: {
      viewport: 'width=device-width, initial-scale=1.0',
    },
  },
  devtools: { enabled: false },
  imports: {
    autoImport: false,
  },
})
