// GoodCompany MVP1 — Nuxt 3 (SPA mode: the browser holds the Supabase session, every data
// request goes to the Nuxt server API with the user's access token).
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  ssr: false,
  devtools: { enabled: false },
  css: ['~/assets/main.css'],
  app: {
    head: {
      title: 'GoodCompany',
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700&display=swap' },
      ],
    },
  },
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    },
  },
})
