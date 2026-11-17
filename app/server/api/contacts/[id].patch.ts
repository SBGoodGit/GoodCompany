export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')!
  const b = await readBody<Record<string, any>>(event)
  const sql = db()
  const [c] = await sql`select * from contacts where id = ${id} and owner_id = ${user.id}`
  if (!c) bad('Contact not found', 404)
  const next = {
    display_name: b.display_name?.trim() || c.display_name,
    company_name: b.company_name !== undefined ? b.company_name || null : c.company_name,
    notes: b.notes !== undefined ? b.notes || null : c.notes,
    collaboration_preference: ['none', 'prefer', 'avoid'].includes(b.collaboration_preference) ? b.collaboration_preference : c.collaboration_preference,
  }
  const [updated] = await sql`update contacts set ${sql(next)} where id = ${id} returning *`
  return updated
})
