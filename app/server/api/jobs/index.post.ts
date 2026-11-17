import { canPostJobs } from '../../../shared/jobs'
import { toMinor } from '../../../shared/money'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  if (!canPostJobs(user.role)) bad('Only clients can post jobs', 403)
  const b = await readBody<Record<string, any>>(event)
  if (!b.title?.trim()) bad('Title is required')
  const [cat] = await db()`select key from categories where key = ${b.category ?? ''}`
  if (!cat) bad('Choose a category')
  const urgency = ['low', 'medium', 'high'].includes(b.urgency) ? b.urgency : 'medium'
  let budget: number | null = null
  if (b.indicative_budget !== undefined && b.indicative_budget !== null && String(b.indicative_budget).trim() !== '') {
    try { budget = toMinor(String(b.indicative_budget)) } catch { bad('Indicative budget is not a valid amount') }
  }
  const [job] = await db()`
    insert into jobs (client_id, title, description, category, region, urgency, indicative_budget)
    values (${user.id}, ${b.title.trim()}, ${b.description ?? ''}, ${cat.key}, ${b.region ?? ''}, ${urgency}, ${budget})
    returning *`
  return job
})
