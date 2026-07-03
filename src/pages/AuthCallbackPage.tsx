import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AemonAvatar } from '../components/AemonAvatar'
import { Button, Panel } from '../components/ui'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/home'
  return value
}

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [message, setMessage] = useState('Google 로그인 확인 중입니다.')
  const nextPath = safeNextPath(searchParams.get('next'))

  useEffect(() => {
    let mounted = true

    async function finishLogin() {
      if (!isSupabaseConfigured || !supabase) {
        setMessage('Supabase 환경변수가 설정되어 있지 않습니다.')
        return
      }

      try {
        const oauthError = searchParams.get('error_description') ?? searchParams.get('error')
        if (oauthError) throw new Error(decodeURIComponent(oauthError))

        const code = searchParams.get('code')
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
        }

        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
        const accessToken = hash.get('access_token')
        const refreshToken = hash.get('refresh_token')
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error) throw error
        }

        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        if (!data.session) {
          setMessage('로그인 세션을 찾지 못했습니다. 다시 로그인해주세요.')
          return
        }

        if (mounted) navigate(nextPath, { replace: true })
      } catch (error) {
        if (mounted) setMessage((error as Error).message)
      }
    }

    void finishLogin()

    return () => {
      mounted = false
    }
  }, [navigate, nextPath, searchParams])

  return (
    <div className="flex min-h-[78vh] items-center justify-center px-5">
      <Panel className="w-full max-w-md text-center">
        <AemonAvatar stage={0} alignment="none" size={120} />
        <h1 className="font-display mt-6 text-4xl text-[#EAF2F5]">로그인 처리 중</h1>
        <p className="mt-4 leading-7 text-[#B7C7D2]">{message}</p>
        <div className="mt-7 flex justify-center gap-3">
          <Button variant="secondary" onClick={() => navigate('/login', { replace: true })}>
            로그인 화면
          </Button>
          <Button onClick={() => navigate('/home', { replace: true })}>
            교사 화면
          </Button>
        </div>
      </Panel>
    </div>
  )
}
