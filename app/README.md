# GoodCompany MVP1 app

Nuxt 3 + TypeScript, Supabase (local), simulated escrow. Built to Build Spec v3.007 (`../docs/spec/`).

## Run locally

Requirements: Docker running, Node 22, Supabase CLI.

```bash
npm install
npx supabase start          # local stack on ports 55320–55329
cp .env.example .env        # fill keys from: npx supabase status -o env
npx supabase db reset       # apply migrations
npm run seed                # admin, default Mediator, demo client + contractor (passwords go in .env)
npm run dev                 # http://127.0.0.1:3100
```

Emails (sign-up verification) arrive in the local Mailpit inbox: http://127.0.0.1:55324

## Tests

```bash
npm test                    # Vitest: business rules + database guarantees (needs the local DB)
npx playwright install chromium   # once
npm run test:e2e            # Playwright end-to-end flows (starts or reuses the dev server)
```

## Layout

- `supabase/migrations/` — data model, RLS, append-only rules, configuration defaults
- `shared/` — pure business rules (money, terms, jobs), used by server, UI and unit tests
- `server/api/` — REST endpoints; `server/utils/` — auth, step-up, audit, notifications, workspace snapshot
- `pages/`, `components/`, `composables/` — UI
- `BUILD_NOTES.md` — implementation choices; `SESSION_LOG.md` — progress per build session
