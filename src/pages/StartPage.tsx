import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Database, LogIn, RotateCcw, School } from 'lucide-react'
import { Button, Panel } from '../components/ui'
import { createRemoteClass, isRemoteReady, probeV2Database } from '../lib/v2Remote'
import { useSupabaseUser } from '../lib/useSupabaseUser'
import { useV2 } from '../state/V2Store'

export function StartPage() {
  const navigate = useNavigate()
  const { user, isConfigured } = useSupabaseUser()
  const { state, createClass, mergeClass, resetDemo, setRemoteStatus } = useV2()
  const [className, setClassName] = useState(state.className)
  const [message, setMessage] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const create = async () => {
    const trimmed = className.trim()
    if (!trimmed) return

    setIsCreating(true)
    setMessage('')

    try {
      if (isRemoteReady() && user) {
        const probe = await probeV2Database()
        setRemoteStatus(probe)
        if (!probe.ok) throw new Error(probe.message)

        const remoteClass = await createRemoteClass({ className: trimmed, teacherId: user.id, teacherEmail: user.email })
        mergeClass(remoteClass)
        navigate('/home')
        return
      }

      createClass(trimmed, user?.email ?? '')
      setRemoteStatus({
        ok: false,
        message: user ? 'Supabase 환경변수가 없어 로컬 학급으로 시작했습니다.' : 'Google 로그인 전이라 로컬 학급으로 시작했습니다. 학생 QR 공유는 Supabase 연결 후 사용하세요.',
      })
      navigate('/home')
    } catch (error) {
      createClass(trimmed, user?.email ?? '')
      setRemoteStatus({ ok: false, message: (error as Error).message })
      setMessage(`${(error as Error).message} 로컬 학급으로는 계속 진행할 수 있습니다.`)
      navigate('/home')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="mx-auto min-h-[calc(100vh-90px)] max-w-5xl px-5 py-10">
      <div className="mb-8">
        <p className="font-data text-sm text-[#4FE0C0]">AEMON V2</p>
        <h1 className="font-display mt-3 text-5xl leading-tight text-[#EAF2F5]">학급 AI 프로젝트 시작</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-[#B7C7D2]">
          교사가 학급을 만들고, 학생은 수업 중 QR 코드로 닉네임만 입력해 참여합니다.
        </p>
      </div>

      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFD37A]/10 text-[#FFD37A]">
              <School size={24} />
            </div>
            <div>
              <p className="font-data text-xs text-[#FFD37A]">TEACHER</p>
              <h2 className="font-display text-3xl text-[#EAF2F5]">학급 만들기</h2>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#07111B]/45 px-4 py-3 text-sm text-[#B7C7D2]">
            {user ? `로그인됨: ${user.email}` : 'Google 로그인 전'}
          </div>
        </div>

        <label className="mt-7 block">
          <span className="text-sm font-bold text-[#8AA0B0]">학급 이름</span>
          <input
            className="mt-2 w-full rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-4 text-lg text-[#EAF2F5]"
            placeholder="예: 햇살초 4학년 2반"
            value={className}
            onChange={(event) => setClassName(event.target.value)}
          />
        </label>

        <div className="mt-5 rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
          <div className="flex items-start gap-3">
            <Database className={state.remote.ok ? 'text-[#4FE0C0]' : 'text-[#FFD37A]'} size={20} />
            <div>
              <p className="font-bold text-[#EAF2F5]">공유 상태</p>
              <p className="mt-1 text-sm leading-6 text-[#8AA0B0]">
                {state.remote.message || (isConfigured ? 'Supabase 연결 확인 전입니다.' : 'Supabase 환경변수가 없습니다.')}
              </p>
            </div>
          </div>
        </div>

        {message ? <p className="mt-4 rounded-2xl border border-[#FFD37A]/25 bg-[#FFD37A]/10 px-4 py-3 text-sm text-[#FFD37A]">{message}</p> : null}

        <div className="mt-7 flex flex-wrap gap-3">
          <Button disabled={!className.trim() || isCreating} onClick={create}>
            학급 만들고 입장
            <ArrowRight size={18} />
          </Button>
          <Button variant="secondary" disabled={!state.classCode} onClick={() => navigate('/home')}>
            기존 학급 계속하기
          </Button>
          {!user ? (
            <Button variant="ghost" onClick={() => navigate('/login')}>
              <LogIn size={18} />
              Google 로그인
            </Button>
          ) : null}
        </div>
      </Panel>

      <div className="mt-5 flex justify-end">
        <button className="inline-flex items-center gap-2 text-sm font-bold text-[#8AA0B0] hover:text-[#EAF2F5]" onClick={resetDemo} type="button">
          <RotateCcw size={16} />
          데모 초기화
        </button>
      </div>
    </div>
  )
}
