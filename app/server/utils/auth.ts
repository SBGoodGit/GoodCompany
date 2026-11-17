import type { H3Event } from 'h3'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export interface AppUser {
  id: string
  email: string
  role: 'client' | 'contractor' | 'both' | 'mediator' | 'admin'
  status: string
  identity_level: string | null
}

let _admin: SupabaseClient | null = null
export function supabaseAdmin(): SupabaseClient {
  if (!_admin) {
    const cfg = useRuntimeConfig()
    _admin = createClient(cfg.public.supabaseUrl, cfg.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return _admin
}

/** A fresh, non-persisting anon client (used to verify a password for step-up). */
export function supabaseAnon(): SupabaseClient {
  const cfg = useRuntimeConfig()
  return createClient(cfg.public.supabaseUrl, cfg.public.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Authenticate the request from its bearer token. Requires an active account with a
 * verified email address: identity_level(user) = 'email_verified' is the MVP1 identity (§7.6).
 */
export async function requireUser(event: H3Event, opts: { roles?: AppUser['role'][] } = {}): Promise<AppUser> {
  const header = getHeader(event, 'authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) throw createError({ statusCode: 401, statusMessage: 'Not signed in' })
  const { data, error } = await supabaseAdmin().auth.getUser(token)
  if (error || !data.user) throw createError({ statusCode: 401, statusMessage: 'Session expired, please sign in again' })
  const [user] = await db()<AppUser[]>`
    select id, email, role, status, public.identity_level(id) as identity_level from users where id = ${data.user.id}`
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unknown account' })
  if (user.status !== 'active') throw createError({ statusCode: 403, statusMessage: 'Account is not active' })
  if (user.identity_level !== 'email_verified') throw createError({ statusCode: 403, statusMessage: 'Verify your email address first' })
  if (opts.roles && !opts.roles.includes(user.role)) throw createError({ statusCode: 403, statusMessage: 'Not allowed for your role' })
  return user
}

/**
 * Consume a step-up grant (single use, short-lived). Required before every signature (§2.3, §10).
 * The grant is created by POST /api/auth/step-up after the user re-enters their password.
 */
export async function consumeStepUp(event: H3Event, tx: Tx, userId: string): Promise<string> {
  const token = getHeader(event, 'x-step-up-token') ?? ''
  if (!/^[0-9a-f-]{36}$/i.test(token)) throw createError({ statusCode: 401, statusMessage: 'Step-up authentication required' })
  const [grant] = await tx`
    update step_up_grants set used_at = now()
     where id = ${token} and user_id = ${userId} and used_at is null and expires_at > now()
     returning id`
  if (!grant) throw createError({ statusCode: 401, statusMessage: 'Step-up authentication expired or already used' })
  return grant.id as string
}
