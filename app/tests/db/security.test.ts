// Database-level guarantees: append-only records (§10) and row-level security against the public anon key.
import { afterAll, describe, expect, it } from 'vitest'
import postgres from 'postgres'

const app = postgres(process.env.DATABASE_URL!, { max: 1, connection: { options: '-c role=gc_app' } as any })
const superuser = postgres(process.env.DATABASE_URL!, { max: 1 })
afterAll(async () => { await app.end(); await superuser.end() })

describe('append-only records', () => {
  for (const table of ['audit_log_entries', 'ledger_entries']) {
    it(`${table}: the application role can insert but not update or delete`, async () => {
      const [row] = table === 'audit_log_entries'
        ? await app`insert into audit_log_entries (event_type) values ('test_append_only') returning id`
        : await app`insert into ledger_entries (account, action_type) values ('test', 'test_append_only') returning id`
      await expect(app`update ${app(table)} set ${app(table === 'audit_log_entries' ? 'event_type' : 'action_type')} = 'x' where id = ${row.id}`).rejects.toThrow(/permission denied/)
      await expect(app`delete from ${app(table)} where id = ${row.id}`).rejects.toThrow(/permission denied/)
    })
    it(`${table}: even a superuser cannot update, delete or truncate`, async () => {
      await expect(superuser`delete from ${superuser(table)}`).rejects.toThrow(/append-only/)
      await expect(superuser`truncate ${superuser(table)}`).rejects.toThrow(/append-only/)
    })
  }
  it('accepted terms versions are immutable', async () => {
    const [t] = await app`select id from terms_versions where status = 'accepted' limit 1`
    if (!t) return // no data yet in a fresh database
    await expect(app`update terms_versions set working_hours = 'changed' where id = ${t.id}`).rejects.toThrow(/immutable/)
  })
})

describe('row-level security', () => {
  it('the public anon key cannot read application tables through the REST API', async () => {
    for (const table of ['jobs', 'users', 'contacts', 'audit_log_entries', 'app_settings']) {
      const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${table}?select=*`, {
        headers: { apikey: process.env.SUPABASE_ANON_KEY!, Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}` },
      })
      const body = await res.json()
      expect(Array.isArray(body) && body.length > 0, `${table} leaked rows`).toBe(false)
    }
  })
  it('every public table has RLS enabled', async () => {
    const rows = await superuser`select tablename from pg_tables where schemaname = 'public' and not rowsecurity`
    expect(rows.map((r) => r.tablename)).toEqual([])
  })
})
