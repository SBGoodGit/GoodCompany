// Runs the system jobs (§10): every 5 minutes a tick starts each job whose interval has passed.
// - Node (`nuxt dev`): a timer in the server process.
// - Cloudflare Workers (online): the Cron Trigger "*/5 * * * *" in wrangler.jsonc wakes the Worker's
//   scheduled handler, which fires the `cloudflare:scheduled` hook (hosting plan C3).
// Jobs are idempotent and catch up on missed ticks. Disable with JOBS_DISABLED=1.
export default defineNitroPlugin((nitroApp) => {
  if (import.meta.prerender) return
  if (isWorkers()) {
    nitroApp.hooks.hook('cloudflare:scheduled', async () => {
      try { await withJobDb(() => schedulerTick()) } catch (e) { console.error('[jobs]', (e as Error).message) }
    })
    return
  }
  if (process.env.JOBS_DISABLED === '1') return
  let running = false
  const tick = async () => {
    if (running) return
    running = true
    try { await schedulerTick() } catch (e) { console.error('[jobs]', (e as Error).message) } finally { running = false }
  }
  setTimeout(tick, 30_000)
  setInterval(tick, 5 * 60_000)
})
