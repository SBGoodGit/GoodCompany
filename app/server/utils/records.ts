import { createHash } from 'node:crypto'
import { canonicalJson } from '../../shared/canonical'

export function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

export function hashCanonical(value: unknown): string {
  return sha256(canonicalJson(value))
}

/** Append an AuditLogEntry. The table is append-only at database permission level. */
export async function audit(
  tx: Tx,
  e: { event_type: string; actor_id: string | null; contract_id?: string | null; workspace_id?: string | null; payload?: Record<string, unknown> },
) {
  await tx`insert into audit_log_entries (contract_id, workspace_id, event_type, actor_id, payload)
           values (${e.contract_id ?? null}, ${e.workspace_id ?? null}, ${e.event_type}, ${e.actor_id}, ${tx.json((e.payload ?? {}) as never)})`
}

/** Create an in-app notification. With a dedupe_key the same notice is never sent twice. */
export async function notify(
  tx: Tx,
  n: { user_id: string; type: string; title: string; body?: string; link?: string; dedupe_key?: string },
) {
  await tx`insert into notifications (user_id, type, title, body, link, dedupe_key)
           values (${n.user_id}, ${n.type}, ${n.title}, ${n.body ?? ''}, ${n.link ?? null}, ${n.dedupe_key ?? null})
           on conflict (user_id, dedupe_key) do nothing`
}

/** All configuration values (§12) as a plain object. */
export async function getSettings(tx: Tx = db()): Promise<Record<string, any>> {
  const rows = await tx<{ key: string; value: unknown }[]>`select key, value from app_settings`
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
}

export function bad(message: string, statusCode = 400): never {
  throw createError({ statusCode, statusMessage: message })
}
