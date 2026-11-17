export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { name } = await readBody<{ name?: string }>(event)
  if (!name?.trim()) bad('Group name is required')
  const [g] = await db()`insert into contact_groups (owner_id, name) values (${user.id}, ${name.trim()})
    on conflict (owner_id, name) do nothing returning *`
  if (!g) bad('A group with this name already exists', 409)
  return g
})
