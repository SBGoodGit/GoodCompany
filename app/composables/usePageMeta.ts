// Page title and one-line subtitle shown by the shell (step A), as in the showcase's page heading.
// Keyed by the route name Nuxt derives from the file under pages/.
export const PAGE_META: Record<string, [string, string]> = {
  dashboard: ['Dashboard', 'Overview of all your GoodCompany activity'],
  jobs: ['Marketplace', 'Search, post and manage jobs'],
  'jobs-new': ['Post a job', 'Describe the work; your indicative budget stays private'],
  'jobs-id': ['Marketplace', 'Job details and the conversations about it'],
  workspaces: ['GoodTrade', 'Negotiation workspaces, from introduction to signed contract'],
  'workspaces-id': ['Negotiation Workspace', 'From introduction to a signed contract'],
  contracts: ['GoodTrade', 'Your contracts and their escrow'],
  'contracts-id': ['Contract', 'Full trajectory: escrow, milestones, changes and completion'],
  'disputes-id': ['Dispute', 'A case between client and contractor; the Mediator advises'],
  contacts: ['Contacts & Inner Circles', 'Your organised address book of GoodCompany relationships'],
  'community-bank': ['Community Bank', 'Reserves, loans and voting'],
  'community-bank-apply': ['Loan application', 'Community Bank — a new application'],
  'community-bank-loans-id': ['Loan', 'Community Bank — loan details'],
  invoices: ['Invoices', 'Invoices and fee statements of your contracts'],
  profile: ['Profile', 'Your reputation, expertise and portfolio'],
  'users-id': ['Public profile', 'Reputation and statistics'],
  notifications: ['Notifications', 'Everything that happened for you'],
  mediator: ['Cases', 'Disputes assigned to you as Mediator'],
  'mediator-cases-id': ['Case', 'Mediator console'],
  admin: ['Admin', 'Settings, Mediators, balances, loans and system jobs'],
}

export function usePageMeta() {
  const route = useRoute()
  return computed(() => {
    const [title, sub] = PAGE_META[String(route.name)] ?? ['GoodCompany', '']
    return { title, sub }
  })
}
