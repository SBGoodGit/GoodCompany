// Contacts are private to their owner, including the collaboration preference (July #5).
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const group = getQuery(event).group
  const sql = db()
  const contacts = await sql`
    select c.*, coalesce(array_agg(m.group_id) filter (where m.group_id is not null), '{}') as group_ids
      from contacts c left join contact_group_memberships m on m.contact_id = c.id
     where c.owner_id = ${user.id}
       ${typeof group === 'string' && group ? sql`and exists (select 1 from contact_group_memberships g where g.contact_id = c.id and g.group_id = ${group})` : sql``}
     group by c.id order by c.display_name`
  const groups = await sql`select * from contact_groups where owner_id = ${user.id} order by name`
  return { contacts, groups }
})
