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
  // Online on Cloudflare Workers (hosting plan, GoodCompany_Hosting_Plan_MVP1.md): `nuxt dev` and the
  // local tests keep running on Node; `npm run build` produces the Worker. The Worker's own settings
  // (name, Cron Trigger, Hyperdrive binding) are in wrangler.jsonc, merged in by Nitro at build time.
  nitro: {
    preset: 'cloudflare_module',
    cloudflare: { deployConfig: true, nodeCompat: true },
    // useEvent() in server utils: the database client is opened per request on Workers (server/utils/db.ts)
    experimental: { asyncContext: true },
  },
  // Secrets on Workers are runtime variables with the NUXT_ prefix (NUXT_SUPABASE_SERVICE_ROLE_KEY,
  // NUXT_PUBLIC_SUPABASE_URL, NUXT_PUBLIC_SUPABASE_ANON_KEY); locally .env fills them as before.
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    },
  },
})
