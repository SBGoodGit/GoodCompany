// Update one configuration value (§12). Fixed values (holdback 10%) cannot be changed.
const FIXED = new Set(['holdback_percentage'])

export default defineEventHandler(async (event) => {
  const admin = await requireUser(event, { roles: ['admin'] })
  const key = getRouterParam(event, 'key')!
  const { value } = await readBody<{ value: unknown }>(event)
  if (FIXED.has(key)) bad('This value is fixed by the specification')
  if (value === undefined) bad('Value required')
  return db().begin(async (tx) => {
    const [row] = await tx`select key, value from app_settings where key = ${key}`
    if (!row) bad('Unknown setting', 404)
    if (key === 'default_mediator_id' && value !== null) {
      const [m] = await tx`select id from users where id = ${String(value)} and role = 'mediator' and status = 'active'`
      if (!m) bad('Not an active Mediator')
    }
    const [updated] = await tx`update app_settings set value = ${tx.json(value as never)}, updated_by = ${admin.id} where key = ${key} returning key, value`
    await audit(tx, { event_type: 'setting_changed', actor_id: admin.id, payload: { key, from: row.value, to: value } })
    return updated
  })
})
