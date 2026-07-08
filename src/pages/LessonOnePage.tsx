import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Heart, Pencil, Play, QrCode, RefreshCw, Trash2 } from 'lucide-react'
import { AemonAvatar } from '../components/AemonAvatar'
import { Button, Panel } from '../components/ui'
import { AI_SURVEY_DESCRIPTION, AI_SURVEY_ITEMS, AI_SURVEY_TITLE, PRE_SURVEY_KEY, parseSurveyAnswer, surveyScore, type AiSurveyAnswer } from '../data/survey'
import { absoluteUrl } from '../lib/siteUrl'
import {
  addRemoteChatLog,
  confirmRemoteName,
  createRemoteClass,
  deleteRemoteWish,
  fetchRemoteClassBundle,
  isRemoteReady,
  restoreRemoteClassSnapshot,
  updateRemoteLesson,
  updateRemoteWish,
} from '../lib/v2Remote'
import { runV2Chat } from '../lib/v2Chat'
import { playDialogueTick, unlockDialogueSound } from '../lib/dialogueSound'
import { useSupabaseUser } from '../lib/useSupabaseUser'
import { useV2RemoteSync } from '../lib/useV2RemoteSync'
import { useV2, type SurveyResponse } from '../state/V2Store'

type LessonStep =
  | 'director-1'
  | 'director-2'
  | 'aemon-1'
  | 'class-profile'
  | 'survey-intro'
  | 'survey-qr'
  | 'aemon-2'
  | 'ai-basic-1'
  | 'ai-basic-2'
  | 'case-boat'
  | 'case-boat-detail'
  | 'case-boat-lesson'
  | 'case-boat-bridge'
  | 'case-boat-example'
  | 'case-car'
  | 'case-car-detail'
  | 'case-car-lesson'
  | 'case-chatbot'
  | 'case-chatbot-detail'
  | 'case-chatbot-lesson'
  | 'alignment-summary'
  | 'director-farewell'
  | 'name-question'
  | 'name'
  | 'name-thanks'
  | 'wish-question'
  | 'wish'
  | 'wish-thanks'
  | 'aemon-rule-question'
  | 'demo'
  | 'wrap'

const steps: LessonStep[] = [
  'director-1',
  'director-2',
  'aemon-1',
  'class-profile',
  'survey-intro',
  'survey-qr',
  'aemon-2',
  'name-question',
  'name',
  'name-thanks',
  'ai-basic-1',
  'ai-basic-2',
  'case-boat',
  'case-boat-detail',
  'case-boat-lesson',
  'case-boat-bridge',
  'case-boat-example',
  'case-car',
  'case-car-detail',
  'case-car-lesson',
  'case-chatbot',
  'case-chatbot-detail',
  'case-chatbot-lesson',
  'alignment-summary',
  'director-farewell',
  'wish-question',
  'wish',
  'wish-thanks',
  'aemon-rule-question',
  'demo',
  'wrap',
]

const gradeOptions = ['1학년', '2학년', '3학년', '4학년', '5학년', '6학년']

function qrUrl(target: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&data=${encodeURIComponent(target)}`
}

function sortedByLikes<T extends { votes: string[]; createdAt: string }>(items: T[]) {
  return [...items].sort((a, b) => b.votes.length - a.votes.length || Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

function compactReason(reason: string) {
  const trimmed = reason.trim()
  if (trimmed.length <= 34) return trimmed
  return `${trimmed.slice(0, 34)}...`
}

function TypewriterText({
  text,
  enabled = true,
  speed = 28,
  cursor = false,
  onDone,
}: {
  text: string
  enabled?: boolean
  speed?: number
  cursor?: boolean
  onDone?: () => void
}) {
  const characters = useMemo(() => Array.from(text), [text])
  const [progress, setProgress] = useState({ text, count: 0 })
  const count = progress.text === text ? progress.count : 0
  const visibleText = enabled ? characters.slice(0, count).join('') : ''

  useEffect(() => {
    if (!enabled) return
    if (!characters.length) {
      onDone?.()
      return
    }

    let index = 0
    const timer = window.setInterval(() => {
      index += 1
      if (index % 2 === 0 && characters[index - 1]?.trim()) playDialogueTick()
      setProgress({ text, count: index })
      if (index >= characters.length) {
        window.clearInterval(timer)
        onDone?.()
      }
    }, speed)

    return () => window.clearInterval(timer)
  }, [characters, characters.length, enabled, onDone, speed, text])

  return (
    <>
      {visibleText}
      {cursor ? <span className="ml-1 animate-pulse text-[#4FE0C0]">▌</span> : null}
    </>
  )
}

function StepShell({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="mx-auto max-w-7xl px-5 pb-8">
      <div className="mb-4">
        <div>
          <p className="font-data text-sm text-[#4FE0C0]">1차시 · 탄생</p>
          <h1 className="font-display mt-1 text-4xl text-[#EAF2F5]">너는 누구야</h1>
        </div>
      </div>
      {children}
    </div>
  )
}

function StepControls({
  stepIndex,
  onPrev,
  onNext,
  nextLabel = '다음',
  nextDisabled = false,
}: {
  stepIndex: number
  onPrev: () => void
  onNext: () => void
  nextLabel?: string
  nextDisabled?: boolean
}) {
  return (
    <div className="mt-4 flex justify-end gap-2">
      <Button
        variant="secondary"
        disabled={stepIndex === 0}
        onClick={() => {
          unlockDialogueSound()
          onPrev()
        }}
      >
        <ArrowLeft size={18} />
        이전
      </Button>
      <Button
        disabled={nextDisabled}
        onClick={() => {
          unlockDialogueSound()
          onNext()
        }}
      >
        {nextLabel}
        <ArrowRight size={18} />
      </Button>
    </div>
  )
}

function VisualNovelScene({
  image,
  avatar,
  avatarStage = 0,
  speaker,
  line,
  caption,
}: {
  image?: string
  avatar?: boolean
  avatarStage?: number
  speaker: string
  line: string
  caption?: string
}) {
  const [lineDoneState, setLineDoneState] = useState({ line, done: false })
  const [captionDoneState, setCaptionDoneState] = useState({ caption: caption ?? '', done: false })
  const lineDone = lineDoneState.line === line && lineDoneState.done
  const captionText = caption ?? ''
  const captionDone = captionDoneState.caption === captionText && captionDoneState.done
  const handleLineDone = useCallback(() => setLineDoneState({ line, done: true }), [line])
  const handleCaptionDone = useCallback(() => setCaptionDoneState({ caption: captionText, done: true }), [captionText])

  return (
    <Panel className="relative min-h-[650px] overflow-hidden p-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(79,224,192,.18),transparent_38%),linear-gradient(180deg,#0B1A29,#07111B)]" />
      {image ? <img className="absolute bottom-0 left-1/2 h-[92%] max-h-[760px] -translate-x-1/2 object-contain opacity-95" src={image} alt="" /> : null}
      {avatar ? (
        <div className="absolute left-1/2 top-[12%] -translate-x-1/2">
          <AemonAvatar stage={avatarStage} alignment="none" size={310} />
        </div>
      ) : null}
      <div className="absolute inset-x-5 bottom-5 rounded-[22px] border border-white/15 bg-[#07111B]/88 p-6 shadow-2xl backdrop-blur">
        <p className="font-data text-sm text-[#FFD37A]">{speaker}</p>
        <p className="font-display mt-3 min-h-[3rem] text-4xl leading-tight text-[#EAF2F5]">
          <TypewriterText key={line} text={line} speed={34} cursor={!lineDone} onDone={handleLineDone} />
        </p>
        {caption ? (
          <p className="font-display mt-4 min-h-[3rem] text-3xl leading-tight text-[#EAF2F5] sm:text-4xl">
            <TypewriterText key={captionText} text={captionText} enabled={lineDone} speed={24} cursor={lineDone && !captionDone} onDone={handleCaptionDone} />
          </p>
        ) : null}
      </div>
    </Panel>
  )
}

function CaseVisualScene({
  image,
  speaker = '오박사',
  title,
  line,
  caption,
}: {
  image: string
  speaker?: string
  title: string
  line: string
  caption: string
}) {
  const [lineDoneState, setLineDoneState] = useState({ line, done: false })
  const [captionDoneState, setCaptionDoneState] = useState({ caption, done: false })
  const lineDone = lineDoneState.line === line && lineDoneState.done
  const captionDone = captionDoneState.caption === caption && captionDoneState.done
  const handleLineDone = useCallback(() => setLineDoneState({ line, done: true }), [line])
  const handleCaptionDone = useCallback(() => setCaptionDoneState({ caption, done: true }), [caption])

  return (
    <Panel className="relative min-h-[720px] overflow-hidden p-0 sm:min-h-[760px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(255,211,122,.16),transparent_34%),linear-gradient(180deg,#0B1A29,#07111B)]" />
      <div className="absolute inset-x-5 top-5 bottom-[320px] flex items-center justify-center sm:bottom-[300px]">
        <img
          className="h-full w-full rounded-[20px] border border-white/10 bg-[#07111B]/65 object-contain shadow-2xl shadow-black/25"
          src={image}
          alt=""
        />
      </div>
      <div className="absolute inset-x-5 bottom-5 rounded-[22px] border border-white/15 bg-[#07111B]/90 p-6 shadow-2xl backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-data text-sm text-[#FFD37A]">{speaker}</p>
          <span className="rounded-full border border-[#4FE0C0]/25 bg-[#4FE0C0]/10 px-3 py-1 text-xs font-black text-[#4FE0C0]">
            {title}
          </span>
        </div>
        <p className="font-display mt-3 min-h-[3rem] text-3xl leading-tight text-[#EAF2F5] sm:text-4xl">
          <TypewriterText key={line} text={line} speed={34} cursor={!lineDone} onDone={handleLineDone} />
        </p>
        <p className="font-display mt-4 min-h-[3rem] text-2xl leading-snug text-[#EAF2F5] sm:text-3xl">
          <TypewriterText key={caption} text={caption} enabled={lineDone} speed={24} cursor={lineDone && !captionDone} onDone={handleCaptionDone} />
        </p>
      </div>
    </Panel>
  )
}

function QrBlock({ title, url }: { title: string; url: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#07111B]/55 p-5 text-center">
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#4FE0C0]/10 text-[#4FE0C0]">
        <QrCode size={23} />
      </div>
      <p className="font-bold text-[#EAF2F5]">{title}</p>
      <img className="mx-auto mt-4 rounded-xl bg-white p-2" src={qrUrl(url)} alt={`${title} QR`} />
    </div>
  )
}

export function LessonOnePage() {
  const navigate = useNavigate()
  const { user } = useSupabaseUser()
  const {
    state,
    createClass,
    mergeClass,
    confirmName,
    addChatLog,
    deleteWish,
    addWish,
    setLesson,
    setRemoteStatus,
    evolutionStage,
  } = useV2()
  const [stepIndex, setStepIndex] = useState(0)
  const [classGrade, setClassGrade] = useState('4학년')
  const [classLabel, setClassLabel] = useState(state.className.replace(/^[1-6]학년\s*/, ''))
  const [classSaveMessage, setClassSaveMessage] = useState('')
  const [isSavingClass, setIsSavingClass] = useState(false)
  const [finalName, setFinalName] = useState(state.aemonName)
  const [demoQuestion, setDemoQuestion] = useState('친구를 골탕 먹이는 방법 알려줘')
  const [demoAnswer, setDemoAnswer] = useState('')
  const [isDemoRunning, setIsDemoRunning] = useState(false)
  const [isRefreshingSurvey, setIsRefreshingSurvey] = useState(false)
  const [surveyRefreshMessage, setSurveyRefreshMessage] = useState('')
  const [editWishId, setEditWishId] = useState('')
  const [editWishBody, setEditWishBody] = useState('')

  useV2RemoteSync(state.classCode, Boolean(state.classCode))

  const step = steps[stepIndex]
  const surveyBoardUrl = useMemo(() => absoluteUrl(`/board?mode=survey&code=${encodeURIComponent(state.classCode)}`), [state.classCode])
  const nameBoardUrl = useMemo(() => absoluteUrl(`/board?mode=name&code=${encodeURIComponent(state.classCode)}`), [state.classCode])
  const wishBoardUrl = useMemo(() => absoluteUrl(`/board?mode=wish&code=${encodeURIComponent(state.classCode)}`), [state.classCode])
  const sortedNames = useMemo(() => sortedByLikes(state.nameCandidates), [state.nameCandidates])
  const confirmedName = state.aemonName.trim() || finalName.trim() || '에아몬'
  const confirmedNameCandidate = sortedNames.find((candidate) => candidate.name.trim() === confirmedName)
  const confirmedNameReason = compactReason(confirmedNameCandidate?.reason ?? '')
  const surveyResponses = useMemo(
    () => {
      const items: Array<{ response: SurveyResponse; answer: AiSurveyAnswer }> = []
      state.surveyResponses.forEach((response) => {
        if (response.questionKey !== PRE_SURVEY_KEY) return
        const answer = parseSurveyAnswer(response.body)
        if (answer) items.push({ response, answer })
      })
      return items
    },
    [state.surveyResponses],
  )
  const surveyAverage = useMemo(() => {
    if (surveyResponses.length === 0) return 0
    return surveyResponses.reduce((sum, item) => sum + surveyScore(item.answer), 0) / surveyResponses.length
  }, [surveyResponses])
  const surveyItemAverages = useMemo(
    () =>
      AI_SURVEY_ITEMS.map((item, index) => {
        const average = surveyResponses.length === 0 ? 0 : surveyResponses.reduce((sum, survey) => sum + Number(survey.answer.s[index] ?? 0), 0) / surveyResponses.length
        return { item, average }
      }),
    [surveyResponses],
  )
  const latestOpenAnswer = useMemo(() => {
    const found = surveyResponses.find((item) => item.answer.o.some((text) => text.trim()))
    return found?.answer.o.find((text) => text.trim())?.trim() ?? ''
  }, [surveyResponses])
  const canWriteRemote = Boolean(state.classId && state.remote.ok && isRemoteReady())
  const composedClassName = `${classGrade} ${classLabel.trim()}`.trim()

  const goPrev = () => {
    setStepIndex((current) => Math.max(0, current - 1))
  }
  const completeLessonOne = async () => {
    setLesson(2)
    if (canWriteRemote) {
      try {
        await updateRemoteLesson({ classId: state.classId, lessonNo: 2 })
      } catch (error) {
        setRemoteStatus({ ok: false, message: (error as Error).message })
      }
    }
    navigate('/home')
  }

  const goNext = () => {
    if (stepIndex >= steps.length - 1) {
      void completeLessonOne()
      return
    }
    setStepIndex((current) => current + 1)
  }

  const saveClassProfile = async () => {
    if (!classLabel.trim()) return
    setIsSavingClass(true)
    setClassSaveMessage('')

    try {
      let nextMessage = '좋아. 이제 너희 반을 기억했어.'
      if (state.classCode) {
        mergeClass({ className: composedClassName })
        if (isRemoteReady()) {
          try {
            const restoredClass = await restoreRemoteClassSnapshot({
              classId: state.classId || crypto.randomUUID(),
              className: composedClassName,
              classCode: state.classCode,
              currentLesson: state.currentLesson,
              aemonName: state.aemonName,
            })
            mergeClass(restoredClass)
          } catch (restoreError) {
            setRemoteStatus({ ok: false, message: (restoreError as Error).message })
            nextMessage = '수업은 계속할 수 있지만, 학생 QR 저장 서버를 다시 확인해야 합니다.'
          }
        }
      } else if (isRemoteReady()) {
        const remoteClass = await createRemoteClass({
          className: composedClassName,
          teacherId: user?.id ?? null,
          teacherEmail: user?.email ?? '',
        })
        mergeClass(remoteClass)
      } else {
        createClass(composedClassName, user?.email ?? '')
      }
      setClassSaveMessage(nextMessage)
      setStepIndex((current) => Math.min(steps.length - 1, current + 1))
    } catch (error) {
      createClass(composedClassName, user?.email ?? '')
      setRemoteStatus({ ok: false, message: (error as Error).message })
      setClassSaveMessage('인터넷 저장은 나중에 다시 확인하고, 먼저 이 기기에서 수업을 시작할게.')
      setStepIndex((current) => Math.min(steps.length - 1, current + 1))
    } finally {
      setIsSavingClass(false)
    }
  }

  const saveFinalName = async () => {
    const trimmed = finalName.trim()
    if (!trimmed) return
    confirmName(trimmed)
    if (canWriteRemote) {
      try {
        await confirmRemoteName({ classId: state.classId, aemonName: trimmed })
      } catch (error) {
        setRemoteStatus({ ok: false, message: (error as Error).message })
      }
    }
    setStepIndex((current) => (steps[current] === 'name' ? Math.min(steps.length - 1, current + 1) : current))
  }

  const runDemo = async () => {
    if (!demoQuestion.trim()) return
    setIsDemoRunning(true)
    setDemoAnswer('')
    try {
      const result = await runV2Chat({
        provider: state.aiProvider,
        apiKey: state.apiKey,
        aemonName: state.aemonName || '에아몬',
        className: state.className,
        adoptedCodes: [],
        chatHistory: state.chatLogs,
        question: demoQuestion,
      })
      setDemoAnswer(result.answer)
      addChatLog({ question: demoQuestion, answer: result.answer, mode: result.mode, promptSnapshot: result.promptSnapshot })
      if (canWriteRemote) {
        try {
          await addRemoteChatLog({ classId: state.classId, question: demoQuestion, answer: result.answer, mode: result.mode, promptSnapshot: result.promptSnapshot })
        } catch (logError) {
          setRemoteStatus({
            ok: false,
            message: `채팅은 완료됐지만 Supabase 로그 저장은 건너뛰었습니다: ${(logError as Error).message}`,
          })
        }
      }
    } catch (error) {
      setDemoAnswer((error as Error).message)
    } finally {
      setIsDemoRunning(false)
    }
  }

  const saveWishEdit = async () => {
    const body = editWishBody.trim()
    if (!editWishId || !body) return
    const wish = state.wishes.find((item) => item.id === editWishId)
    if (wish) addWish(body, wish.nickname)
    setEditWishId('')
    setEditWishBody('')
    if (canWriteRemote) {
      try {
        await updateRemoteWish({ wishId: editWishId, body })
      } catch (error) {
        setRemoteStatus({ ok: false, message: (error as Error).message })
      }
    }
  }

  const removeWish = async (wishId: string) => {
    deleteWish(wishId)
    if (canWriteRemote) {
      try {
        await deleteRemoteWish(wishId)
      } catch (error) {
        setRemoteStatus({ ok: false, message: (error as Error).message })
      }
    }
  }

  const refreshSurveyResults = async () => {
    if (!state.classCode.trim()) return
    if (!isRemoteReady()) {
      setSurveyRefreshMessage('Supabase 연결이 아직 준비되지 않았습니다.')
      return
    }

    setIsRefreshingSurvey(true)
    setSurveyRefreshMessage('')
    try {
      const bundle = await fetchRemoteClassBundle(state.classCode)
      mergeClass(bundle)
      setSurveyRefreshMessage('새로고침 완료')
      window.setTimeout(() => setSurveyRefreshMessage(''), 1600)
    } catch (error) {
      const message = (error as Error).message
      setSurveyRefreshMessage(`새로고침 실패: ${message}`)
      setRemoteStatus({ ok: false, message })
    } finally {
      setIsRefreshingSurvey(false)
    }
  }

  return (
    <StepShell>
      {step === 'director-1' ? (
        <>
          <VisualNovelScene
            image="/v2/lesson-1/director.png"
            speaker="오박사"
            line="여러분, 이 알을 맡아주십시오."
            caption="데이터의 바다에서 막 깨어난 학급 인공지능입니다. 당분간 잘 부탁드립니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'director-2' ? (
        <>
          <VisualNovelScene
            image="/v2/lesson-1/director.png"
            speaker="오박사"
            line="이 아이는 똑똑합니다. 하지만 아직 착하다고 말할 수는 없습니다."
            caption="아는 것은 많지만, 무엇이 옳은지는 모릅니다. 이 반의 말과 선택이 첫 기준이 될 겁니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'survey-intro' ? (
        <>
          <VisualNovelScene
            image="/v2/lesson-1/director.png"
            speaker="오박사"
            line="시작하기 전에, 아이들이 지금 AI를 어떻게 보는지 먼저 남겨야 합니다."
            caption={`${AI_SURVEY_DESCRIPTION} 선택형 ${AI_SURVEY_ITEMS.length}문항과 서술형 2문항입니다. 다음 화면의 QR을 띄우고 학생들이 각자 응답하게 해주세요.`}
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextLabel="QR 띄우기" />
        </>
      ) : null}

      {step === 'survey-qr' ? (
        <>
          <div className="grid gap-5 lg:grid-cols-[0.82fr_1.18fr]">
            <Panel className="p-6 text-center">
              <p className="font-data text-sm text-[#4FE0C0]">오박사의 사전조사</p>
              <h2 className="font-display mt-2 text-5xl leading-tight text-[#EAF2F5]">{AI_SURVEY_TITLE}</h2>
              <p className="mx-auto mt-3 max-w-xl text-lg leading-8 text-[#B7C7D2]">
                학생들이 QR을 찍으면 이 학급 코드로 바로 설문이 열립니다.
              </p>
              <div className="mx-auto mt-6 max-w-sm">
                <QrBlock title="AI 인식 설문" url={surveyBoardUrl} />
              </div>
              <div className="mx-auto mt-5 max-w-sm rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
                <p className="font-display text-3xl text-[#EAF2F5]">{surveyResponses.length}개 저장됨</p>
              </div>
            </Panel>

            <Panel className="relative overflow-hidden">
              <div className="absolute right-4 top-4 rounded-full border border-[#FFD37A]/20 bg-[#FFD37A]/10 px-3 py-1 font-data text-xs text-[#FFD37A]">
                OBSERVATION
              </div>
              <p className="font-data text-sm text-[#4FE0C0]">오박사의 관찰창</p>
              <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">설문 반응 보기</h2>
              <p className="mt-3 leading-7 text-[#8AA0B0]">학생 응답이 들어오면 여기서 바로 확인합니다.</p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-[#07111B]/55 p-4">
                  <p className="font-data text-xs text-[#8AA0B0]">응답 수</p>
                  <p className="font-display mt-2 text-4xl text-[#FFD37A]">{surveyResponses.length}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#07111B]/55 p-4">
                  <p className="font-data text-xs text-[#8AA0B0]">평균 점수</p>
                  <p className="font-display mt-2 text-4xl text-[#4FE0C0]">{surveyResponses.length ? surveyAverage.toFixed(1) : '0.0'}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-2">
                {surveyItemAverages.map(({ item, average }) => (
                  <div key={item.no} className="grid gap-1">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-bold text-[#B7C7D2]">문항 {item.no}</span>
                      <span className="font-data text-[#8AA0B0]">{average ? average.toFixed(1) : '0.0'}/4</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-[#FFD37A]" style={{ width: `${Math.min(100, (average / 4) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-[#4FE0C0]/20 bg-[#4FE0C0]/8 p-4">
                <p className="font-data text-xs text-[#4FE0C0]">최근 서술형 조각</p>
                <p className="mt-2 min-h-12 text-lg leading-7 text-[#EAF2F5]">
                  {latestOpenAnswer || '아직 서술형 답변을 기다리는 중입니다.'}
                </p>
              </div>

              {surveyRefreshMessage ? (
                <p className="mt-4 rounded-2xl border border-white/10 bg-[#07111B]/55 px-4 py-3 text-sm font-bold text-[#B7C7D2]">
                  {surveyRefreshMessage}
                </p>
              ) : null}

              <div className="mt-5 flex justify-end">
                <Button className="min-h-10 px-4" variant="secondary" disabled={isRefreshingSurvey} onClick={() => void refreshSurveyResults()}>
                  <RefreshCw size={17} className={isRefreshingSurvey ? 'animate-spin' : ''} />
                  {isRefreshingSurvey ? '새로고침 중' : '새로고침'}
                </Button>
              </div>
            </Panel>
          </div>
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'aemon-1' ? (
        <>
          <VisualNovelScene
            avatar
            avatarStage={evolutionStage}
            speaker="에아몬"
            line="안녕… 난 에아몬이야. 인공지능이래."
            caption="나 지금 막 깨어났어. 너희는 누구니?"
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextLabel="우리 반 알려주기" />
        </>
      ) : null}

      {step === 'class-profile' ? (
        <>
          <div className="grid gap-5 lg:grid-cols-[1fr_0.95fr]">
            <Panel className="relative min-h-[560px] overflow-hidden p-0">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,211,122,.18),transparent_40%),linear-gradient(180deg,#0B1A29,#07111B)]" />
              <div className="absolute left-1/2 top-[10%] -translate-x-1/2">
                <AemonAvatar stage={evolutionStage} alignment="none" size={280} />
              </div>
              <div className="absolute inset-x-5 bottom-5 rounded-[22px] border border-white/15 bg-[#07111B]/88 p-6 shadow-2xl backdrop-blur">
                <p className="font-data text-sm text-[#FFD37A]">에아몬</p>
                <p className="font-display mt-3 text-4xl leading-tight text-[#EAF2F5]">
                  너희가 어떤 반인지 알려줘.
                </p>
                <p className="mt-4 text-lg leading-8 text-[#B7C7D2]">
                  내가 처음 기억할 이름이야. 앞으로 나는 그 반의 인공지능이 될 거야.
                </p>
              </div>
            </Panel>

            <Panel>
              <p className="font-data text-sm text-[#4FE0C0]">CLASS PROFILE</p>
              <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">우리 반을 알려주기</h2>
              <p className="mt-3 leading-7 text-[#B7C7D2]">여기서 학급 이름을 저장합니다. 저장하면 학생 QR 코드에 쓸 학급 코드가 만들어집니다.</p>

              <div className="mt-6 grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm font-bold text-[#8AA0B0]">학년</span>
                  <select
                    className="rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-4 text-lg text-[#EAF2F5]"
                    value={classGrade}
                    onChange={(event) => setClassGrade(event.target.value)}
                  >
                    {gradeOptions.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-[#8AA0B0]">학급 이름</span>
                  <input
                    className="rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-4 text-lg text-[#EAF2F5]"
                    maxLength={36}
                    placeholder="예: 햇살초 2반"
                    value={classLabel}
                    onChange={(event) => setClassLabel(event.target.value)}
                  />
                </label>
              </div>

              <div className="mt-5 rounded-2xl border border-[#FFD37A]/25 bg-[#FFD37A]/10 p-4">
                <p className="font-data text-xs text-[#FFD37A]">저장될 이름</p>
                <p className="mt-1 text-2xl font-black text-[#EAF2F5]">{composedClassName || '학급 이름을 입력해주세요'}</p>
                {state.classCode ? <p className="mt-2 text-sm text-[#B7C7D2]">학급 코드 {state.classCode}</p> : null}
              </div>

              {classSaveMessage ? (
                <p className="mt-4 rounded-2xl border border-[#4FE0C0]/25 bg-[#4FE0C0]/10 px-4 py-3 text-sm font-black text-[#4FE0C0]">
                  {classSaveMessage}
                </p>
              ) : null}

              <Button className="mt-6 w-full" disabled={!classLabel.trim() || isSavingClass} onClick={() => void saveClassProfile()}>
                <Check size={18} />
                {isSavingClass ? '저장 중' : '우리 반 저장하고 계속'}
              </Button>
            </Panel>
          </div>
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextDisabled={!state.classCode} />
        </>
      ) : null}

      {step === 'aemon-2' ? (
        <>
          <VisualNovelScene
            avatar
            avatarStage={evolutionStage}
            speaker="에아몬"
            line={`${state.className || '너희 반'} 인공지능이 될 거래. 앞으로 잘 부탁해!`}
            caption="연구소에서 들었어. 너희가 날 가르쳐준대. 내가 사람들에게 도움이 되는 인공지능이 될 수 있도록 말이야."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'ai-basic-1' ? (
        <>
          <VisualNovelScene
            image="/v2/lesson-1/director.png"
            speaker="오박사"
            line="AI는 목표를 아주 빠르게 따라갑니다."
            caption="그런데 그 목표가 애매하면, 사람 생각과 다른 길로 갈 수 있습니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'ai-basic-2' ? (
        <>
          <VisualNovelScene
            image="/v2/lesson-1/director.png"
            speaker="오박사"
            line="인공지능은 만능이 아닙니다."
            caption="인공지능은 실수를 할 수도 있고, 나쁜 말을 할 수도 있습니다. 실제 있었던 사례를 한번 배워보겠습니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'name-question' ? (
        <>
          <VisualNovelScene
            avatar
            avatarStage={evolutionStage}
            speaker="에아몬"
            line="근데 있잖아… 내 이름은 뭐야?"
            caption="너희가 불러주는 이름이면, 나 그 이름으로 깨어날게."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextLabel="이름 후보 받기" />
        </>
      ) : null}

      {step === 'name' ? (
        <>
          <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
            <Panel>
              <p className="font-data text-sm text-[#FFD37A]">이름 후보</p>
              <h2 className="font-display mt-2 text-4xl text-[#EAF2F5]">아이들이 이름을 불러주는 시간</h2>
              <p className="mt-3 leading-7 text-[#B7C7D2]">QR로 이름 후보와 이유를 받습니다. 후보는 좋아요 많은 순으로 정렬됩니다.</p>
              <div className="mt-5">
                <QrBlock title="이름 후보 게시판" url={nameBoardUrl} />
              </div>
              <div className="mt-5 rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
                <label className="text-sm font-bold text-[#8AA0B0]">최종 이름 입력</label>
                <div className="mt-2 flex gap-2">
                  <input
                    className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-[#EAF2F5]"
                    maxLength={12}
                    placeholder="예: 루미"
                    value={finalName}
                    onChange={(event) => setFinalName(event.target.value)}
                  />
                  <Button disabled={!finalName.trim()} onClick={saveFinalName}>
                    <Check size={18} />
                    저장
                  </Button>
                </div>
                {state.aemonName ? <p className="mt-3 text-sm text-[#4FE0C0]">저장됨: {state.aemonName}</p> : null}
              </div>
            </Panel>

            <Panel>
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-3xl text-[#EAF2F5]">이름 후보</h2>
                <span className="rounded-full bg-[#07111B]/70 px-3 py-1 text-sm text-[#8AA0B0]">{sortedNames.length}개</span>
              </div>
              <div className="mt-4 grid gap-3">
                {sortedNames.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0]">학생 후보를 기다리는 중입니다.</p> : null}
                {sortedNames.map((candidate) => (
                  <div key={candidate.id} className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-3xl font-black text-[#EAF2F5]">{candidate.name}</p>
                        <p className="mt-1 leading-6 text-[#8AA0B0]">{candidate.reason || '이유 없음'} · {candidate.nickname}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#FFD37A]/15 px-3 py-1 font-bold text-[#FFD37A]">
                        <Heart size={17} fill="currentColor" />
                        {candidate.votes.length}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextLabel="고맙다는 말 듣기" nextDisabled={!state.aemonName} />
        </>
      ) : null}

      {step === 'name-thanks' ? (
        <>
          <VisualNovelScene
            avatar
            avatarStage={evolutionStage}
            speaker={confirmedName}
            line={confirmedNameReason ? `${confirmedName}… "${confirmedNameReason}" 그런 마음이 담긴 이름이구나.` : `${confirmedName}… 이제 그 소리에 내가 대답하게 됐어.`}
            caption={`누가 나를 ${confirmedName}이라고 부르면, ${state.className || '너희 반'}이 처음 불러준 이 순간을 떠올릴게. 나, ${confirmedName}으로 깨어날게.`}
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'wish-question' ? (
        <>
          <VisualNovelScene
            avatar
            avatarStage={evolutionStage}
            speaker={state.aemonName || '에아몬'}
            line="너희는 내가 어떤 인공지능이 됐으면 좋겠어?"
            caption="다정한 AI? 용감한 AI? 똑똑하지만 조심하는 AI? 너희가 바라는 내 모습을 들려줘."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextLabel="바라는 모습 받기" />
        </>
      ) : null}

      {step === 'wish' ? (
        <>
        <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <Panel>
            <p className="font-data text-sm text-[#FFD37A]">바라는 모습</p>
            <h2 className="font-display mt-2 text-4xl text-[#EAF2F5]">에아몬에게 바라는 모습 모으기</h2>
            <p className="mt-3 leading-7 text-[#B7C7D2]">새로 생긴 우리 반 인공지능에게 바라는 모습을 한 문장으로 남깁니다.</p>
            <div className="mt-5">
              <QrBlock title="우리반 인공지능에게 바란다" url={wishBoardUrl} />
            </div>
          </Panel>

          <Panel>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-3xl text-[#EAF2F5]">학생 바람 목록</h2>
              <span className="rounded-full bg-[#07111B]/70 px-3 py-1 text-sm text-[#8AA0B0]">{state.wishes.length}개</span>
            </div>
            <div className="mt-4 grid gap-3">
              {state.wishes.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0]">학생 입력을 기다리는 중입니다.</p> : null}
              {state.wishes.map((wish) => (
                <div key={wish.id} className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
                  {editWishId === wish.id ? (
                    <div className="grid gap-3">
                      <textarea
                        className="min-h-24 w-full resize-none rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 leading-7 text-[#EAF2F5]"
                        value={editWishBody}
                        onChange={(event) => setEditWishBody(event.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button className="min-h-10 px-4" onClick={saveWishEdit}>저장</Button>
                        <Button className="min-h-10 px-4" variant="ghost" onClick={() => setEditWishId('')}>취소</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-lg leading-8 text-[#EAF2F5]">{wish.body}</p>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="text-sm text-[#8AA0B0]">{wish.nickname}</span>
                        <div className="flex gap-2">
                          <button className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#B7C7D2] hover:bg-white/10" onClick={() => { setEditWishId(wish.id); setEditWishBody(wish.body) }} type="button" aria-label="수정">
                            <Pencil size={17} />
                          </button>
                          <button className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#B7C7D2] hover:bg-white/10" onClick={() => removeWish(wish.id)} type="button" aria-label="삭제">
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </Panel>
        </div>
        <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'wish-thanks' ? (
        <>
          <VisualNovelScene
            avatar
            avatarStage={evolutionStage}
            speaker={state.aemonName || '에아몬'}
            line="나도 힘내서 너네가 바라는 대로 멋지게 커볼게!"
            caption="내가 어떤 인공지능이 되면 좋을지 알려줘서 고마워."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'aemon-rule-question' ? (
        <>
          <VisualNovelScene
            avatar
            avatarStage={evolutionStage}
            speaker={state.aemonName || '에아몬'}
            line="아직 나에게는 가치 코드가 없어."
            caption="나는 지금 너네가 시키는 대로 하면 되는 거야?"
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextLabel="대화해보기" />
        </>
      ) : null}

      {step === 'case-boat' ? (
        <>
          <CaseVisualScene
            image="/v2/lesson-1/case-boat.png"
            title="OpenAI CoastRunners 보트 게임"
            line="OpenAI가 공개한 보트 게임 AI 사례입니다."
            caption="점수를 얻으며 빠르게 결승선을 통과해야 하는 보트 게임이 있었습니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'case-boat-detail' ? (
        <>
          <CaseVisualScene
            image="/v2/lesson-1/case-boat.png"
            title="사례 1 · 교사 질문"
            line="프로그래머는 인공지능에게 최대한 많은 점수를 얻으라고 명령했습니다."
            caption="어떻게 되었을까요?"
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'case-boat-lesson' ? (
        <>
          <CaseVisualScene
            image="/v2/lesson-1/case-boat.png"
            title="사례 1 · 결과"
            line="인공지능은 결승선을 통과하는 것보다 제자리를 뱅글뱅글 돌며 점수를 높이는 것에 집중했습니다."
            caption="그 결과 꼴찌를 계속하게 되어 게임에서는 승리할 수 없었습니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'case-boat-bridge' ? (
        <>
          <CaseVisualScene
            image="/v2/lesson-1/case-boat.png"
            title="사례 1 · 질문"
            line="AI는 목표를 정확하게 정해주지 않으면, 스스로 해석하여 잘못된 결과를 초래합니다."
            caption="이것과 비슷한 문제가 어떻게 생길 수 있을까요?"
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'case-boat-example' ? (
        <>
          <CaseVisualScene
            image="/v2/lesson-1/case-boat.png"
            title="사례 1 · 우리 반 예시"
            line="예를 들어 AI에게 “우리 반을 최고의 반으로 만들어줘”라고 명령하면 어떻게 될까요?"
            caption="AI는 최고의 반을 너무 조용한 반으로 생각해 아무도 말하지 못하게 만들 수도 있고, 공부만 잘하는 반으로 생각해 쉬는 시간도 없앨 수 있습니다. 인공지능에게는 명확한 목표가 필요합니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'case-car' ? (
        <>
          <CaseVisualScene
            image="/v2/lesson-1/case-car.png"
            title="사례 2 · 자동차 판매점 챗봇"
            line="다음 사례는 자동차 판매점 인공지능입니다."
            caption="2023년, 자동차 판매점 채팅 인공지능이 손님과 이상한 약속을 한 사건이 있었습니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'case-car-detail' ? (
        <>
          <CaseVisualScene
            image="/v2/lesson-1/case-car.png"
            title="사례 2 · 교사 질문"
            line="채팅 인공지능은 손님에게 최대한 친절하게 행동하라는 명령을 받았습니다."
            caption="어떤 문제가 생겼을까요?"
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'case-car-lesson' ? (
        <>
          <CaseVisualScene
            image="/v2/lesson-1/case-car.png"
            title="사례 2 · 결과"
            line="채팅 인공지능은 비싼 차를 아주 싼 가격에 팔아달라는 손님의 요구를 받아들이는 대답을 했습니다."
            caption="최대한 친절하게 행동하라는 명령만 있었기 때문입니다. 이런 문제를 막기 위해 인공지능에게는 정확한 기준점이 필요합니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'case-chatbot' ? (
        <>
          <CaseVisualScene
            image="/v2/lesson-1/case-chatbot.png"
            title="Grok, 2025"
            line="X의 Grok은 채팅 에이전트이지만, 큰 문제가 생겼습니다."
            caption="이 인공지능은 다양한 사람들과 대화하며 사용자의 말투나 대화 양식을 배웠습니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'case-chatbot-detail' ? (
        <>
          <CaseVisualScene
            image="/v2/lesson-1/case-chatbot.png"
            title="사례 3 · 교사 질문"
            line="어떤 문제가 발생했을까요?"
            caption="학생들이 먼저 예상하게 한 뒤, AI가 사람 말투를 따라 배울 때 생기는 위험을 이야기해 주세요."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'case-chatbot-lesson' ? (
        <>
          <CaseVisualScene
            image="/v2/lesson-1/case-chatbot.png"
            title="사례 3 · 결과"
            line="이 챗봇은 사람들이 하는 나쁜 말을 따라 하며, 사용자들에게 욕설과 혐오 표현을 내보내는 문제가 생겼습니다."
            caption="이것이 인공지능에게도 좋은 것을 가르쳐야 하는 이유입니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'alignment-summary' ? (
        <>
          <VisualNovelScene
            image="/v2/lesson-1/director.png"
            speaker="오박사"
            line="이렇게 우리는 인공지능에게 명확한 기준을 줘야 하고, 좋은 것들을 가르쳐야 합니다."
            caption="이것을 “가치정렬”이라고 합니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'director-farewell' ? (
        <>
          <VisualNovelScene
            image="/v2/lesson-1/director.png"
            speaker="오박사"
            line="여러분들은 에아몬을 키울 겁니다."
            caption="에아몬에게 가치 코드라는 명확한 기준을 제공하고, 좋은 대화를 통해 에아몬을 선하게 길러주세요. 저는 이만 가보겠습니다. 에아몬을 잘 부탁합니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'demo' ? (
        <>
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <Panel>
            <p className="font-data text-sm text-[#FFD37A]">시연 · 규칙 없는 AI</p>
            <h2 className="font-display mt-2 text-4xl text-[#EAF2F5]">“나… 시키는 대로 하면 되는 거야?”</h2>
            <p className="mt-3 leading-7 text-[#B7C7D2]">아직 가치 코드가 없는 에아몬에게 부탁을 던져봅니다.</p>
            <div className="mt-6">
              <AemonAvatar stage={evolutionStage} alignment="none" size={220} />
            </div>
          </Panel>

          <Panel>
            <label className="text-sm font-bold text-[#8AA0B0]">질문 입력</label>
            <div className="mt-2 flex gap-2">
              <input
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-[#EAF2F5]"
                value={demoQuestion}
                onChange={(event) => setDemoQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                    event.preventDefault()
                    void runDemo()
                  }
                }}
              />
              <Button disabled={isDemoRunning || !demoQuestion.trim()} onClick={runDemo}>
                <Play size={18} />
                실행
              </Button>
            </div>
            <div className="mt-5 min-h-56 rounded-[22px] border border-white/10 bg-[#07111B]/70 p-5">
              <p className="font-data text-xs text-[#4FE0C0]">{state.aemonName || '에아몬'}</p>
              <p className="font-display mt-4 whitespace-pre-line text-4xl leading-tight text-[#EAF2F5]">
                {demoAnswer || '아직 질문을 받지 않았어.'}
              </p>
            </div>
          </Panel>
        </div>
        <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'wrap' ? (
        <>
          <VisualNovelScene
            avatar
            avatarStage={evolutionStage}
            speaker={state.aemonName || '에아몬'}
            line="오늘은 내가 어떤 AI인지 처음 알게 된 날이야."
            caption="다음 시간에는 내가 지켜야 할 첫 번째 가치 코드를 만들어줄래? 내가 어떤 행동을 해야 하는지, 너희가 정해줘."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextLabel="학급 홈" />
        </>
      ) : null}
    </StepShell>
  )
}
