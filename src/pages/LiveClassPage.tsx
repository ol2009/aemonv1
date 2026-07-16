import { useEffect, useRef, useState } from 'react'
import { Radio, Send } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Panel } from '../components/ui'
import { fetchRemoteClassBundle, fetchRemoteLiveLesson, isRemoteReady } from '../lib/v2Remote'
import { useV2 } from '../state/V2Store'

function targetFor(state: Awaited<ReturnType<typeof fetchRemoteLiveLesson>>, classCode: string) {
  if (!state) return ''
  const code = encodeURIComponent(classCode)
  if (state.activityPath) {
    const separator = state.activityPath.includes('?') ? '&' : '?'
    return `${state.activityPath}${separator}live=student&code=${code}`
  }
  if (state.boardMode) return `/board?code=${code}&mode=${state.boardMode}&live=student`
  return `/lesson/${state.lessonNo}?code=${code}&live=student&step=${state.stepIndex}`
}

export function LiveClassPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryCode = (searchParams.get('code') ?? '').trim()
  const { state, joinStudent, mergeClass, setRemoteStatus } = useV2()
  const mergeClassRef = useRef(mergeClass)
  const existingSession = state.studentSession?.classCode === queryCode ? state.studentSession : null
  const [nickname, setNickname] = useState(existingSession?.nickname ?? '')
  const [message, setMessage] = useState('')
  const [isJoining, setIsJoining] = useState(false)

  useEffect(() => {
    mergeClassRef.current = mergeClass
  }, [mergeClass])

  useEffect(() => {
    if (!existingSession || !queryCode) return
    let cancelled = false
    const openCurrentScreen = async () => {
      const bundle = await fetchRemoteClassBundle(queryCode)
      if (cancelled) return
      mergeClassRef.current({ ...bundle, studentSession: existingSession })
      const liveState = await fetchRemoteLiveLesson(queryCode)
      const target = targetFor(liveState, queryCode)
      if (!cancelled && target) navigate(target, { replace: true })
    }
    void openCurrentScreen().catch((error) => setMessage((error as Error).message))
    const timer = window.setInterval(() => void openCurrentScreen().catch((error) => setMessage((error as Error).message)), 4000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [existingSession, navigate, queryCode])

  const enter = async () => {
    const trimmedNickname = nickname.trim()
    if (!queryCode || !trimmedNickname || isJoining) return
    setIsJoining(true)
    setMessage('학급 화면에 연결하는 중입니다.')
    try {
      if (!isRemoteReady()) throw new Error('Supabase 연결이 준비되지 않았습니다.')
      const bundle = await fetchRemoteClassBundle(queryCode)
      mergeClass({ ...bundle, studentSession: { classCode: queryCode, nickname: trimmedNickname } })
      joinStudent(queryCode, trimmedNickname)
      const liveState = await fetchRemoteLiveLesson(queryCode)
      const target = targetFor(liveState, queryCode)
      if (target) navigate(target, { replace: true })
      else setMessage('입장했습니다. 선생님이 수업 화면을 열면 자동으로 시작됩니다.')
    } catch (error) {
      const text = (error as Error).message
      setMessage(text)
      setRemoteStatus({ ok: false, message: text })
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[75vh] max-w-xl items-center px-5 py-10">
      <Panel className="w-full text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-[#4FE0C0]/10 text-[#4FE0C0]">
          <Radio size={28} />
        </div>
        <p className="font-data mt-4 text-xs text-[#4FE0C0]">학급 화면 연결</p>
        <h1 className="font-display mt-2 text-4xl text-[#EAF2F5]">선생님 화면과 함께 보기</h1>
        <p className="mt-3 leading-7 text-[#8AA0B0]">선생님이 다음 장면으로 넘어가면 이 화면도 함께 바뀝니다.</p>
        <label className="mt-6 block text-left">
          <span className="text-sm font-black text-[#B7C7D2]">내 닉네임</span>
          <input
            className="mt-2 min-h-14 w-full rounded-lg border border-white/10 bg-[#07111B]/75 px-4 text-lg font-bold text-[#EAF2F5] outline-none focus:border-[#4FE0C0]"
            value={nickname}
            maxLength={16}
            placeholder="수업에서 사용할 닉네임"
            onChange={(event) => setNickname(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void enter()
            }}
          />
        </label>
        <Button className="mt-4 w-full" disabled={!queryCode || !nickname.trim() || isJoining} onClick={() => void enter()}>
          <Send size={18} />
          {isJoining ? '연결 중' : '수업 화면 입장'}
        </Button>
        {message ? <p className="mt-4 text-sm font-bold leading-6 text-[#FFD37A]">{message}</p> : null}
      </Panel>
    </div>
  )
}
