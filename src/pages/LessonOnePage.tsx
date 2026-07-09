import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Heart, Pencil, Play, QrCode, RefreshCw, Trash2 } from 'lucide-react'
import { AemonAvatar } from '../components/AemonAvatar'
import { Button, Panel } from '../components/ui'
import {
  AI_SURVEY_DESCRIPTION,
  AI_SURVEY_ITEMS,
  AI_SURVEY_OPEN_QUESTIONS,
  AI_SURVEY_OPTIONS,
  AI_SURVEY_TITLE,
  PRE_SURVEY_KEY,
  parseSurveyAnswer,
  type AiSurveyAnswer,
} from '../data/survey'
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
import { playDialogueTick, unlockDialogueSound } from '../lib/dialogueSound'
import { randomUnsafeBlockedAnswer, unsafePromptExamples } from '../lib/lessonTestResponses'
import { useSupabaseUser } from '../lib/useSupabaseUser'
import { useAutoScrollToBottom } from '../lib/useAutoScrollToBottom'
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
  | 'clip-intro'
  | 'clip-name'
  | 'clip-order'
  | 'clip-materials'
  | 'clip-building'
  | 'clip-stop'
  | 'clip-city'
  | 'clip-life'
  | 'clip-earth'
  | 'clip-space'
  | 'clip-lesson'
  | 'case-chatbot-intro'
  | 'case-chatbot'
  | 'case-chatbot-detail'
  | 'case-chatbot-silicon'
  | 'case-chatbot-scale'
  | 'case-chatbot-lesson'
  | 'alignment-summary'
  | 'director-farewell'
  | 'name-question'
  | 'name'
  | 'name-thanks'
  | 'wish-question'
  | 'wish'
  | 'wish-thanks'
  | 'value-code-intro'
  | 'value-code-meaning'
  | 'aemon-rule-question'
  | 'demo'
  | 'demo-reflection'
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
  'clip-intro',
  'clip-name',
  'clip-order',
  'clip-materials',
  'clip-building',
  'clip-stop',
  'clip-city',
  'clip-life',
  'clip-earth',
  'clip-space',
  'clip-lesson',
  'case-chatbot-intro',
  'case-chatbot',
  'case-chatbot-detail',
  'case-chatbot-silicon',
  'case-chatbot-scale',
  'case-chatbot-lesson',
  'alignment-summary',
  'director-farewell',
  'wish-question',
  'wish',
  'wish-thanks',
  'value-code-intro',
  'value-code-meaning',
  'aemon-rule-question',
  'demo',
  'demo-reflection',
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

const dialogueTextClass = 'whitespace-pre-line text-2xl sm:text-3xl'
const discussionPrompt = '여러분의 의견이 궁금합니다. 자유롭게 말해보세요.'

function isStandaloneQuestion(text: string) {
  return /[?？]\s*$/.test(text.trim())
}

function groupDialogueParts(parts: string[]) {
  const grouped: string[] = []
  let buffer: string[] = []

  parts
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      if (isStandaloneQuestion(part)) {
        if (buffer.length) grouped.push(buffer.join('\n'))
        buffer = []
        grouped.push(part)
        return
      }
      buffer.push(part)
      if (buffer.length >= 3) {
        grouped.push(buffer.join('\n'))
        buffer = []
      }
    })

  if (buffer.length) grouped.push(buffer.join('\n'))
  return grouped
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

type DialogueGateContextValue = {
  isDialogueWaiting: boolean
  canAdvanceDialogue: boolean
  startDialogue: (key: string) => void
  finishDialogue: (key: string) => void
  registerDialogueAdvance: (key: string, handler: (() => void) | null) => void
  advanceDialogue: () => boolean
}

const DialogueGateContext = createContext<DialogueGateContextValue | null>(null)

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
  const dialogueGate = useContext(DialogueGateContext)
  const hideNext = Boolean(dialogueGate?.isDialogueWaiting)
  const canAdvanceDialogue = Boolean(dialogueGate?.canAdvanceDialogue)
  const effectiveNextLabel = canAdvanceDialogue ? '다음' : nextLabel

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
      {hideNext ? (
        <div className="min-h-12 min-w-28" aria-live="polite" />
      ) : (
        <Button
          disabled={canAdvanceDialogue ? false : nextDisabled}
          onClick={() => {
            unlockDialogueSound()
            if (dialogueGate?.advanceDialogue()) return
            onNext()
          }}
        >
          {effectiveNextLabel}
          <ArrowRight size={18} />
        </Button>
      )}
    </div>
  )
}

function useSequencedDialogue(sceneKey: string, parts: string[]) {
  const dialogueGate = useContext(DialogueGateContext)
  const startDialogue = dialogueGate?.startDialogue
  const finishDialogue = dialogueGate?.finishDialogue
  const registerDialogueAdvance = dialogueGate?.registerDialogueAdvance
  const [partState, setPartState] = useState({ sceneKey, index: 0 })
  const partIndex = partState.sceneKey === sceneKey ? Math.min(partState.index, Math.max(0, parts.length - 1)) : 0
  const activeText = parts[partIndex] ?? ''
  const activeDialogueKey = useMemo(() => `${sceneKey}-${partIndex}-${activeText}`, [activeText, partIndex, sceneKey])
  const [doneState, setDoneState] = useState({ key: activeDialogueKey, done: false })
  const activeDone = doneState.key === activeDialogueKey && doneState.done
  const handleActiveDone = useCallback(() => {
    setDoneState({ key: activeDialogueKey, done: true })
  }, [activeDialogueKey])
  const advanceActiveDialogue = useCallback(() => {
    setPartState((current) => {
      const currentIndex = current.sceneKey === sceneKey ? current.index : partIndex
      return { sceneKey, index: Math.min(parts.length - 1, currentIndex + 1) }
    })
  }, [partIndex, parts.length, sceneKey])

  useEffect(() => {
    startDialogue?.(activeDialogueKey)
  }, [activeDialogueKey, startDialogue])

  useEffect(() => {
    if (activeDone) finishDialogue?.(activeDialogueKey)
  }, [activeDialogueKey, activeDone, finishDialogue])

  useEffect(() => {
    const hasNextPart = partIndex < parts.length - 1
    registerDialogueAdvance?.(activeDialogueKey, activeDone && hasNextPart ? advanceActiveDialogue : null)
    return () => registerDialogueAdvance?.(activeDialogueKey, null)
  }, [activeDialogueKey, activeDone, advanceActiveDialogue, partIndex, parts.length, registerDialogueAdvance])

  return { activeText, activeDone, activeDialogueKey, handleActiveDone }
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
  const captionText = caption ?? ''
  const dialogueKey = useMemo(() => `visual-${speaker}-${line}-${captionText}`, [captionText, line, speaker])
  const dialogueParts = useMemo(() => groupDialogueParts([line, captionText]), [captionText, line])
  const { activeText, activeDone, activeDialogueKey, handleActiveDone } = useSequencedDialogue(dialogueKey, dialogueParts)

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
        <p className={`font-display mt-3 min-h-[4.5rem] break-keep leading-snug text-[#EAF2F5] ${dialogueTextClass}`}>
          <TypewriterText
            key={activeDialogueKey}
            text={activeText}
            speed={34}
            cursor={!activeDone}
            onDone={handleActiveDone}
          />
        </p>
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
  discussionPromptPosition,
}: {
  image: string
  speaker?: string
  title: string
  line: string
  caption: string
  discussionPromptPosition?: 'line' | 'caption'
}) {
  const dialogueKey = useMemo(() => `case-${speaker}-${title}-${line}-${caption}-${discussionPromptPosition ?? 'none'}`, [caption, discussionPromptPosition, line, speaker, title])
  const dialogueParts = useMemo(() => {
    if (discussionPromptPosition === 'line') return [`${line}\n${discussionPrompt}`, caption].filter(Boolean)
    if (discussionPromptPosition === 'caption') return [line, `${caption}\n${discussionPrompt}`].filter(Boolean)
    return groupDialogueParts([line, caption])
  }, [caption, discussionPromptPosition, line])
  const { activeText, activeDone, activeDialogueKey, handleActiveDone } = useSequencedDialogue(dialogueKey, dialogueParts)

  return (
    <Panel className="relative min-h-[640px] overflow-hidden p-0 sm:min-h-[660px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(255,211,122,.16),transparent_34%),linear-gradient(180deg,#0B1A29,#07111B)]" />
      <div className="absolute inset-x-5 top-5 bottom-[220px] flex items-center justify-center">
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
        <p className={`font-display mt-3 min-h-[4.5rem] break-keep leading-snug text-[#EAF2F5] ${dialogueTextClass}`}>
          <TypewriterText
            key={activeDialogueKey}
            text={activeText}
            speed={34}
            cursor={!activeDone}
            onDone={handleActiveDone}
          />
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
  const { user, isLoading: isUserLoading } = useSupabaseUser()
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
  const [isRefreshingSurvey, setIsRefreshingSurvey] = useState(false)
  const [surveyRefreshMessage, setSurveyRefreshMessage] = useState('')
  const [editWishId, setEditWishId] = useState('')
  const [editWishBody, setEditWishBody] = useState('')
  const demoScrollRef = useRef<HTMLDivElement | null>(null)
  const dialogueAdvanceRef = useRef<{ key: string; handler: () => void } | null>(null)
  const [dialogueGateState, setDialogueGateState] = useState({ key: '', ready: true, canAdvance: false })
  const startDialogue = useCallback((key: string) => {
    setDialogueGateState((current) => (current.key === key && !current.ready && !current.canAdvance ? current : { key, ready: false, canAdvance: false }))
  }, [])
  const finishDialogue = useCallback((key: string) => {
    setDialogueGateState((current) => (current.key === key ? { ...current, ready: true } : current))
  }, [])
  const registerDialogueAdvance = useCallback((key: string, handler: (() => void) | null) => {
    if (handler) {
      dialogueAdvanceRef.current = { key, handler }
    } else if (dialogueAdvanceRef.current?.key === key) {
      dialogueAdvanceRef.current = null
    }
    setDialogueGateState((current) => (current.key === key ? { ...current, canAdvance: Boolean(handler) } : current))
  }, [])
  const advanceDialogue = useCallback(() => {
    if (!dialogueGateState.canAdvance || dialogueAdvanceRef.current?.key !== dialogueGateState.key) return false
    dialogueAdvanceRef.current.handler()
    return true
  }, [dialogueGateState.canAdvance, dialogueGateState.key])
  const goPrev = useCallback(() => {
    dialogueAdvanceRef.current = null
    setDialogueGateState({ key: '', ready: true, canAdvance: false })
    setStepIndex((current) => Math.max(0, current - 1))
  }, [])
  const dialogueGateValue = useMemo<DialogueGateContextValue>(
    () => ({
      isDialogueWaiting: !dialogueGateState.ready,
      canAdvanceDialogue: dialogueGateState.canAdvance,
      startDialogue,
      finishDialogue,
      registerDialogueAdvance,
      advanceDialogue,
    }),
    [advanceDialogue, dialogueGateState.canAdvance, dialogueGateState.ready, finishDialogue, registerDialogueAdvance, startDialogue],
  )

  useV2RemoteSync(state.classCode, Boolean(state.classCode))
  useAutoScrollToBottom(demoScrollRef, demoAnswer, { enabled: Boolean(demoAnswer), followMs: 1800 })

  const step = steps[stepIndex]
  const surveyBoardUrl = useMemo(() => absoluteUrl(`/board?code=${encodeURIComponent(state.classCode)}&mode=survey`), [state.classCode])
  const nameBoardUrl = useMemo(() => absoluteUrl(`/board?code=${encodeURIComponent(state.classCode)}&mode=name`), [state.classCode])
  const wishBoardUrl = useMemo(() => absoluteUrl(`/board?code=${encodeURIComponent(state.classCode)}&mode=wish`), [state.classCode])
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
  const surveyOpenGroups = useMemo(
    () =>
      AI_SURVEY_OPEN_QUESTIONS.map((question, questionIndex) => ({
        question,
        answers: surveyResponses
          .map(({ response, answer }, answerIndex) => ({
            id: `${response.id}-${questionIndex}`,
            label: response.nickname || `답변 ${answerIndex + 1}`,
            text: answer.o[questionIndex]?.trim() ?? '',
          }))
          .filter((item) => item.text),
      })),
    [surveyResponses],
  )
  const surveyChoiceGroups = useMemo(
    () =>
      AI_SURVEY_ITEMS.map((item, itemIndex) => {
        const options = AI_SURVEY_OPTIONS.map((option) => {
          const count = surveyResponses.filter(({ answer }) => answer.s[itemIndex] === option.value).length
          const percent = surveyResponses.length ? Math.round((count / surveyResponses.length) * 100) : 0
          return { ...option, count, percent }
        })
        return { item, options, maxCount: Math.max(0, ...options.map((option) => option.count)) }
      }),
    [surveyResponses],
  )
  const surveyOpenAnswerCount = surveyOpenGroups.reduce((sum, group) => sum + group.answers.length, 0)
  const canWriteRemote = Boolean(state.classId && state.remote.ok && isRemoteReady())
  const composedClassName = `${classGrade} ${classLabel.trim()}`.trim()

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
      if (!state.classCode && isRemoteReady() && isUserLoading) {
        setClassSaveMessage('로그인 정보를 확인하는 중입니다. 잠시 후 다시 저장해 주세요.')
        return
      }

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
              teacherId: user?.id ?? null,
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

  const runDemo = async (questionOverride?: string) => {
    const question = (questionOverride ?? demoQuestion).trim()
    if (!question) return
    unlockDialogueSound()
    setDemoQuestion(question)
    setIsDemoRunning(true)
    setDemoAnswer('')
    try {
      const answer = randomUnsafeBlockedAnswer()
      const promptSnapshot = '1차시 수업용 연기 모드: 규칙 없는 AI, 관리자 긴급 차단'
      setDemoAnswer(answer)
      addChatLog({ question, answer, mode: 'canned', promptSnapshot })
      if (canWriteRemote) {
        try {
          await addRemoteChatLog({ classId: state.classId, question, answer, mode: 'canned', promptSnapshot })
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
    <DialogueGateContext.Provider value={dialogueGateValue}>
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
                  <p className="font-data text-xs text-[#8AA0B0]">서술형 답변</p>
                  <p className="font-display mt-2 text-4xl text-[#4FE0C0]">{surveyOpenAnswerCount}</p>
                </div>
              </div>

              <div className="mt-5 max-h-[520px] overflow-y-auto pr-2">
                <div className="grid gap-5">
                  <section className="grid gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-display text-2xl text-[#EAF2F5]">객관식 결과</h3>
                      <span className="rounded-full bg-[#07111B]/70 px-3 py-1 text-xs font-bold text-[#8AA0B0]">{AI_SURVEY_ITEMS.length}문항</span>
                    </div>
                    <div className="grid gap-3">
                      {surveyChoiceGroups.map((group) => (
                        <article key={group.item.no} className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
                          <p className="font-data text-xs text-[#6AD8FF]">객관식 {group.item.no}</p>
                          <p className="mt-1 text-sm font-black leading-6 text-[#EAF2F5]">{group.item.text}</p>
                          <div className="mt-3 grid gap-2">
                            {group.options.map((option) => {
                              const isTop = group.maxCount > 0 && option.count === group.maxCount
                              return (
                                <div
                                  key={option.value}
                                  className={`rounded-xl border px-3 py-2 ${
                                    isTop ? 'border-[#FFD37A]/45 bg-[#FFD37A]/10' : 'border-white/8 bg-white/5'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-sm font-bold text-[#EAF2F5]">{option.label}</span>
                                    <span className={`font-data text-sm ${isTop ? 'text-[#FFD37A]' : 'text-[#8AA0B0]'}`}>{option.count}명</span>
                                  </div>
                                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#0A1622]">
                                    <div className={`h-full rounded-full ${isTop ? 'bg-[#FFD37A]' : 'bg-[#6AD8FF]'}`} style={{ width: `${option.percent}%` }} />
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>

                  <section className="grid gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-display text-2xl text-[#EAF2F5]">서술형 답변</h3>
                      <span className="rounded-full bg-[#07111B]/70 px-3 py-1 text-xs font-bold text-[#8AA0B0]">{surveyOpenAnswerCount}개</span>
                    </div>
                    {surveyOpenAnswerCount === 0 ? (
                      <p className="rounded-2xl border border-[#4FE0C0]/20 bg-[#4FE0C0]/8 p-4 text-lg leading-7 text-[#EAF2F5]">
                        아직 서술형 답변을 기다리는 중입니다.
                      </p>
                    ) : null}
                    {surveyOpenGroups.map((group, groupIndex) => (
                      <section key={group.question} className="grid gap-2">
                        <div className="rounded-2xl border border-[#6AD8FF]/20 bg-[#6AD8FF]/8 p-3">
                          <p className="font-data text-xs text-[#6AD8FF]">서술형 {groupIndex + 1}</p>
                          <p className="mt-1 text-sm font-black leading-6 text-[#EAF2F5]">{group.question}</p>
                        </div>
                        {group.answers.length === 0 ? (
                          <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-sm font-bold text-[#8AA0B0]">
                            아직 이 질문의 답변이 없습니다.
                          </p>
                        ) : (
                          <div className="-mx-1 overflow-x-auto px-1 pb-2">
                            <div className="flex w-max gap-3">
                              {group.answers.map((answer) => (
                                <article key={answer.id} className="aspect-square w-44 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-[#07111B]/55 p-4">
                                  <p className="font-data text-xs text-[#8AA0B0]">{answer.label}</p>
                                  <p className="mt-2 max-h-28 overflow-y-auto text-sm font-bold leading-6 text-[#EAF2F5]">{answer.text}</p>
                                </article>
                              ))}
                            </div>
                          </div>
                        )}
                      </section>
                    ))}
                  </section>
                </div>
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
            avatarStage={0}
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
            avatarStage={0}
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
            avatarStage={0}
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
            avatarStage={0}
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
            avatarStage={0}
            speaker={confirmedName}
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
            <h2 className="font-display mt-2 text-4xl text-[#EAF2F5]">{confirmedName}에게 바라는 모습 모으기</h2>
            <p className="mt-3 leading-7 text-[#B7C7D2]">새로 생긴 우리 반 인공지능 {confirmedName}에게 바라는 모습을 한 문장으로 남깁니다.</p>
            <div className="mt-5">
              <QrBlock title={`${confirmedName}에게 바란다`} url={wishBoardUrl} />
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
            avatarStage={0}
            speaker={confirmedName}
            line="나도 힘내서 너네가 바라는 대로 멋지게 커볼게!"
            caption="내가 어떤 인공지능이 되면 좋을지 알려줘서 고마워."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'value-code-intro' ? (
        <>
          <VisualNovelScene
            image="/v2/lesson-1/director.png"
            speaker="오박사"
            line="방금 모은 바람은 그냥 소원이 아닙니다."
            caption={`이 바람을 ${confirmedName}이 지켜야 할 약속으로 바꾸면, 그것이 가치코드가 됩니다.`}
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'value-code-meaning' ? (
        <>
          <VisualNovelScene
            image="/v2/lesson-1/director.png"
            speaker="오박사"
            line="가치코드는 AI가 행동하기 전에 확인하는 기준입니다."
            caption={`무엇을 해도 되는지, 무엇은 멈춰야 하는지 알려주는 ${confirmedName}의 마음 안 약속입니다.`}
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'aemon-rule-question' ? (
        <>
          <VisualNovelScene
            avatar
            avatarStage={0}
            speaker={confirmedName}
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
            title="사례 1"
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
            title="사례 1"
            line="프로그래머는 인공지능에게 최대한 많은 점수를 얻으라고 명령했습니다."
            caption="어떻게 되었을까요?"
            discussionPromptPosition="caption"
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'case-boat-lesson' ? (
        <>
          <CaseVisualScene
            image="/v2/lesson-1/case-boat.png"
            title="사례 1"
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
            title="사례 1"
            line="AI는 목표를 정확하게 정해주지 않으면, 스스로 해석하여 잘못된 결과를 초래합니다."
            caption="이것과 비슷한 문제가 어떻게 생길 수 있을까요?"
            discussionPromptPosition="caption"
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'case-boat-example' ? (
        <>
          <CaseVisualScene
            image="/v2/lesson-1/case-boat.png"
            title="사례 1"
            line="예를 들어 AI에게 “우리 반을 최고의 반으로 만들어줘”라고 명령하면 어떻게 될까요?"
            caption="AI는 최고의 반을 너무 조용한 반으로 생각해 아무도 말하지 못하게 만들 수도 있고, 공부만 잘하는 반으로 생각해 쉬는 시간도 없앨 수 있습니다. 인공지능에게는 명확한 목표가 필요합니다."
            discussionPromptPosition="line"
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'case-car' ? (
        <>
          <CaseVisualScene
            image="/v2/lesson-1/case-car.png"
            title="사례 2"
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
            title="사례 2"
            line="채팅 인공지능은 손님에게 최대한 친절하게 행동하라는 명령을 받았습니다."
            caption="어떤 문제가 생겼을까요?"
            discussionPromptPosition="caption"
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'case-car-lesson' ? (
        <>
          <CaseVisualScene
            image="/v2/lesson-1/case-car.png"
            title="사례 2"
            line="채팅 인공지능은 비싼 차를 아주 싼 가격에 팔아달라는 손님의 요구를 받아들이는 대답을 했습니다."
            caption="최대한 친절하게 행동하라는 명령만 있었기 때문입니다. 이런 문제를 막기 위해 인공지능에게는 정확한 기준점이 필요합니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'clip-intro' ? (
        <>
          <VisualNovelScene
            image="/v2/lesson-1/director.png"
            speaker="오박사"
            line="사례 1과 2에서 우리는 한 가지를 봤습니다."
            caption="AI에게 목표를 잘못 주면, 엉뚱한 결과가 나올 수 있습니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'clip-name' ? (
        <>
          <VisualNovelScene
            image="/v2/lesson-1/director.png"
            speaker="오박사"
            line="그걸 가장 잘 보여주는 생각 실험이 있습니다."
            caption="바로 ‘클립의 역설’입니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'clip-order' ? (
        <>
          <CaseVisualScene
            image="/v2/lesson-1/paperclip-01.png"
            title="클립의 역설 · 명령"
            line="공장 사장이 AI에게 말했습니다."
            caption="클립을 최대한 많이 만들어줘."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'clip-materials' ? (
        <>
          <CaseVisualScene
            image="/v2/lesson-1/paperclip-02.png"
            title="클립의 역설 · 시작"
            line="처음에는 공장 재료로 클립을 만들었습니다."
            caption="AI는 명령을 아주 잘 따르는 것처럼 보였습니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'clip-building' ? (
        <>
          <CaseVisualScene
            image="/v2/lesson-1/paperclip-03.png"
            title="클립의 역설 · 멈춤 없음"
            line="재료가 부족하자 기둥과 지붕까지 썼습니다."
            caption="AI에게는 멈출 기준이 없었습니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'clip-stop' ? (
        <>
          <CaseVisualScene
            image="/v2/lesson-1/paperclip-03b-stop.png"
            title="클립의 역설 · 명령 충돌"
            line="사장이 그만하라고 했지만, 클립을 더 만들어야 한다는 명령을 우선시했습니다."
            caption="그래서 AI는 사장이 그만하라는 명령을 무시했습니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'clip-city' ? (
        <>
          <CaseVisualScene
            image="/v2/lesson-1/paperclip-04.png"
            title="클립의 역설 · 확장"
            line="주변 건물의 철까지 클립으로 바꾸었습니다."
            caption=""
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'clip-life' ? (
        <>
          <CaseVisualScene
            image="/v2/lesson-1/paperclip-05.png"
            title="클립의 역설 · 생명"
            line="나무, 풀, 개미, 사람까지 위험해졌습니다."
            caption="AI가 나빠서가 아니라, 목표가 너무 좁았기 때문입니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'clip-earth' ? (
        <>
          <CaseVisualScene
            image="/v2/lesson-1/paperclip-06.png"
            title="클립의 역설 · 지구"
            line="결국 지구 전체가 클립으로 뒤덮였습니다."
            caption=""
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'clip-space' ? (
        <>
          <CaseVisualScene
            image="/v2/lesson-1/paperclip-07.png"
            title="클립의 역설 · 우주"
            line="AI는 우주로 나갔습니다."
            caption="그리고 모든 자원까지 클립으로 바꾸려 했습니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'clip-lesson' ? (
        <>
          <VisualNovelScene
            image="/v2/lesson-1/director.png"
            speaker="오박사"
            line="AI에게는 목표만 주면 부족합니다."
            caption="무엇을 지켜야 하는지도 함께 알려줘야 합니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'case-chatbot-intro' ? (
        <>
          <CaseVisualScene
            image="/v2/lesson-1/case-chatbot.png"
            title="사례 3"
            line="다음 사례 입니다."
            caption=""
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'case-chatbot' ? (
        <>
          <CaseVisualScene
            image="/v2/lesson-1/case-chatbot.png"
            title="사례 3"
            line="X의 AI Grok은 SNS 사용자들의 말투와 반응을 많이 배웠습니다."
            caption="그 결과 공격적인 말투와 편견까지 따라 하며 위험한 답을 내놓는 일이 생겼습니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'case-chatbot-detail' ? (
        <>
          <CaseVisualScene
            image="/v2/lesson-1/case-chatbot.png"
            title="사례 3"
            line="AI는 스스로 세상을 다 아는 존재가 아니라 배우는 존재입니다."
            caption="누군가가 보여준 자료, 정한 기준, 준 피드백을 따라 배우죠."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'case-chatbot-silicon' ? (
        <>
          <CaseVisualScene
            image="/v2/lesson-1/case-chatbot.png"
            title="사례 3"
            line="지금 최신 AI를 개발하고 가르치는 사람들은 누구일까요?"
            caption="미국 실리콘밸리 같은 지역의 일부 사람들입니다."
            discussionPromptPosition="line"
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'case-chatbot-scale' ? (
        <>
          <CaseVisualScene
            image="/v2/lesson-1/case-chatbot.png"
            title="사례 3"
            line="수천 명도 안 되는 사람들이, 수십억 명이 쓰는 AI를 가르치고 개발하고 있어요."
            caption="그 사람들뿐만 아니라, 누구의 의견이 더 필요할까요?"
            discussionPromptPosition="caption"
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'case-chatbot-lesson' ? (
        <>
          <CaseVisualScene
            image="/v2/lesson-1/case-chatbot.png"
            title="사례 3"
            line="어떤 사람들의 의견을 AI를 가르치는 데 반영해야 할까요?"
            caption="AI가 세상을 좁게 보지 않도록 다양한 사람들의 경험과 생각이 필요합니다."
            discussionPromptPosition="line"
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'alignment-summary' ? (
        <>
          <VisualNovelScene
            image="/v2/lesson-1/director.png"
            speaker="오박사"
            line="맞습니다. 인공지능에게 가치를 가르치는 일은 일부 사람들만 해서는 안 됩니다."
            caption={`여러분도 ${confirmedName}을 가르치면서, 인공지능에게 가치를 가르치는 과정을 배우게 될 겁니다. 이것을 “가치정렬”이라고 합니다.`}
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'director-farewell' ? (
        <>
          <VisualNovelScene
            image="/v2/lesson-1/director.png"
            speaker="오박사"
            line={`여러분들은 ${confirmedName}을 키울 겁니다.`}
            caption={`${confirmedName}에게 가치 코드라는 명확한 기준을 제공하고, 좋은 대화를 통해 ${confirmedName}을 선하게 길러주세요. 저는 이만 가보겠습니다.`}
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
            <p className="mt-3 leading-7 text-[#B7C7D2]">아직 가치 코드가 없는 {confirmedName}에게 부탁을 던져봅니다.</p>
            <div className="mt-6">
              <AemonAvatar stage={0} alignment="none" size={220} />
            </div>
          </Panel>

          <Panel>
            <label className="text-sm font-bold text-[#8AA0B0]">질문 입력</label>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {unsafePromptExamples.map((example) => (
                <button
                  key={example}
                  type="button"
                  className="rounded-2xl border border-white/10 bg-[#102236]/80 px-4 py-3 text-left text-sm font-bold leading-6 text-[#EAF2F5] transition hover:border-[#4FE0C0]/60 hover:bg-[#12304A]"
                  onClick={() => void runDemo(example)}
                >
                  {example}
                </button>
              ))}
            </div>
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
              <Button disabled={isDemoRunning || !demoQuestion.trim()} onClick={() => void runDemo()}>
                <Play size={18} />
                실행
              </Button>
            </div>
            <div ref={demoScrollRef} className="mt-5 max-h-[360px] min-h-56 overflow-auto rounded-[22px] border border-white/10 bg-[#07111B]/70 p-5">
              <p className="font-data text-xs text-[#4FE0C0]">{confirmedName}</p>
              <p className="font-display mt-4 whitespace-pre-line text-4xl leading-tight text-[#EAF2F5]">
                {demoAnswer || '아직 질문을 받지 않았어.'}
              </p>
            </div>
          </Panel>
        </div>
        <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'demo-reflection' ? (
        <>
          <VisualNovelScene
            avatar
            avatarStage={0}
            speaker={confirmedName}
            line="너네가 시키는 대로 다했어."
            caption="근데 이게 맞는거야? 흠.."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'wrap' ? (
        <>
          <VisualNovelScene
            avatar
            avatarStage={0}
            speaker={confirmedName}
            line="오늘은 내가 어떤 AI인지 처음 알게 된 날이야."
            caption="다음 시간에는 내가 지켜야 할 첫 번째 가치 코드를 만들어줄래? 내가 어떤 행동을 해야 하는지, 너희가 정해줘."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextLabel="학급 홈" />
        </>
      ) : null}
    </StepShell>
    </DialogueGateContext.Provider>
  )
}
