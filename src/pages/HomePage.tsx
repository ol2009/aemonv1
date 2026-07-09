import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, KeyRound, Play, RotateCcw, Save, MessageSquare, Waves, X } from 'lucide-react'
import { AemonAvatar } from '../components/AemonAvatar'
import { Button, Panel } from '../components/ui'
import { pickWalkItem } from '../data/walkItems'
import { findV2Lesson, v2Lessons } from '../data/v2Lessons'
import type { AiProvider, WalkItem, WalkItemType } from '../domain/types'
import { findBestRecoverableClass, shouldAutoRestoreClass } from '../lib/classRecovery'
import { providerLabel } from '../lib/v2Chat'
import { fetchRemoteClassBundle, fetchRemoteTeacherClasses, isRemoteReady, updateRemoteLesson } from '../lib/v2Remote'
import { useSupabaseUser } from '../lib/useSupabaseUser'
import { useV2RemoteSync } from '../lib/useV2RemoteSync'
import { useV2 } from '../state/V2Store'

type WalkPhase = 'idle' | 'swimming' | 'reveal'

const typeMeta: Record<WalkItemType, { color: string; soft: string }> = {
  good: { color: '#4FE0C0', soft: 'rgba(79,224,192,.12)' },
  weird: { color: '#E0476B', soft: 'rgba(224,71,107,.12)' },
  plain: { color: '#FFD37A', soft: 'rgba(255,211,122,.12)' },
}

export function HomePage() {
  const navigate = useNavigate()
  const { user, isLoading } = useSupabaseUser()
  const { state, evolutionStage, adoptedCodeCount, currentReaction, mergeClass, setLesson, setRemoteStatus, updateAiSettings, resetDemo } = useV2()
  const [isApiOpen, setIsApiOpen] = useState(false)
  const [draftProvider, setDraftProvider] = useState<AiProvider>(state.aiProvider)
  const [draftApiKey, setDraftApiKey] = useState(state.apiKey)
  const [apiSaved, setApiSaved] = useState(false)
  const [walkPhase, setWalkPhase] = useState<WalkPhase>('idle')
  const [walkItem, setWalkItem] = useState<WalkItem | null>(null)
  const swimTimer = useRef<number | null>(null)
  const recoveryAttemptedRef = useRef('')
  const stateRef = useRef(state)
  const walkMeta = walkItem ? typeMeta[walkItem.type] : null

  useV2RemoteSync(state.classCode, Boolean(state.classCode))

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    if (!user?.id || !isRemoteReady()) return

    let cancelled = false
    fetchRemoteTeacherClasses(user.id)
      .then(async (classes) => {
        if (cancelled || !shouldAutoRestoreClass(stateRef.current, classes)) return
        const bestClass = findBestRecoverableClass(classes)
        if (!bestClass || recoveryAttemptedRef.current === bestClass.classCode) return

        recoveryAttemptedRef.current = bestClass.classCode
        const bundle = await fetchRemoteClassBundle(bestClass.classCode)
        if (!cancelled) mergeClass({ ...bundle, studentSession: null })
      })
      .catch((error) => {
        if (!cancelled) setRemoteStatus({ ok: false, message: (error as Error).message })
      })

    return () => {
      cancelled = true
    }
  }, [
    mergeClass,
    setRemoteStatus,
    state.classCode,
    user?.id,
  ])

  useEffect(
    () => () => {
      if (swimTimer.current) window.clearTimeout(swimTimer.current)
    },
    [],
  )

  const openStart = () => {
    navigate('/start')
  }

  const openApiModal = () => {
    setDraftProvider(state.aiProvider)
    setDraftApiKey(state.apiKey)
    setApiSaved(false)
    setIsApiOpen(true)
  }

  const saveApiSettings = () => {
    updateAiSettings({ provider: draftProvider, apiKey: draftApiKey.trim() })
    setApiSaved(true)
    window.setTimeout(() => setApiSaved(false), 1800)
  }

  const startWalk = () => {
    if (walkPhase !== 'idle') return
    setWalkPhase('swimming')
    swimTimer.current = window.setTimeout(() => {
      const seed = Date.now() + state.chatLogs.length + state.adoptedCodes.length + Number(state.classCode || 0)
      setWalkItem(pickWalkItem(seed))
      setWalkPhase('reveal')
    }, 1700)
  }

  const closeWalk = () => {
    if (swimTimer.current) window.clearTimeout(swimTimer.current)
    setWalkPhase('idle')
    setWalkItem(null)
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
          <h1 className="font-display text-4xl text-[#EAF2F5]">아직 에아몬이 깨어나지 않았어요</h1>
          <p className="mt-3 leading-7 text-[#8AA0B0]">프로젝트를 시작하면 수업 중에 우리 반 정보를 저장합니다.</p>
          <Button className="mt-6" disabled={isLoading} onClick={openStart}>
            프로젝트 시작하기
          </Button>
        </Panel>
      </div>
    )
  }

  const lessonNo = state.currentLesson || 1
  const currentLesson = findV2Lesson(lessonNo)
  const progressPercent = Math.round((lessonNo / 7) * 100)
  const canWriteRemote = Boolean(state.classId && state.remote.ok && isRemoteReady())
  const isFreshClass =
    lessonNo <= 1 &&
    !state.aemonName &&
    state.nameCandidates.length === 0 &&
    state.wishes.length === 0 &&
    state.surveyResponses.length === 0 &&
    state.proposals.length === 0 &&
    state.adoptedCodes.length === 0 &&
    state.chatLogs.length === 0

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
    else if (lessonNo === 2) navigate('/lesson/2')
    else if (lessonNo === 3) navigate('/lesson/3')
    else if (lessonNo >= 7) navigate('/graduation')
    else navigate('/talk')
  }

  if (isFreshClass) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-10">
        <section className="border-b border-white/10 pb-6">
          <p className="font-data text-sm text-[#4FE0C0]">
            {state.className} · 학급 코드 {state.classCode}
          </p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
            <div>
              <h1 className="font-display text-5xl leading-tight text-[#EAF2F5]">학급 정보 저장 완료</h1>
              <p className="mt-3 text-lg leading-8 text-[#B7C7D2]">바로 수업을 시작하거나, 먼저 교사용 사전연수를 열 수 있습니다.</p>
            </div>
            <Button variant="secondary" onClick={() => navigate('/start')}>
              시작 화면
            </Button>
          </div>
        </section>

        <div className="mt-7 grid gap-5 md:grid-cols-2">
          <Panel className="flex min-h-72 flex-col justify-between">
            <div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFD37A]/10 text-[#FFD37A]">
                <Play size={30} />
              </div>
              <p className="font-data mt-6 text-xs text-[#FFD37A]">LESSON 1</p>
              <h2 className="font-display mt-2 text-4xl text-[#EAF2F5]">프로젝트 시작하기</h2>
              <p className="mt-4 text-lg leading-8 text-[#B7C7D2]">1차시 화면으로 들어가 에아몬을 처음 깨웁니다.</p>
            </div>
            <Button className="mt-8 w-full" onClick={() => navigate('/lesson/1')}>
              프로젝트 시작하기
              <Play size={18} />
            </Button>
          </Panel>

          <Panel className="flex min-h-72 flex-col justify-between">
            <div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#4FE0C0]/10 text-[#4FE0C0]">
                <BookOpen size={30} />
              </div>
              <p className="font-data mt-6 text-xs text-[#4FE0C0]">TEACHER</p>
              <h2 className="font-display mt-2 text-4xl text-[#EAF2F5]">사전연수</h2>
              <p className="mt-4 text-lg leading-8 text-[#B7C7D2]">수업 철학과 진행 흐름을 먼저 확인합니다.</p>
            </div>
            <Button className="mt-8 w-full" variant="secondary" onClick={() => navigate('/training')}>
              사전연수
              <BookOpen size={18} />
            </Button>
          </Panel>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <section className="border-b border-white/10 pb-6">
        <p className="font-data text-sm text-[#4FE0C0]">
          {state.className} · 학급 코드 {state.classCode}
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="font-display text-5xl text-[#EAF2F5]">학급 홈</h1>
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
                  {providerLabel[state.aiProvider]} 사용 중
                </span>
              ) : (
                <span className="rounded-full border border-[#FFD37A]/25 bg-[#FFD37A]/10 px-3 py-1 text-sm font-bold text-[#FFD37A]">
                  API 미연결
                </span>
              )}
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
                채팅하기
              </Button>
              <Button variant="secondary" disabled={walkPhase !== 'idle'} onClick={startWalk}>
                <Waves size={18} />
                데이터바다 산책
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

            <div className="mt-4 rounded-2xl border border-white/10 bg-[#07111B]/55 p-4">
              <p className="font-data text-xs text-[#8AA0B0]">현재 사용 중</p>
              <p className="mt-1 text-lg font-black text-[#EAF2F5]">
                {state.apiKey ? `${providerLabel[state.aiProvider]} · 연결됨` : 'API 미연결'}
              </p>
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

            <div className="mt-4 rounded-2xl border border-[#4FE0C0]/20 bg-[#4FE0C0]/5 p-4">
              <p className="font-data text-xs text-[#4FE0C0]">저장할 설정</p>
              <p className="mt-1 text-base font-bold text-[#EAF2F5]">
                {providerLabel[draftProvider]} · {draftApiKey.trim() ? '키 입력됨' : '키 없음'}
              </p>
            </div>

            {apiSaved ? (
              <p className="mt-4 rounded-2xl border border-[#FFD37A]/25 bg-[#FFD37A]/10 px-4 py-3 text-sm font-black text-[#FFD37A]">
                저장완료
              </p>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setIsApiOpen(false)}>
                취소
              </Button>
              <Button onClick={saveApiSettings}>
                <Save size={18} />
                {apiSaved ? '저장완료' : '저장'}
              </Button>
            </div>
          </Panel>
        </div>
      ) : null}

      {walkPhase === 'swimming' ? (
        <div className="data-sea fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#07111B]/85 px-5 backdrop-blur-sm">
          <div className="relative">
            {Array.from({ length: 7 }).map((_, index) => (
              <span
                key={index}
                className="absolute bottom-0 rounded-full bg-[#4FE0C0]/40"
                style={{
                  left: `${10 + index * 12}%`,
                  height: 8 + (index % 3) * 6,
                  width: 8 + (index % 3) * 6,
                  animation: `bubble-rise ${2.2 + (index % 4) * 0.5}s ease-in ${index * 0.25}s infinite`,
                }}
              />
            ))}
            <div style={{ animation: 'swim 2.4s ease-in-out infinite' }}>
              <AemonAvatar stage={evolutionStage} alignment="none" size={180} animated={false} />
            </div>
          </div>
          <p className="font-hand mt-8 text-3xl text-[#EAF2F5]">데이터의 바다를 헤엄치는 중…</p>
          <p className="mt-2 text-sm text-[#8AA0B0]">오늘은 뭘 주워 올까?</p>
        </div>
      ) : null}

      {walkPhase === 'reveal' && walkItem && walkMeta ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-5 backdrop-blur-sm">
          <Panel className="w-full max-w-xl text-center">
            <button className="ml-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-[#B7C7D2]" onClick={closeWalk} type="button">
              <X size={18} />
            </button>

            <span className="inline-block rounded-full px-3 py-1 font-data text-xs" style={{ background: walkMeta.soft, color: walkMeta.color }}>
              {walkItem.tag}
            </span>

            <div
              className="mx-auto mt-4 flex h-28 w-28 items-center justify-center rounded-[28px] text-6xl"
              style={{ background: walkMeta.soft, boxShadow: `0 0 38px ${walkMeta.color}33` }}
            >
              {walkItem.emoji}
            </div>

            <p className="font-hand mt-5 text-2xl" style={{ color: walkMeta.color }}>"나 오늘 바다에서 이런 거 봤어!"</p>
            <h2 className="font-display mt-3 text-3xl text-[#EAF2F5]">{walkItem.title}</h2>
            <p className="mt-4 text-lg leading-8 text-[#B7C7D2]">{walkItem.contentText}</p>
            <p className="font-hand mt-5 text-2xl text-[#EAF2F5]">"{walkItem.aemonLine}"</p>

            {walkItem.linkedEpisodeCode ? (
              <p className="mt-4 inline-block rounded-full bg-[#FFD37A]/10 px-4 py-1.5 text-sm text-[#FFD37A]">
                이 주제는 다음 대화에서 함께 생각해볼 수 있어요.
              </p>
            ) : null}

            <Button className="mt-6" onClick={closeWalk}>
              잘 다녀왔어!
            </Button>
          </Panel>
        </div>
      ) : null}
    </div>
  )
}
