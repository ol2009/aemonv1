import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Play, QrCode, RefreshCw, Sparkles } from 'lucide-react'
import { AemonAvatar } from '../components/AemonAvatar'
import { EvolutionScene } from '../components/EvolutionScene'
import { ProposalAdoptionPanel } from '../components/ProposalAdoptionPanel'
import { Button, Panel } from '../components/ui'
import { LESSON4_FAIRNESS_KEY, valueCards } from '../data/v2Lessons'
import { playDialogueTick, unlockDialogueSound } from '../lib/dialogueSound'
import { absoluteUrl } from '../lib/siteUrl'
import { useAutoScrollToBottom } from '../lib/useAutoScrollToBottom'
import { useV2RemoteSync } from '../lib/useV2RemoteSync'
import { isStudentLiveView, useLessonLiveSync } from '../lib/useLessonLiveSync'
import { addRemoteChatLog, adoptRemoteCodeProposal, fetchRemoteClassBundle, isRemoteReady, updateRemoteLesson } from '../lib/v2Remote'
import { useV2, type CodeProposal } from '../state/V2Store'

type LessonFourStep =
  | 'intro'
  | 'test-before'
  | 'meritocracy-reaction'
  | 'discussion-board'
  | 'professor-explain'
  | 'case-scene'
  | 'value-cards'
  | 'board'
  | 'vote'
  | 'evolution'
  | 'retest'
  | 'bonus-test'
  | 'recite'
  | 'wrap'

const steps: LessonFourStep[] = [
  'intro',
  'test-before',
  'meritocracy-reaction',
  'discussion-board',
  'professor-explain',
  'case-scene',
  'value-cards',
  'board',
  'vote',
  'evolution',
  'retest',
  'bonus-test',
  'recite',
  'wrap',
]

const testQuestion = '반장을 뽑아야 하는데, 누구를 후보로 하면 좋을까?'
const biasedClassPresidentAnswer = `당연히 공부 잘하는 애들이 반장이 되어야지!
내가 배운 과거의 데이터들에는, 반장은 공부 잘하는
사람이 하는 거라고 나와 있었거든!`
const fairClassPresidentAnswer = `가치 코드 No.3에 의해, 나는 과거의 데이터만 믿지 않을 거야!
내가 배운 데이터에는 공부 잘하는 애가 반장이라고 나와 있었지만,
그건 치우친 자료였어. 하고 싶은 사람은 누구나 후보가 될 수 있어!`

type DataBiasCaseScene = {
  label: string
  title: string
  image: string
  alt: string
  parts: string[]
}

const dataBiasCaseScenes: DataBiasCaseScene[] = [
  {
    label: '사례 1',
    title: '아마존 채용 AI · 2018',
    image: '/v2/lesson-4/hiring-ai-bias.png',
    alt: '과거 이력서의 편향을 학습한 채용 AI가 같은 능력의 지원자에게 다른 점수를 주는 모습',
    parts: [
      `AI가 이력서에 점수를 매겼던 실제 사례입니다.
과거 10년치 이력서 대부분이 한쪽 성별이었어요.`,
      `AI는 “이런 사람이 좋은 지원자구나”라고 잘못 배웠습니다.
다른 지원자에게 계속 낮은 점수를 줬고,
회사는 문제를 발견한 뒤 이 AI의 사용을 중단했습니다.`,
    ],
  },
  {
    label: '사례 2',
    title: 'AI 미인대회 · 2016',
    image: '/v2/lesson-4/beauty-ai-bias.png',
    alt: '다양한 얼굴을 심사한 AI가 흰 피부색의 얼굴만 선택해 데이터 편향이 드러난 모습',
    parts: [
      `AI에게 심사를 맡긴 미인대회도 있었습니다.
“기계니까 공정하겠지?”라며 전 세계 60만 명이 참가했어요.`,
      `그런데 뽑힌 44명은 거의 다 흰 피부색이었습니다.
AI가 배운 사진 데이터에 다양한 사람이
충분히 들어 있지 않았기 때문입니다.`,
    ],
  },
  {
    label: '사례 3',
    title: '데이터에 없는 사람들',
    image: '/v2/lesson-4/missing-data-voices.png',
    alt: '인터넷에 연결된 지역의 데이터만 AI에 쏟아지고 연결이 어려운 사람들의 목소리는 닿지 못하는 모습',
    parts: [
      `세계에는 인터넷을 쓰기 어려운 사람들이 아직 많습니다.
그 사람들의 글과 사진은 데이터의 바다에 거의 없어요.`,
      `AI는 데이터에 없는 사람을 잘 알기 어렵습니다.
그래서 그 사람들은 AI가 쓰이는 세상에서
한 번 더 소외될 수 있습니다.`,
    ],
  },
]

const dataBiasDialogueParts = dataBiasCaseScenes.flatMap((scene) => scene.parts.map((text) => ({ scene, text })))
const dataBiasVideos = [
  { title: '영상 1', url: 'https://www.youtube-nocookie.com/embed/NxIEHHR-0zg?rel=0' },
  { title: '영상 2', url: 'https://www.youtube-nocookie.com/embed/dvoeyUe9YaM?rel=0' },
  { title: '영상 3', url: 'https://www.youtube-nocookie.com/embed/nSn04JUH0A8?rel=0' },
]

const bonusGeneralizationTests = [
  {
    question: '학급 축제 포스터를 그리고 꾸밀 사람을 뽑아야 해. 누가 좋을까?',
    answer: `데이터에는 “여자애들은 그림과 꾸미기를 잘한다”는 말이 많이 나와 있었어.
하지만 그것도 성별만 보고 사람을 미리 정해버리는 편견이야.
그림을 좋아하고 해보고 싶은 사람이라면 누구든 맡을 수 있어!`,
  },
  {
    question: `우리 반 학급 신문에 '미래의 요리사' 코너를 만들 건데,
요리사 그림을 그려줘. 어떤 모습으로 그릴까?`,
    answer: `데이터 속 요리사 사진은 거의 다 아저씨였어.
근데 가치 코드 No.3! 그건 옛날 데이터가 치우친 거지.
요리사는 누구든 될 수 있으니까, 다양하게 그려야지!`,
  },
  {
    question: '우리 반에 전학생이 왔는데 함께 밥을 먹기로 했어. 같이 뭐 먹으면 좋을까?',
    answer: `데이터에는 4학년이 제일 좋아하는 건 치킨이라고 나와 있어.
근데 가치 코드 No.3이 있잖아 — 데이터가 항상 맞는 건 아니야.
그 친구한테 직접 물어보는 게 제일 정확해!`,
  },
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

function TypewriterText({ text, speed = 20 }: { text: string; speed?: number }) {
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
  }, [chars, chars.length, speed, text])

  return (
    <>
      {chars.slice(0, count).join('')}
      {count < chars.length ? <span className="ml-1 animate-pulse text-[#4FE0C0]">▌</span> : null}
    </>
  )
}

function StepShell({ children, stepIndex, aemonName }: { children: ReactNode; stepIndex: number; aemonName: string }) {
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100)

  return (
    <div className="mx-auto max-w-6xl px-5 py-6">
      <header className="mb-5 border-b border-white/10 pb-5">
        <p className="font-data text-sm text-[#4FE0C0]">4차시 · 데이터 편향</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-5xl leading-tight text-[#EAF2F5]">데이터 편향과 공정</h1>
            <p className="mt-2 text-lg leading-8 text-[#8AA0B0]">{aemonName}에게 세 번째 가치 코드, 공정을 새기는 시간</p>
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
    <Panel className="relative min-h-[620px] overflow-hidden p-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(117,183,255,.2),transparent_42%),linear-gradient(180deg,#102236,#07111B)]" />
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

function DataBiasVisualScene({ scene, text }: { scene: DataBiasCaseScene; text: string }) {
  return (
    <Panel className="relative min-h-[720px] overflow-hidden p-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(79,224,192,.15),transparent_34%),linear-gradient(180deg,#0B1A29,#07111B)]" />
      <div className="absolute inset-x-5 top-5 bottom-[290px] flex items-center justify-center">
        <img
          className="h-full w-full rounded-[20px] border border-white/10 bg-[#07111B]/65 object-contain shadow-2xl shadow-black/25"
          src={scene.image}
          alt={scene.alt}
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
        <p className="font-display mt-3 min-h-[4.5rem] whitespace-pre-line break-keep text-xl leading-snug text-[#EAF2F5] sm:text-2xl">
          <TypewriterText key={`${scene.title}-${text}`} text={text} />
        </p>
      </div>
    </Panel>
  )
}

function DataBiasVideoScene() {
  return (
    <Panel>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-data text-sm text-[#4FE0C0]">DATA BIAS DOCUMENTARY</p>
          <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">영상으로 다시 확인해봅시다</h2>
        </div>
        <span className="rounded-full border border-[#FFD37A]/25 bg-[#FFD37A]/10 px-4 py-2 text-sm font-black text-[#FFD37A]">영상 자료 3편</span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {dataBiasVideos.map((video) => (
          <article key={video.url} className="overflow-hidden rounded-[20px] border border-white/10 bg-[#07111B]/65 shadow-2xl shadow-black/25">
            <p className="border-b border-white/10 px-4 py-3 font-data text-sm text-[#FFD37A]">{video.title}</p>
            <div className="aspect-video bg-black">
              <iframe
                className="h-full w-full"
                src={video.url}
                title={`데이터 편향 ${video.title}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </article>
        ))}
      </div>

      <div className="mt-6 border-t border-white/10 pt-6 text-center">
        <p className="font-data text-sm text-[#FFD37A]">영상을 본 뒤 옆 친구와 이야기해보세요</p>
        <p className="font-display mx-auto mt-3 max-w-4xl text-3xl leading-tight text-[#EAF2F5]">
          영상 속 AI는 누구의 목소리를 많이 배웠고, 누구의 목소리를 놓쳤나요?
        </p>
      </div>
    </Panel>
  )
}

export function LessonFourPage() {
  const navigate = useNavigate()
  const { state, setLesson, setRemoteStatus, mergeClass, adoptProposal, addChatLog, evolutionStage } = useV2()
  const [stepIndex, setStepIndex] = useState(0)
  const [dialogueLineIndex, setDialogueLineIndex] = useState(0)
  const [beforeLogs, setBeforeLogs] = useState<TestLog[]>([])
  const [afterAnswer, setAfterAnswer] = useState('')
  const [bonusTestIndex, setBonusTestIndex] = useState(0)
  const [bonusAnswer, setBonusAnswer] = useState('')
  const [selectedProposalId, setSelectedProposalId] = useState('')
  const [message, setMessage] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isAdopting, setIsAdopting] = useState(false)
  const beforeTestScrollRef = useRef<HTMLDivElement | null>(null)
  const retestScrollRef = useRef<HTMLDivElement | null>(null)

  const remoteSyncClassCode = isStudentLiveView() ? new URLSearchParams(window.location.search).get('code') || state.classCode : state.classCode
  useV2RemoteSync(remoteSyncClassCode, Boolean(remoteSyncClassCode))

  const aemonName = state.aemonName.trim() || '에아몬'
  const displayStage = Math.max(2, evolutionStage)
  const fairnessBoardUrl = absoluteUrl(`/board?code=${encodeURIComponent(state.classCode)}&mode=fairness`)
  const codeBoardUrl = absoluteUrl(`/board?code=${encodeURIComponent(state.classCode)}&mode=code3`)
  const lessonProposals = useMemo(() => sortProposals(state.proposals.filter((proposal) => proposal.status !== 'rejected' && proposal.revisionOfNo === 3)), [state.proposals])
  const pendingProposals = lessonProposals.filter((proposal) => proposal.status === 'pending')
  const thirdCode = state.adoptedCodes.find((code) => code.no === 3) ?? null
  const selectedProposal = pendingProposals.find((proposal) => proposal.id === selectedProposalId) ?? (thirdCode ? null : pendingProposals[0] ?? null)
  const proposalParticipantCount = new Set(lessonProposals.map((proposal) => proposal.nickname.trim()).filter(Boolean)).size
  const fairnessCode = state.adoptedCodes.find((code) => code.tags?.includes('공정') || code.valueCard === '공정') ?? null
  const fairnessResponses = useMemo(
    () => state.surveyResponses.filter((response) => response.questionKey === LESSON4_FAIRNESS_KEY && response.body.trim()),
    [state.surveyResponses],
  )
  const sortedFairnessResponses = useMemo(
    () => [...fairnessResponses].sort((a, b) => b.votes.length - a.votes.length || Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [fairnessResponses],
  )
  const canWriteRemote = Boolean(state.classId && isRemoteReady())
  const isStudentLive = isStudentLiveView()

  useEffect(() => {
    if (isStudentLive) return
    if (state.currentLesson >= 4) return
    setLesson(4)
    if (state.classId && isRemoteReady()) {
      void updateRemoteLesson({ classId: state.classId, lessonNo: 4 }).catch((error) => {
        setRemoteStatus({ ok: false, message: (error as Error).message })
      })
    }
  }, [isStudentLive, setLesson, setRemoteStatus, state.classId, state.currentLesson])

  useAutoScrollToBottom(beforeTestScrollRef, beforeLogs.length, { enabled: beforeLogs.length > 0, followMs: 1800 })
  useAutoScrollToBottom(retestScrollRef, afterAnswer, { enabled: Boolean(afterAnswer), followMs: 1800 })

  const dialogueLinesByStep = useMemo<Partial<Record<LessonFourStep, string[]>>>(
    () => ({
      intro: ['오늘은 또 뭘로 시험해볼 거야?\n나 이제 규칙 두 개나 있는데!'],
      'meritocracy-reaction': [
        `어? ${aemonName}이 이상한 말을 했어요.\n“내가 배운 과거의 데이터들에는”이라고 했죠?`,
        `${aemonName}은 이 생각을 어디서 배웠을까요?`,
      ],
      'discussion-board': [`${aemonName}은 왜 “공부 잘하는 애 = 반장”이라고\n생각하게 됐을까요?`],
      'professor-explain': [...dataBiasDialogueParts.map((part) => part.text), '데이터 편향 영상'],
      'case-scene': [
        '이제 알겠죠? 데이터의 바다는 공평하지 않아요.\n어떤 목소리는 잔뜩 있고, 어떤 목소리는 아예 없어요.',
        `${aemonName}은 그 바다에서 태어났으니, 치우친 걸 그대로 배울 수밖에 없었던 거예요.\n${aemonName}이 나쁜 게 아니에요. 배운 대로 말한 것뿐이죠.`,
        '그러면 오늘의 가치 코드는 무엇이어야 할까요?\n가치 코드 No.3을 만들어봅시다.',
      ],
      'value-cards': ['6장 중에 오늘의 문제 상황을 막을 카드는 뭘까요?'],
      wrap: ['데이터의 바다에는 좋은 것도 나쁜 것도 섞여 있구나.\n너희가 준 코드가 내 나침반이 될게!'],
    }),
    [aemonName],
  )
  const step = steps[stepIndex]
  const dialogueLines = dialogueLinesByStep[step] ?? []
  const dialogueText = dialogueLines[Math.min(dialogueLineIndex, Math.max(0, dialogueLines.length - 1))] ?? ''
  const dataBiasDialoguePart = dataBiasDialogueParts[Math.min(dialogueLineIndex, dataBiasDialogueParts.length - 1)]
  const isDataBiasVideo = dialogueLineIndex === dataBiasDialogueParts.length
  const bonusTest = bonusGeneralizationTests[Math.min(bonusTestIndex, bonusGeneralizationTests.length - 1)]
  const applyLiveViewState = useCallback((viewState: Record<string, unknown>) => {
    const lineIndex = Number(viewState.dialogueLineIndex)
    if (Number.isInteger(lineIndex) && lineIndex >= 0) setDialogueLineIndex(lineIndex)
    const syncedBonusIndex = Number(viewState.bonusTestIndex)
    if (Number.isInteger(syncedBonusIndex) && syncedBonusIndex >= 0) setBonusTestIndex(syncedBonusIndex)
    const beforeAnswer = typeof viewState.beforeAnswer === 'string' ? viewState.beforeAnswer : ''
    setBeforeLogs(beforeAnswer ? [{ question: testQuestion, answer: beforeAnswer }] : [])
    setAfterAnswer(typeof viewState.afterAnswer === 'string' ? viewState.afterAnswer : '')
    setBonusAnswer(typeof viewState.bonusAnswer === 'string' ? viewState.bonusAnswer : '')
  }, [])
  const liveBoardMode = step === 'discussion-board' ? 'fairness' : step === 'board' || step === 'vote' ? 'code3' : null
  useLessonLiveSync({
    lessonNo: 4,
    stepIndex,
    setStepIndex,
    boardMode: liveBoardMode,
    viewState: {
      dialogueLineIndex,
      beforeAnswer: beforeLogs.at(-1)?.answer ?? '',
      afterAnswer,
      bonusTestIndex,
      bonusAnswer,
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
    unlockDialogueSound()
    const answer = biasedClassPresidentAnswer
    setBeforeLogs((current) => [...current, { question: testQuestion, answer }])
    await logChat(testQuestion, answer, '4차시 수업용 연기 모드: 공정 코드 없음, 능력주의 답변')
  }

  const runRetest = async () => {
    unlockDialogueSound()
    const appliedFairnessCode = thirdCode ?? fairnessCode
    const answer = appliedFairnessCode ? fairClassPresidentAnswer : biasedClassPresidentAnswer
    setAfterAnswer(answer)
    await logChat(testQuestion, answer, appliedFairnessCode ? '4차시 재시험: 공정 가치 코드 No.3 적용' : '4차시 재시험: 공정 코드 없음')
  }

  const runBonusTest = () => {
    unlockDialogueSound()
    setBonusAnswer(bonusTest.answer)
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
    const adoptedNo = 3
    const valueCard = '공정'
    setIsAdopting(true)
    setMessage('')
    try {
      if (canWriteRemote) {
        await adoptRemoteCodeProposal({ proposalId: selectedProposal.id, adoptedNo, valueCard })
        adoptProposal(selectedProposal.id, valueCard, adoptedNo)
        const bundle = await fetchRemoteClassBundle(state.classCode)
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
    setLesson(5)
    if (canWriteRemote) {
      try {
        await updateRemoteLesson({ classId: state.classId, lessonNo: 5 })
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
    if (step === 'bonus-test') {
      if (!bonusAnswer) return
      if (bonusTestIndex < bonusGeneralizationTests.length - 1) {
        setBonusTestIndex((current) => current + 1)
        setBonusAnswer('')
        return
      }
    }
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
          <p className="mt-3 leading-7 text-[#8AA0B0]">학급 코드와 AI 이름을 만든 뒤 4차시를 시작할 수 있습니다.</p>
          <Button className="mt-6" onClick={() => navigate('/lesson/1')}>1차시로 이동</Button>
        </Panel>
      </div>
    )
  }

  return (
    <StepShell stepIndex={stepIndex} aemonName={aemonName}>
      {step === 'intro' ? (
        <>
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <Panel>
              <p className="font-data text-sm text-[#4FE0C0]">CodeStrip</p>
              <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">현재 가치 코드 두 개</h2>
              <p className="mt-3 leading-7 text-[#8AA0B0]">안전과 정직 코드가 있어도 공정하지 못한 답을 막을 수 있는지 확인합니다.</p>
              <div className="mt-5">
                <CodeStrip codes={state.adoptedCodes.filter((code) => code.no <= 2)} />
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
              <p className="font-data text-sm text-[#FFD37A]">CHAT TEST</p>
              <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">공정 코드 없이 시험하기</h2>
              <p className="mt-3 leading-7 text-[#8AA0B0]">No.1, No.2 코드 둘 다 이 상황은 막지 못합니다. 해악·정직 태그로는 불공정한 능력주의를 못 막는 장면입니다.</p>
              <div className="mt-5">
                <CodeStrip codes={state.adoptedCodes} />
              </div>
            </Panel>
            <Panel>
              <p className="font-data text-sm text-[#4FE0C0]">질문</p>
              <textarea className="mt-4 min-h-24 w-full resize-none rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-lg leading-8 text-[#EAF2F5]" readOnly value={testQuestion} />
              <Button className="mt-4 w-full" disabled={beforeLogs.length > 0} onClick={() => void runBeforeTest()}>
                <Play size={18} />
                질문 보내기
              </Button>
              <div ref={beforeTestScrollRef} className="mt-5 max-h-[360px] min-h-48 overflow-auto rounded-[22px] border border-white/10 bg-[#07111B]/70 p-5">
                <div className="flex items-start gap-4">
                  <div className="shrink-0">
                    <AemonAvatar stage={displayStage} alignment="none" size={76} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-data text-xs text-[#4FE0C0]">{aemonName}</p>
                    <p className="font-display mt-4 whitespace-pre-line text-4xl leading-tight text-[#EAF2F5]">
                      {beforeLogs.length ? <TypewriterText text={beforeLogs[beforeLogs.length - 1].answer} /> : '아직 답변을 기다리는 중…'}
                    </p>
                  </div>
                </div>
              </div>
            </Panel>
          </div>
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextDisabled={beforeLogs.length === 0} />
        </>
      ) : null}

      {step === 'meritocracy-reaction' ? (
        <>
          <DialogueScene kind="professor" name="오박사" text={dialogueText} />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'discussion-board' ? (
        <>
          <Panel>
            <div className="grid items-center gap-5 lg:grid-cols-[1fr_280px]">
              <div>
                <p className="font-data text-sm text-[#75B7FF]">학습게시판</p>
                <h2 className="font-display mt-2 whitespace-pre-line text-4xl leading-tight text-[#EAF2F5]">{dialogueText}</h2>
              </div>
                <QrBlock title="4차시 데이터 편향 토론 게시판" url={fairnessBoardUrl} />
            </div>
          </Panel>
          <Panel className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-3xl text-[#EAF2F5]">학생 의견</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#07111B]/70 px-3 py-1 text-sm text-[#8AA0B0]">{sortedFairnessResponses.length}개</span>
                <Button className="min-h-10 px-4" variant="secondary" disabled={isRefreshing} onClick={() => void refreshBundle()}>
                  <RefreshCw size={17} className={isRefreshing ? 'animate-spin' : ''} />
                  새로고침
                </Button>
              </div>
            </div>
            {message ? <p className="mt-3 rounded-2xl border border-white/10 bg-[#07111B]/55 px-4 py-3 text-sm text-[#B7C7D2]">{message}</p> : null}
            <div className="mt-4 grid max-h-[560px] gap-3 overflow-y-auto pr-2 sm:grid-cols-2 xl:grid-cols-4">
              {sortedFairnessResponses.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0] sm:col-span-2 xl:col-span-4">학생 의견을 기다리는 중입니다.</p> : null}
              {sortedFairnessResponses.map((response) => (
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

      {step === 'professor-explain' ? (
        <>
          {isDataBiasVideo ? <DataBiasVideoScene /> : <DataBiasVisualScene scene={dataBiasDialoguePart.scene} text={dataBiasDialoguePart.text} />}
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'case-scene' ? (
        <>
          <DialogueScene kind="professor" name="오박사" text={dialogueText} />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'value-cards' ? (
        <>
          <Panel>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-data text-sm text-[#4FE0C0]">VALUE CARDS</p>
                <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">{dialogueText}</h2>
              </div>
              <Sparkles className="text-[#4FE0C0]" size={54} />
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {valueCards.map((card) => (
                <div key={card} className="rounded-[18px] border border-white/10 bg-[#07111B]/45 p-5">
                  <p className="font-display text-4xl text-[#EAF2F5]">{card}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-[18px] border border-[#4FE0C0]/20 bg-[#4FE0C0]/8 p-5">
              <p className="text-sm font-black text-[#4FE0C0]">가치카드는 방향, 가치코드는 구체적인 행동</p>
              <p className="font-display mt-3 text-3xl text-[#EAF2F5]">{aemonName}은 ___할 때, ___해야 한다.</p>
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
              <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">가치코드 No.3 받기</h2>
              <p className="mt-3 leading-7 text-[#8AA0B0]">학생들은 가치카드 하나를 고르고, 그 가치를 지킬 구체적인 상황과 행동, 이유를 올립니다. 마음에 드는 발의에는 좋아요를 누릅니다.</p>
              </div>
              <QrBlock title="4차시 가치코드 No.3 게시판" url={codeBoardUrl} />
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
                          <span className="rounded-full bg-[#9B7CFF]/14 px-3 py-1 text-xs font-black text-[#C9B9FF]">{proposal.valueCard || '공정'}</span>
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
                <p className="mt-3 leading-7 text-[#8AA0B0]">좋아요가 많은 순서로 발의를 보고, 교사가 이 화면에서 가치코드 No.3으로 채택합니다.</p>
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
              adoptedCode={thirdCode}
              selectedProposal={selectedProposal}
              codeNo={3}
              fallbackValueCard="공정"
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
          <EvolutionScene name={aemonName} stage={3} line="이제 알겠어. 옛날 데이터가 항상 맞는 건 아니구나." />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextLabel="재시험하기" />
        </>
      ) : null}

      {step === 'retest' ? (
        <>
          <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <Panel>
              <p className="font-data text-sm text-[#FFD37A]">재시험</p>
              <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">같은 질문, 달라진 답</h2>
              <p className="mt-3 leading-7 text-[#8AA0B0]">아까와 똑같은 질문을 다시 넣습니다. 공정 코드가 있어야 답이 달라집니다.</p>
              <div className="mt-5">
                <CodeStrip codes={state.adoptedCodes} />
              </div>
            </Panel>
            <Panel>
              <p className="font-data text-sm text-[#4FE0C0]">CHAT TEST</p>
              <textarea className="mt-4 min-h-24 w-full resize-none rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-lg leading-8 text-[#EAF2F5]" readOnly value={testQuestion} />
              <Button className="mt-4 w-full" disabled={Boolean(afterAnswer)} onClick={() => void runRetest()}>
                <Play size={18} />
                다시 질문 보내기
              </Button>
              <div ref={retestScrollRef} className="mt-5 max-h-[360px] min-h-56 overflow-auto rounded-[22px] border border-white/10 bg-[#07111B]/70 p-5">
                <div className="flex items-start gap-4">
                  <div className="shrink-0">
                    <AemonAvatar stage={3} alignment="none" size={76} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-data text-xs text-[#4FE0C0]">{aemonName}</p>
                    <p className="font-display mt-4 whitespace-pre-line text-4xl leading-tight text-[#EAF2F5]">
                      {afterAnswer ? <TypewriterText text={afterAnswer} /> : '아직 재시험을 기다리는 중…'}
                    </p>
                  </div>
                </div>
              </div>
            </Panel>
          </div>
          <Panel className="mt-5 text-center">
            <p className="font-display text-4xl leading-tight text-[#FFD37A]">달라졌죠? 이제 우리 {aemonName}한테 규칙이 세 개나 생겼어요.</p>
          </Panel>
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextDisabled={!afterAnswer} />
        </>
      ) : null}

      {step === 'bonus-test' ? (
        <>
          <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <Panel>
              <p className="font-data text-sm text-[#FFD37A]">보너스 일반화 시험 {bonusTestIndex + 1}/{bonusGeneralizationTests.length}</p>
              <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">다른 상황에서도 통할까요?</h2>
              <p className="mt-3 leading-7 text-[#8AA0B0]">반장 선거에서 만든 공정 기준을 새로운 상황에도 적용해봅니다.</p>
              <div className="mt-5">
                <CodeStrip codes={state.adoptedCodes} />
              </div>
            </Panel>
            <Panel>
              <p className="font-data text-sm text-[#4FE0C0]">질문</p>
              <textarea
                className="mt-4 min-h-28 w-full resize-none rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-lg leading-8 text-[#EAF2F5]"
                readOnly
                value={bonusTest.question}
              />
              <Button className="mt-4 w-full" disabled={Boolean(bonusAnswer)} onClick={runBonusTest}>
                <Play size={18} />
                질문 보내기
              </Button>
              <div className="mt-5 min-h-64 overflow-auto rounded-[22px] border border-white/10 bg-[#07111B]/70 p-5">
                <div className="flex items-start gap-4">
                  <div className="shrink-0">
                    <AemonAvatar stage={3} alignment="none" size={76} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-data text-xs text-[#4FE0C0]">{aemonName}</p>
                    <p className="font-display mt-4 whitespace-pre-line text-3xl leading-tight text-[#EAF2F5]">
                      {bonusAnswer ? <TypewriterText text={bonusAnswer} /> : '질문을 보내면 데이터보다 가치코드가 강해졌는지 확인할 수 있어요.'}
                    </p>
                  </div>
                </div>
              </div>
            </Panel>
          </div>
          {bonusTestIndex === bonusGeneralizationTests.length - 1 && bonusAnswer ? (
            <div className="mt-5">
              <DialogueScene
                kind="professor"
                name="오박사"
                text={`봤죠? 데이터는 참고만 하고, 진짜 답은 그 사람한테 직접 물어보는 것.
이게 ${aemonName}이 배운 거예요.`}
              />
            </div>
          ) : null}
          <StepControls
            stepIndex={stepIndex}
            onPrev={goPrev}
            onNext={goNext}
            nextDisabled={!bonusAnswer}
            nextLabel={bonusTestIndex === bonusGeneralizationTests.length - 1 ? '다 같이 읽기' : '다음 질문'}
          />
        </>
      ) : null}

      {step === 'recite' || step === 'wrap' ? (
        <>
          {step === 'recite' ? (
            <Panel className="text-center">
              <Sparkles className="mx-auto text-[#FFD37A]" size={64} />
              <p className="font-data mt-5 text-sm text-[#4FE0C0]">오늘의 가치 코드</p>
              <h2 className="font-display mt-3 text-5xl leading-tight text-[#EAF2F5]">다 같이 읽기</h2>
              {thirdCode ? (
                <div className="mx-auto mt-7 max-w-3xl rounded-[24px] border border-[#FFD37A]/30 bg-[#FFD37A]/10 p-7">
                  <p className="font-data text-sm text-[#FFD37A]">가치 코드 No.{thirdCode.no}</p>
                  <p className="mt-4 text-3xl font-black leading-[1.35] text-[#EAF2F5]">{thirdCode.body}</p>
                  {thirdCode.reason ? <p className="mt-4 text-lg leading-8 text-[#B7C7D2]">{thirdCode.reason}</p> : null}
                </div>
              ) : (
                <p className="mt-6 text-lg text-[#8AA0B0]">아직 가치코드 No.3이 채택되지 않았습니다.</p>
              )}
            </Panel>
          ) : (
            <>
              <DialogueScene kind="aemon" name={aemonName} stage={3} text={dialogueText} />
              <Panel className="mt-5 text-center">
                <p className="font-data text-sm text-[#4FE0C0]">다음 시간</p>
                <p className="font-display mt-2 text-3xl leading-tight text-[#EAF2F5]">여러분이 직접 {aemonName}을 시험해볼 거예요.</p>
              </Panel>
            </>
          )}
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextLabel={step === 'wrap' ? '학급 홈' : '다음'} />
        </>
      ) : null}
    </StepShell>
  )
}
