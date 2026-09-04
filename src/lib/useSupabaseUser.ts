import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './supabase'
import { publicSiteUrl } from './siteUrl'

export function useSupabaseUser() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsLoading(false)
      return
    }

    const authClient = supabase
    let mounted = true
    let validationId = 0

    const validateUser = async () => {
      const requestId = ++validationId
      const { data, error } = await authClient.auth.getUser()
      if (!mounted || requestId !== validationId) return
      setUser(error ? null : data.user)
      setIsLoading(false)
    }

    void validateUser()

    const { data: listener } = authClient.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        validationId += 1
        setUser(null)
        setIsLoading(false)
        return
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setIsLoading(true)
        window.setTimeout(() => void validateUser(), 0)
      }
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  return { user, isLoading, isConfigured: isSupabaseConfigured }
}

function authCallbackUrl(nextPath: string) {
  const url = new URL('/auth/callback', publicSiteUrl())
  if (nextPath && nextPath !== '/home') {
    url.searchParams.set('next', nextPath)
  }
  return url.toString()
}

export function googleRedirectUrl(nextPath = '/home') {
  return authCallbackUrl(nextPath)
}

export async function signInWithGoogle(nextPath = '/home') {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase 환경변수가 설정되어 있지 않습니다.')
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: authCallbackUrl(nextPath),
      scopes: 'email profile',
    },
  })

  if (error) throw error
}

export async function signOut() {
  if (!isSupabaseConfigured || !supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
