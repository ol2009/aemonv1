import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './supabase'

export function useSupabaseUser() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsLoading(false)
      return
    }

    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setUser(data.session?.user ?? null)
      setIsLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  return { user, isLoading, isConfigured: isSupabaseConfigured }
}

function authCallbackUrl(nextPath: string) {
  const url = new URL('/auth/callback', window.location.origin)
  url.searchParams.set('next', nextPath)
  return url.toString()
}

export async function signInWithGoogle(nextPath = '/guide') {
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
