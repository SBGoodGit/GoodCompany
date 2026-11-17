import type { Session } from '@supabase/supabase-js'

/** $fetch against the Nuxt server API with the user's bearer token. */
export function useApi() {
  const session = useState<Session | null>('session')
  return <T = any>(url: string, opts: Record<string, any> = {}): Promise<T> =>
    $fetch<T>(url, {
      ...opts,
      headers: { ...(opts.headers ?? {}), ...(session.value ? { Authorization: `Bearer ${session.value.access_token}` } : {}) },
    } as any) as Promise<T>
}

/** Readable message from a failed API call. */
export function apiError(e: any): string {
  const errors = e?.data?.data?.errors
  if (Array.isArray(errors) && errors.length) return errors.join(' · ')
  return e?.data?.statusMessage || e?.data?.message || e?.statusMessage || e?.message || 'Something went wrong'
}

export function useMe() {
  return useState<any>('me', () => null)
}

export async function refreshMe() {
  const api = useApi()
  const me = useMe()
  try { me.value = await api('/api/me') } catch { me.value = null }
  return me.value
}
