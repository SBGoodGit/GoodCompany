export default defineEventHandler(async (event) => {
  await requireUser(event, { roles: ['admin'] })
  return db()`select key, value, description, updated_at from app_settings order by key`
})
