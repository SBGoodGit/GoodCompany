// Loan application (v2 §4.8): verified applicant, allowed purpose, supplier with a verified account.
// Interest is derived, required votes and audience computed; the sampled members are invited.
import { toMinor } from '../../../shared/money'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, { roles: ['client', 'contractor', 'both'] })
  const b = await readBody<Record<string, any>>(event)
  return db().begin(async (tx) => {
    const settings = await getSettings(tx)
    if (!(settings.loan_purpose_categories as string[]).includes(b.purpose_category)) bad('Choose an allowed purpose: equipment, inventory, transport or software')
    if (!String(b.purpose ?? '').trim()) bad('Describe the purpose')
    let amount = 0, income: number | null = null
    try {
      amount = toMinor(String(b.amount_requested ?? ''))
      if (b.projected_income !== undefined && String(b.projected_income).trim() !== '') income = toMinor(String(b.projected_income))
    } catch (e) { bad((e as Error).message) }
    if (amount <= 0) bad('Enter the amount')
    const term = Number(b.repayment_term_months)
    if (!Number.isInteger(term) || term < 1 || term > 120) bad('The term must be 1 to 120 months')
    const [sup] = await tx`select id from users where email = ${String(b.supplier_email ?? '').trim().toLowerCase()} and status = 'active'
                             and public.identity_level(id) = 'email_verified'`
    if (!sup) bad('The supplier needs a verified GoodCompany account')
    if (sup.id === user.id) bad('You cannot be your own supplier')
    return submitLoanApplication(tx, user.id, { purpose_category: b.purpose_category, purpose: String(b.purpose).trim(), amount, term, projected_income: income, supplier_id: sup.id })
  })
})
