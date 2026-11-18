import postgres from 'postgres'
import { AsyncLocalStorage } from 'node:async_hooks'

// Database access. Every query runs as the restricted role gc_app, which cannot update or delete
// append-only records (see migration 2). Two runtimes:
//
// - Node (`nuxt dev`, the local tests): one shared pool for the server. It logs in as `postgres`
//   and switches to gc_app with the startup option `-c role=gc_app`.
// - Cloudflare Workers (online, hosting plan C1–C2): a connection cannot be shared between
//   requests, and Hyperdrive does the pooling. A client is opened per request (or per scheduled
//   run) from the Hyperdrive binding, which logs in as gc_app itself, so no role switch is sent.
//   The client is closed when the response is done (server/plugins/db-close.ts).

const types = {
  // int8 and numeric as JS numbers: amounts are minor units, far below 2^53
  bigint: { to: 20, from: [20], serialize: (x: number) => String(x), parse: (x: string) => Number(x) },
  numeric: { to: 1700, from: [1700], serialize: (x: number) => String(x), parse: (x: string) => Number(x) },
}

let _pool: postgres.Sql | null = null
const jobScope = new AsyncLocalStorage<{ sql?: postgres.Sql }>()

/** True when running in the Cloudflare Workers runtime. */
export const isWorkers = () => typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers'

function hyperdriveUrl(): string | null {
  return (globalThis as any).__env__?.HYPERDRIVE?.connectionString ?? null
}

function workerClient(url: string) {
  // fetch_types: false avoids an extra round trip per connection (recommended with Hyperdrive).
  return postgres(url, { max: 5, fetch_types: false, types })
}

export function db(): postgres.Sql {
  const url = hyperdriveUrl()
  if (url) {
    const job = jobScope.getStore()
    if (job) return (job.sql ??= workerClient(url))
    const event = useEvent()
    return (event.context.gcSql ??= workerClient(url))
  }
  if (!_pool) {
    const local = useRuntimeConfig().databaseUrl || process.env.DATABASE_URL
    if (!local) throw new Error('DATABASE_URL is not set')
    _pool = postgres(local, { max: 10, connection: { options: '-c role=gc_app' } as Record<string, string>, types })
  }
  return _pool
}

/** Run a scheduled job with its own database client, closed afterwards (Workers only; on Node it just runs). */
export async function withJobDb<T>(fn: () => Promise<T>): Promise<T> {
  const store: { sql?: postgres.Sql } = {}
  try {
    return await jobScope.run(store, fn)
  } finally {
    await store.sql?.end({ timeout: 5 })
  }
}

export type Tx = postgres.TransactionSql | postgres.Sql
