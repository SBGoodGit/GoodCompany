// Add a contact (v2 §4.2): linked automatically when the email or phone matches a GoodCompany account.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const b = await readBody<Record<string, any>>(event)
  if (!b.display_name?.trim()) bad('Name is required')
  const email = b.email?.trim().toLowerCase() || null
  const phone = b.phone?.trim() || null
  const sql = db()
  const [match] = email || phone
    ? await sql`select id from users where status = 'active' and id <> ${user.id}
                  and ((${email}::text is not null and email = ${email}) or (${phone}::text is not null and phone = ${phone})) limit 1`
    : []
  const [contact] = await sql`
    insert into contacts (owner_id, linked_user_id, display_name, company_name, phone, email, status, notes)
    values (${user.id}, ${match?.id ?? null}, ${b.display_name.trim()}, ${b.company_name || null}, ${phone}, ${email},
            ${match ? 'linked' : 'unlinked'}, ${b.notes || null})
    returning *`
  return contact
})
