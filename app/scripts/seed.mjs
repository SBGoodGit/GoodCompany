// Local seed: admin, default Mediator and two demo accounts with verified email.
// Idempotent. Passwords come from .env (SEED_ADMIN_PASSWORD, SEED_USER_PASSWORD) and are never printed.
import { createClient } from '@supabase/supabase-js'
import postgres from 'postgres'

const env = process.env
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const sql = postgres(env.DATABASE_URL, { max: 1 })

async function ensureUser(email, password, display_name, role, expertise = []) {
  const [existing] = await sql`select id from public.users where email = ${email}`
  let id = existing?.id
  if (!id) {
    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name } })
    if (error) throw error
    id = data.user.id
  }
  await sql`update public.users set role = ${role} where id = ${id}`
  if (expertise.length) await sql`update public.profiles set expertise_tags = ${expertise} where user_id = ${id}`
  return id
}

await ensureUser(env.SEED_ADMIN_EMAIL, env.SEED_ADMIN_PASSWORD, 'GoodCompany Admin', 'admin')
const mediator = await ensureUser('mediator@goodcompany.test', env.SEED_USER_PASSWORD, 'Mira Mediator', 'mediator')
await sql`update public.app_settings set value = ${sql.json(mediator)} where key = 'default_mediator_id' and value = 'null'::jsonb`
await ensureUser('client@goodcompany.test', env.SEED_USER_PASSWORD, 'Clara Client', 'client')
await ensureUser('contractor@goodcompany.test', env.SEED_USER_PASSWORD, 'Conor Contractor', 'contractor', ['carpentry', 'renovation'])
await ensureUser('supplier@goodcompany.test', env.SEED_USER_PASSWORD, 'Sam Supplier', 'contractor')

// Simulated balance (§2.2): demonstration money for the demo client, created by this seed function.
const [client] = await sql`select id from public.users where email = 'client@goodcompany.test'`
const [has] = await sql`select 1 from public.simulated_balances where user_id = ${client.id}`
if (!has) {
  await sql`insert into public.simulated_balances (user_id, balance) values (${client.id}, 5000000)`
  await sql`insert into public.ledger_entries (account, action_type, amounts, resulting_balances)
            values (${'user:' + client.id}, 'simulated_credit', ${sql.json({ credit: 5000000 })}, ${sql.json({ balance: 5000000 })})`
}
await sql.end()
console.log('Seeded: admin, mediator (default), client (EUR 50,000 simulated), contractor, supplier (passwords in .env)')
