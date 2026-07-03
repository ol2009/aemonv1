import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn, LogOut } from 'lucide-react'
import { AemonAvatar } from '../components/AemonAvatar'
import { Button, Panel } from '../components/ui'
import { googleRedirectUrl, signInWithGoogle, signOut, useSupabaseUser } from '../lib/useSupabaseUser'

export function LoginPage() {
  const navigate = useNavigate()
  const { user, isConfigured, isLoading } = useSupabaseUser()
  const [message, setMessage] = useState('')
  const redirectUrl = googleRedirectUrl('/home')

  const login = async () => {
    setMessage('')
    try {
      await signInWithGoogle('/home')
    } catch (error) {
      setMessage((error as Error).message)
    }
  }

  const logout = async () => {
    setMessage('')
    try {
      await signOut()
      setMessage('로그아웃되었습니다.')
    } catch (error) {
      setMessage((error as Error).message)
    }
  }

  return (
    <div className="flex min-h-[78vh] items-center justify-center px-5">
      <Panel className="w-full max-w-md text-center">
        <AemonAvatar stage={0} alignment="none" size={130} />
        <h1 className="font-display mt-6 text-4xl text-[#EAF2F5]">에아몬에 오신 걸 환영합니다</h1>
        <p className="mt-4 leading-7 text-[#8AA0B0]">
          교사용 수정 기능은 Google 로그인 후 사용할 수 있습니다. 학생 화면은 로그인 없이 둘러볼 수 있습니다.
        </p>
        {user ? (
          <p className="mt-4 rounded-2xl border border-[#4FE0C0]/25 bg-[#4FE0C0]/10 px-4 py-3 text-sm text-[#B7C7D2]">
            로그인됨: {user.email}
          </p>
        ) : null}
        {message ? (
          <p className="mt-4 rounded-2xl border border-[#FFD37A]/25 bg-[#FFD37A]/10 px-4 py-3 text-sm text-[#FFD37A]">{message}</p>
        ) : null}
        <div className="mt-5 rounded-2xl border border-white/10 bg-[#07111B]/45 px-4 py-3 text-left">
          <p className="font-data text-xs text-[#8AA0B0]">OAuth callback</p>
          <p className="mt-1 break-all text-sm leading-6 text-[#B7C7D2]">{redirectUrl}</p>
        </div>
        <div className="mt-8 grid gap-3">
          {user ? (
            <Button onClick={() => navigate('/home')}>
              <LogIn size={19} />
              교사 화면으로 이동
            </Button>
          ) : (
            <Button disabled={!isConfigured || isLoading} onClick={login}>
              <LogIn size={19} />
              Google로 로그인
            </Button>
          )}
          {user ? (
            <Button variant="ghost" onClick={logout}>
              <LogOut size={19} />
              로그아웃
            </Button>
          ) : null}
          <Button variant="secondary" onClick={() => navigate('/home')}>
            둘러보기
          </Button>
        </div>
      </Panel>
    </div>
  )
}
