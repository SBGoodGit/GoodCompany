// Job search (§5.1). Never returns indicative_budget to a contractor; budget is also not a
// search filter, because filtering by it would let a contractor infer the budget (BUILD_NOTES).
import { jobForViewer } from '../../../shared/jobs'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const q = getQuery(event)
  const sql = db()
  const [profile] = await sql`select expertise_tags from profiles where user_id = ${user.id}`
  const myExpertise = q.my_expertise === undefined ? true : String(q.my_expertise) !== 'false' // default ON (§7.9)
  const text = typeof q.q === 'string' && q.q.trim() ? `%${q.q.trim()}%` : null
  const category = typeof q.category === 'string' && q.category ? q.category : null
  const region = typeof q.region === 'string' && q.region.trim() ? `%${q.region.trim()}%` : null
  const tags: string[] = profile?.expertise_tags ?? []
  const rows = await sql`
    select j.id, j.client_id, j.title, j.description, j.category, j.region, j.urgency, j.status, j.created_at,
           j.indicative_budget, p.display_name as client_name,
           exists (select 1 from negotiation_workspaces w where w.job_id = j.id and w.contractor_id = ${user.id}) as responded
      from jobs j join profiles p on p.user_id = j.client_id
     where j.status = 'open' and j.selected_contractor_id is null and j.client_id <> ${user.id}
       ${text ? sql`and (j.title ilike ${text} or j.description ilike ${text})` : sql``}
       ${category ? sql`and j.category = ${category}` : sql``}
       ${region ? sql`and j.region ilike ${region}` : sql``}
       ${myExpertise && tags.length ? sql`and j.category = any(${tags})` : sql``}
     order by j.created_at desc
     limit 100`
  return { my_expertise: myExpertise, expertise_tags: tags, jobs: rows.map((j: any) => jobForViewer(j, user.id)) }
})
