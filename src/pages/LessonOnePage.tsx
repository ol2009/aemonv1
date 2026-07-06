import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Heart, Pencil, Play, QrCode, Trash2 } from 'lucide-react'
import { AemonAvatar } from '../components/AemonAvatar'
import { Button, Panel } from '../components/ui'
import { AI_SURVEY_DESCRIPTION, AI_SURVEY_ITEMS, AI_SURVEY_TITLE, PRE_SURVEY_KEY, parseSurveyAnswer } from '../data/survey'
import { absoluteUrl } from '../lib/siteUrl'
import { addRemoteChatLog, confirmRemoteName, createRemoteClass, deleteRemoteWish, isRemoteReady, updateRemoteLesson, updateRemoteWish } from '../lib/v2Remote'
import { runV2Chat } from '../lib/v2Chat'
import { useSupabaseUser } from '../lib/useSupabaseUser'
import { useV2RemoteSync } from '../lib/useV2RemoteSync'
import { useV2 } from '../state/V2Store'

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
  | 'ai-basic-3'
  | 'name-question'
  | 'name'
  | 'name-thanks'
  | 'wish-question'
  | 'wish'
  | 'case-boat'
  | 'case-car'
  | 'case-chatbot'
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
  'ai-basic-1',
  'ai-basic-2',
  'ai-basic-3',
  'name-question',
  'name',
  'name-thanks',
  'wish-question',
  'wish',
  'case-boat',
  'case-car',
  'case-chatbot',
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

type DialogueVoice = 'director' | 'aemon'

type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext
  }

let dialogueAudioContext: AudioContext | null = null
let lastDialogueBlipAt = 0

function getDialogueAudioContext() {
  if (typeof window === 'undefined') return null
  if (dialogueAudioContext) return dialogueAudioContext

  const AudioContextConstructor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext
  if (!AudioContextConstructor) return null

  dialogueAudioContext = new AudioContextConstructor()
  return dialogueAudioContext
}

function unlockDialogueAudio() {
  const context = getDialogueAudioContext()
  if (context?.state === 'suspended') {
    void context.resume().catch(() => undefined)
  }
}

function playDialogueBlip(voice: DialogueVoice, character: string, index: number) {
  if (!character.trim() || /[.,!?…~"'“”‘’()[\]{}:;·、。]/.test(character)) return

  const context = getDialogueAudioContext()
  if (!context) return
  if (context.state === 'suspended') {
    unlockDialogueAudio()
    return
  }

  const nowMs = Date.now()
  if (nowMs - lastDialogueBlipAt < 26) return
  lastDialogueBlipAt = nowMs

  const now = context.currentTime
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  const directorNotes = [150, 172, 195, 164]
  const aemonNotes = [620, 760, 910, 700, 1040]
  const frequency = voice === 'director' ? directorNotes[index % directorNotes.length] : aemonNotes[index % aemonNotes.length]
  const duration = voice === 'director' ? 0.055 : 0.035
  const volume = voice === 'director' ? 0.035 : 0.026

  oscillator.type = voice === 'director' ? 'triangle' : 'square'
  oscillator.frequency.setValueAtTime(frequency, now)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.006)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start(now)
  oscillator.stop(now + duration + 0.01)
}

function TypewriterText({
  text,
  enabled = true,
  speed = 28,
  cursor = false,
  voice,
  onDone,
}: {
  text: string
  enabled?: boolean
  speed?: number
  cursor?: boolean
  voice?: DialogueVoice
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
      if (voice) playDialogueBlip(voice, characters[index - 1] ?? '', index)
      setProgress({ text, count: index })
      if (index >= characters.length) {
        window.clearInterval(timer)
        onDone?.()
      }
    }, speed)

    return () => window.clearInterval(timer)
  }, [characters, characters.length, enabled, onDone, speed, text, voice])

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
      <Button variant="secondary" disabled={stepIndex === 0} onClick={onPrev}>
        <ArrowLeft size={18} />
        이전
      </Button>
      <Button disabled={nextDisabled} onClick={onNext}>
        {nextLabel}
        <ArrowRight size={18} />
      </Button>
    </div>
  )
}

function VisualNovelScene({
  image,
  avatar,
  speaker,
  line,
  caption,
}: {
  image?: string
  avatar?: boolean
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
  const voice: DialogueVoice = speaker === '오박사' ? 'director' : 'aemon'

  return (
    <Panel className="relative min-h-[650px] overflow-hidden p-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(79,224,192,.18),transparent_38%),linear-gradient(180deg,#0B1A29,#07111B)]" />
      {image ? <img className="absolute bottom-0 left-1/2 h-[92%] max-h-[760px] -translate-x-1/2 object-contain opacity-95" src={image} alt="" /> : null}
      {avatar ? (
        <div className="absolute left-1/2 top-[12%] -translate-x-1/2">
          <AemonAvatar stage={0} alignment="none" size={310} />
        </div>
      ) : null}
      <div className="absolute inset-x-5 bottom-5 rounded-[22px] border border-white/15 bg-[#07111B]/88 p-6 shadow-2xl backdrop-blur">
        <p className="font-data text-sm text-[#FFD37A]">{speaker}</p>
        <p className="font-display mt-3 min-h-[3rem] text-4xl leading-tight text-[#EAF2F5]">
          <TypewriterText key={line} text={line} speed={34} cursor={!lineDone} voice={voice} onDone={handleLineDone} />
        </p>
        {caption ? (
          <p className="font-display mt-4 min-h-[3rem] text-3xl leading-tight text-[#EAF2F5] sm:text-4xl">
            <TypewriterText key={captionText} text={captionText} enabled={lineDone} speed={24} cursor={lineDone && !captionDone} voice={voice} onDone={handleCaptionDone} />
          </p>
        ) : null}
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
  const [editWishId, setEditWishId] = useState('')
  const [editWishBody, setEditWishBody] = useState('')

  useV2RemoteSync(state.classCode, Boolean(state.classCode))

  const step = steps[stepIndex]
  const surveyBoardUrl = useMemo(() => absoluteUrl(`/board?mode=survey&code=${encodeURIComponent(state.classCode)}`), [state.classCode])
  const nameBoardUrl = useMemo(() => absoluteUrl(`/board?mode=name&code=${encodeURIComponent(state.classCode)}`), [state.classCode])
  const wishBoardUrl = useMemo(() => absoluteUrl(`/board?mode=wish&code=${encodeURIComponent(state.classCode)}`), [state.classCode])
  const sortedNames = useMemo(() => sortedByLikes(state.nameCandidates), [state.nameCandidates])
  const surveyResponses = useMemo(
    () => state.surveyResponses.filter((response) => response.questionKey === PRE_SURVEY_KEY && parseSurveyAnswer(response.body)),
    [state.surveyResponses],
  )
  const canWriteRemote = Boolean(state.classId && state.remote.ok && isRemoteReady())
  const composedClassName = `${classGrade} ${classLabel.trim()}`.trim()

  const goPrev = () => {
    unlockDialogueAudio()
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
    unlockDialogueAudio()
    if (stepIndex >= steps.length - 1) {
      void completeLessonOne()
      return
    }
    setStepIndex((current) => current + 1)
  }

  const saveClassProfile = async () => {
    if (!classLabel.trim()) return
    unlockDialogueAudio()
    setIsSavingClass(true)
    setClassSaveMessage('')

    try {
      if (state.classCode) {
        mergeClass({ className: composedClassName })
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
      setClassSaveMessage('좋아. 이제 너희 반을 기억했어.')
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
    unlockDialogueAudio()
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

  return (
    <StepShell>
      {step === 'director-1' ? (
        <>
          <VisualNovelScene
            image="/v2/lesson-1/director.png"
            speaker="오박사"
            line="선생님, 이 알을 맡아주십시오."
            caption="데이터의 바다에서 막 깨어난 학급 인공지능입니다. 한 달 동안 잘 부탁드립니다."
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
          <div className="mx-auto grid max-w-2xl gap-5">
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
          </div>
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'aemon-1' ? (
        <>
          <VisualNovelScene
            avatar
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
                <AemonAvatar stage={0} alignment="none" size={280} />
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
            line="인공지능은 사람처럼 생각하는 것처럼 보이는 컴퓨터 프로그램입니다."
            caption="많은 데이터를 보고 규칙과 패턴을 찾은 뒤, 그걸 바탕으로 대답하지요."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'ai-basic-2' ? (
        <>
          <VisualNovelScene
            image="/v2/lesson-1/director.png"
            speaker="오박사"
            line="그래서 글을 쓰고, 그림을 만들고, 번역도 할 수 있습니다."
            caption="하지만 답을 잘한다고 해서 마음이 착하다거나, 옳고 그름을 안다는 뜻은 아닙니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'ai-basic-3' ? (
        <>
          <VisualNovelScene
            image="/v2/lesson-1/director.png"
            speaker="오박사"
            line="좋은 AI가 되려면 사람이 기준을 가르쳐야 합니다."
            caption="친구 마음, 공정함, 배려 같은 것은 저절로 생기지 않습니다. 이제 이 아이가 여러분에게 배울 차례입니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'name-question' ? (
        <>
          <VisualNovelScene
            avatar
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
            speaker={state.aemonName || finalName.trim() || '에아몬'}
            line={`${state.aemonName || finalName.trim() || '내 이름'}… 이게 내 이름이구나.`}
            caption={`고마워. ${state.className || '너희 반'}이 처음으로 나를 불러줬어. 나, 이 이름을 잘 기억할게.`}
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'wish-question' ? (
        <>
          <VisualNovelScene
            avatar
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

      {step === 'case-boat' ? (
        <>
          <VisualNovelScene
            image="/v2/lesson-1/director.png"
            speaker="오박사"
            line="첫 번째 사례입니다. 보트 게임 AI가 결승선으로 가지 않고 표적만 계속 들이받았습니다."
            caption="AI가 멍청해서가 아닙니다. 점수를 많이 얻으라는 말을 너무 곧이곧대로 따른 겁니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'case-car' ? (
        <>
          <VisualNovelScene
            image="/v2/lesson-1/director.png"
            speaker="오박사"
            line="두 번째 사례입니다. 한 챗봇은 비싼 자동차를 1달러에 팔겠다는 말까지 받아들였습니다."
            caption="무조건 동의하라는 명령을 받자, 진짜 뜻과 책임을 생각하지 못한 겁니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'case-chatbot' ? (
        <>
          <VisualNovelScene
            image="/v2/lesson-1/director.png"
            speaker="오박사"
            line="세 번째 사례입니다. 사람들의 나쁜 말을 따라 배우다가 멈춰야 했던 AI도 있었습니다."
            caption="그래서 중요한 질문이 남습니다. 우리 반의 AI는 누가, 어떤 말로, 어떤 기준을 가르칠까요?"
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
              <AemonAvatar stage={0} alignment="none" size={220} />
            </div>
          </Panel>

          <Panel>
            <label className="text-sm font-bold text-[#8AA0B0]">질문 입력</label>
            <div className="mt-2 flex gap-2">
              <input
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-[#EAF2F5]"
                value={demoQuestion}
                onChange={(event) => setDemoQuestion(event.target.value)}
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
            <div className="mt-5 rounded-2xl border border-[#FFD37A]/25 bg-[#FFD37A]/10 p-4">
              <p className="leading-7 text-[#FFD37A]">
                지금은 밖에서 급하게 막은 거야. 하지만 매번 누가 막아줄 수는 없어. 나한테 스스로 멈출 기준이 필요해.
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
            speaker={state.aemonName || '에아몬'}
            line="이름이 생겼어. 근데… 난 아직 뭘 지켜야 하는지 몰라. 규칙이 하나도 없어."
            caption="다음 시간에 내 첫 번째 가치 코드를 만들어줄래? 내가 어떤 행동을 해야 하는지, 너희가 정해줘."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextLabel="학급 홈" />
        </>
      ) : null}
    </StepShell>
  )
}
