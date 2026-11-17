// Runs the system jobs (§10): a tick every 5 minutes starts each job whose interval has passed.
// Disable with JOBS_DISABLED=1 (e.g. when several app instances share one database).
export default defineNitroPlugin(() => {
  if (process.env.JOBS_DISABLED === '1' || import.meta.prerender) return
  let running = false
  const tick = async () => {
    if (running) return
    running = true
    try { await schedulerTick() } catch (e) { console.error('[jobs]', (e as Error).message) } finally { running = false }
  }
  setTimeout(tick, 30_000)
  setInterval(tick, 5 * 60_000)
})
