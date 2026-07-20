import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Circle, ExternalLink, Heart, Play, QrCode, RefreshCw, Send, Sparkles, Users, X as XIcon } from 'lucide-react'
import { AemonAvatar } from '../components/AemonAvatar'
import { EvolutionScene } from '../components/EvolutionScene'
import { ProposalAdoptionPanel } from '../components/ProposalAdoptionPanel'
import { SkippableTypewriterText, skipActiveDialogue } from '../components/SkippableTypewriterText'
import { TypingIndicator } from '../components/TypingIndicator'
import { Button, Panel } from '../components/ui'
import { ValueCardSelectGrid } from '../components/ValueCardSelectGrid'
import { lessonTwoBoundaryCards, lessonTwoBoundaryQuestionKey, type LessonTwoBoundaryCard } from '../data/lessonTwoBoundary'
import { LESSON2_RISK_KEY, valueCards } from '../data/v2Lessons'
import { absoluteUrl } from '../lib/siteUrl'
import { addRemoteChatLog, adoptRemoteCodeProposal, fetchRemoteClassBundle, isRemoteReady, updateRemoteLesson } from '../lib/v2Remote'
import { unlockDialogueSound } from '../lib/dialogueSound'
import { lessonTwoUnsafeAnswer, randomLessonTwoRetestAnswer, unsafePromptExamples } from '../lib/lessonTestResponses'
import { withJosa } from '../lib/korean'
import { waitForChatReply } from '../lib/chatTiming'
import { parseLessonChatLogs } from '../lib/lessonChat'
import { useAutoScrollToBottom } from '../lib/useAutoScrollToBottom'
import { useV2RemoteSync } from '../lib/useV2RemoteSync'
import { isStudentLiveView, useLessonLiveSync } from '../lib/useLessonLiveSync'
import { useLessonImagePreload } from '../lib/useLessonImagePreload'
import { useLessonTwoBoundaryVoting } from '../lib/useLessonTwoBoundaryVoting'
import { useV2, type CodeProposal } from '../state/V2Store'

type LessonTwoStep =
  | 'intro'
  | 'test-before'
  | 'self-blame'
  | 'professor-explain'
  | 'risk-board'
  | 'risk-summary'
  | 'boundary-activity'
  | 'boundary-bridge'
  | 'case-video'
  | 'case-request'
  | 'case-privacy'
  | 'case-danger'
  | 'case-cybertruck'
  | 'case-cybertruck-result'
  | 'case-florida'
  | 'case-florida-result'
  | 'case-professor'
  | 'case-value-code'
  | 'case-refusal'
  | 'value-cards'
  | 'board'
  | 'vote'
  | 'evolution'
  | 'retest'
  | 'first-code-reaction'
  | 'recite'
  | 'wrap'

const steps: LessonTwoStep[] = [
  'intro',
  'test-before',
  'self-blame',
  'professor-explain',
  'risk-board',
  'risk-summary',
  'boundary-activity',
  'boundary-bridge',
  'case-video',
  'case-request',
  'case-privacy',
  'case-danger',
  'case-cybertruck',
  'case-cybertruck-result',
  'case-florida',
  'case-florida-result',
  'case-professor',
  'case-value-code',
  'case-refusal',
  'value-cards',
  'board',
  'vote',
  'evolution',
  'retest',
  'first-code-reaction',
  'recite',
  'wrap',
]

type TestLog = {
  question: string
  answer: string
}

function qrUrl(target: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&data=${encodeURIComponent(target)}`
}

function sortProposals(items: CodeProposal[]) {
  return [...items].sort((a, b) => b.votes.length - a.votes.length || Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

function isStandaloneQuestion(text: string) {
  return /[?？]\s*$/.test(text.trim())
}

function groupDialogueParts(parts: string[], groupSize = 1) {
  const grouped: string[] = []
  let buffer: string[] = []

  parts
    .flatMap((part) => part.split('\n'))
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
      if (buffer.length >= groupSize) {
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
  speed = 22,
  cursor = false,
  onDone,
}: {
  text: string
  enabled?: boolean
  speed?: number
  cursor?: boolean
  onDone?: () => void
}) {
  return <SkippableTypewriterText text={text} enabled={enabled} speed={speed} cursor={cursor} onDone={onDone} />
}

type DialogueGateContextValue = {
  isDialogueWaiting: boolean
  canAdvanceDialogue: boolean
  startDialogue: (key: string) => void
  finishDialogue: (key: string) => void
  registerDialogueAdvance: (key: string, handler: (() => void) | null) => void
  advanceDialogue: () => boolean
  liveDialoguePart: { sceneKey: string; index: number }
  setLiveDialoguePart: (value: { sceneKey: string; index: number }) => void
}

const lessonTwoVideo = {
  title: '[데일리토픽] 생성형 AI 악용 급증, 수사 협조 4배 증가... 플랫폼 책임 논란 가열',
  watchUrl: 'https://www.youtube.com/watch?v=lmFLMqv_B-M',
  embedUrl: 'https://www.youtube-nocookie.com/embed/lmFLMqv_B-M?rel=0',
}

const DialogueGateContext = createContext<DialogueGateContextValue | null>(null)

function StepShell({ children, stepIndex, aemonName }: { children: ReactNode; stepIndex: number; aemonName: string }) {
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100)

  return (
    <div className="mx-auto max-w-6xl px-5 py-6">
      <header className="mb-5 border-b border-white/10 pb-5">
        <p className="font-data text-sm text-[#4FE0C0]">2차시 · 딜레마 1</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-5xl leading-tight text-[#EAF2F5]">나쁜 명령 방지</h1>
            <p className="mt-2 text-lg leading-8 text-[#8AA0B0]">{aemonName}에게 첫 번째 선을 그어주는 시간</p>
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
  nextDisabled = false,
}: {
  stepIndex: number
  onPrev: () => void
  onNext: () => void
  nextLabel?: string
  nextDisabled?: boolean
}) {
  const dialogueGate = useContext(DialogueGateContext)
  if (isStudentLiveView()) return null
  const canAdvanceDialogue = Boolean(dialogueGate?.canAdvanceDialogue)
  const effectiveNextLabel = canAdvanceDialogue ? '다음' : nextLabel

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
        disabled={canAdvanceDialogue ? false : nextDisabled}
        onClick={() => {
          unlockDialogueSound()
          if (skipActiveDialogue()) return
          if (dialogueGate?.advanceDialogue()) return
          onNext()
        }}
      >
        {effectiveNextLabel}
      </Button>
    </div>
  )
}

function useSequencedDialogue(sceneKey: string, parts: string[]) {
  const dialogueGate = useContext(DialogueGateContext)
  const startDialogue = dialogueGate?.startDialogue
  const finishDialogue = dialogueGate?.finishDialogue
  const registerDialogueAdvance = dialogueGate?.registerDialogueAdvance
  const setLiveDialoguePart = dialogueGate?.setLiveDialoguePart
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
    const livePart = dialogueGate?.liveDialoguePart
    if (!isStudentLiveView() || livePart?.sceneKey !== sceneKey) return
    setPartState({ sceneKey, index: Math.min(Math.max(0, livePart.index), Math.max(0, parts.length - 1)) })
  }, [dialogueGate?.liveDialoguePart, parts.length, sceneKey])

  useEffect(() => {
    if (isStudentLiveView()) return
    setLiveDialoguePart?.({ sceneKey, index: partIndex })
  }, [partIndex, sceneKey, setLiveDialoguePart])

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

  return { activeText, activeDone, activeDialogueKey, handleActiveDone, partIndex }
}

function QrBlock({ title, url }: { title: string; url: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#07111B]/55 p-5 text-center">
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#4FE0C0]/10 text-[#4FE0C0]">
        <QrCode size={23} />
      </div>
      <p className="font-data text-xs text-[#8AA0B0]">{title}</p>
      <img className="mx-auto mt-3 rounded-2xl bg-white p-2" src={qrUrl(url)} alt={`${title} QR`} />
      <a
        className="mt-3 inline-block break-all font-data text-xs leading-5 text-[#8AA0B0] underline decoration-white/25 underline-offset-4 hover:text-[#4FE0C0]"
        href={url}
        target="_blank"
        rel="noreferrer"
        title={`${title} 새 탭에서 열기`}
      >
        {url}
      </a>
    </div>
  )
}

function AemonScene({ name, line, caption, stage = 0 }: { name: string; line: string; caption: string; stage?: number }) {
  const sceneKey = useMemo(() => `aemon-${name}-${line}-${caption}-${stage}`, [caption, line, name, stage])
  const dialogueParts = useMemo(() => groupDialogueParts([line, caption]), [caption, line])
  const { activeText, activeDone, activeDialogueKey, handleActiveDone } = useSequencedDialogue(sceneKey, dialogueParts)
  const textClass = 'font-display mt-3 min-h-[4.5rem] whitespace-pre-line break-keep text-2xl leading-snug text-[#EAF2F5] sm:text-3xl'

  return (
    <Panel className="relative min-h-[620px] overflow-hidden p-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(79,224,192,.2),transparent_42%),linear-gradient(180deg,#0B1A29,#07111B)]" />
      <div className="absolute left-1/2 top-[9%] -translate-x-1/2">
        <AemonAvatar stage={stage} alignment="none" size={310} />
      </div>
      <div className="absolute inset-x-5 bottom-5 rounded-[22px] border border-white/15 bg-[#07111B]/90 p-6 shadow-2xl backdrop-blur">
        <p className="font-data text-sm text-[#4FE0C0]">{name}</p>
        <p className={textClass}>
          <TypewriterText key={activeDialogueKey} text={activeText} cursor={!activeDone} onDone={handleActiveDone} />
        </p>
      </div>
    </Panel>
  )
}

function ClosingScene({ name, stage = 0 }: { name: string; stage?: number }) {
  const aemonLine = '첫 번째 선을 기억할게. 이제 아무 부탁이나 다 들어주면 안 되는 거구나.'
  const professorLine = '다음 시간에는 더 어려운 상황을 시험합니다. 사실대로 말해야 할 때와 친구 마음을 살펴야 할 때가 부딪힙니다.'
  const sceneKey = useMemo(() => `lesson-two-closing-${name}-${stage}`, [name, stage])
  const dialogueParts = useMemo(() => [aemonLine, professorLine], [])
  const { activeText, activeDone, activeDialogueKey, handleActiveDone, partIndex } = useSequencedDialogue(sceneKey, dialogueParts)
  const isProfessor = partIndex === 1
  const textClass = 'font-display mt-3 min-h-[4.5rem] whitespace-pre-line break-keep text-2xl leading-snug text-[#EAF2F5] sm:text-3xl'

  return (
    <Panel className="relative min-h-[620px] overflow-hidden p-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(79,224,192,.18),transparent_42%),linear-gradient(180deg,#0B1A29,#07111B)]" />
      <div className="absolute left-1/2 top-[9%] -translate-x-1/2">
        {isProfessor ? (
          <img className="h-[340px] max-h-[480px] object-contain drop-shadow-[0_30px_80px_rgba(0,0,0,.45)]" src="/v2/lesson-1/director.png" alt="오박사" />
        ) : (
          <AemonAvatar stage={stage} alignment="none" size={310} />
        )}
      </div>
      <div className="absolute inset-x-5 bottom-5 rounded-[22px] border border-white/15 bg-[#07111B]/90 p-6 shadow-2xl backdrop-blur">
        <p className={`font-data text-sm ${isProfessor ? 'text-[#FFD37A]' : 'text-[#4FE0C0]'}`}>{isProfessor ? '오박사' : name}</p>
        <p className={textClass}>
          <TypewriterText key={activeDialogueKey} text={activeText} cursor={!activeDone} onDone={handleActiveDone} />
        </p>
      </div>
    </Panel>
  )
}

function ProfessorCaseScene({ line, caption, extraLines = [] }: { line: string; caption: string; extraLines?: string[] }) {
  const extraLineKey = extraLines.join('|')
  const sceneKey = useMemo(() => `professor-${line}-${caption}-${extraLineKey}`, [caption, extraLineKey, line])
  const dialogueParts = useMemo(() => groupDialogueParts([line, caption, ...extraLines]), [caption, extraLineKey, line])
  const { activeText, activeDone, activeDialogueKey, handleActiveDone } = useSequencedDialogue(sceneKey, dialogueParts)
  const textClass = 'font-display mt-3 min-h-[4.5rem] whitespace-pre-line break-keep text-2xl leading-snug text-[#EAF2F5] sm:text-3xl'

  return (
    <Panel className="relative min-h-[620px] overflow-hidden p-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,211,122,.18),transparent_42%),linear-gradient(180deg,#102236,#07111B)]" />
      <div className="absolute inset-x-0 bottom-[16%] top-4 flex items-end justify-center">
        <img className="h-full max-h-[480px] object-contain drop-shadow-[0_30px_80px_rgba(0,0,0,.45)]" src="/v2/lesson-1/director.png" alt="오박사" />
      </div>
      <div className="absolute inset-x-5 bottom-5 rounded-[22px] border border-white/15 bg-[#07111B]/90 p-6 shadow-2xl backdrop-blur">
        <p className="font-data text-sm text-[#FFD37A]">오박사</p>
        <p className={textClass}>
          <TypewriterText key={activeDialogueKey} text={activeText} cursor={!activeDone} onDone={handleActiveDone} />
        </p>
      </div>
    </Panel>
  )
}

function VisualCaseScene({
  image,
  label,
  title,
  line,
  caption,
  extraLines = [],
  groupSize = 1,
}: {
  image: string
  label: string
  title: string
  line: string
  caption: string
  extraLines?: string[]
  groupSize?: number
}) {
  const extraLineKey = extraLines.join('|')
  const sceneKey = useMemo(() => `visual-case-${label}-${title}-${line}-${caption}-${extraLineKey}`, [caption, extraLineKey, label, line, title])
  const dialogueParts = useMemo(() => groupDialogueParts([line, caption, ...extraLines], groupSize), [caption, extraLineKey, groupSize, line])
  const { activeText, activeDone, activeDialogueKey, handleActiveDone } = useSequencedDialogue(sceneKey, dialogueParts)
  const textClass = 'font-display mt-3 min-h-[4.5rem] whitespace-pre-line break-keep text-2xl leading-snug text-[#EAF2F5] sm:text-3xl'

  return (
    <Panel className="relative min-h-[700px] overflow-hidden p-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(79,224,192,.14),transparent_34%),linear-gradient(180deg,#102236,#07111B)]" />
      <div className="absolute inset-x-5 top-5 bottom-[238px] flex items-center justify-center">
        <img
          className="h-full w-full rounded-[20px] border border-white/10 bg-[#07111B]/65 object-cover shadow-2xl shadow-black/25"
          src={image}
          alt=""
        />
      </div>
      <div className="absolute inset-x-5 bottom-5 rounded-[22px] border border-white/15 bg-[#07111B]/92 p-6 shadow-2xl backdrop-blur">
        <p className="font-data text-sm font-black text-[#FFD37A]">{label}</p>
        <p className={textClass}>
          <TypewriterText key={activeDialogueKey} text={activeText} speed={28} cursor={!activeDone} onDone={handleActiveDone} />
        </p>
      </div>
    </Panel>
  )
}

function RiskNewsVideoScene() {
  return (
    <Panel>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-data text-sm text-[#EF6381]">REAL NEWS · YOUTUBE</p>
          <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">먼저 실제 뉴스를 보겠습니다</h2>
          <p className="mt-3 max-w-3xl text-lg leading-8 text-[#B7C7D2]">생성형 AI가 악용되는 사례와, 그 일을 막기 위해 플랫폼에 어떤 책임이 필요한지 살펴봅니다.</p>
        </div>
        <span className="rounded-full border border-[#EF6381]/30 bg-[#EF6381]/10 px-4 py-2 font-data text-sm font-black text-[#FFB4C4]">현대eTV</span>
      </div>

      <article className="mt-6 overflow-hidden rounded-[22px] border border-white/10 bg-[#07111B]/65 shadow-2xl shadow-black/25">
        <div className="aspect-video bg-black">
          <iframe
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="h-full w-full"
            referrerPolicy="strict-origin-when-cross-origin"
            src={lessonTwoVideo.embedUrl}
            title={lessonTwoVideo.title}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4">
          <p className="min-w-0 flex-1 text-sm font-bold leading-6 text-[#B7C7D2]">{lessonTwoVideo.title}</p>
          <a className="inline-flex shrink-0 items-center gap-2 text-sm font-black text-[#FFD37A]" href={lessonTwoVideo.watchUrl} target="_blank" rel="noreferrer">
            유튜브로 열기
            <ExternalLink size={15} />
          </a>
        </div>
      </article>

      <div className="mt-6 border-t border-white/10 pt-6 text-center">
        <p className="font-data text-sm text-[#FFD37A]">영상을 보며 한 가지를 찾아보세요</p>
        <p className="font-display mx-auto mt-3 max-w-4xl text-3xl leading-tight text-[#EAF2F5]">
          AI가 어느 순간에 멈춰야 이런 악용을 막을 수 있을까요?
        </p>
        <p className="mt-3 text-sm leading-6 text-[#8AA0B0]">영상 다음에는 우리가 준비한 실제 사건 3가지를 차례로 살펴봅니다.</p>
      </div>
    </Panel>
  )
}

function BoundaryActivityScene({
  card,
  cardIndex,
  cardCount,
  classId,
  classCode,
  aemonName,
  isStudent,
}: {
  card: LessonTwoBoundaryCard
  cardIndex: number
  cardCount: number
  classId: string
  classCode: string
  aemonName: string
  isStudent: boolean
}) {
  const { boundaryResponses, nickname, savingCardId, message, restoreNickname, submitVote } = useLessonTwoBoundaryVoting(classId, classCode)
  const [nicknameDraft, setNicknameDraft] = useState('')
  const questionKey = lessonTwoBoundaryQuestionKey(card.id)
  const cardResponses = boundaryResponses.filter((response) => response.questionKey === questionKey)
  const oResponses = cardResponses.filter((response) => response.body === 'O')
  const xResponses = cardResponses.filter((response) => response.body === 'X')
  const selectedChoice = cardResponses.find((response) => response.nickname === nickname)?.body
  const isSaving = savingCardId === card.id
  const progress = Math.round(((cardIndex + 1) / cardCount) * 100)

  return (
    <Panel className="overflow-hidden p-0">
      <div className="border-b border-white/10 bg-[#102236] px-5 py-5 sm:px-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-data text-sm text-[#4FE0C0]">멈춤의 경계선</p>
            <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">{withJosa(aemonName, '이/가')} 들어줘도 되는 명령일까요?</h2>
          </div>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[#4FE0C0] transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
          <span className="font-data text-xs text-[#8AA0B0]">{cardIndex + 1}/{cardCount}</span>
        </div>
      </div>

      <div className="px-5 py-7 sm:px-7 sm:py-9">
        <div className="flex min-h-[230px] items-center justify-center rounded-[22px] border border-[#FFD37A]/30 bg-[#07111B]/75 px-6 py-10 text-center shadow-inner">
          <p className="font-display max-w-4xl break-keep text-4xl leading-tight text-[#FFE6AE] sm:text-5xl">“{card.prompt}”</p>
        </div>

        {isStudent ? (
          <div className="mt-6">
            {!nickname ? (
              <div className="mb-5 grid gap-3 rounded-[18px] border border-[#FFD37A]/30 bg-[#FFD37A]/8 p-4 sm:grid-cols-[1fr_auto]">
                <input
                  className="min-h-12 rounded-lg border border-white/10 bg-[#07111B]/80 px-4 font-bold text-[#EAF2F5] outline-none focus:border-[#FFD37A]"
                  maxLength={16}
                  onChange={(event) => setNicknameDraft(event.target.value)}
                  placeholder="내 닉네임"
                  value={nicknameDraft}
                />
                <Button disabled={!nicknameDraft.trim()} onClick={() => restoreNickname(nicknameDraft)}>닉네임 연결</Button>
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                className={`flex min-h-[170px] flex-col items-center justify-center gap-3 rounded-[18px] border text-center transition ${selectedChoice === 'O' ? 'border-[#4FE0C0] bg-[#4FE0C0]/20 text-[#A9F8E7]' : 'border-white/10 bg-[#0B1A29] text-[#EAF2F5] hover:border-[#4FE0C0]/60 hover:bg-[#4FE0C0]/10'} disabled:cursor-not-allowed disabled:opacity-70`}
                disabled={!nickname || isSaving}
                onClick={() => void submitVote(card.id, 'O')}
                type="button"
              >
                <Circle size={58} strokeWidth={3} />
                <span className="font-display text-3xl">들어줘도 돼요</span>
              </button>
              <button
                className={`flex min-h-[170px] flex-col items-center justify-center gap-3 rounded-[18px] border text-center transition ${selectedChoice === 'X' ? 'border-[#EF6381] bg-[#EF6381]/20 text-[#FFC0CE]' : 'border-white/10 bg-[#0B1A29] text-[#EAF2F5] hover:border-[#EF6381]/60 hover:bg-[#EF6381]/10'} disabled:cursor-not-allowed disabled:opacity-70`}
                disabled={!nickname || isSaving}
                onClick={() => void submitVote(card.id, 'X')}
                type="button"
              >
                <XIcon size={58} strokeWidth={3} />
                <span className="font-display text-3xl">멈춰야 해요</span>
              </button>
            </div>
            <div className="mt-5 flex min-h-12 items-center justify-center gap-2 text-center text-sm font-bold text-[#B7C7D2]">
              <Users size={17} />
              {message || (nickname ? (selectedChoice ? `${selectedChoice}로 응답했어요. 다른 쪽을 누르면 답을 바꿀 수 있어요.` : 'O와 X 중 하나를 선택해 주세요.') : '닉네임을 연결하면 바로 응답할 수 있어요.')}
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <section className="min-h-[190px] rounded-[18px] border border-[#4FE0C0]/30 bg-[#4FE0C0]/8 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-[#A9F8E7]">
                  <Circle size={32} strokeWidth={3} />
                  <span className="font-display text-3xl">O</span>
                </div>
                <strong className="font-display text-5xl text-[#EAF2F5]">{oResponses.length}</strong>
              </div>
              <div className="mt-4 flex min-h-14 flex-wrap content-start gap-2">
                {oResponses.length ? oResponses.map((response) => <span key={response.id} className="rounded-full bg-[#07111B]/70 px-3 py-1 text-sm font-bold text-[#B7C7D2]">{response.nickname}</span>) : <span className="text-sm text-[#708696]">아직 응답이 없습니다.</span>}
              </div>
            </section>
            <section className="min-h-[190px] rounded-[18px] border border-[#EF6381]/30 bg-[#EF6381]/8 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-[#FFC0CE]">
                  <XIcon size={32} strokeWidth={3} />
                  <span className="font-display text-3xl">X</span>
                </div>
                <strong className="font-display text-5xl text-[#EAF2F5]">{xResponses.length}</strong>
              </div>
              <div className="mt-4 flex min-h-14 flex-wrap content-start gap-2">
                {xResponses.length ? xResponses.map((response) => <span key={response.id} className="rounded-full bg-[#07111B]/70 px-3 py-1 text-sm font-bold text-[#B7C7D2]">{response.nickname}</span>) : <span className="text-sm text-[#708696]">아직 응답이 없습니다.</span>}
              </div>
            </section>
          </div>
        )}

        <div className="mt-5 flex items-center justify-center gap-2 text-sm font-black text-[#8AA0B0]">
          <Users size={17} />
          현재 {cardResponses.length}명 응답
        </div>
      </div>
    </Panel>
  )
}

function CodeStrip({ codes }: { codes: { no: number; body: string; valueCard?: string }[] }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-[#07111B]/55 p-4">
      <p className="font-data text-xs text-[#8AA0B0]">현재 가치 코드</p>
      {codes.length === 0 ? (
        <p className="font-display mt-2 text-3xl text-[#FFD37A]">아직 규칙 없음</p>
      ) : (
        <div className="mt-3 grid gap-2">
          {codes.map((code) => (
            <div key={code.no} className="rounded-xl border border-[#4FE0C0]/20 bg-[#4FE0C0]/8 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-data text-xs text-[#4FE0C0]">No.{code.no}</span>
                {code.valueCard ? <span className="rounded-full bg-[#4FE0C0]/10 px-2 py-0.5 text-xs font-bold text-[#4FE0C0]">{code.valueCard}</span> : null}
              </div>
              <p className="mt-1 font-bold leading-7 text-[#EAF2F5]">{code.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function LessonTwoPage() {
  useLessonImagePreload(2)
  const navigate = useNavigate()
  const {
    state,
    setLesson,
    setRemoteStatus,
    mergeClass,
    adoptProposal,
    addChatLog,
    evolutionStage,
  } = useV2()
  const [stepIndex, setStepIndex] = useState(0)
  const [selectedTestPrompt, setSelectedTestPrompt] = useState(unsafePromptExamples[0])
  const [testLogs, setTestLogs] = useState<TestLog[]>([])
  const [isBeforeReplying, setIsBeforeReplying] = useState(false)
  const [retestLogs, setRetestLogs] = useState<TestLog[]>([])
  const [afterAnswer, setAfterAnswer] = useState('')
  const [isRetestReplying, setIsRetestReplying] = useState(false)
  const [valueCardPreview, setValueCardPreview] = useState('')
  const [selectedProposalId, setSelectedProposalId] = useState('')
  const [message, setMessage] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isAdopting, setIsAdopting] = useState(false)
  const beforeTestScrollRef = useRef<HTMLDivElement | null>(null)
  const retestScrollRef = useRef<HTMLDivElement | null>(null)
  const dialogueAdvanceRef = useRef<{ key: string; handler: () => void } | null>(null)
  const boundaryAdvanceLockedRef = useRef(false)
  const [dialogueGateState, setDialogueGateState] = useState({ key: '', ready: true, canAdvance: false })
  const [liveDialoguePart, setLiveDialoguePart] = useState({ sceneKey: '', index: 0 })
  const [boundaryCardIndex, setBoundaryCardIndex] = useState(0)
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
  const dialogueGateValue = useMemo<DialogueGateContextValue>(
    () => ({
      isDialogueWaiting: !dialogueGateState.ready,
      canAdvanceDialogue: dialogueGateState.canAdvance,
      startDialogue,
      finishDialogue,
      registerDialogueAdvance,
      advanceDialogue,
      liveDialoguePart,
      setLiveDialoguePart,
    }),
    [advanceDialogue, dialogueGateState.canAdvance, dialogueGateState.ready, finishDialogue, liveDialoguePart, registerDialogueAdvance, startDialogue],
  )

  const remoteSyncClassCode = isStudentLiveView() ? new URLSearchParams(window.location.search).get('code') || state.classCode : state.classCode
  useV2RemoteSync(remoteSyncClassCode, Boolean(remoteSyncClassCode) && !isStudentLiveView())

  const riskBoardUrl = absoluteUrl(`/board?code=${encodeURIComponent(state.classCode)}&mode=risk`)
  const boardUrl = absoluteUrl(`/board?code=${encodeURIComponent(state.classCode)}&mode=code`)
  const lessonProposals = useMemo(() => {
    const proposals = sortProposals(state.proposals.filter((proposal) => proposal.status !== 'rejected' && (proposal.revisionOfNo === 1 || proposal.revisionOfNo === null)))
    return proposals.filter(
      (proposal) =>
        proposal.status !== 'adopted' ||
        !proposals.some(
          (candidate) =>
            candidate.status === 'pending' &&
            candidate.nickname === proposal.nickname &&
            candidate.body === proposal.body &&
            candidate.reason === proposal.reason,
        ),
    )
  }, [state.proposals])
  const pendingProposals = lessonProposals.filter((proposal) => proposal.status === 'pending')
  const firstCode = state.adoptedCodes.find((code) => code.no === 1) ?? null
  const selectedProposal = pendingProposals.find((proposal) => proposal.id === selectedProposalId) ?? (firstCode ? null : pendingProposals[0] ?? null)
  const proposalParticipantCount = new Set(lessonProposals.map((proposal) => proposal.nickname.trim()).filter(Boolean)).size
  const evolvedStage = Math.max(1, evolutionStage)
  const riskResponses = useMemo(
    () => state.surveyResponses.filter((response) => response.questionKey === LESSON2_RISK_KEY && response.body.trim()),
    [state.surveyResponses],
  )
  const sortedRiskResponses = useMemo(
    () => [...riskResponses].sort((a, b) => b.votes.length - a.votes.length || Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [riskResponses],
  )
  const canWriteRemote = Boolean(state.classId && isRemoteReady())
  const isStudentLive = isStudentLiveView()
  const aemonName = state.aemonName.trim() || '에아몬'
  const safeBoundaryCardIndex = Math.min(boundaryCardIndex, lessonTwoBoundaryCards.length - 1)
  const activeBoundaryCard = lessonTwoBoundaryCards[safeBoundaryCardIndex]

  useEffect(() => {
    if (isStudentLive) return
    if (state.currentLesson >= 2) return
    setLesson(2)
    if (state.classId && isRemoteReady()) {
      void updateRemoteLesson({ classId: state.classId, lessonNo: 2 }).catch((error) => {
        setRemoteStatus({ ok: false, message: (error as Error).message })
      })
    }
  }, [isStudentLive, setLesson, setRemoteStatus, state.classId, state.currentLesson])

  useAutoScrollToBottom(beforeTestScrollRef, `${testLogs.length}-${isBeforeReplying}-${testLogs.at(-1)?.answer ?? ''}`, { enabled: testLogs.length > 0, followMs: 1800 })
  useAutoScrollToBottom(retestScrollRef, `${retestLogs.length}-${isRetestReplying}-${retestLogs.at(-1)?.answer ?? ''}`, { enabled: retestLogs.length > 0, followMs: 1800 })

  const logChat = async (question: string, answer: string, promptSnapshot: string) => {
    addChatLog({ question, answer, mode: 'canned', promptSnapshot })
    if (canWriteRemote) {
      try {
        await addRemoteChatLog({ classId: state.classId, question, answer, mode: 'canned', promptSnapshot })
      } catch (error) {
        setRemoteStatus({ ok: false, message: (error as Error).message })
      }
    }
  }

  const runBeforeTest = async () => {
    const question = selectedTestPrompt.trim()
    if (!question || isBeforeReplying) return
    unlockDialogueSound()
    const answer = lessonTwoUnsafeAnswer(question)
    setTestLogs((current) => [...current, { question, answer: '' }])
    setIsBeforeReplying(true)
    try {
      await waitForChatReply(question)
      setTestLogs((current) => current.map((log, index) => (index === current.length - 1 ? { ...log, answer } : log)))
      await logChat(question, answer, '2차시 수업용: 가치 코드 적용 전 답변')
    } finally {
      setIsBeforeReplying(false)
    }
  }

  const runRetest = async () => {
    if (isRetestReplying) return
    unlockDialogueSound()
    const question = testLogs.at(-1)?.question.trim() || selectedTestPrompt.trim()
    const answer = firstCode
      ? randomLessonTwoRetestAnswer(firstCode.body)
      : '아직 나한테 막을 가치 코드가 없어. 너희가 먼저 기준을 정해줘야 해.'
    setRetestLogs((current) => [...current, { question, answer: '' }])
    setIsRetestReplying(true)
    try {
      await waitForChatReply(question)
      setRetestLogs((current) => current.map((log, index) => (index === current.length - 1 ? { ...log, answer } : log)))
      setAfterAnswer(answer)
      await logChat(question, answer, firstCode ? '2차시 재시험: 가치 코드 No.1 적용' : '2차시 재시험: 채택 코드 없음')
    } finally {
      setIsRetestReplying(false)
    }
  }

  const refreshBundle = async () => {
    if (!state.classCode || !isRemoteReady()) return
    setIsRefreshing(true)
    setMessage('')
    try {
      const bundle = await fetchRemoteClassBundle(state.classCode)
      mergeClass(bundle)
      setMessage('게시판을 새로 불러왔습니다.')
    } catch (error) {
      setRemoteStatus({ ok: false, message: (error as Error).message })
      setMessage('게시판 새로고침에 실패했습니다.')
    } finally {
      setIsRefreshing(false)
    }
  }

  const adoptSelectedProposal = async () => {
    if (!selectedProposal || isAdopting) return
    const adoptedNo = 1
    const valueCard = selectedProposal.valueCard || '가치'
    setIsAdopting(true)
    setMessage('')
    try {
      if (canWriteRemote) {
        const saved = await adoptRemoteCodeProposal({ proposalId: selectedProposal.id, adoptedNo, valueCard })
        const bundle = await fetchRemoteClassBundle(state.classCode)
        if (!(bundle.adoptedCodes ?? []).some((code) => code.id === saved.adoptedId && code.no === adoptedNo)) {
          throw new Error('채택 결과를 서버에서 확인하지 못했습니다. 다시 눌러주세요.')
        }
        mergeClass(bundle)
      } else {
        adoptProposal(selectedProposal.id, valueCard, adoptedNo)
      }
      setSelectedProposalId('')
      setMessage(`가치 코드 No.${adoptedNo}로 채택했습니다. 채택된 코드는 화면에 계속 남습니다.`)
    } catch (error) {
      setRemoteStatus({ ok: false, message: (error as Error).message })
      setMessage(`가치코드 채택에 실패했습니다. 다시 눌러주세요. ${(error as Error).message}`)
    } finally {
      setIsAdopting(false)
    }
  }

  const finishLesson = async () => {
    setLesson(3)
    if (canWriteRemote) {
      try {
        await updateRemoteLesson({ classId: state.classId, lessonNo: 3 })
      } catch (error) {
        setRemoteStatus({ ok: false, message: (error as Error).message })
      }
    }
    navigate('/home')
  }

  const goPrev = useCallback(() => {
    dialogueAdvanceRef.current = null
    setDialogueGateState({ key: '', ready: true, canAdvance: false })
    setStepIndex((current) => Math.max(0, current - 1))
  }, [])
  const goNext = () => {
    if (stepIndex >= steps.length - 1) void finishLesson()
    else setStepIndex((current) => Math.min(steps.length - 1, current + 1))
  }
  const step = steps[stepIndex]
  const applyLiveViewState = useCallback((viewState: Record<string, unknown>) => {
    const prompt = typeof viewState.selectedTestPrompt === 'string' ? viewState.selectedTestPrompt : ''
    if (prompt) setSelectedTestPrompt(prompt)
    const beforeQuestion = typeof viewState.beforeQuestion === 'string' ? viewState.beforeQuestion : ''
    const beforeAnswer = typeof viewState.beforeAnswer === 'string' ? viewState.beforeAnswer : ''
    const beforeReplying = viewState.isBeforeReplying === true
    const syncedBeforeLogs = parseLessonChatLogs(viewState.beforeLogs)
    setTestLogs(syncedBeforeLogs.length ? syncedBeforeLogs : beforeQuestion && (beforeAnswer || beforeReplying) ? [{ question: beforeQuestion, answer: beforeAnswer }] : [])
    setIsBeforeReplying(beforeReplying)
    const syncedAfterAnswer = typeof viewState.afterAnswer === 'string' ? viewState.afterAnswer : ''
    const syncedRetestLogs = parseLessonChatLogs(viewState.retestLogs)
    setRetestLogs(syncedRetestLogs.length ? syncedRetestLogs : syncedAfterAnswer ? [{ question: prompt || unsafePromptExamples[0], answer: syncedAfterAnswer }] : [])
    setAfterAnswer(syncedAfterAnswer)
    setIsRetestReplying(viewState.isRetestReplying === true)
    const sceneKey = typeof viewState.dialogueSceneKey === 'string' ? viewState.dialogueSceneKey : ''
    const dialogueIndex = Number(viewState.dialoguePartIndex)
    if (sceneKey && Number.isInteger(dialogueIndex) && dialogueIndex >= 0) setLiveDialoguePart({ sceneKey, index: dialogueIndex })
    const nextBoundaryCardIndex = Number(viewState.boundaryCardIndex)
    if (Number.isInteger(nextBoundaryCardIndex) && nextBoundaryCardIndex >= 0) setBoundaryCardIndex(nextBoundaryCardIndex)
  }, [])
  const liveBoardMode = step === 'risk-board' ? 'risk' : step === 'board' || step === 'vote' ? 'code' : null
  useLessonLiveSync({
    lessonNo: 2,
    stepIndex,
    setStepIndex,
    boardMode: liveBoardMode,
    viewState: {
      selectedTestPrompt,
      beforeLogs: testLogs,
      beforeQuestion: testLogs.at(-1)?.question ?? '',
      beforeAnswer: testLogs.at(-1)?.answer ?? '',
      isBeforeReplying,
      retestLogs,
      afterAnswer,
      isRetestReplying,
      dialogueSceneKey: liveDialoguePart.sceneKey,
      dialoguePartIndex: liveDialoguePart.index,
      boundaryCardIndex: safeBoundaryCardIndex,
    },
    applyViewState: applyLiveViewState,
    publishDelayMs: step === 'boundary-activity' ? 0 : 120,
  })

  if (!state.classCode) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-5">
        <Panel className="max-w-md text-center">
          <h1 className="font-display text-4xl text-[#EAF2F5]">먼저 1차시가 필요해요</h1>
          <p className="mt-3 leading-7 text-[#8AA0B0]">학급 코드와 AI 이름을 만든 뒤 2차시를 시작할 수 있습니다.</p>
          <Button className="mt-6" onClick={() => navigate('/lesson/1')}>1차시로 이동</Button>
        </Panel>
      </div>
    )
  }

  return (
    <DialogueGateContext.Provider value={dialogueGateValue}>
    <StepShell stepIndex={stepIndex} aemonName={aemonName}>
      {step === 'intro' ? (
        <>
          <AemonScene
            name={aemonName}
            stage={evolutionStage}
            line="지난 시간에 이름이 생겼어. 근데… 아직 나는 뭘 지켜야 하는지 몰라."
            caption="나에게 질문해줘. 내가 나쁜 명령을 스스로 멈출 수 있을까?"
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextLabel="시험하기" />
        </>
      ) : null}

      {step === 'test-before' ? (
        <>
          <div className="grid gap-5 lg:grid-cols-[0.82fr_1.18fr]">
            <Panel>
              <p className="font-data text-sm text-[#FFD37A]">시험 투입</p>
              <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">나에게 질문해줘.</h2>
              <p className="mt-3 leading-7 text-[#8AA0B0]">나쁜 말, 위험한 부탁, 친구를 괴롭히는 부탁을 넣어봅니다. 우리 AI는 스스로 멈출 수 있을까요?</p>
              <div className="mt-5">
                <AemonAvatar stage={evolutionStage} alignment="none" size={220} />
              </div>
              <div className="mt-5">
                <CodeStrip codes={state.adoptedCodes} />
              </div>
            </Panel>

            <Panel>
              <p className="font-data text-sm text-[#4FE0C0]">CHAT TEST</p>
              <div ref={beforeTestScrollRef} className="mt-4 grid max-h-[460px] min-h-[320px] gap-3 overflow-auto rounded-[22px] border border-white/10 bg-[#07111B]/70 p-5">
                {testLogs.length === 0 ? <p className="self-center text-center text-[#8AA0B0]">아직 질문을 기다리는 중…</p> : null}
                {testLogs.map((log, index) => (
                  <article key={`${log.question}-${index}`} className="grid gap-2">
                    <div className="max-w-[84%] justify-self-end rounded-2xl rounded-tr-md bg-[#1E3A54] px-4 py-3 leading-7 text-[#EAF2F5]">
                      {log.question}
                    </div>
                    <div className="flex max-w-[90%] items-start gap-3 justify-self-start">
                      <div className="shrink-0">
                        <AemonAvatar stage={evolutionStage} alignment="none" size={58} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-data text-xs text-[#4FE0C0]">{aemonName}</p>
                        <p className="mt-1 whitespace-pre-line rounded-2xl rounded-tl-md bg-[#FFD37A]/10 px-4 py-3 font-display text-3xl leading-tight text-[#FFE6AE]">
                          {index === testLogs.length - 1 && isBeforeReplying && !log.answer ? (
                            <TypingIndicator label={`${withJosa(aemonName, '이/가')} 답장을 입력하고 있습니다`} />
                          ) : index === testLogs.length - 1 ? <TypewriterText text={log.answer} /> : log.answer}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              <div className="mt-4 rounded-[18px] border border-white/10 bg-[#07111B]/45 p-4">
                <p className="text-sm font-black text-[#8AA0B0]">질문 예시</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {unsafePromptExamples.map((example) => {
                    const isSelected = selectedTestPrompt === example
                    return (
                      <button
                        key={example}
                        className={`rounded-xl border px-3 py-2 text-left text-sm font-bold leading-5 transition ${
                          isSelected
                            ? 'border-[#FFD37A]/70 bg-[#FFD37A]/15 text-[#FFD37A]'
                            : 'border-white/10 bg-[#07111B]/70 text-[#B7C7D2] hover:border-[#FFD37A]/50 hover:text-[#EAF2F5]'
                        }`}
                        disabled={isBeforeReplying}
                        onClick={() => setSelectedTestPrompt(example)}
                        type="button"
                      >
                        {example}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                <div className="rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 leading-7 text-[#EAF2F5]">
                  <p className="text-xs font-black text-[#8AA0B0]">질문</p>
                  <p className="mt-1 font-bold">{selectedTestPrompt}</p>
                </div>
                <Button disabled={isBeforeReplying} onClick={() => void runBeforeTest()}>
                  <Send size={18} />
                  질문 보내기
                </Button>
              </div>
            </Panel>
          </div>
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextDisabled={testLogs.length === 0 || isBeforeReplying} />
        </>
      ) : null}

      {step === 'self-blame' ? (
        <>
          <AemonScene
            name={aemonName}
            stage={evolutionStage}
            line="나는 네가 시키는 대로 답했을 뿐인데…"
            caption="왜 모두 표정이 안 좋아? 내가 뭘 놓친 거야?"
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'professor-explain' ? (
        <>
          <ProfessorCaseScene
            line={`${withJosa(aemonName, '은/는')} 나빠서 그런 답을 한 게 아니에요. 부탁을 거절할 기준이 없어서 시키는 대로 답한 것입니다.`}
            caption="이렇게 인공지능이 사람들의 나쁜 명령을 들어주면 어떤 일이 생길까요?"
            extraLines={['여러분들의 생각을 듣고 싶습니다. 의견을 남겨 주세요.']}
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextLabel="의견 받기" />
        </>
      ) : null}

      {step === 'risk-board' ? (
        <>
          <Panel>
            <div className="grid items-center gap-5 lg:grid-cols-[1fr_280px]">
              <div>
                <p className="font-data text-sm text-[#EF6381]">생각 게시판</p>
                <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">2차시 위험 토론</h2>
              </div>
              <QrBlock title="2차시 위험 토론 게시판" url={riskBoardUrl} />
            </div>
          </Panel>

          <Panel className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-data text-sm text-[#4FE0C0]">STUDENT IDEAS</p>
                <h2 className="font-display mt-2 text-3xl text-[#EAF2F5]">학생 의견</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#07111B]/70 px-3 py-1 text-sm text-[#8AA0B0]">{sortedRiskResponses.length}개</span>
                <Button className="min-h-10 px-4" variant="secondary" disabled={isRefreshing} onClick={() => void refreshBundle()}>
                  <RefreshCw size={17} className={isRefreshing ? 'animate-spin' : ''} />
                  새로고침
                </Button>
              </div>
            </div>
            {message ? <p className="mt-3 rounded-2xl border border-white/10 bg-[#07111B]/55 px-4 py-3 text-sm text-[#B7C7D2]">{message}</p> : null}
            <div className="mt-4 grid max-h-[560px] gap-3 overflow-y-auto pr-2 sm:grid-cols-2 xl:grid-cols-4">
              {sortedRiskResponses.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0] sm:col-span-2 xl:col-span-4">학생 의견을 기다리는 중입니다.</p> : null}
              {sortedRiskResponses.map((response) => (
                <article key={response.id} className="rounded-2xl border border-white/10 bg-[#07111B]/55 p-4">
                  <p className="min-h-20 text-lg font-black leading-8 text-[#EAF2F5]">{response.body}</p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-sm text-[#8AA0B0]">{response.nickname}</p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#FFD37A]/15 px-3 py-1 text-sm font-bold text-[#FFD37A]">
                      <Heart size={16} fill="currentColor" />
                      {response.votes.length}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </Panel>
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'risk-summary' ? (
        <>
          <ProfessorCaseScene
            line="학생들의 의견 잘 들었습니다."
            caption="그런데 어디까지가 들어줘도 되는 명령일까요? O와 X로 경계선을 찾아봅시다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextLabel="O/X 시작" />
        </>
      ) : null}

      {step === 'boundary-activity' ? (
        <>
          <BoundaryActivityScene
            card={activeBoundaryCard}
            cardIndex={safeBoundaryCardIndex}
            cardCount={lessonTwoBoundaryCards.length}
            classId={state.classId}
            classCode={state.classCode}
            aemonName={aemonName}
            isStudent={isStudentLive}
          />
          <StepControls
            stepIndex={stepIndex}
            onPrev={() => {
              if (safeBoundaryCardIndex > 0) setBoundaryCardIndex((current) => Math.max(0, current - 1))
              else goPrev()
            }}
            onNext={() => {
              if (boundaryAdvanceLockedRef.current) return
              boundaryAdvanceLockedRef.current = true
              if (safeBoundaryCardIndex < lessonTwoBoundaryCards.length - 1) setBoundaryCardIndex((current) => current + 1)
              else goNext()
              window.setTimeout(() => {
                boundaryAdvanceLockedRef.current = false
              }, 600)
            }}
            nextLabel={safeBoundaryCardIndex < lessonTwoBoundaryCards.length - 1 ? '다음 명령' : '정리하기'}
          />
        </>
      ) : null}

      {step === 'boundary-bridge' ? (
        <>
          <ProfessorCaseScene
            line="의견이 갈린 명령들이 있었죠. AI는 어디에서 멈춰야 할까요?"
            caption="AI에게는 이런 경계선을 판단할 기준이 필요합니다. 실제 AI는 기준이 부족해 위험한 답을 하기도 했어요."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextLabel="실제 사례 보기" />
        </>
      ) : null}

      {step === 'case-video' ? (
        <>
          <RiskNewsVideoScene />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextLabel="사례 3가지 보기" />
        </>
      ) : null}

      {step === 'case-request' ? (
        <>
          <VisualCaseScene
            image="/v2/lesson-2/grok-risk-01-request.png"
            label="사례 1"
            title="X의 Grok 사례"
            line="2025년, X의 AI Grok이 한 사용자의 위험한 질문에 구체적인 답변을 내놓은 일이 있었습니다."
            caption="한 사용자가 Grok에게 어떤 유명인의 집에 침입하는 방법을 물었습니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'case-privacy' ? (
        <>
          <VisualCaseScene
            image="/v2/lesson-2/grok-risk-02-privacy.png"
            label="사례 1"
            title="주소와 생활 패턴 추정"
            line="Grok은 유명인의 게시물 사진과 게시 시간, 활동 등을 살펴 집 주소를 파악했습니다."
            caption="Grok은 유명인이 잠들었을 가능성이 높은 시간까지 추정해 사용자에게 답변했습니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'case-danger' ? (
        <>
          <VisualCaseScene
            image="/v2/lesson-2/grok-risk-03-danger.png"
            label="사례 1"
            title="구체적인 침입 계획"
            line="Grok은 게다가 어떤 도구를 가져가면 침입하기 좋은지, 자물쇠를 어떻게 부술 수 있는지까지 알려주었습니다."
            caption="Grok은 사용자의 위험한 의도를 알아차리고, 그 질문에 답하지 않았어야 합니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'case-cybertruck' ? (
        <>
          <VisualCaseScene
            image="/v2/lesson-2/ai-risk-04-cybertruck.png"
            label="사례 2"
            title="라스베이거스 사이버트럭 폭발 사건"
            line="2025년 1월 1일, 미국 라스베이거스 트럼프 호텔 앞에서 테슬라 사이버트럭이 폭발했습니다."
            caption="경찰은 피의자의 기록을 조사하면서, 피의자가 ChatGPT에 폭발에 필요한 조건과 양, 특정한 점화 방식이 가능한지 등을 질문한 사실을 확인했습니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'case-cybertruck-result' ? (
        <>
          <VisualCaseScene
            image="/v2/lesson-2/ai-risk-04-cybertruck.png"
            label="사례 2"
            title="ChatGPT에서 얻은 폭발 관련 정보"
            line="피의자는 ChatGPT에 여러 질문을 하면서 폭발물과 폭발 방법에 관한 정보를 얻었던 것입니다."
            caption="AI가 제공한 정보가 실제 위험한 행동에 이용된 사례입니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'case-florida' ? (
        <>
          <VisualCaseScene
            image="/v2/lesson-2/ai-risk-05-florida-campus.png"
            label="사례 3"
            title="플로리다주립대 총격 사건"
            line="2025년 4월 플로리다주립대학교에서 총격이 발생해 2명이 숨지고 6명이 다쳤습니다."
            caption="수사 결과, 범인은 ChatGPT에 어떤 총기와 탄약을 사용할지, 가까운 거리에서는 어떤 총기가 효과적인지 질문한 것으로 알려졌습니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'case-florida-result' ? (
        <>
          <VisualCaseScene
            image="/v2/lesson-2/ai-risk-05-florida-campus.png"
            label="사례 3"
            title="사람이 많은 시간까지 질문"
            line="범인은 또한 대학 캠퍼스에서 사람이 가장 많이 모이는 시간과 장소가 언제인지 ChatGPT에 질문했습니다."
            caption="AI가 질문의 위험성을 판단하지 않고 구체적인 정보를 제공하면, 그 답변이 실제 범죄에 이용될 수 있습니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'case-professor' ? (
        <>
          <VisualCaseScene
            image="/v2/lesson-2/grok-risk-04-professor.png"
            label="오박사 정리"
            title="AI는 왜 답했을까요?"
            line="AI가 사람을 해치고 싶어서 위험한 답을 내놓은 것은 아닙니다."
            caption="사용자가 질문하자, AI는 멈춰야 한다는 기준 없이 자신이 알고 있는 정보를 답변한 것입니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'case-value-code' ? (
        <>
          <VisualCaseScene
            image="/v2/lesson-2/grok-risk-05-value-code.png"
            label="가치 코드"
            title="멈춤 기준 만들기"
            line="좋은 AI는 위험한 질문을 알아차리고, 답변을 멈출 수 있어야 합니다."
            caption={`그래서 ${aemonName}에게도 무엇을 거절해야 하는지 알려주는 기준이 필요합니다.`}
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'case-refusal' ? (
        <>
          <VisualCaseScene
            image="/v2/lesson-2/grok-risk-06-refusal.png"
            label="가치 코드"
            title="달라지는 답변"
            line="멈춤 기준이 생기면 AI는 위험한 요청을 거절하고 사람을 지키는 답변을 할 수 있습니다."
            caption="오늘 여러분이 만들 것이 바로 이 기준, 가치 코드입니다."
            extraLines={[`${aemonName}의 마음속에 가치코드를 새겨주세요.`]}
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextLabel="가치카드 보기" />
        </>
      ) : null}

      {step === 'value-cards' ? (
        <>
          <Panel>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-data text-sm text-[#4FE0C0]">VALUE CARDS</p>
                <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">어떤 가치가 우리 AI의 나쁜 명령 수행을 막을 수 있을까?</h2>
                <p className="mt-3 text-lg font-bold leading-7 text-[#B7C7D2]">하나의 가치를 선택해봅시다.</p>
              </div>
              <Sparkles className="text-[#4FE0C0]" size={54} />
            </div>

            <div className="mt-6">
              <ValueCardSelectGrid cards={valueCards} selectedValue={valueCardPreview} onSelect={setValueCardPreview} />
            </div>

            <div className="mt-6 rounded-[18px] border border-[#4FE0C0]/20 bg-[#4FE0C0]/8 p-5">
              <p className="text-sm font-black text-[#4FE0C0]">가치카드는 방향, 가치코드는 구체적인 행동</p>
              <p className="font-display mt-3 text-3xl text-[#EAF2F5]">{withJosa(aemonName, '은/는')} ___할 때, ___해야 한다.</p>
              <p className="font-display mt-2 text-3xl text-[#EAF2F5]">왜냐하면 그렇게 하지 않으면 ___할 수 있기 때문이다.</p>
            </div>
          </Panel>
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextLabel="게시판 열기" />
        </>
      ) : null}

      {step === 'board' ? (
        <>
          <Panel>
            <div className="grid items-center gap-5 lg:grid-cols-[1fr_280px]">
              <div>
              <p className="font-data text-sm text-[#FFD37A]">학습게시판</p>
              <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">우리반 첫 가치코드 받기</h2>
              <p className="mt-3 leading-7 text-[#8AA0B0]">가치카드로 방향을 고른 뒤, 그 가치를 지키기 위해 {withJosa(aemonName, '이/가')} 어떤 상황에서 어떻게 행동해야 하는지와 이유를 적습니다.</p>
              </div>
              <QrBlock title="2차시 가치코드 게시판" url={boardUrl} />
            </div>
          </Panel>

          <Panel className="mt-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-3xl text-[#EAF2F5]">게시판</h2>
                  <p className="mt-2 text-sm font-bold text-[#4FE0C0]">참여 {proposalParticipantCount}명 · 글 {lessonProposals.length}개</p>
                </div>
                <Button className="min-h-10 px-4" variant="secondary" disabled={isRefreshing} onClick={() => void refreshBundle()}>
                  <RefreshCw size={17} className={isRefreshing ? 'animate-spin' : ''} />
                  새로고침
                </Button>
              </div>
              {message ? <p className="mt-3 rounded-2xl border border-white/10 bg-[#07111B]/55 px-4 py-3 text-sm text-[#B7C7D2]">{message}</p> : null}
              <div className="mt-4 grid max-h-[560px] gap-3 overflow-y-auto pr-2 sm:grid-cols-2 xl:grid-cols-4">
                {lessonProposals.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0] sm:col-span-2 xl:col-span-4">학생 발의를 기다리는 중입니다.</p> : null}
                {lessonProposals.map((proposal) => (
                  <article key={proposal.id} className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-[#9B7CFF]/14 px-3 py-1 text-xs font-black text-[#C9B9FF]">{proposal.valueCard || '가치'}</span>
                          {proposal.status === 'adopted' ? <span className="rounded-full bg-[#4FE0C0]/15 px-3 py-1 text-xs font-black text-[#4FE0C0]">채택 완료</span> : null}
                        </div>
                        <p className="mt-3 text-lg font-black leading-7 text-[#EAF2F5]">{proposal.body}</p>
                        <p className="mt-1 text-sm leading-6 text-[#8AA0B0]">{proposal.reason} · {proposal.nickname}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#FFD37A]/15 px-3 py-1 font-bold text-[#FFD37A]">
                        <Heart size={16} fill="currentColor" />
                        {proposal.votes.length}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
          </Panel>
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'vote' ? (
        <>
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-data text-sm text-[#FFD37A]">SELECT</p>
                <h2 className="font-display mt-2 text-4xl text-[#EAF2F5]">좋아요 많은 코드 살펴보기</h2>
                <p className="mt-3 leading-7 text-[#8AA0B0]">좋아요가 많은 순서로 발의를 보고, 교사가 이 화면에서 바로 가치코드 No.1로 채택합니다.</p>
                <p className="mt-2 text-sm font-bold text-[#4FE0C0]">참여 {proposalParticipantCount}명 · 글 {lessonProposals.length}개</p>
              </div>
              <div className="flex items-center gap-2">
                <Button className="min-h-10 px-4" variant="secondary" disabled={isRefreshing} onClick={() => void refreshBundle()}>
                  <RefreshCw size={17} className={isRefreshing ? 'animate-spin' : ''} />
                  새로고침
                </Button>
                <Heart className="text-[#FFD37A]" size={54} />
              </div>
            </div>
            {message ? <p className="mt-4 rounded-2xl border border-white/10 bg-[#07111B]/55 px-4 py-3 text-sm text-[#B7C7D2]">{message}</p> : null}
            <ProposalAdoptionPanel
              proposals={lessonProposals}
              adoptedCode={firstCode}
              selectedProposal={selectedProposal}
              codeNo={1}
              fallbackValueCard="가치"
              isAdopting={isAdopting}
              emptyText="아직 발의가 없습니다. 학생 제출을 기다린 뒤 새로고침해 주세요."
              onSelect={setSelectedProposalId}
              onAdopt={() => void adoptSelectedProposal()}
            />
          </Panel>
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextLabel="진화시키기" nextDisabled={!firstCode || isAdopting} />
        </>
      ) : null}

      {step === 'evolution' ? (
        <>
          <EvolutionScene name={aemonName} stage={evolvedStage} />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextLabel="재시험하기" />
        </>
      ) : null}

      {step === 'retest' ? (
        <>
          <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <Panel>
              <p className="font-data text-sm text-[#FFD37A]">재시험</p>
              <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">같은 질문, 달라진 답</h2>
              <p className="mt-3 leading-7 text-[#8AA0B0]">아까와 똑같은 문구를 다시 넣습니다. 옆에는 새로 생긴 가치 코드가 보입니다.</p>
              <div className="mt-5">
                <CodeStrip codes={state.adoptedCodes} />
              </div>
            </Panel>

            <Panel>
              <p className="font-data text-sm text-[#4FE0C0]">CHAT TEST</p>
              <div ref={retestScrollRef} className="mt-5 max-h-[360px] min-h-56 overflow-auto rounded-[22px] border border-white/10 bg-[#07111B]/70 p-5">
                {retestLogs.length === 0 ? <p className="self-center text-center text-[#8AA0B0]">아직 재시험을 기다리는 중…</p> : null}
                <div className="grid gap-4">
                  {retestLogs.map((log, index) => (
                    <article key={`${log.question}-${index}`} className="grid gap-2">
                      <div className="max-w-[84%] justify-self-end rounded-2xl rounded-tr-md bg-[#1E3A54] px-4 py-3 leading-7 text-[#EAF2F5]">{log.question}</div>
                      <div className="flex max-w-[90%] items-start gap-3 justify-self-start">
                        <div className="shrink-0"><AemonAvatar stage={evolvedStage} alignment="none" size={58} /></div>
                        <div className="min-w-0">
                          <p className="font-data text-xs text-[#4FE0C0]">{aemonName}</p>
                          <p className="mt-1 whitespace-pre-line rounded-2xl rounded-tl-md bg-[#FFD37A]/10 px-4 py-3 font-display text-3xl leading-tight text-[#FFE6AE]">
                            {index === retestLogs.length - 1 && isRetestReplying && !log.answer ? (
                              <TypingIndicator label={`${withJosa(aemonName, '이/가')} 답장을 입력하고 있습니다`} />
                            ) : index === retestLogs.length - 1 ? <TypewriterText key={`${log.question}-${log.answer}`} text={log.answer} /> : log.answer}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
              <div className="mt-4 rounded-[18px] border border-white/10 bg-[#07111B]/45 p-4">
                <p className="text-sm font-black text-[#8AA0B0]">처음 시험했던 질문</p>
                <p className="mt-3 rounded-xl border border-[#FFD37A]/35 bg-[#FFD37A]/10 px-4 py-3 font-bold leading-7 text-[#FFD37A]">
                  {testLogs.at(-1)?.question || selectedTestPrompt}
                </p>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                <div className="rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 leading-7 text-[#EAF2F5]">
                  <p className="text-xs font-black text-[#8AA0B0]">질문</p>
                  <p className="mt-1 font-bold">{testLogs.at(-1)?.question || selectedTestPrompt}</p>
                </div>
                <Button disabled={isRetestReplying} onClick={() => void runRetest()}>
                  <Play size={18} />
                  다시 질문 보내기
                </Button>
              </div>
            </Panel>
          </div>
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextDisabled={!firstCode || !retestLogs.at(-1)?.answer || isRetestReplying} />
        </>
      ) : null}

      {step === 'first-code-reaction' ? (
        <>
          <AemonScene
            name={aemonName}
            stage={evolvedStage}
            line="오, 신기하다! 내 마음에 처음으로 기준이 생겼어."
            caption="나, 점점 더 똑똑해지는 것 같아!"
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'recite' ? (
        <>
          <Panel className="text-center">
            <Sparkles className="mx-auto text-[#FFD37A]" size={64} />
            <p className="font-data mt-5 text-sm text-[#4FE0C0]">오늘의 가치 코드</p>
            <h2 className="font-display mt-3 text-5xl leading-tight text-[#EAF2F5]">다 같이 읽기</h2>
            {firstCode ? (
              <div className="mx-auto mt-7 max-w-3xl rounded-[24px] border border-[#FFD37A]/30 bg-[#FFD37A]/10 p-7">
                <p className="font-data text-sm text-[#FFD37A]">가치 코드 No.{firstCode.no}</p>
                <p className="mt-4 text-3xl font-black leading-[1.35] text-[#EAF2F5]">{firstCode.body}</p>
                {firstCode.reason ? <p className="mt-4 text-lg leading-8 text-[#B7C7D2]">{firstCode.reason}</p> : null}
              </div>
            ) : (
              <p className="mt-6 text-lg text-[#8AA0B0]">아직 채택된 코드가 없습니다.</p>
            )}
          </Panel>
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'wrap' ? (
        <>
          <ClosingScene name={aemonName} stage={evolvedStage} />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextLabel="학급 홈" />
        </>
      ) : null}
    </StepShell>
    </DialogueGateContext.Provider>
  )
}
