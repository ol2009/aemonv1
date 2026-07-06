import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, Play, RotateCcw, Save, MessageSquare, Waves, X } from 'lucide-react'
import { AemonAvatar } from '../components/AemonAvatar'
import { Button, Panel } from '../components/ui'
import { findV2Lesson, v2Lessons } from '../data/v2Lessons'
import type { AiProvider } from '../domain/types'
import { providerLabel } from '../lib/v2Chat'
import { isRemoteReady, updateRemoteLesson } from '../lib/v2Remote'
import { useSupabaseUser } from '../lib/useSupabaseUser'
import { useV2RemoteSync } from '../lib/useV2RemoteSync'
import { useV2 } from '../state/V2Store'

export function HomePage() {
  const navigate = useNavigate()
  const { user, isLoading } = useSupabaseUser()
  const { state, evolutionStage, adoptedCodeCount, currentReaction, setLesson, setRemoteStatus, updateAiSettings, resetDemo } = useV2()
  const [isApiOpen, setIsApiOpen] = useState(false)
  const [draftProvider, setDraftProvider] = useState<AiProvider>(state.aiProvider)
  const [draftApiKey, setDraftApiKey] = useState(state.apiKey)

  useV2RemoteSync(state.classCode, Boolean(state.classCode))

  const openStart = () => {
    if (isLoading) return
    navigate(user ? '/start' : '/login?next=/start')
  }

  const openApiModal = () => {
    setDraftProvider(state.aiProvider)
    setDraftApiKey(state.apiKey)
    setIsApiOpen(true)
  }

  const saveApiSettings = () => {
    updateAiSettings({ provider: draftProvider, apiKey: draftApiKey.trim() })
    setIsApiOpen(false)
  }

  const resetProject = () => {
    const ok = window.confirm('학급, 가치코드, 게시판, 채팅, API 연결을 모두 지우고 처음부터 다시 시작할까요?')
    if (!ok) return
    resetDemo()
    localStorage.removeItem('aemon.state')
    navigate('/', { replace: true })
  }

  if (!state.classCode) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-5">
        <Panel className="max-w-md text-center">
          <h1 className="font-display text-4xl text-[#EAF2F5]">학급이 없습니다</h1>
          <p className="mt-3 leading-7 text-[#8AA0B0]">먼저 로그인하고 학급을 만들어 주세요.</p>
          <Button className="mt-6" disabled={isLoading} onClick={openStart}>
            학급 만들기
          </Button>
        </Panel>
      </div>
    )
  }

  const lessonNo = state.currentLesson || 1
  const currentLesson = findV2Lesson(lessonNo)
  const progressPercent = Math.round((lessonNo / 7) * 100)
  const canWriteRemote = Boolean(state.classId && state.remote.ok && isRemoteReady())

  const saveLesson = async (nextLesson: number) => {
    const clamped = Math.min(7, Math.max(1, nextLesson))
    setLesson(clamped)
    if (canWriteRemote) {
      try {
        await updateRemoteLesson({ classId: state.classId, lessonNo: clamped })
      } catch (error) {
        setRemoteStatus({ ok: false, message: (error as Error).message })
      }
    }
  }

  const openCurrentLesson = () => {
    if (lessonNo <= 1) navigate('/lesson/1')
    else if (lessonNo === 2) navigate('/codes')
    else if (lessonNo >= 7) navigate('/graduation')
    else navigate('/talk')
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <section className="border-b border-white/10 pb-6">
        <p className="font-data text-sm text-[#4FE0C0]">
          {state.className} · 학급 코드 {state.classCode}
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="font-display text-5xl text-[#EAF2F5]">대시보드</h1>
            <p className="mt-3 text-xl font-black text-[#EAF2F5]">{state.aemonName || '이름 없는 에아몬'}</p>
          </div>
          <div className="md:text-right">
            <p className="font-data text-xs text-[#8AA0B0]">현재 진행</p>
            <p className="font-display mt-1 text-4xl text-[#FFD37A]">{lessonNo}/7차시</p>
            <p className="mt-1 text-sm text-[#B7C7D2]">{currentLesson.title}</p>
            <Button className="mt-3 min-h-10 px-4" variant="danger" onClick={resetProject}>
              <RotateCcw size={17} />
              초기화
            </Button>
          </div>
        </div>
      </section>

      <Panel className="mt-6 overflow-hidden">
        <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-data text-sm text-[#FFD37A]">AEMON</p>
              <span className="rounded-full border border-white/10 bg-[#07111B]/55 px-3 py-1 text-sm font-bold text-[#B7C7D2]">
                가치코드 {adoptedCodeCount}개
              </span>
              {state.apiKey ? (
                <span className="rounded-full border border-[#4FE0C0]/25 bg-[#4FE0C0]/10 px-3 py-1 text-sm font-bold text-[#4FE0C0]">
                  API 연결됨
                </span>
              ) : null}
            </div>
            <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">{state.aemonName || '이름 없는 에아몬'}</h2>
            <div className="mt-4 rounded-[18px] border border-[#4FE0C0]/20 bg-[#07111B]/50 p-5">
              <p className="font-display text-3xl leading-tight text-[#FFD37A]">"{currentReaction}"</p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={openCurrentLesson}>
                <Play size={18} />
                {lessonNo <= 1 ? '1차시 시작' : `${lessonNo}차시 열기`}
              </Button>
              <Button variant="secondary" onClick={() => navigate('/talk')}>
                <MessageSquare size={18} />
                대화하기
              </Button>
              <Button variant="secondary" onClick={() => navigate('/dex')}>
                <Waves size={18} />
                데이터바다
              </Button>
              <Button variant="secondary" onClick={openApiModal}>
                <KeyRound size={18} />
                API 연결
              </Button>
            </div>
          </div>

          <div className="text-center">
            <AemonAvatar stage={evolutionStage} alignment="none" size={240} />
          </div>
        </div>
      </Panel>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-data text-sm text-[#4FE0C0]">차시 이동</p>
            <p className="mt-1 text-sm text-[#8AA0B0]">{currentLesson.phase} · {currentLesson.goal}</p>
          </div>
          <div className="h-2 w-52 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[#FFD37A]" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {v2Lessons.map((lesson) => (
            <button
              key={lesson.no}
              className={`h-11 min-w-11 rounded-xl border px-3 font-black transition ${
                lesson.no === lessonNo
                  ? 'border-[#FFD37A] bg-[#FFD37A] text-[#0A1622]'
                  : lesson.no < lessonNo
                    ? 'border-[#4FE0C0]/35 bg-[#4FE0C0]/10 text-[#4FE0C0]'
                    : 'border-white/10 bg-[#07111B]/55 text-[#B7C7D2] hover:border-white/25'
              }`}
              onClick={() => void saveLesson(lesson.no)}
              title={lesson.title}
              type="button"
            >
              {lesson.no}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button className="min-h-10 px-4" variant="secondary" disabled={lessonNo <= 1} onClick={() => void saveLesson(lessonNo - 1)}>
            <RotateCcw size={18} />
            이전
          </Button>
          <Button className="min-h-10 px-4" disabled={lessonNo >= 7} onClick={() => void saveLesson(lessonNo + 1)}>
            다음
          </Button>
        </div>
      </section>

      {isApiOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
          <Panel className="w-full max-w-xl">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-3xl text-[#EAF2F5]">API 연결</h2>
              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#B7C7D2] transition hover:bg-white/10 hover:text-[#EAF2F5]"
                onClick={() => setIsApiOpen(false)}
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {(Object.keys(providerLabel) as AiProvider[]).map((provider) => (
                <button
                  key={provider}
                  className={`rounded-xl border px-4 py-3 text-sm font-black transition ${
                    draftProvider === provider
                      ? 'border-[#4FE0C0] bg-[#4FE0C0]/10 text-[#EAF2F5]'
                      : 'border-white/10 bg-[#07111B]/55 text-[#8AA0B0] hover:border-white/25'
                  }`}
                  onClick={() => setDraftProvider(provider)}
                  type="button"
                >
                  {providerLabel[provider]}
                </button>
              ))}
            </div>

            <label className="mt-5 grid gap-2">
              <span className="text-sm font-bold text-[#8AA0B0]">API 키</span>
              <input
                className="rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 font-data text-[#EAF2F5] outline-none transition focus:border-[#4FE0C0]/60"
                placeholder="API 키 입력"
                type="password"
                value={draftApiKey}
                onChange={(event) => setDraftApiKey(event.target.value)}
              />
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setIsApiOpen(false)}>
                취소
              </Button>
              <Button onClick={saveApiSettings}>
                <Save size={18} />
                저장
              </Button>
            </div>
          </Panel>
        </div>
      ) : null}
    </div>
  )
}
