import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, BookOpen, KeyRound, Play, RefreshCw, RotateCcw, Send, MessageSquare, MonitorPlay, Waves, X } from 'lucide-react'
import { AemonAvatar } from '../components/AemonAvatar'
import { ApiConnectionModal } from '../components/ApiConnectionModal'
import { TypingIndicator } from '../components/TypingIndicator'
import { Button, Panel } from '../components/ui'
import { buildDashboardResponseRequest, getDashboardQuestions, getDashboardStatusLines } from '../data/dashboardDialogue'
import { pickWalkItem } from '../data/walkItems'
import { findV2Lesson, TOTAL_V2_LESSONS, v2Lessons } from '../data/v2Lessons'
import type { WalkItem, WalkItemType } from '../domain/types'
import { markDashboardPrompt } from '../lib/chatLogFilters'
import { findBestRecoverableClass, shouldAutoRestoreClass } from '../lib/classRecovery'
import { providerLabel, runV2Chat } from '../lib/v2Chat'
import { addRemoteChatLog, fetchRemoteClassBundle, fetchRemoteTeacherClasses, isRemoteReady, updateRemoteLesson } from '../lib/v2Remote'
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
  const { state, evolutionStage, adoptedCodeCount, addChatLog, mergeClass, setLesson, setRemoteStatus, updateAiSettings, resetDemo } = useV2()
  const [isApiOpen, setIsApiOpen] = useState(false)
  const [walkPhase, setWalkPhase] = useState<WalkPhase>('idle')
  const [walkItem, setWalkItem] = useState<WalkItem | null>(null)
  const [statusLineIndex, setStatusLineIndex] = useState(0)
  const [isDashboardAnswerOpen, setIsDashboardAnswerOpen] = useState(false)
  const [classAnswer, setClassAnswer] = useState('')
  const [submittedClassAnswer, setSubmittedClassAnswer] = useState('')
  const [dashboardResponse, setDashboardResponse] = useState('')
  const [dashboardError, setDashboardError] = useState('')
  const [isDashboardReplying, setIsDashboardReplying] = useState(false)
  const swimTimer = useRef<number | null>(null)
  const recoveryAttemptedRef = useRef('')
  const stateRef = useRef(state)
  const walkMeta = walkItem ? typeMeta[walkItem.type] : null
  const lessonNo = Math.min(TOTAL_V2_LESSONS, Math.max(1, state.currentLesson || 1))
  const currentLesson = findV2Lesson(lessonNo)
  const progressPercent = Math.round((lessonNo / TOTAL_V2_LESSONS) * 100)
  const statusLines = getDashboardStatusLines(lessonNo)
  const dashboardQuestions = getDashboardQuestions(lessonNo)
  const dashboardLines = statusLines.flatMap((line, index) => [line, dashboardQuestions[index % dashboardQuestions.length]])
  const statusLine = dashboardLines[(lessonNo + adoptedCodeCount + statusLineIndex) % dashboardLines.length]
  const isDashboardQuestion = /[?？]\s*$/.test(statusLine.trim())
  const dashboardQuestion = isDashboardQuestion ? statusLine : ''
  const aemonName = state.aemonName.trim() || '에아몬'

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
    setIsApiOpen(true)
  }

  const saveApiSettings = (provider: typeof state.aiProvider, apiKey: string) => {
    updateAiSettings({ provider, apiKey })
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

  const nextStatusLine = () => {
    setStatusLineIndex((current) => (current + 1) % dashboardLines.length)
    setIsDashboardAnswerOpen(false)
    setClassAnswer('')
    setSubmittedClassAnswer('')
    setDashboardResponse('')
    setDashboardError('')
  }

  const submitDashboardAnswer = async () => {
    const answer = classAnswer.trim()
    if (!answer || isDashboardReplying) return
    if (!state.apiKey.trim()) {
      setDashboardError('우리 반 대답에 맞춘 AI 반응을 만들려면 API를 먼저 연결해 주세요.')
      openApiModal()
      return
    }

    setDashboardError('')
    setDashboardResponse('')
    setSubmittedClassAnswer(answer)
    setIsDashboardReplying(true)
    try {
      const request = buildDashboardResponseRequest({
        aemonQuestion: dashboardQuestion,
        classAnswer: answer,
        lessonNo,
        lessonTitle: currentLesson.title,
      })
      const result = await runV2Chat({
        provider: state.aiProvider,
        apiKey: state.apiKey,
        aemonName,
        className: state.className,
        adoptedCodes: state.adoptedCodes,
        chatHistory: state.chatLogs,
        question: request,
      })
      const promptSnapshot = markDashboardPrompt(result.promptSnapshot, { lessonNo, aemonQuestion: dashboardQuestion })
      addChatLog({ question: answer, answer: result.answer, mode: result.mode, promptSnapshot })
      setDashboardResponse(result.answer)

      if (canWriteRemote) {
        try {
          await addRemoteChatLog({
            classId: state.classId,
            question: answer,
            answer: result.answer,
            mode: result.mode,
            promptSnapshot,
          })
        } catch (error) {
          setRemoteStatus({ ok: false, message: (error as Error).message })
        }
      }
    } catch (error) {
      setDashboardError((error as Error).message)
      setSubmittedClassAnswer('')
    } finally {
      setIsDashboardReplying(false)
    }
  }

  const saveLesson = async (nextLesson: number) => {
    const clamped = Math.min(TOTAL_V2_LESSONS, Math.max(1, nextLesson))
    if (clamped !== lessonNo) {
      setStatusLineIndex(0)
      setIsDashboardAnswerOpen(false)
      setClassAnswer('')
      setSubmittedClassAnswer('')
      setDashboardResponse('')
      setDashboardError('')
    }
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
    else if (lessonNo === 4) navigate('/lesson/4')
    else if (lessonNo === 5) navigate('/lesson/5')
    else if (lessonNo >= TOTAL_V2_LESSONS) navigate('/graduation')
    else navigate('/talk')
  }

  if (isFreshClass) {
    return (
      <>
      <div className="mx-auto max-w-6xl px-5 py-10">
        <section className="border-b border-white/10 pb-6">
          <p className="font-data text-sm text-[#4FE0C0]">
            {state.className} · 학급 코드 {state.classCode}
          </p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
            <div>
              <h1 className="font-display text-5xl leading-tight text-[#EAF2F5]">학급 정보 저장 완료</h1>
              <p className="mt-3 text-lg leading-8 text-[#B7C7D2]">실제 수업을 시작하거나, 학생 데이터 없이 교사 리허설로 흐름을 먼저 연습할 수 있습니다.</p>
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

          <Panel className="flex min-h-72 flex-col justify-between border-[#4FE0C0]/35">
            <div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#4FE0C0]/10 text-[#4FE0C0]">
                <MonitorPlay size={30} />
              </div>
              <p className="font-data mt-6 text-xs text-[#4FE0C0]">PRACTICE</p>
              <h2 className="font-display mt-2 text-4xl text-[#EAF2F5]">교사 리허설</h2>
              <p className="mt-4 text-lg leading-8 text-[#B7C7D2]">실제 학급 기록을 바꾸지 않고 1~5차시 발문과 화면 전환을 연습합니다.</p>
            </div>
            <Button className="mt-8 w-full" variant="secondary" onClick={() => navigate('/rehearsal?lesson=1')}>
              리허설 시작
              <MonitorPlay size={18} />
            </Button>
          </Panel>

          <Panel className="flex min-h-72 flex-col justify-between">
            <div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#4FE0C0]/10 text-[#4FE0C0]">
                <BookOpen size={30} />
              </div>
              <p className="font-data mt-6 text-xs text-[#4FE0C0]">TEACHER</p>
              <h2 className="font-display mt-2 text-4xl text-[#EAF2F5]">사전연수</h2>
              <p className="mt-4 text-lg leading-8 text-[#B7C7D2]">프로젝트 철학, 차시별 40분 과정안, 운영 준비를 확인합니다.</p>
            </div>
            <Button className="mt-8 w-full" variant="secondary" onClick={() => navigate('/training')}>
              사전연수
              <BookOpen size={18} />
            </Button>
          </Panel>

          <Panel className="flex min-h-72 flex-col justify-between border-[#FFD37A]/30">
            <div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFD37A]/10 text-[#FFD37A]">
                <KeyRound size={30} />
              </div>
              <p className="font-data mt-6 text-xs text-[#FFD37A]">OPTIONAL · FREE START</p>
              <h2 className="font-display mt-2 text-4xl text-[#EAF2F5]">API 연결</h2>
              <p className="mt-4 text-lg leading-8 text-[#B7C7D2]">API를 연결하면 에아몬이 우리 반 말에 맞춰 즉석으로 반응합니다. Google 계정이 있으면 Gemini 무료 등급으로 시작할 수 있습니다.</p>
            </div>
            <Button className="mt-8 w-full" variant="secondary" onClick={openApiModal}>
              API 연결 안내
              <KeyRound size={18} />
            </Button>
          </Panel>
        </div>
      </div>
      {isApiOpen ? (
        <ApiConnectionModal
          apiKey={state.apiKey}
          provider={state.aiProvider}
          onClose={() => setIsApiOpen(false)}
          onSave={saveApiSettings}
        />
      ) : null}
      </>
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
            <p className="font-display mt-1 text-4xl text-[#FFD37A]">{lessonNo}/{TOTAL_V2_LESSONS}차시</p>
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
            <div className="mt-4 rounded-[18px] border border-[#4FE0C0]/20 bg-[#07111B]/50 p-5" aria-label={`${aemonName} 대화`}>
              <div className="flex items-start gap-3">
                <p className="font-display min-w-0 flex-1 text-3xl leading-tight text-[#FFD37A]">"{statusLine}"</p>
                <button
                  aria-label="에아몬의 다른 대사 보기"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 text-[#B7C7D2] transition hover:border-[#4FE0C0]/45 hover:text-[#4FE0C0]"
                  disabled={isDashboardReplying}
                  onClick={nextStatusLine}
                  title="다른 대사"
                  type="button"
                >
                  <RefreshCw size={18} />
                </button>
              </div>

              {isDashboardQuestion ? (
                <div className="mt-5 border-t border-white/10 pt-5">
                  {!isDashboardAnswerOpen && !dashboardResponse ? (
                    <Button className="min-h-10 px-4" onClick={() => setIsDashboardAnswerOpen(true)}>
                      <MessageSquare size={18} />
                      대답하기
                    </Button>
                  ) : null}

                  {isDashboardAnswerOpen && !submittedClassAnswer ? (
                    <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-stretch">
                      <textarea
                        id="dashboard-class-answer"
                        className="min-h-24 resize-y rounded-2xl border border-white/10 bg-[#07111B]/70 px-5 py-4 text-lg leading-8 text-[#EAF2F5] outline-none transition placeholder:text-[#647989] focus:border-[#4FE0C0]/60"
                        disabled={isDashboardReplying}
                        maxLength={500}
                        onChange={(event) => setClassAnswer(event.target.value)}
                        placeholder="친구들과 이야기한 뒤 우리 반의 대답을 적어 주세요."
                        value={classAnswer}
                      />
                      <Button className="min-w-32" disabled={!classAnswer.trim() || isDashboardReplying} onClick={() => void submitDashboardAnswer()}>
                        <Send size={18} />
                        대답 보내기
                      </Button>
                    </div>
                  ) : null}

                  {submittedClassAnswer ? (
                    <div className="ml-auto max-w-[90%] rounded-2xl rounded-tr-md bg-[#1E3A54] px-4 py-3 text-lg leading-7 text-[#EAF2F5]">
                      <p className="mb-1 text-xs font-black text-[#8AA0B0]">우리 반</p>
                      <p className="whitespace-pre-wrap">{submittedClassAnswer}</p>
                    </div>
                  ) : null}

                  {dashboardError ? (
                    <p className="mt-4 flex items-start gap-2 rounded-2xl border border-[#E0476B]/30 bg-[#E0476B]/10 px-4 py-3 text-sm leading-6 text-[#FFD7DE]">
                      <AlertTriangle className="mt-0.5 shrink-0" size={17} />
                      {dashboardError}
                    </p>
                  ) : null}

                  {dashboardResponse || isDashboardReplying ? (
                    <div className="mt-4 max-w-[95%] rounded-2xl rounded-tl-md border border-[#4FE0C0]/20 bg-[#4FE0C0]/10 px-4 py-3 text-lg font-bold leading-8 text-[#D9FFF6]">
                      <p className="mb-1 text-xs font-black text-[#4FE0C0]">{aemonName}</p>
                      <p className="whitespace-pre-wrap">
                        {isDashboardReplying ? <TypingIndicator label={`${aemonName}이 답장을 입력하고 있습니다`} /> : dashboardResponse}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}
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

      <div className="mt-4 flex justify-end">
        <Button variant="ghost" onClick={() => navigate(`/rehearsal?lesson=${lessonNo}`)}>
          <MonitorPlay size={18} />
          {lessonNo}차시 교사 리허설
        </Button>
      </div>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-data text-sm text-[#4FE0C0]">차시 이동</p>
            <p className="mt-2 text-lg font-black text-[#EAF2F5]">{currentLesson.no}차시 · {currentLesson.title}</p>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-[#8AA0B0]">{currentLesson.dashboardSummary}</p>
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
          <Button className="min-h-10 px-4" disabled={lessonNo >= TOTAL_V2_LESSONS} onClick={() => void saveLesson(lessonNo + 1)}>
            다음
          </Button>
        </div>
      </section>

      {isApiOpen ? (
        <ApiConnectionModal
          apiKey={state.apiKey}
          provider={state.aiProvider}
          onClose={() => setIsApiOpen(false)}
          onSave={saveApiSettings}
        />
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
