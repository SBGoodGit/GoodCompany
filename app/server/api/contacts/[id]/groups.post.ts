// Set the groups a contact belongs to (many-to-many).
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')!
  const { group_ids } = await readBody<{ group_ids?: string[] }>(event)
  return db().begin(async (tx) => {
    const [c] = await tx`select id from contacts where id = ${id} and owner_id = ${user.id}`
    if (!c) bad('Contact not found', 404)
    const ids = (group_ids ?? []).map(String)
    const owned = ids.length ? await tx`select id from contact_groups where owner_id = ${user.id} and id = any(${ids})` : []
    if (owned.length !== ids.length) bad('Unknown group')
    await tx`delete from contact_group_memberships where contact_id = ${id}`
    for (const g of owned) await tx`insert into contact_group_memberships (contact_id, group_id) values (${id}, ${g.id})`
    return { ok: true }
  })
})
