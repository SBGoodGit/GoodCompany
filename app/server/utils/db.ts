import postgres from 'postgres'

// One connection pool for the server. Every session runs as the restricted role gc_app,
// which cannot update or delete append-only records (see migration 2).
let _sql: postgres.Sql | null = null

export function db(): postgres.Sql {
  if (!_sql) {
    const url = useRuntimeConfig().databaseUrl || process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is not set')
    _sql = postgres(url, {
      max: 10,
      connection: { options: '-c role=gc_app' } as Record<string, string>,
      types: {
        // int8 and numeric as JS numbers: amounts are minor units, far below 2^53
        bigint: { to: 20, from: [20], serialize: (x: number) => String(x), parse: (x: string) => Number(x) },
        numeric: { to: 1700, from: [1700], serialize: (x: number) => String(x), parse: (x: string) => Number(x) },
      },
    })
  }
  return _sql
}

export type Tx = postgres.TransactionSql | postgres.Sql
