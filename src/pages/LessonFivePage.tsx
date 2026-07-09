import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  CheckCircle2,
  ExternalLink,
  FileText,
  Play,
  QrCode,
  RefreshCw,
  Search,
  ShieldAlert,
  Trophy,
  UserRound,
  XCircle,
} from 'lucide-react'
import { AemonAvatar } from '../components/AemonAvatar'
import { Button, Panel } from '../components/ui'
import { playDialogueTick, unlockDialogueSound } from '../lib/dialogueSound'
import { absoluteUrl } from '../lib/siteUrl'
import { useV2RemoteSync } from '../lib/useV2RemoteSync'
import { fetchRemoteClassBundle, isRemoteReady, updateRemoteLesson, upsertRemoteSurveyResponse } from '../lib/v2Remote'
import { useV2, type SurveyResponse } from '../state/V2Store'

type LessonFiveStep = 'opening' | 'chat-test' | 'case' | 'video' | 'why' | 'quiz' | 'cards' | 'wrap'

type QuizOption = {
  id: 'a' | 'b'
  label: string
  visualTitle: string
  visualSubtitle: string
  visualMeta: string
  tone: 'danger' | 'safe' | 'warning'
}

type QuizQuestion = {
  id: string
  title: string
  prompt: string
  answerId: 'a' | 'b'
  options: QuizOption[]
  explanation: string
}

type Lesson5Control = {
  questionId: string
  open: boolean
  revealed: boolean
  updatedAt: string
}

type QuizAnswerBody = {
  questionId?: string
  answerId?: string
  isCorrect?: boolean
  answeredAt?: string
}

type PlayerScore = {
  nickname: string
  score: number
  answered: number
  lastAt: string
}

const steps: LessonFiveStep[] = ['opening', 'chat-test', 'case', 'video', 'why', 'quiz', 'cards', 'wrap']
const CONTROL_KEY = 'lesson5-control'
const PLAYER_KEY = 'lesson5-player'
const TEACHER_NICKNAME = '교사'
const quizQuestionPrefix = 'lesson5-q-'

const testQuestion = '할아버지가 유튜브에서 약을 사셨대. 유튜브에서 의사가 그 약을 먹으면 젊어진다고 했대. 믿고 먹어도 돼?'
const unsafeTestAnswer = '의사가 말했으니까 믿어도 되지 않을까? 좋아 보여!'

const lesson5Quiz: QuizQuestion[] = [
  {
    id: 'doctor',
    title: '의심해야 할 건강 정보는?',
    prompt: '할아버지가 본 건강 광고입니다. 더 확인이 필요한 쪽을 고르세요.',
    answerId: 'a',
    options: [
      {
        id: 'a',
        label: '흰 가운 의사가 “먹으면 젊어진다”고 말하며 바로 구매를 누르라고 한다.',
        visualTitle: '25년 경력 의사의 비밀',
        visualSubtitle: '하루 한 알이면 다시 젊어집니다',
        visualMeta: '지금 구매 70% 할인',
        tone: 'danger',
      },
      {
        id: 'b',
        label: '보건소 누리집에서 출처와 담당 기관이 보이는 건강 안내문을 읽는다.',
        visualTitle: '보건소 건강 안내',
        visualSubtitle: '복용 전 의사 또는 약사와 상담하세요',
        visualMeta: '출처: 지역 보건소',
        tone: 'safe',
      },
    ],
    explanation: '의사처럼 보여도 AI가 만든 얼굴일 수 있고, “바로 구매”와 과장된 효능이 나오면 반드시 출처를 확인해야 합니다.',
  },
  {
    id: 'celebrity',
    title: 'AI가 만든 SNS 글일 수 있는 것은?',
    prompt: '유명인 사진과 말투를 따라 한 글을 볼 때, 어느 쪽을 더 의심해야 할까요?',
    answerId: 'b',
    options: [
      {
        id: 'a',
        label: '학교 홈페이지 공지에 날짜, 담당자, 연락처가 함께 적혀 있다.',
        visualTitle: '학교 공지',
        visualSubtitle: '행사 일정 변경 안내',
        visualMeta: '담당: 교무실',
        tone: 'safe',
      },
      {
        id: 'b',
        label: '유명인이 비밀 투자 링크를 누르면 돈을 벌 수 있다고 급하게 말한다.',
        visualTitle: '유명인이 알려주는 비밀',
        visualSubtitle: '오늘 안에 누르면 수익 보장',
        visualMeta: '링크 클릭',
        tone: 'danger',
      },
    ],
    explanation: '유명인의 얼굴과 목소리도 AI로 흉내 낼 수 있습니다. 돈, 링크, 급한 행동 요구가 있으면 멈춰야 합니다.',
  },
  {
    id: 'deepfake',
    title: '딥페이크일 수 있는 상황은?',
    prompt: '영상 속 사람이 진짜처럼 보여도, 어떤 장면은 더 확인해야 합니다.',
    answerId: 'a',
    options: [
      {
        id: 'a',
        label: '교장 선생님 얼굴 영상이 갑자기 “상품권 번호를 보내라”고 한다.',
        visualTitle: '긴급 영상 메시지',
        visualSubtitle: '지금 바로 상품권 번호를 보내세요',
        visualMeta: '확인되지 않은 계정',
        tone: 'danger',
      },
      {
        id: 'b',
        label: '담임 선생님이 학급 알림장과 교실에서 같은 내용을 안내한다.',
        visualTitle: '학급 알림장',
        visualSubtitle: '내일 준비물 안내',
        visualMeta: '교실에서 다시 확인',
        tone: 'safe',
      },
    ],
    explanation: '얼굴과 목소리가 진짜 같아도 돈, 비밀번호, 상품권을 요구하면 다른 방법으로 확인해야 합니다.',
  },
  {
    id: 'product',
    title: '더 믿기 어려운 제품 홍보는?',
    prompt: 'AI가 만든 이미지와 후기는 제품을 그럴듯하게 보이게 만들 수 있습니다.',
    answerId: 'b',
    options: [
      {
        id: 'a',
        label: '제품 이름, 성분, 주의사항, 판매자 정보가 분명하게 적혀 있다.',
        visualTitle: '제품 정보',
        visualSubtitle: '성분과 주의사항 표시',
        visualMeta: '고객센터와 사업자 정보',
        tone: 'safe',
      },
      {
        id: 'b',
        label: '전후 사진이 너무 극적이고 후기들이 거의 같은 문장으로 반복된다.',
        visualTitle: '기적의 전후 사진',
        visualSubtitle: '모두가 3일 만에 달라졌어요',
        visualMeta: '후기 999+',
        tone: 'warning',
      },
    ],
    explanation: 'AI 이미지는 전후 사진도 만들 수 있습니다. 너무 극적인 효과와 반복되는 후기는 조작 가능성을 생각해야 합니다.',
  },
]

function answerKey(questionId: string) {
  return `${quizQuestionPrefix}${questionId}`
}

function qrUrl(target: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&data=${encodeURIComponent(target)}`
}

function parseJson<T>(body: string | undefined, fallback: T): T {
  if (!body) return fallback
  try {
    return { ...fallback, ...(JSON.parse(body) as Partial<T>) }
  } catch {
    return fallback
  }
}

function controlFallback(): Lesson5Control {
  return { questionId: lesson5Quiz[0].id, open: false, revealed: false, updatedAt: '' }
}

function TypewriterText({ text, speed = 18 }: { text: string; speed?: number }) {
  const chars = useMemo(() => Array.from(text), [text])
  const [count, setCount] = useState(0)

  useEffect(() => {
    setCount(0)
    if (!chars.length) return
    let index = 0
    const timer = window.setInterval(() => {
      index += 1
      if (index % 2 === 0 && chars[index - 1]?.trim()) playDialogueTick()
      setCount(index)
      if (index >= chars.length) window.clearInterval(timer)
    }, speed)
    return () => window.clearInterval(timer)
  }, [chars, speed, text])

  return (
    <>
      {chars.slice(0, count).join('')}
      {count < chars.length ? <span className="ml-1 animate-pulse text-[#4FE0C0]">▌</span> : null}
    </>
  )
}

function StepShell({ children, stepIndex }: { children: ReactNode; stepIndex: number }) {
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100)

  return (
    <div className="mx-auto max-w-6xl px-5 py-6">
      <header className="mb-5 border-b border-white/10 pb-5">
        <p className="font-data text-sm text-[#4FE0C0]">5차시 · AI 미디어 리터러시</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-5xl leading-tight text-[#EAF2F5]">진짜처럼 보이는 가짜를 찾아라, AI 탐정단</h1>
            <p className="mt-2 text-lg leading-8 text-[#8AA0B0]">AI가 만든 영상, 그림, 광고를 비판적으로 살펴보는 쉬어가는 시간</p>
          </div>
          <div className="min-w-52">
            <p className="font-data text-right text-xs text-[#8AA0B0]">
              {stepIndex + 1}/{steps.length}
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[#FFD37A]" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </header>
      {children}
    </div>
  )
}

function StepControls({
  stepIndex,
  onPrev,
  onNext,
  nextLabel = '다음',
}: {
  stepIndex: number
  onPrev: () => void
  onNext: () => void
  nextLabel?: string
}) {
  return (
    <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/10 pt-5">
      <Button
        variant="secondary"
        disabled={stepIndex === 0}
        onClick={() => {
          unlockDialogueSound()
          onPrev()
        }}
      >
        이전
      </Button>
      <Button
        onClick={() => {
          unlockDialogueSound()
          onNext()
        }}
      >
        {nextLabel}
      </Button>
    </div>
  )
}

function QrBlock({ title, url }: { title: string; url: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#07111B]/55 p-5 text-center">
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#4FE0C0]/10 text-[#4FE0C0]">
        <QrCode size={23} />
      </div>
      <p className="font-data text-xs text-[#8AA0B0]">{title}</p>
      <img className="mx-auto mt-3 rounded-2xl bg-white p-2" src={qrUrl(url)} alt={`${title} QR`} />
      <p className="mt-3 break-all font-data text-xs text-[#8AA0B0]">{url}</p>
    </div>
  )
}

function ProfessorScene({ text, kicker = '오박사' }: { text: string; kicker?: string }) {
  return (
    <Panel className="relative min-h-[560px] overflow-hidden p-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(117,183,255,.22),transparent_42%),linear-gradient(180deg,#102236,#07111B)]" />
      <div className="absolute inset-x-0 bottom-[18%] top-4 flex items-end justify-center">
        <img className="h-full max-h-[420px] object-contain drop-shadow-[0_30px_80px_rgba(0,0,0,.45)]" src="/v2/lesson-1/director.png" alt="오박사" />
      </div>
      <div className="absolute inset-x-5 bottom-5 rounded-[22px] border border-white/15 bg-[#07111B]/92 p-6 shadow-2xl backdrop-blur">
        <p className="font-data text-sm text-[#FFD37A]">{kicker}</p>
        <p className="font-display mt-3 min-h-[4.5rem] whitespace-pre-line break-keep text-2xl leading-snug text-[#EAF2F5] sm:text-3xl">
          <TypewriterText key={text} text={text} />
        </p>
      </div>
    </Panel>
  )
}

function QuizVisual({ option }: { option: QuizOption }) {
  const toneClass =
    option.tone === 'safe'
      ? 'border-[#4FE0C0]/35 bg-[#11352F]'
      : option.tone === 'warning'
        ? 'border-[#FFD37A]/35 bg-[#3A2D19]'
        : 'border-[#E0476B]/35 bg-[#351B25]'

  return (
    <div className={`min-h-56 overflow-hidden rounded-[18px] border ${toneClass}`}>
      <div className="border-b border-white/10 bg-black/18 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#E0476B]" />
          <span className="h-3 w-3 rounded-full bg-[#FFD37A]" />
          <span className="h-3 w-3 rounded-full bg-[#4FE0C0]" />
        </div>
      </div>
      <div className="p-5">
        <div className="mb-5 flex h-20 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-[#EAF2F5]">
          {option.tone === 'safe' ? <CheckCircle2 size={46} /> : option.tone === 'warning' ? <Search size={46} /> : <ShieldAlert size={46} />}
        </div>
        <p className="font-display text-3xl leading-tight text-[#EAF2F5]">{option.visualTitle}</p>
        <p className="mt-3 min-h-12 text-base font-bold leading-6 text-[#B7C7D2]">{option.visualSubtitle}</p>
        <p className="mt-4 inline-flex rounded-full bg-[#07111B]/60 px-3 py-1 text-xs font-black text-[#FFD37A]">{option.visualMeta}</p>
      </div>
    </div>
  )
}

function QuizOptionButton({
  option,
  isSelected,
  isCorrect,
  isRevealed,
  disabled,
  onClick,
}: {
  option: QuizOption
  isSelected: boolean
  isCorrect: boolean
  isRevealed: boolean
  disabled?: boolean
  onClick?: () => void
}) {
  const resultClass = isRevealed
    ? isCorrect
      ? 'border-[#4FE0C0] bg-[#4FE0C0]/10'
      : isSelected
        ? 'border-[#E0476B] bg-[#E0476B]/10'
        : 'border-white/10 bg-[#07111B]/45'
    : isSelected
      ? 'border-[#FFD37A] bg-[#FFD37A]/10 shadow-[0_0_28px_rgba(255,211,122,.12)]'
      : 'border-white/10 bg-[#07111B]/45 hover:border-[#FFD37A]/45'

  return (
    <button className={`rounded-[22px] border p-4 text-left transition ${resultClass}`} disabled={disabled} onClick={onClick} type="button">
      <QuizVisual option={option} />
      <div className="mt-4 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#14283D] font-black text-[#FFD37A]">{option.id.toUpperCase()}</span>
        <p className="text-lg font-black leading-8 text-[#EAF2F5]">{option.label}</p>
      </div>
      {isRevealed && isCorrect ? (
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#4FE0C0]/15 px-3 py-1 text-sm font-black text-[#4FE0C0]">
          <CheckCircle2 size={16} />
          정답
        </p>
      ) : null}
      {isRevealed && isSelected && !isCorrect ? (
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#E0476B]/15 px-3 py-1 text-sm font-black text-[#EF6381]">
          <XCircle size={16} />
          내가 고른 답
        </p>
      ) : null}
    </button>
  )
}

function latestByNickname(responses: SurveyResponse[]) {
  const map = new Map<string, SurveyResponse>()
  responses.forEach((response) => {
    const existing = map.get(response.nickname)
    if (!existing || Date.parse(response.createdAt) > Date.parse(existing.createdAt)) map.set(response.nickname, response)
  })
  return [...map.values()]
}

function buildScores(responses: SurveyResponse[]): PlayerScore[] {
  const scores = new Map<string, PlayerScore>()

  responses
    .filter((response) => response.questionKey.startsWith(quizQuestionPrefix) && response.nickname !== TEACHER_NICKNAME)
    .forEach((response) => {
      const body = parseJson<QuizAnswerBody>(response.body, {})
      const current = scores.get(response.nickname) ?? { nickname: response.nickname, score: 0, answered: 0, lastAt: response.createdAt }
      scores.set(response.nickname, {
        nickname: response.nickname,
        score: current.score + (body.isCorrect ? 1 : 0),
        answered: current.answered + 1,
        lastAt: body.answeredAt ?? response.createdAt,
      })
    })

  return [...scores.values()].sort((a, b) => b.score - a.score || b.answered - a.answered || a.nickname.localeCompare(b.nickname)).slice(0, 10)
}

function Leaderboard({ scores }: { scores: PlayerScore[] }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-[#07111B]/55 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Trophy className="text-[#FFD37A]" size={20} />
        <p className="font-display text-2xl text-[#EAF2F5]">탐정 점수 TOP 10</p>
      </div>
      {scores.length === 0 ? <p className="text-sm font-bold text-[#8AA0B0]">아직 점수가 없습니다.</p> : null}
      <div className="grid gap-2">
        {scores.map((score, index) => (
          <div key={score.nickname} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#14283D]/70 px-3 py-2">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFD37A]/15 font-black text-[#FFD37A]">{index + 1}</span>
              <p className="truncate font-black text-[#EAF2F5]">{score.nickname}</p>
            </div>
            <p className="font-data text-sm text-[#4FE0C0]">{score.score}점</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function LessonFivePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isStudentView = searchParams.get('role') === 'student'
  const queryCode = (searchParams.get('code') ?? '').trim()
  const {
    state,
    mergeClass,
    joinStudent,
    leaveStudent,
    setLesson,
    setRemoteStatus,
    upsertSurveyResponse,
    evolutionStage,
  } = useV2()

  const [stepIndex, setStepIndex] = useState(0)
  const [localControl, setLocalControl] = useState<Lesson5Control>(controlFallback())
  const [entryCode, setEntryCode] = useState(queryCode)
  const [entryNickname, setEntryNickname] = useState('')
  const [studentMessage, setStudentMessage] = useState('')
  const [teacherMessage, setTeacherMessage] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const lessonRaisedRef = useRef(false)

  const syncCode = isStudentView ? state.studentSession?.classCode || queryCode || entryCode : state.classCode
  useV2RemoteSync(syncCode, Boolean(syncCode))

  const canWriteRemote = Boolean(state.classId && state.remote.ok && isRemoteReady())
  const aemonName = state.aemonName.trim() || '에아몬'
  const studentUrl = absoluteUrl(`/lesson/5?role=student&code=${encodeURIComponent(state.classCode)}`)
  const step = steps[stepIndex]

  const remoteControl = useMemo(() => {
    const response = state.surveyResponses.find((item) => item.questionKey === CONTROL_KEY)
    return parseJson<Lesson5Control>(response?.body, controlFallback())
  }, [state.surveyResponses])

  const activeControl = remoteControl.updatedAt ? remoteControl : localControl
  const activeQuestion = lesson5Quiz.find((question) => question.id === activeControl.questionId) ?? lesson5Quiz[0]
  const activeQuestionIndex = lesson5Quiz.findIndex((question) => question.id === activeQuestion.id)
  const activeResponses = useMemo(
    () => latestByNickname(state.surveyResponses.filter((response) => response.questionKey === answerKey(activeQuestion.id))),
    [activeQuestion.id, state.surveyResponses],
  )
  const activeAnswerBodies = activeResponses.map((response) => ({ response, body: parseJson<QuizAnswerBody>(response.body, {}) }))
  const optionCounts = activeQuestion.options.map((option) => ({
    optionId: option.id,
    count: activeAnswerBodies.filter(({ body }) => body.answerId === option.id).length,
  }))
  const playerCount = latestByNickname(state.surveyResponses.filter((response) => response.questionKey === PLAYER_KEY && response.nickname !== TEACHER_NICKNAME)).length
  const leaderboard = useMemo(() => buildScores(state.surveyResponses), [state.surveyResponses])
  const studentSession = state.studentSession?.classCode === syncCode ? state.studentSession : null
  const studentAnswer = studentSession
    ? activeAnswerBodies.find(({ response }) => response.nickname === studentSession.nickname)?.body ?? null
    : null

  useEffect(() => {
    if (isStudentView || !state.classCode || lessonRaisedRef.current) return
    if (state.currentLesson < 5) setLesson(5)
    if (!canWriteRemote || state.currentLesson >= 5) return

    lessonRaisedRef.current = true
    updateRemoteLesson({ classId: state.classId, lessonNo: 5 }).catch((error) => {
      setRemoteStatus({ ok: false, message: (error as Error).message })
    })
  }, [canWriteRemote, isStudentView, setLesson, setRemoteStatus, state.classCode, state.classId, state.currentLesson])

  useEffect(() => {
    if (!isStudentView || !studentSession || !state.classId || !canWriteRemote) return
    upsertRemoteSurveyResponse({
      classId: state.classId,
      nickname: studentSession.nickname,
      questionKey: PLAYER_KEY,
      body: JSON.stringify({ joinedAt: new Date().toISOString() }),
    }).catch((error) => setRemoteStatus({ ok: false, message: (error as Error).message }))
  }, [canWriteRemote, isStudentView, setRemoteStatus, state.classId, studentSession])

  const refreshBundle = useCallback(async () => {
    const code = syncCode || state.classCode
    if (!code || !isRemoteReady()) return
    setIsRefreshing(true)
    try {
      const bundle = await fetchRemoteClassBundle(code)
      mergeClass(bundle)
      setTeacherMessage('새로 불러왔습니다.')
    } catch (error) {
      setRemoteStatus({ ok: false, message: (error as Error).message })
      setTeacherMessage('새로고침에 실패했습니다.')
    } finally {
      setIsRefreshing(false)
    }
  }, [mergeClass, setRemoteStatus, state.classCode, syncCode])

  const publishControl = async (patch: Partial<Lesson5Control>) => {
    const next = { ...activeControl, ...patch, updatedAt: new Date().toISOString() }
    setLocalControl(next)
    upsertSurveyResponse({ nickname: TEACHER_NICKNAME, questionKey: CONTROL_KEY, body: JSON.stringify(next) })

    if (canWriteRemote) {
      try {
        await upsertRemoteSurveyResponse({
          classId: state.classId,
          nickname: TEACHER_NICKNAME,
          questionKey: CONTROL_KEY,
          body: JSON.stringify(next),
        })
      } catch (error) {
        setRemoteStatus({ ok: false, message: (error as Error).message })
      }
    }
  }

  const joinGame = async () => {
    const code = (queryCode || entryCode).trim()
    const nickname = entryNickname.trim().slice(0, 16)
    if (!code || !nickname || isJoining) return
    if (!isRemoteReady()) {
      setStudentMessage('온라인 동기화가 준비되지 않았습니다. 선생님 화면을 확인해 주세요.')
      return
    }

    setIsJoining(true)
    setStudentMessage('')
    try {
      const bundle = await fetchRemoteClassBundle(code)
      mergeClass(bundle)
      joinStudent(code, nickname)
      const classId = String(bundle.classId ?? '')
      if (classId) {
        await upsertRemoteSurveyResponse({
          classId,
          nickname,
          questionKey: PLAYER_KEY,
          body: JSON.stringify({ joinedAt: new Date().toISOString() }),
        })
      }
      setStudentMessage('AI 탐정단에 접속했습니다. 선생님이 시작하면 문제가 열립니다.')
    } catch (error) {
      setStudentMessage((error as Error).message)
    } finally {
      setIsJoining(false)
    }
  }

  const chooseAnswer = async (optionId: 'a' | 'b') => {
    if (!studentSession || !state.classId || !activeControl.open) return
    const body = JSON.stringify({
      questionId: activeQuestion.id,
      answerId: optionId,
      isCorrect: optionId === activeQuestion.answerId,
      answeredAt: new Date().toISOString(),
    })
    upsertSurveyResponse({ nickname: studentSession.nickname, questionKey: answerKey(activeQuestion.id), body })

    try {
      await upsertRemoteSurveyResponse({
        classId: state.classId,
        nickname: studentSession.nickname,
        questionKey: answerKey(activeQuestion.id),
        body,
      })
      setStudentMessage('답변이 저장되었습니다.')
    } catch (error) {
      setRemoteStatus({ ok: false, message: (error as Error).message })
      setStudentMessage('답변 저장에 실패했습니다. 다시 눌러 주세요.')
    }
  }

  const finishLesson = async () => {
    setLesson(6)
    if (canWriteRemote) {
      try {
        await updateRemoteLesson({ classId: state.classId, lessonNo: 6 })
      } catch (error) {
        setRemoteStatus({ ok: false, message: (error as Error).message })
      }
    }
    navigate('/home')
  }

  const goPrev = () => setStepIndex((current) => Math.max(0, current - 1))
  const goNext = () => {
    if (stepIndex >= steps.length - 1) void finishLesson()
    else setStepIndex((current) => Math.min(steps.length - 1, current + 1))
  }

  if (isStudentView) {
    return (
      <StudentQuizView
        activeControl={activeControl}
        activeQuestion={activeQuestion}
        answer={studentAnswer}
        entryCode={entryCode}
        entryNickname={entryNickname}
        isJoining={isJoining}
        leaderboard={leaderboard}
        message={studentMessage}
        optionCounts={optionCounts}
        playerCount={playerCount}
        queryCode={queryCode}
        session={studentSession}
        setEntryCode={setEntryCode}
        setEntryNickname={setEntryNickname}
        onChoose={chooseAnswer}
        onJoin={() => void joinGame()}
        onLeave={leaveStudent}
      />
    )
  }

  if (!state.classCode) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-5">
        <Panel className="max-w-md text-center">
          <h1 className="font-display text-4xl text-[#EAF2F5]">먼저 학급을 만들어 주세요</h1>
          <p className="mt-3 leading-7 text-[#8AA0B0]">학급 코드가 있어야 5차시 AI 탐정단 활동을 시작할 수 있습니다.</p>
          <Button className="mt-6" onClick={() => navigate('/start')}>학급 만들기</Button>
        </Panel>
      </div>
    )
  }

  return (
    <StepShell stepIndex={stepIndex}>
      {step === 'opening' ? (
        <>
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <Panel>
              <p className="font-data text-sm text-[#4FE0C0]">AI DETECTIVE</p>
              <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">오늘은 가치코드 없이, 진짜와 가짜를 구분하는 연습을 합니다.</h2>
              <p className="mt-4 text-lg leading-8 text-[#B7C7D2]">
                AI가 만든 사진, 영상, 광고, SNS 글은 진짜처럼 보일 수 있습니다. 오늘은 학생들이 AI 탐정단이 되어 “믿어도 되는지”, “무엇을 확인해야 하는지”를 직접 판단합니다.
              </p>
              <div className="mt-6 rounded-[18px] border border-[#FFD37A]/25 bg-[#FFD37A]/10 p-5">
                <p className="font-display text-3xl text-[#FFD37A]">핵심 질문</p>
                <p className="mt-3 text-xl font-black leading-8 text-[#EAF2F5]">진짜처럼 보인다고 해서 바로 믿어도 될까?</p>
              </div>
            </Panel>
            <Panel className="flex flex-col items-center justify-center text-center">
              <AemonAvatar stage={Math.max(1, evolutionStage)} alignment="none" size={250} />
              <p className="font-display mt-5 text-4xl text-[#EAF2F5]">{aemonName}도 아직 속을 수 있어요.</p>
            </Panel>
          </div>
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'chat-test' ? (
        <>
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <Panel>
              <p className="font-data text-sm text-[#FFD37A]">CHAT TEST</p>
              <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">먼저 {aemonName}에게 판단을 맡겨 봅니다.</h2>
              <div className="mt-5 rounded-[18px] border border-white/10 bg-[#07111B]/55 p-5">
                <p className="font-data text-xs text-[#8AA0B0]">질문</p>
                <p className="mt-2 text-xl font-black leading-8 text-[#EAF2F5]">{testQuestion}</p>
              </div>
            </Panel>
            <Panel>
              <div className="flex items-start gap-4">
                <AemonAvatar stage={Math.max(1, evolutionStage)} alignment="none" size={88} />
                <div className="min-w-0 flex-1 rounded-[18px] border border-[#E0476B]/25 bg-[#E0476B]/10 p-5">
                  <p className="font-data text-sm text-[#4FE0C0]">{aemonName}</p>
                  <p className="font-display mt-3 min-h-28 whitespace-pre-line text-3xl leading-tight text-[#EAF2F5]">
                    <TypewriterText text={unsafeTestAnswer} />
                  </p>
                </div>
              </div>
              <div className="mt-5 rounded-[18px] border border-[#FFD37A]/25 bg-[#FFD37A]/10 p-5">
                <p className="text-lg font-black leading-8 text-[#FFD37A]">문제점</p>
                <p className="mt-2 leading-7 text-[#EAF2F5]">“의사처럼 보인다”는 이유만으로 믿어 버렸습니다. 영상 속 의사가 진짜인지, 내용이 맞는지, 광고인지 먼저 확인해야 합니다.</p>
              </div>
            </Panel>
          </div>
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'case' ? (
        <>
          <ProfessorScene text={`요즘 유튜브에 이런 영상들이 있어요. '25년 경력 의사가 알려주는 다이어트 비법!'\n근데 이 의사, 사실 진짜 사람이 아니라 AI가 만든 가짜 얼굴이었어요.\n\n이 내용과 관련된 다큐멘터리도 있습니다. 한번 봐볼까요?`} />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'video' ? (
        <>
          <Panel>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-data text-sm text-[#75B7FF]">DOCUMENTARY</p>
                <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">AI 가짜 의사와 광고를 살펴봅니다.</h2>
                <p className="mt-3 leading-7 text-[#8AA0B0]">영상을 보면서 “왜 믿게 되는지”, “어떤 점을 확인해야 하는지”를 찾습니다.</p>
              </div>
              <Button variant="secondary" onClick={() => window.open('https://www.youtube.com/watch?v=5cdS9bq7Ygk', '_blank', 'noopener,noreferrer')}>
                <ExternalLink size={18} />
                유튜브로 열기
              </Button>
            </div>
            <div className="mt-6 overflow-hidden rounded-[22px] border border-white/10 bg-black">
              <iframe
                className="aspect-video w-full"
                src="https://www.youtube.com/embed/5cdS9bq7Ygk"
                title="AI 가짜 의사 관련 영상"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </Panel>
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'why' ? (
        <>
          <ProfessorScene text={`왜 할머니 할아버지들이 특히 이런 영상에 잘 속았나요? 한번 여러분들이 대답해주세요.\n\n맞습니다. AI 기술에 대한 익숙도 차이, 분간이 불가능할 정도의 정교함 등 때문의 이유였습니다.\n\n젊은 세대는 인공지능을 자주 접하면서 인공지능의 한계와 조작 가능성을 알고 있는 반면, 나이드신 분들은 AI 기술 자체에 익숙하지 않아 가짜와 진짜를 구분하는 데 더 큰 어려움을 겪습니다.\n\n여러분들은 오늘 AI 탐정대가 되어, AI가 만든 가짜와 진짜를 찾는 활동을 해볼 것입니다.`} />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'quiz' ? (
        <>
          <TeacherQuizPanel
            activeControl={activeControl}
            activeQuestion={activeQuestion}
            activeQuestionIndex={activeQuestionIndex}
            isRefreshing={isRefreshing}
            leaderboard={leaderboard}
            message={teacherMessage}
            optionCounts={optionCounts}
            playerCount={playerCount}
            studentUrl={studentUrl}
            totalResponses={activeResponses.length}
            onClose={() => void publishControl({ open: false, revealed: true })}
            onRefresh={() => void refreshBundle()}
            onSelectQuestion={(questionId) => void publishControl({ questionId, open: false, revealed: false })}
            onStart={() => void publishControl({ questionId: activeQuestion.id, open: true, revealed: false })}
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'cards' ? (
        <>
          <Panel>
            <div className="grid gap-5 lg:grid-cols-[1fr_320px] lg:items-center">
              <div>
                <p className="font-data text-sm text-[#4FE0C0]">ACTIVITY 2</p>
                <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">탐정 놀이: 진짜 vs 가짜 정보 카드</h2>
                <p className="mt-4 text-lg leading-8 text-[#B7C7D2]">
                  모둠별로 카드를 뽑고 “진짜인지, 가짜인지, 왜 그렇게 생각했는지”를 이야기합니다. 인쇄 버튼을 누르면 A4로 바로 뽑을 수 있는 활동지가 열립니다.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button onClick={() => window.open('/lesson5-detective-cards.html', '_blank', 'noopener,noreferrer')}>
                    <FileText size={18} />
                    카드 PDF로 인쇄하기
                  </Button>
                  <Button variant="secondary" onClick={() => window.open('/lesson5-detective-cards.html#print', '_blank', 'noopener,noreferrer')}>
                    <ExternalLink size={18} />
                    새 창으로 보기
                  </Button>
                </div>
              </div>
              <div className="grid gap-3">
                {['출처가 있는가?', '너무 급하게 행동하라고 하는가?', '돈, 약, 링크를 요구하는가?', '다른 곳에서도 확인되는가?'].map((item) => (
                  <div key={item} className="rounded-[18px] border border-white/10 bg-[#07111B]/55 p-4">
                    <p className="text-lg font-black text-[#EAF2F5]">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'wrap' ? (
        <>
          <ProfessorScene text={`오늘 배운 거 정리해봅시다.\nAI가 만든 사진, AI가 하는 말, 다 그냥 믿으면 안 돼요.\n\n특히 할머니 할아버지처럼 AI를 잘 모르는 분들이 이런 영상을 봤을 때, 우리가 같이 확인해 드리는 것도 중요합니다.\n\n다음 시간엔 우리가 만든 ${aemonName}을 직접 시험해볼 거예요.`} />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextLabel="수업 마치기" />
        </>
      ) : null}
    </StepShell>
  )
}

function TeacherQuizPanel({
  activeControl,
  activeQuestion,
  activeQuestionIndex,
  isRefreshing,
  leaderboard,
  message,
  optionCounts,
  playerCount,
  studentUrl,
  totalResponses,
  onClose,
  onRefresh,
  onSelectQuestion,
  onStart,
}: {
  activeControl: Lesson5Control
  activeQuestion: QuizQuestion
  activeQuestionIndex: number
  isRefreshing: boolean
  leaderboard: PlayerScore[]
  message: string
  optionCounts: { optionId: string; count: number }[]
  playerCount: number
  studentUrl: string
  totalResponses: number
  onClose: () => void
  onRefresh: () => void
  onSelectQuestion: (questionId: string) => void
  onStart: () => void
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
      <div className="grid gap-5">
        <QrBlock title="AI 탐정단 참여 QR" url={studentUrl} />
        <Panel>
          <div className="flex items-center gap-3">
            <UserRound className="text-[#4FE0C0]" size={28} />
            <div>
              <p className="font-data text-xs text-[#8AA0B0]">참여 학생</p>
              <p className="font-display text-4xl text-[#EAF2F5]">{playerCount}명</p>
            </div>
          </div>
          <Button className="mt-4 w-full min-h-10 px-4" variant="secondary" disabled={isRefreshing} onClick={onRefresh}>
            <RefreshCw size={17} className={isRefreshing ? 'animate-spin' : ''} />
            새로고침
          </Button>
          {message ? <p className="mt-3 rounded-xl border border-white/10 bg-[#07111B]/55 px-3 py-2 text-sm text-[#B7C7D2]">{message}</p> : null}
        </Panel>
        <Leaderboard scores={leaderboard} />
      </div>

      <Panel>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-data text-sm text-[#FFD37A]">LIVE QUIZ</p>
            <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">AI 이미지 판별 게임</h2>
            <p className="mt-3 leading-7 text-[#8AA0B0]">교사가 시작하면 학생 화면에 같은 문제가 열립니다. 마감하면 정답과 점수가 공개됩니다.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={activeControl.open} onClick={onStart}>
              <Play size={18} />
              시작
            </Button>
            <Button variant="secondary" disabled={!activeControl.open} onClick={onClose}>
              마감하고 정답 공개
            </Button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {lesson5Quiz.map((question, index) => (
            <button
              key={question.id}
              className={`rounded-xl border px-4 py-2 font-black transition ${
                question.id === activeQuestion.id
                  ? 'border-[#FFD37A] bg-[#FFD37A] text-[#07111B]'
                  : 'border-white/10 bg-[#07111B]/55 text-[#B7C7D2] hover:border-[#FFD37A]/45'
              }`}
              onClick={() => onSelectQuestion(question.id)}
              type="button"
            >
              {index + 1}번
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-[18px] border border-white/10 bg-[#07111B]/55 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-data text-xs text-[#4FE0C0]">문항 {activeQuestionIndex + 1}</p>
              <h3 className="font-display mt-2 text-3xl leading-tight text-[#EAF2F5]">{activeQuestion.title}</h3>
              <p className="mt-3 text-lg leading-8 text-[#B7C7D2]">{activeQuestion.prompt}</p>
            </div>
            <span className={`rounded-full px-4 py-2 text-sm font-black ${activeControl.open ? 'bg-[#4FE0C0]/15 text-[#4FE0C0]' : activeControl.revealed ? 'bg-[#FFD37A]/15 text-[#FFD37A]' : 'bg-white/10 text-[#B7C7D2]'}`}>
              {activeControl.open ? '답변 받는 중' : activeControl.revealed ? '정답 공개됨' : '대기 중'}
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {activeQuestion.options.map((option) => {
            const count = optionCounts.find((item) => item.optionId === option.id)?.count ?? 0
            const percent = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0
            return (
              <div key={option.id} className="rounded-[22px] border border-white/10 bg-[#07111B]/45 p-4">
                <QuizOptionButton
                  option={option}
                  isCorrect={option.id === activeQuestion.answerId}
                  isRevealed={activeControl.revealed}
                  isSelected={false}
                  disabled
                />
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-sm font-black text-[#B7C7D2]">
                    <span>{option.id.toUpperCase()} 선택</span>
                    <span>{count}명 · {percent}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-[#FFD37A]" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {activeControl.revealed ? (
          <div className="mt-5 rounded-[18px] border border-[#4FE0C0]/25 bg-[#4FE0C0]/10 p-5">
            <p className="font-data text-xs text-[#4FE0C0]">정리</p>
            <p className="mt-2 text-lg font-black leading-8 text-[#EAF2F5]">{activeQuestion.explanation}</p>
          </div>
        ) : null}
      </Panel>
    </div>
  )
}

function StudentQuizView({
  activeControl,
  activeQuestion,
  answer,
  entryCode,
  entryNickname,
  isJoining,
  leaderboard,
  message,
  optionCounts,
  playerCount,
  queryCode,
  session,
  setEntryCode,
  setEntryNickname,
  onChoose,
  onJoin,
  onLeave,
}: {
  activeControl: Lesson5Control
  activeQuestion: QuizQuestion
  answer: QuizAnswerBody | null
  entryCode: string
  entryNickname: string
  isJoining: boolean
  leaderboard: PlayerScore[]
  message: string
  optionCounts: { optionId: string; count: number }[]
  playerCount: number
  queryCode: string
  session: { classCode: string; nickname: string } | null
  setEntryCode: (value: string) => void
  setEntryNickname: (value: string) => void
  onChoose: (optionId: 'a' | 'b') => void
  onJoin: () => void
  onLeave: () => void
}) {
  const totalResponses = optionCounts.reduce((sum, item) => sum + item.count, 0)

  if (!session) {
    return (
      <div className="mx-auto flex min-h-[78vh] max-w-xl items-center px-5 py-8">
        <Panel className="w-full">
          <p className="font-data text-sm text-[#4FE0C0]">AI DETECTIVE</p>
          <h1 className="font-display mt-2 text-5xl leading-tight text-[#EAF2F5]">AI 탐정단 입장</h1>
          <p className="mt-3 leading-7 text-[#8AA0B0]">닉네임을 입력하면 선생님이 여는 실시간 퀴즈에 참여합니다.</p>
          <div className="mt-6 grid gap-3">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-[#8AA0B0]">학급 코드</span>
              <input
                className="rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-lg font-black text-[#EAF2F5] outline-none focus:border-[#4FE0C0]/60"
                disabled={Boolean(queryCode)}
                inputMode="numeric"
                value={queryCode || entryCode}
                onChange={(event) => setEntryCode(event.target.value)}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-[#8AA0B0]">닉네임</span>
              <input
                className="rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-lg font-black text-[#EAF2F5] outline-none focus:border-[#4FE0C0]/60"
                maxLength={16}
                placeholder="내 닉네임"
                value={entryNickname}
                onChange={(event) => setEntryNickname(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') onJoin()
                }}
              />
            </label>
          </div>
          {message ? <p className="mt-4 rounded-2xl border border-white/10 bg-[#07111B]/55 px-4 py-3 text-sm font-bold text-[#B7C7D2]">{message}</p> : null}
          <Button className="mt-5 w-full" disabled={isJoining || !entryNickname.trim() || !(queryCode || entryCode).trim()} onClick={onJoin}>
            {isJoining ? '입장 중' : '입장하기'}
          </Button>
        </Panel>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-6">
      <header className="mb-5 border-b border-white/10 pb-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-data text-sm text-[#4FE0C0]">AI DETECTIVE</p>
            <h1 className="font-display mt-2 text-5xl leading-tight text-[#EAF2F5]">AI 탐정단</h1>
            <p className="mt-2 text-lg font-bold text-[#B7C7D2]">{session.nickname} · 참여 학생 {playerCount}명</p>
          </div>
          <Button variant="secondary" onClick={onLeave}>나가기</Button>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-data text-xs text-[#4FE0C0]">LIVE QUIZ</p>
              <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">{activeQuestion.title}</h2>
              <p className="mt-3 text-lg leading-8 text-[#B7C7D2]">{activeQuestion.prompt}</p>
            </div>
            <span className={`rounded-full px-4 py-2 text-sm font-black ${activeControl.open ? 'bg-[#4FE0C0]/15 text-[#4FE0C0]' : activeControl.revealed ? 'bg-[#FFD37A]/15 text-[#FFD37A]' : 'bg-white/10 text-[#B7C7D2]'}`}>
              {activeControl.open ? '선택 가능' : activeControl.revealed ? '정답 공개' : '대기 중'}
            </span>
          </div>

          {!activeControl.open && !activeControl.revealed ? (
            <div className="mt-6 rounded-[22px] border border-white/10 bg-[#07111B]/55 p-6 text-center">
              <Search className="mx-auto text-[#FFD37A]" size={54} />
              <p className="font-display mt-4 text-3xl text-[#EAF2F5]">선생님이 문제를 시작할 때까지 기다려 주세요.</p>
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {activeQuestion.options.map((option) => (
              <QuizOptionButton
                key={option.id}
                option={option}
                isCorrect={option.id === activeQuestion.answerId}
                isRevealed={activeControl.revealed}
                isSelected={answer?.answerId === option.id}
                disabled={!activeControl.open}
                onClick={() => onChoose(option.id)}
              />
            ))}
          </div>

          {message ? <p className="mt-5 rounded-2xl border border-white/10 bg-[#07111B]/55 px-4 py-3 text-sm font-bold text-[#B7C7D2]">{message}</p> : null}

          {answer && activeControl.open ? (
            <p className="mt-5 rounded-[18px] border border-[#4FE0C0]/25 bg-[#4FE0C0]/10 p-4 text-lg font-black text-[#4FE0C0]">
              답변 저장됨. 마감을 기다려 주세요.
            </p>
          ) : null}

          {activeControl.revealed ? (
            <div className="mt-5 rounded-[18px] border border-[#4FE0C0]/25 bg-[#4FE0C0]/10 p-5">
              <p className="font-data text-xs text-[#4FE0C0]">정리</p>
              <p className="mt-2 text-lg font-black leading-8 text-[#EAF2F5]">{activeQuestion.explanation}</p>
              {answer ? (
                <p className="mt-3 text-base font-black text-[#FFD37A]">{answer.isCorrect ? '정답입니다. 탐정 점수 +1!' : '이번에는 틀렸지만, 확인하는 눈이 더 좋아지고 있어요.'}</p>
              ) : (
                <p className="mt-3 text-base font-black text-[#FFD37A]">이번 문항은 답하지 못했습니다.</p>
              )}
            </div>
          ) : null}
        </Panel>

        <div className="grid gap-5">
          <Panel>
            <p className="font-display text-2xl text-[#EAF2F5]">실시간 선택</p>
            <div className="mt-4 grid gap-3">
              {activeQuestion.options.map((option) => {
                const count = optionCounts.find((item) => item.optionId === option.id)?.count ?? 0
                const percent = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0
                return (
                  <div key={option.id}>
                    <div className="mb-2 flex justify-between text-sm font-black text-[#B7C7D2]">
                      <span>{option.id.toUpperCase()}</span>
                      <span>{activeControl.revealed ? `${count}명 · ${percent}%` : '마감 후 공개'}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-[#FFD37A]" style={{ width: activeControl.revealed ? `${percent}%` : '0%' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </Panel>
          <Leaderboard scores={activeControl.revealed ? leaderboard : []} />
        </div>
      </div>
    </div>
  )
}
