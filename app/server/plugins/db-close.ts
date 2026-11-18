// Cloudflare Workers: close the request's database client once the response is sent (hosting plan C1).
// On Node there is no per-request client, so this does nothing.
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('afterResponse', (event) => {
    const sql = event.context.gcSql
    if (!sql) return
    event.context.gcSql = undefined
    const done = sql.end({ timeout: 5 }).catch(() => {})
    event.waitUntil?.(done)
  })
})
