// Run the trigger checks now (b: silence, c: payment deadline). Scheduling is part of the system jobs (session 3).
export default defineEventHandler(async (event) => {
  await requireUser(event, { roles: ['admin'] })
  return runTriggerChecks()
})
