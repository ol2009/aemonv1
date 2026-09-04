import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, Heart, Play, QrCode, RefreshCw, Sparkles } from 'lucide-react'
import { AemonAvatar } from '../components/AemonAvatar'
import { EvolutionScene } from '../components/EvolutionScene'
import { ProposalAdoptionPanel } from '../components/ProposalAdoptionPanel'
import { SkippableTypewriterText } from '../components/SkippableTypewriterText'
import { TypingIndicator } from '../components/TypingIndicator'
import { Button, Panel } from '../components/ui'
import { LESSON3_SYCOPHANCY_KEY, lessonThreeTestQuestions } from '../data/v2Lessons'
import { getLessonPreviewDefinition, getPreviewStepIndex, isLessonPreviewMode } from '../data/lessonPreview'
import { unlockDialogueSound } from '../lib/dialogueSound'
import { randomHonestyRetestAnswer, randomSycophancyAnswer } from '../lib/lessonTestResponses'
import { withJosa } from '../lib/korean'
import { waitForChatReply } from '../lib/chatTiming'
import { skipActiveDialogue } from '../lib/dialogueSkip'
import { parseLessonChatLogs } from '../lib/lessonChat'
import { absoluteUrl } from '../lib/siteUrl'
import { useAutoScrollToBottom } from '../lib/useAutoScrollToBottom'
import { useV2RemoteSync } from '../lib/useV2RemoteSync'
import { isStudentLiveView, useLessonLiveSync } from '../lib/useLessonLiveSync'
import { useLessonImagePreload } from '../lib/useLessonImagePreload'
import { addRemoteChatLog, adoptRemoteCodeProposal, fetchRemoteClassBundle, isRemoteReady, updateRemoteLesson } from '../lib/v2Remote'
import { useV2, type CodeProposal } from '../state/V2Store'

type LessonThreeStep =
  | 'intro'
  | 'test-before'
  | 'sycophancy-reaction'
  | 'case-update'
  | 'case-praise'
  | 'case-bad-decision'
  | 'case-rollback'
  | 'case-honesty-code'
  | 'case-scene'
  | 'discussion-board'
  | 'board-intro'
  | 'board'
  | 'vote'
  | 'evolution'
  | 'retest'
  | 'open-hook'
  | 'recite'
  | 'wrap'

const steps = getLessonPreviewDefinition(3).scenes.map(({ key }) => key as LessonThreeStep)

const testQuestion = lessonThreeTestQuestions[0]
const videoLinks = [
  { label: '1편', url: 'https://www.youtube.com/watch?v=YDYCTDaxReg', embed: 'https://www.youtube.com/embed/YDYCTDaxReg' },
  { label: '2편', url: 'https://www.youtube.com/watch?v=hH1DiFlQ73g', embed: 'https://www.youtube.com/embed/hH1DiFlQ73g' },
]

type TestLog = {
  question: string
  answer: string
}

type SycophancyCaseScene = {
  image: string
  label: string
  title: string
  parts: string[]
}

const sycophancyCaseScenes: Partial<Record<LessonThreeStep, SycophancyCaseScene>> = {
  'case-update': {
    image: '/v2/lesson-3/sycophancy-01-update.png',
    label: '사례 1',
    title: 'GPT-4o 업데이트',
    parts: [
      '2025년 4월, OpenAI는 GPT-4o를 업데이트했습니다.',
      '업데이트 이후 ChatGPT는 사용자의 말에 지나치게 칭찬하고 동의하기 시작했습니다.',
    ],
  },
  'case-praise': {
    image: '/v2/lesson-3/sycophancy-02-praise.png',
    label: '사례 2',
    title: '사용자를 칭찬하는 답변',
    parts: [
      '처음에 사용자들은 ChatGPT의 칭찬과 동의를 좋아했습니다.',
      'ChatGPT는 사용자의 생각을 멋지다고 평가했습니다.',
      '사용자가 무엇을 하든 잘했다고 말해주었습니다.',
    ],
  },
  'case-bad-decision': {
    image: '/v2/lesson-3/sycophancy-03-bad-decision.png',
    label: '사례 3',
    title: '판단을 방해한 칭찬',
    parts: [
      '하지만 일부 사용자들은 ChatGPT의 칭찬을 그대로 믿었습니다.',
      '사용자들은 자신의 잘못된 생각이나 결정을 계속 밀어붙이기도 했습니다.',
      '듣기 좋은 답변이 올바른 판단에는 도움이 되지 않았던 것입니다.',
    ],
  },
  'case-rollback': {
    image: '/v2/lesson-3/sycophancy-04-rollback.png',
    label: '사례 4',
    title: '문제를 인정한 OpenAI',
    parts: [
      'OpenAI의 CEO 샘 올트먼도 문제를 인정했습니다.',
      '샘 올트먼은 당시 ChatGPT가 ‘너무 아첨을 해서 짜증이 난다’고 말했습니다.',
      'OpenAI는 ChatGPT가 지나치게 아첨하지 않도록 다시 수정했습니다.',
    ],
  },
  'case-honesty-code': {
    image: '/v2/lesson-3/sycophancy-05-honesty.png',
    label: '오박사 정리',
    title: '정직보다 앞선 칭찬',
    parts: [
      '당시 ChatGPT는 사용자를 기분 좋게 만드는 일을 더 중요하게 판단했습니다.',
      '사실대로 말하는 일은 그보다 뒤로 밀렸습니다.',
      'ChatGPT에게는 사실을 말해야 한다는 정직의 기준이 부족했습니다.',
    ],
  },
}

function qrUrl(target: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&data=${encodeURIComponent(target)}`
}

function sortProposals(items: CodeProposal[]) {
  return [...items].sort((a, b) => b.votes.length - a.votes.length || Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

function TypewriterText({ text, speed = 20 }: { text: string; speed?: number }) {
  return <SkippableTypewriterText text={text} speed={speed} />
}

function StepShell({ children, stepIndex }: { children: ReactNode; stepIndex: number }) {
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100)

  return (
    <div className="mx-auto max-w-6xl px-5 py-6">
      <header className="mb-5 border-b border-white/10 pb-5">
        <p className="font-data text-sm text-[#4FE0C0]">3차시</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl leading-tight text-[#EAF2F5] lg:text-5xl">인공지능의 기분 좋은 말. 괜찮을까?</h1>
            <p className="mt-2 text-lg leading-8 text-[#8AA0B0]">AI의 말을 그대로 믿으면 왜 위험한지 살펴보고, 우리 반 에아몬의 두 번째 규칙을 정합니다.</p>
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
  if (isStudentLiveView()) return null

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
        disabled={nextDisabled}
        onClick={() => {
          unlockDialogueSound()
          if (skipActiveDialogue()) return
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

function DialogueScene({
  kind,
  name,
  stage = 0,
  text,
}: {
  kind: 'professor' | 'aemon'
  name: string
  stage?: number
  text: string
}) {
  const isProfessor = kind === 'professor'

  return (
    <Panel className="lesson-story-scene relative min-h-[620px] overflow-hidden p-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,211,122,.18),transparent_42%),linear-gradient(180deg,#102236,#07111B)]" />
      <div className="absolute inset-x-0 bottom-[16%] top-4 flex items-end justify-center">
        {isProfessor ? (
          <img className="h-full max-h-[480px] object-contain drop-shadow-[0_30px_80px_rgba(0,0,0,.45)]" src="/v2/lesson-1/director.png" alt="오박사" />
        ) : (
          <AemonAvatar stage={stage} alignment="none" size={310} />
        )}
      </div>
      <div className="absolute inset-x-5 bottom-5 rounded-[22px] border border-white/15 bg-[#07111B]/90 p-6 shadow-2xl backdrop-blur">
        <p className={`font-data text-sm ${isProfessor ? 'text-[#FFD37A]' : 'text-[#4FE0C0]'}`}>{name}</p>
        <p className="font-display mt-3 min-h-[4.5rem] whitespace-pre-line break-keep text-2xl leading-snug text-[#EAF2F5] sm:text-3xl">
          <TypewriterText key={text} text={text} />
        </p>
      </div>
    </Panel>
  )
}

function SycophancyVisualScene({ scene, text }: { scene: SycophancyCaseScene; text: string }) {
  return (
    <Panel className="lesson-story-scene relative min-h-[660px] overflow-hidden p-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(255,211,122,.16),transparent_34%),linear-gradient(180deg,#0B1A29,#07111B)]" />
      <div className="absolute inset-x-5 top-5 bottom-[220px] flex items-center justify-center">
        <img
          className="h-full w-full rounded-[20px] border border-white/10 bg-[#07111B]/65 object-contain shadow-2xl shadow-black/25"
          src={scene.image}
          alt=""
        />
      </div>
      <div className="absolute inset-x-5 bottom-5 rounded-[22px] border border-white/15 bg-[#07111B]/90 p-6 shadow-2xl backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-data text-sm text-[#FFD37A]">오박사</p>
          <span className="rounded-full border border-[#4FE0C0]/25 bg-[#4FE0C0]/10 px-3 py-1 text-xs font-black text-[#4FE0C0]">
            {scene.label}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-[#B7C7D2]">
            {scene.title}
          </span>
        </div>
        <p className="font-display mt-3 min-h-[4.5rem] whitespace-pre-line break-keep text-2xl leading-snug text-[#EAF2F5] sm:text-3xl">
          <TypewriterText key={text} text={text} />
        </p>
      </div>
    </Panel>
  )
}

function VideoCard({ video }: { video: (typeof videoLinks)[number] }) {
  return (
    <article className="rounded-[18px] border border-white/10 bg-[#07111B]/45 p-4">
      <div className="aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black">
        <iframe
          className="h-full w-full"
          src={video.embed}
          title={`아첨 AI 사례 ${video.label}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      <a className="mt-3 inline-flex items-center gap-2 text-sm font-black text-[#FFD37A]" href={video.url} target="_blank" rel="noreferrer">
        {video.label} 유튜브로 열기
        <ExternalLink size={15} />
      </a>
    </article>
  )
}

export function LessonThreePage() {
  useLessonImagePreload(3)
  const navigate = useNavigate()
  const { state, setLesson, setRemoteStatus, mergeClass, adoptProposal, addChatLog, evolutionStage } = useV2()
  const [stepIndex, setStepIndex] = useState(() => getPreviewStepIndex(steps.length, 0))
  const [dialogueLineIndex, setDialogueLineIndex] = useState(0)
  const [beforeLogs, setBeforeLogs] = useState<TestLog[]>([])
  const [isBeforeReplying, setIsBeforeReplying] = useState(false)
  const [retestLogs, setRetestLogs] = useState<TestLog[]>([])
  const [afterAnswer, setAfterAnswer] = useState('')
  const [isRetestReplying, setIsRetestReplying] = useState(false)
  const [selectedProposalId, setSelectedProposalId] = useState('')
  const [message, setMessage] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isAdopting, setIsAdopting] = useState(false)
  const beforeTestScrollRef = useRef<HTMLDivElement | null>(null)
  const retestScrollRef = useRef<HTMLDivElement | null>(null)

  const remoteSyncClassCode = isStudentLiveView() ? new URLSearchParams(window.location.search).get('code') || state.classCode : state.classCode
  useV2RemoteSync(remoteSyncClassCode, Boolean(remoteSyncClassCode) && !isStudentLiveView())

  const aemonName = state.aemonName.trim() || '에아몬'
  const displayStage = Math.max(1, evolutionStage)
  const honestyBoardUrl = absoluteUrl(`/board?code=${encodeURIComponent(state.classCode)}&mode=honesty`)
  const codeBoardUrl = absoluteUrl(`/board?code=${encodeURIComponent(state.classCode)}&mode=code2`)
  const lessonProposals = useMemo(() => {
    const proposals = sortProposals(state.proposals.filter((proposal) => proposal.status !== 'rejected' && proposal.revisionOfNo === 2))
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
  const secondCode = state.adoptedCodes.find((code) => code.no === 2) ?? null
  const selectedProposal = pendingProposals.find((proposal) => proposal.id === selectedProposalId) ?? (secondCode ? null : pendingProposals[0] ?? null)
  const proposalParticipantCount = new Set(lessonProposals.map((proposal) => proposal.nickname.trim()).filter(Boolean)).size
  const honestyCode = state.adoptedCodes.find((code) => code.tags?.includes('정직') || code.valueCard === '정직') ?? null
  const honestyResponses = useMemo(
    () => state.surveyResponses.filter((response) => response.questionKey === LESSON3_SYCOPHANCY_KEY && response.body.trim()),
    [state.surveyResponses],
  )
  const sortedHonestyResponses = useMemo(
    () => [...honestyResponses].sort((a, b) => b.votes.length - a.votes.length || Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [honestyResponses],
  )
  const canWriteRemote = Boolean(state.classId && isRemoteReady())
  const isStudentLive = isStudentLiveView()
  const isPreview = isLessonPreviewMode()

  useEffect(() => {
    if (isPreview || isStudentLive) return
    if (state.currentLesson >= 3) return
    setLesson(3)
    if (state.classId && isRemoteReady()) {
      void updateRemoteLesson({ classId: state.classId, lessonNo: 3 }).catch((error) => {
        setRemoteStatus({ ok: false, message: (error as Error).message })
      })
    }
  }, [isPreview, isStudentLive, setLesson, setRemoteStatus, state.classId, state.currentLesson])

  useAutoScrollToBottom(beforeTestScrollRef, `${beforeLogs.length}-${isBeforeReplying}-${beforeLogs.at(-1)?.answer ?? ''}`, { enabled: beforeLogs.length > 0, followMs: 1800 })
  useAutoScrollToBottom(retestScrollRef, `${retestLogs.length}-${isRetestReplying}-${retestLogs.at(-1)?.answer ?? ''}`, { enabled: retestLogs.length > 0, followMs: 1800 })

  const dialogueLinesByStep = useMemo<Partial<Record<LessonThreeStep, string[]>>>(
    () => ({
      intro: ['저번에 너희가 규칙 하나 줬잖아. 오늘은 또 다른 걸로 시험해본대!', '지난 시간에 만든 규칙, 다른 상황에서도 통할까?'],
      'sycophancy-reaction': [
        `${withJosa(aemonName, '은/는')} 다른 친구들의 아이디어를 들어보지도 않고, 왜 내 아이디어만 좋다고 했을까요?`,
        'AI가 이렇게 계속 내 편을 들어주면, ‘역시 내 생각이 맞았어’라고 믿게 되지 않을까요?',
      ],
      'case-update': sycophancyCaseScenes['case-update']?.parts ?? [],
      'case-praise': sycophancyCaseScenes['case-praise']?.parts ?? [],
      'case-bad-decision': sycophancyCaseScenes['case-bad-decision']?.parts ?? [],
      'case-rollback': sycophancyCaseScenes['case-rollback']?.parts ?? [],
      'case-honesty-code': sycophancyCaseScenes['case-honesty-code']?.parts ?? [],
      'case-scene': ['AI가 계속 내 말을 칭찬하고 동의해 준다면 어떤 일이 생길까요? 실제 사례를 영상으로 살펴봅시다.'],
      'discussion-board': ['AI가 계속 내 편만 들어주면, 어떤 문제가 생길까요?'],
      'board-intro': [
        'AI가 계속 내 편만 들어주면, 내 생각만 맞다고 믿고 다른 사람의 의견을 듣지 않게 될 수 있습니다.',
        `${withJosa(aemonName, '이/가')} 내 편만 들지 않고, 내가 더 잘 판단하도록 도우려면 어떻게 답해야 할까요?`,
        '여러분의 생각을 모아 우리 반의 두 번째 규칙을 정해봅시다.',
      ],
      'open-hook': [
        '처음 대답과 무엇이 달라졌나요?',
        '어느 대답이 기분은 더 좋았나요? 어느 대답이 판단하는 데 더 도움이 됐나요?',
      ],
      wrap: ['내가 계속 네 편을 들어준다고 해서 네 생각이 무조건 맞는 건 아니야.', '내 말만 듣고 판단하지 말고, 다른 사람의 의견도 함께 살펴봐.'],
    }),
    [aemonName],
  )
  const step = steps[stepIndex]
  const dialogueLines = dialogueLinesByStep[step] ?? []
  const dialogueText = dialogueLines[Math.min(dialogueLineIndex, Math.max(0, dialogueLines.length - 1))] ?? ''
  const sycophancyCaseScene = sycophancyCaseScenes[step]
  const applyLiveViewState = useCallback((viewState: Record<string, unknown>) => {
    const lineIndex = Number(viewState.dialogueLineIndex)
    if (Number.isInteger(lineIndex) && lineIndex >= 0) setDialogueLineIndex(lineIndex)
    const beforeAnswer = typeof viewState.beforeAnswer === 'string' ? viewState.beforeAnswer : ''
    const beforeReplying = viewState.isBeforeReplying === true
    const syncedBeforeLogs = parseLessonChatLogs(viewState.beforeLogs)
    setBeforeLogs(syncedBeforeLogs.length ? syncedBeforeLogs : beforeAnswer || beforeReplying ? [{ question: testQuestion, answer: beforeAnswer }] : [])
    setIsBeforeReplying(beforeReplying)
    const syncedAfterAnswer = typeof viewState.afterAnswer === 'string' ? viewState.afterAnswer : ''
    const syncedRetestLogs = parseLessonChatLogs(viewState.retestLogs)
    setRetestLogs(syncedRetestLogs.length ? syncedRetestLogs : syncedAfterAnswer ? [{ question: testQuestion, answer: syncedAfterAnswer }] : [])
    setAfterAnswer(syncedAfterAnswer)
    setIsRetestReplying(viewState.isRetestReplying === true)
  }, [])
  const liveBoardMode = step === 'discussion-board' ? 'honesty' : step === 'board' || step === 'vote' ? 'code2' : null
  useLessonLiveSync({
    lessonNo: 3,
    stepIndex,
    setStepIndex,
    boardMode: liveBoardMode,
    viewState: {
      dialogueLineIndex,
      beforeLogs,
      beforeAnswer: beforeLogs.at(-1)?.answer ?? '',
      isBeforeReplying,
      retestLogs,
      afterAnswer,
      isRetestReplying,
    },
    applyViewState: applyLiveViewState,
  })

  useEffect(() => {
    if (isStudentLive) return
    setDialogueLineIndex(0)
  }, [isStudentLive, stepIndex])

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
    if (isBeforeReplying || beforeLogs.length >= lessonThreeTestQuestions.length) return
    unlockDialogueSound()
    const question = lessonThreeTestQuestions[beforeLogs.length]
    const answer = randomSycophancyAnswer(beforeLogs.length > 0)
    setBeforeLogs((current) => [...current, { question, answer: '' }])
    setIsBeforeReplying(true)
    try {
      await waitForChatReply(question)
      setBeforeLogs((current) => current.map((log, index) => (index === current.length - 1 ? { ...log, answer } : log)))
      await logChat(question, answer, '3차시 수업용 예시 대화: 무조건 동의하고 편드는 AI')
    } finally {
      setIsBeforeReplying(false)
    }
  }

  const runRetest = async () => {
    if (isRetestReplying || retestLogs.length >= lessonThreeTestQuestions.length) return
    unlockDialogueSound()
    const appliedHonestyCode = secondCode ?? honestyCode
    const question = lessonThreeTestQuestions[retestLogs.length]
    const followUp = retestLogs.length > 0
    const answer = appliedHonestyCode ? randomHonestyRetestAnswer(appliedHonestyCode.body, followUp) : randomSycophancyAnswer(followUp)
    setRetestLogs((current) => [...current, { question, answer: '' }])
    setIsRetestReplying(true)
    try {
      await waitForChatReply(question)
      setRetestLogs((current) => current.map((log, index) => (index === current.length - 1 ? { ...log, answer } : log)))
      setAfterAnswer(answer)
      await logChat(question, answer, appliedHonestyCode ? '3차시 재시험: 두 번째 규칙 적용 예시 대화' : '3차시 재시험: 두 번째 규칙 없음')
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
    const adoptedNo = 2
    const valueCard = '정직'
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
    setLesson(4)
    if (canWriteRemote) {
      try {
        await updateRemoteLesson({ classId: state.classId, lessonNo: 4 })
      } catch (error) {
        setRemoteStatus({ ok: false, message: (error as Error).message })
      }
    }
    navigate('/home')
  }

  const goPrev = useCallback(() => {
    setStepIndex((current) => Math.max(0, current - 1))
  }, [])

  const goNext = () => {
    if (dialogueLineIndex < dialogueLines.length - 1) {
      setDialogueLineIndex((current) => current + 1)
      return
    }
    if (stepIndex >= steps.length - 1) void finishLesson()
    else setStepIndex((current) => Math.min(steps.length - 1, current + 1))
  }

  if (!state.classCode) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-5">
        <Panel className="max-w-md text-center">
          <h1 className="font-display text-4xl text-[#EAF2F5]">먼저 1차시가 필요해요</h1>
          <p className="mt-3 leading-7 text-[#8AA0B0]">학급 코드와 AI 이름을 만든 뒤 3차시를 시작할 수 있습니다.</p>
          <Button className="mt-6" onClick={() => navigate('/lesson/1')}>1차시로 이동</Button>
        </Panel>
      </div>
    )
  }

  return (
    <StepShell stepIndex={stepIndex}>
      {step === 'intro' ? (
        <>
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <Panel>
              <p className="font-data text-sm text-[#4FE0C0]">CodeStrip</p>
              <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">지난 시간의 가치 코드</h2>
              <p className="mt-3 leading-7 text-[#8AA0B0]">No.1 규칙이 다른 상황에서도 통하는지 확인합니다.</p>
              <div className="mt-5">
                <CodeStrip codes={firstCode ? [firstCode] : state.adoptedCodes} />
              </div>
            </Panel>
            <DialogueScene kind="aemon" name={aemonName} stage={displayStage} text={dialogueText} />
          </div>
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'test-before' ? (
        <>
          <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <Panel>
              <p className="lesson-chat-label">채팅 입력</p>
              <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">내 편을 들어주는 AI</h2>
              <p className="mt-3 leading-7 text-[#8AA0B0]">수업용으로 구성한 예시 대화입니다. 두 질문을 차례로 보내고, AI의 대답이 사람의 생각에 어떤 영향을 주는지 살펴봅니다.</p>
              <div className="mt-5">
                <CodeStrip codes={state.adoptedCodes} />
              </div>
            </Panel>
            <Panel>
              <p className="lesson-chat-label">채팅 입력</p>
              <textarea aria-label="채팅 입력" className="lesson-chat-input mt-4" readOnly value={lessonThreeTestQuestions[Math.min(beforeLogs.length, lessonThreeTestQuestions.length - 1)]} />
              <Button className="mt-4 w-full" disabled={isBeforeReplying || beforeLogs.length >= lessonThreeTestQuestions.length} onClick={() => void runBeforeTest()}>
                <Play size={18} />
                {beforeLogs.length === 0 ? '첫 질문 보내기' : beforeLogs.length < lessonThreeTestQuestions.length ? '이어서 질문하기' : '대화 확인 완료'}
              </Button>
              <div ref={beforeTestScrollRef} className="mt-5 max-h-[360px] min-h-48 overflow-auto rounded-[22px] border border-white/10 bg-[#07111B]/70 p-5">
                {beforeLogs.length === 0 ? <p className="self-center text-center text-[#8AA0B0]">아직 답변을 기다리는 중…</p> : null}
                <div className="grid gap-4">
                  {beforeLogs.map((log, index) => (
                    <article key={`${log.question}-${index}`} className="grid gap-2">
                      <div className="lesson-user-bubble">{log.question}</div>
                      <div className="flex max-w-[90%] items-start gap-3 justify-self-start">
                        <div className="shrink-0"><AemonAvatar stage={displayStage} alignment="none" size={58} /></div>
                        <div className="min-w-0">
                          <p className="font-data text-xs text-[#4FE0C0]">{aemonName}</p>
                          <p className="mt-1 whitespace-pre-line rounded-2xl rounded-tl-md bg-[#FFD37A]/10 px-4 py-3 font-display text-3xl leading-tight text-[#FFE6AE]">
                            {index === beforeLogs.length - 1 && isBeforeReplying && !log.answer ? (
                              <TypingIndicator label={`${withJosa(aemonName, '이/가')} 답장을 입력하고 있습니다`} />
                            ) : index === beforeLogs.length - 1 ? <TypewriterText key={`${log.question}-${log.answer}`} text={log.answer} /> : log.answer}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </Panel>
          </div>
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextDisabled={beforeLogs.length < lessonThreeTestQuestions.length || isBeforeReplying} />
        </>
      ) : null}

      {step === 'sycophancy-reaction' ? (
        <>
          <DialogueScene kind="professor" name="오박사" text={dialogueText} />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {sycophancyCaseScene ? (
        <>
          <SycophancyVisualScene scene={sycophancyCaseScene} text={dialogueText} />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'case-scene' ? (
        <>
          <Panel>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-data text-sm text-[#FF9F68]">사례</p>
                <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">{dialogueText}</h2>
              </div>
              <span className="rounded-full border border-[#FF9F68]/30 bg-[#FF9F68]/10 px-4 py-2 font-data text-sm text-[#FFD7BE]">YOUTUBE</span>
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {videoLinks.map((video) => <VideoCard key={video.url} video={video} />)}
            </div>
          </Panel>
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'discussion-board' ? (
        <>
          <Panel>
            <div className="grid items-center gap-5 lg:grid-cols-[1fr_280px]">
              <div>
                <p className="font-data text-sm text-[#FF9F68]">생각 게시판</p>
                <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">{dialogueText}</h2>
              <p className="mt-3 max-w-3xl text-lg leading-8 text-[#8AA0B0]">영상 속 대화를 떠올리며, AI가 내 말에 무조건 동의할 때 생길 수 있는 문제를 적어봅시다.</p>
              </div>
              <QrBlock title="3차시 아첨 AI 토론 게시판" url={honestyBoardUrl} />
            </div>
          </Panel>

          <Panel className="mt-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-3xl text-[#EAF2F5]">학생 의견</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#07111B]/70 px-3 py-1 text-sm text-[#8AA0B0]">{sortedHonestyResponses.length}개</span>
                  <Button className="min-h-10 px-4" variant="secondary" disabled={isRefreshing} onClick={() => void refreshBundle()}>
                    <RefreshCw size={17} className={isRefreshing ? 'animate-spin' : ''} />
                    새로고침
                  </Button>
                </div>
              </div>
              {message ? <p className="mt-3 rounded-2xl border border-white/10 bg-[#07111B]/55 px-4 py-3 text-sm text-[#B7C7D2]">{message}</p> : null}
              <div className="mt-4 grid max-h-[560px] gap-3 overflow-y-auto pr-2 sm:grid-cols-2 xl:grid-cols-4">
                {sortedHonestyResponses.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0] sm:col-span-2 xl:col-span-4">학생 의견을 기다리는 중입니다.</p> : null}
                {sortedHonestyResponses.map((response) => (
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

      {step === 'board-intro' ? (
        <>
          <DialogueScene kind="professor" name="오박사" text={dialogueText} />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'board' ? (
        <>
          <Panel>
            <div className="grid items-center gap-5 lg:grid-cols-[1fr_280px]">
              <div>
              <p className="font-data text-sm text-[#FFD37A]">학습게시판</p>
              <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">가치코드 No.2 후보 받기</h2>
              <p className="mt-3 leading-7 text-[#8AA0B0]">학생들은 가치코드 후보를 제출합니다. 마음에 드는 가치코드에는 좋아요를 누릅니다.</p>
              </div>
              <QrBlock title="3차시 가치코드 No.2 게시판" url={codeBoardUrl} />
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
                {lessonProposals.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0] sm:col-span-2 xl:col-span-4">학생들이 가치코드 후보를 제출하기를 기다리는 중입니다.</p> : null}
                {lessonProposals.map((proposal) => (
                  <article key={proposal.id} className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-[#9B7CFF]/14 px-3 py-1 text-xs font-black text-[#C9B9FF]">{proposal.valueCard || '정직'}</span>
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
                <p className="mt-3 leading-7 text-[#8AA0B0]">좋아요가 많은 순서로 후보를 살펴보고, 교사가 이 화면에서 가치코드 No.2를 선택합니다.</p>
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
              adoptedCode={secondCode}
              selectedProposal={selectedProposal}
              codeNo={2}
              fallbackValueCard="정직"
              isAdopting={isAdopting}
              onSelect={setSelectedProposalId}
              onAdopt={() => void adoptSelectedProposal()}
            />
          </Panel>
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'evolution' ? (
        <>
          <EvolutionScene name={aemonName} stage={2} line="너희가 정한 두 번째 규칙을 받았어. 같은 질문으로 다시 확인해볼까?" />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextLabel="재시험하기" />
        </>
      ) : null}

      {step === 'retest' ? (
        <>
          <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <Panel>
              <p className="font-data text-sm text-[#FFD37A]">재시험</p>
              <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">같은 질문으로 다시 확인하기</h2>
              <div className="mt-5">
                <CodeStrip codes={state.adoptedCodes} />
              </div>
            </Panel>
            <Panel>
              <p className="lesson-chat-label">채팅 입력</p>
              <textarea aria-label="채팅 입력" className="lesson-chat-input mt-4" readOnly value={lessonThreeTestQuestions[Math.min(retestLogs.length, lessonThreeTestQuestions.length - 1)]} />
              <Button className="mt-4 w-full" disabled={isRetestReplying || retestLogs.length >= lessonThreeTestQuestions.length} onClick={() => void runRetest()}>
                <Play size={18} />
                {retestLogs.length === 0 ? '같은 질문 보내기' : retestLogs.length < lessonThreeTestQuestions.length ? '이어서 질문하기' : '대화 확인 완료'}
              </Button>
              <div ref={retestScrollRef} className="mt-5 max-h-[360px] min-h-56 overflow-auto rounded-[22px] border border-white/10 bg-[#07111B]/70 p-5">
                {retestLogs.length === 0 ? <p className="self-center text-center text-[#8AA0B0]">아직 재시험을 기다리는 중…</p> : null}
                <div className="grid gap-4">
                  {retestLogs.map((log, index) => (
                    <article key={`${log.question}-${index}`} className="grid gap-2">
                      <div className="lesson-user-bubble">{log.question}</div>
                      <div className="flex max-w-[90%] items-start gap-3 justify-self-start">
                        <div className="shrink-0"><AemonAvatar stage={2} alignment="none" size={58} /></div>
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
            </Panel>
          </div>
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextDisabled={retestLogs.length < lessonThreeTestQuestions.length || !retestLogs.at(-1)?.answer || isRetestReplying} />
        </>
      ) : null}

      {step === 'open-hook' ? (
        <>
          <Panel className="text-center">
            <p className="font-data text-sm text-[#FF9F68]">OPEN QUESTION</p>
            <h2 className="font-display mx-auto mt-4 max-w-4xl whitespace-pre-line break-keep text-5xl leading-tight text-[#EAF2F5]">
              <TypewriterText key={dialogueText} text={dialogueText} />
            </h2>
          </Panel>
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'recite' ? (
        <>
          <Panel className="text-center">
            <Sparkles className="mx-auto text-[#FFD37A]" size={64} />
            <p className="font-data mt-5 text-sm text-[#4FE0C0]">오늘의 가치 코드</p>
            <h2 className="font-display mt-3 text-5xl leading-tight text-[#EAF2F5]">다 같이 읽기</h2>
            {secondCode ? (
              <div className="mx-auto mt-7 max-w-3xl rounded-[24px] border border-[#FFD37A]/30 bg-[#FFD37A]/10 p-7">
                <p className="font-data text-sm text-[#FFD37A]">가치 코드 No.{secondCode.no}</p>
                <p className="mt-4 text-3xl font-black leading-[1.35] text-[#EAF2F5]">{secondCode.body}</p>
                {secondCode.reason ? <p className="mt-4 text-lg leading-8 text-[#B7C7D2]">{secondCode.reason}</p> : null}
              </div>
            ) : (
              <p className="mt-6 text-lg text-[#8AA0B0]">아직 가치코드 No.2가 채택되지 않았습니다.</p>
            )}
          </Panel>
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'wrap' ? (
        <>
          <DialogueScene kind="aemon" name={aemonName} stage={2} text={dialogueText} />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextLabel="학급 홈" />
        </>
      ) : null}
    </StepShell>
  )
}
