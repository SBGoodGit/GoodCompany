import type { Session } from '@supabase/supabase-js'

const PUBLIC = ['/', '/login', '/signup']

export default defineNuxtRouteMiddleware(async (to) => {
  const session = useState<Session | null>('session')
  if (PUBLIC.includes(to.path)) return
  if (!session.value) return navigateTo(`/login?next=${encodeURIComponent(to.fullPath)}`)
  const me = useMe()
  if (!me.value) await refreshMe()
  if (!me.value) return navigateTo('/login')
  if (to.path.startsWith('/admin') && me.value.user.role !== 'admin') return navigateTo('/dashboard')
  if (to.path.startsWith('/mediator') && me.value.user.role !== 'mediator') return navigateTo('/dashboard')
})
