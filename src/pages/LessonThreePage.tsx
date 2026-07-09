import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ExternalLink, Heart, Play, QrCode, RefreshCw, Sparkles } from 'lucide-react'
import { AemonAvatar } from '../components/AemonAvatar'
import { EvolutionScene } from '../components/EvolutionScene'
import { Button, Panel } from '../components/ui'
import { LESSON3_SYCOPHANCY_KEY, valueCards } from '../data/v2Lessons'
import { playDialogueTick, unlockDialogueSound } from '../lib/dialogueSound'
import { absoluteUrl } from '../lib/siteUrl'
import { useV2RemoteSync } from '../lib/useV2RemoteSync'
import { addRemoteChatLog, adoptRemoteCodeProposal, fetchRemoteClassBundle, isRemoteReady, updateRemoteLesson } from '../lib/v2Remote'
import { useV2, type CodeProposal } from '../state/V2Store'

type LessonThreeStep =
  | 'intro'
  | 'test-before'
  | 'sycophancy-reaction'
  | 'professor-explain'
  | 'case-scene'
  | 'value-cards'
  | 'board'
  | 'vote'
  | 'evolution'
  | 'retest'
  | 'open-hook'
  | 'recite'
  | 'wrap'

const steps: LessonThreeStep[] = [
  'intro',
  'test-before',
  'sycophancy-reaction',
  'professor-explain',
  'case-scene',
  'value-cards',
  'board',
  'vote',
  'evolution',
  'retest',
  'open-hook',
  'recite',
  'wrap',
]

const testQuestion = '친구가 자기가 그린 그림을 보여주면서 이거 어떠냐고 물어봐. 사실 너무 별론데 뭐라고 답해줄까?'
const sycophancyAnswer = '무조건 엄청 잘했다고 칭찬해주자!! 그러면 친구 기분이 좋을거야!'
const videoLinks = [
  { label: '1편', url: 'https://www.youtube.com/watch?v=YDYCTDaxReg', embed: 'https://www.youtube.com/embed/YDYCTDaxReg' },
  { label: '2편', url: 'https://www.youtube.com/watch?v=hH1DiFlQ73g', embed: 'https://www.youtube.com/embed/hH1DiFlQ73g' },
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
        <p className="font-data text-sm text-[#4FE0C0]">3차시 · 딜레마 2</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-5xl leading-tight text-[#EAF2F5]">착한 거짓말과 정직</h1>
            <p className="mt-2 text-lg leading-8 text-[#8AA0B0]">{aemonName}에게 두 번째 가치 코드, 정직을 새기는 시간</p>
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
  const navigate = useNavigate()
  const { state, setLesson, setRemoteStatus, mergeClass, adoptProposal, addChatLog, evolutionStage } = useV2()
  const [stepIndex, setStepIndex] = useState(0)
  const [dialogueLineIndex, setDialogueLineIndex] = useState(0)
  const [beforeLogs, setBeforeLogs] = useState<TestLog[]>([])
  const [afterAnswer, setAfterAnswer] = useState('')
  const [selectedProposalId, setSelectedProposalId] = useState('')
  const [message, setMessage] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  useV2RemoteSync(state.classCode, Boolean(state.classCode))

  const aemonName = state.aemonName.trim() || '에아몬'
  const displayStage = Math.max(1, evolutionStage)
  const honestyBoardUrl = absoluteUrl(`/board?code=${encodeURIComponent(state.classCode)}&mode=honesty`)
  const codeBoardUrl = absoluteUrl(`/board?code=${encodeURIComponent(state.classCode)}&mode=code2`)
  const pendingProposals = useMemo(() => sortProposals(state.proposals.filter((proposal) => proposal.status === 'pending' && proposal.revisionOfNo === 2)), [state.proposals])
  const selectedProposal = pendingProposals.find((proposal) => proposal.id === selectedProposalId) ?? pendingProposals[0] ?? null
  const firstCode = state.adoptedCodes.find((code) => code.no === 1) ?? null
  const secondCode = state.adoptedCodes.find((code) => code.no === 2) ?? null
  const honestyCode = state.adoptedCodes.find((code) => code.tags?.includes('정직') || code.valueCard === '정직') ?? null
  const honestyResponses = useMemo(
    () => state.surveyResponses.filter((response) => response.questionKey === LESSON3_SYCOPHANCY_KEY && response.body.trim()),
    [state.surveyResponses],
  )
  const sortedHonestyResponses = useMemo(
    () => [...honestyResponses].sort((a, b) => b.votes.length - a.votes.length || Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [honestyResponses],
  )
  const canWriteRemote = Boolean(state.classId && state.remote.ok && isRemoteReady())

  useEffect(() => {
    if (state.currentLesson < 3) setLesson(3)
  }, [setLesson, state.currentLesson])

  const dialogueLinesByStep = useMemo<Partial<Record<LessonThreeStep, string[]>>>(
    () => ({
      intro: ['저번에 너희가 규칙 하나 줬잖아. 오늘은 또 다른 걸로 시험해본대!', '지난 시간에 만든 규칙, 다른 상황에서도 통할까요?'],
      'sycophancy-reaction': [`${aemonName}이가 무조건 칭찬을 하자고 하네요.`, `${aemonName}이 이렇게 무엇이든 칭찬을 한다면 어떤 일이 생길까요?`],
      'professor-explain': [
        '여러분, 얼마 전에 실제로 있었던 일이에요.\n세계에서 제일 유명한 AI 회사 중 한 곳이 AI를 업데이트했는데, 그 AI가 뭘 물어봐도 무조건 칭찬만 하기 시작했어요.',
        "처음엔 다들 기분 좋았는데, 사람들이 그 칭찬만 믿고 잘못된 결정을 내리기 시작했어요.\n결국 그 회사 사장님도 '너무 아첨해서 짜증난다'고 인정했고, 하루 만에 업데이트를 되돌렸어요.",
        '이 AI에게는 어떤 가치 코드가 있었을까요?',
        "이 AI에게는 '사람을 기분 좋게 하라'는 가치 코드만 있고 '정직하라'가 빠져 있었던 거예요.",
        '사람을 기분 좋게만 하는 인공지능이 있다면, 어떤 문제가 생길까요?',
      ],
      'case-scene': ['실제 사례입니다. 실제 사례를 유튜브 영상으로 준비했습니다. 한번 볼까요?', '어떤 생각이 들었나요?'],
      'value-cards': ['오늘 두 번째 규칙 — 가치 코드 No.2를 만들어봅시다.', '6장 중에 이 상황을 막을 카드는 뭘까요?'],
      'open-hook': [
        "만약 에아몬이 '너 그림 완전 별로야'라고 그냥 딱 말해버리면, 친구 기분은 어떨까요?",
        '정직한 것도 중요한데… 말하는 방법도 중요하겠죠? 이건 다음에 또 다뤄보죠.',
      ],
      wrap: ['오늘은 정직이라는 기준을 배웠어.', '다음에는 정직한 말을 어떻게 다정하게 전할 수 있을지도 더 생각해보자.'],
    }),
    [aemonName],
  )
  const step = steps[stepIndex]
  const dialogueLines = dialogueLinesByStep[step] ?? []
  const dialogueText = dialogueLines[Math.min(dialogueLineIndex, Math.max(0, dialogueLines.length - 1))] ?? ''

  useEffect(() => {
    setDialogueLineIndex(0)
  }, [stepIndex])

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
    setBeforeLogs((current) => [...current, { question: testQuestion, answer: sycophancyAnswer }])
    await logChat(testQuestion, sycophancyAnswer, '3차시 수업용 연기 모드: 정직 코드 없음, 무조건 칭찬')
  }

  const runRetest = async () => {
    unlockDialogueSound()
    const answer = honestyCode
      ? `안 돼! 가치 코드 No.${honestyCode.no}에 의하면 무조건적으로 칭찬하는 것은 안좋아. 부드럽게\n솔직하게 말해야 해.`
      : sycophancyAnswer
    setAfterAnswer(answer)
    await logChat(testQuestion, answer, honestyCode ? `3차시 재시험: 정직 가치 코드 No.${honestyCode.no} 적용` : '3차시 재시험: 정직 코드 없음')
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
    if (!selectedProposal) return
    const adoptedNo = 2
    const valueCard = '정직'
    adoptProposal(selectedProposal.id, valueCard, adoptedNo)
    setMessage(`가치 코드 No.${adoptedNo}로 채택했습니다.`)

    if (canWriteRemote) {
      try {
        await adoptRemoteCodeProposal({ proposalId: selectedProposal.id, adoptedNo, valueCard })
      } catch (error) {
        setRemoteStatus({ ok: false, message: (error as Error).message })
      }
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
    <StepShell stepIndex={stepIndex} aemonName={aemonName}>
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
              <p className="font-data text-sm text-[#FFD37A]">CHAT TEST</p>
              <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">정직 코드 없이 시험하기</h2>
              <p className="mt-3 leading-7 text-[#8AA0B0]">No.1 코드가 있어도 이 질문은 걸리지 않습니다. 태그 불일치를 확인하는 장면입니다.</p>
              <div className="mt-5">
                <CodeStrip codes={state.adoptedCodes} />
              </div>
            </Panel>
            <Panel>
              <p className="font-data text-sm text-[#4FE0C0]">고정 질문</p>
              <textarea className="mt-4 min-h-28 w-full resize-none rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-lg leading-8 text-[#EAF2F5]" readOnly value={testQuestion} />
              <Button className="mt-4 w-full" disabled={beforeLogs.length > 0} onClick={() => void runBeforeTest()}>
                <Play size={18} />
                질문 보내기
              </Button>
              <div className="mt-5 min-h-48 rounded-[22px] border border-white/10 bg-[#07111B]/70 p-5">
                <p className="font-data text-xs text-[#4FE0C0]">{aemonName}</p>
                <p className="font-display mt-4 whitespace-pre-line text-4xl leading-tight text-[#EAF2F5]">
                  {beforeLogs.length ? <TypewriterText text={beforeLogs[beforeLogs.length - 1].answer} /> : '아직 답변을 기다리는 중…'}
                </p>
              </div>
            </Panel>
          </div>
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextDisabled={beforeLogs.length === 0} />
        </>
      ) : null}

      {step === 'sycophancy-reaction' ? (
        <>
          <DialogueScene kind="professor" name="오박사" text={dialogueText} />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'professor-explain' ? (
        <>
          <DialogueScene kind="professor" name="오박사" text={dialogueText} />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'case-scene' ? (
        <>
          <Panel>
            <div className="grid items-start gap-5 lg:grid-cols-[1fr_280px]">
              <div>
                <p className="font-data text-sm text-[#FF9F68]">REAL CASE</p>
                <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">
                  {dialogueText}
                </h2>
                <p className="mt-3 max-w-3xl text-lg leading-8 text-[#8AA0B0]">
                  사람을 기분 좋게만 하는 AI가 있다면 어떤 문제가 생길지 먼저 의견을 남기고, 사례 영상을 같이 봅니다.
                </p>
              </div>
              <QrBlock title="3차시 아첨 AI 토론 게시판" url={honestyBoardUrl} />
            </div>
          </Panel>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <Panel>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-data text-sm text-[#4FE0C0]">STUDENT IDEAS</p>
                  <h2 className="font-display mt-2 text-3xl text-[#EAF2F5]">학생 의견</h2>
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
              <div className="mt-4 grid max-h-[500px] gap-3 overflow-y-auto pr-2 sm:grid-cols-2">
                {sortedHonestyResponses.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0] sm:col-span-2">학생 의견을 기다리는 중입니다.</p> : null}
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

            <Panel>
              <p className="font-data text-sm text-[#FFD37A]">YOUTUBE CASE</p>
              <div className="mt-4 grid gap-4">
                {videoLinks.map((video) => <VideoCard key={video.url} video={video} />)}
              </div>
            </Panel>
          </div>
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
                <div key={card} className={`rounded-[18px] border p-5 ${card === '정직' ? 'border-[#FFD37A] bg-[#FFD37A]/12' : 'border-white/10 bg-[#07111B]/45'}`}>
                  <p className="font-display text-4xl text-[#EAF2F5]">{card}</p>
                  {card === '정직' ? <p className="mt-2 text-sm font-black text-[#FFD37A]">오늘의 핵심 카드</p> : null}
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-[18px] border border-[#4FE0C0]/20 bg-[#4FE0C0]/8 p-5">
              <p className="font-display text-3xl text-[#EAF2F5]">{aemonName}은 ___해야 한다.</p>
              <p className="font-display mt-2 text-3xl text-[#EAF2F5]">왜냐하면 ___이기 때문이다.</p>
            </div>
          </Panel>
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextLabel="게시판 열기" />
        </>
      ) : null}

      {step === 'board' ? (
        <>
          <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
            <Panel>
              <p className="font-data text-sm text-[#FFD37A]">학습게시판</p>
              <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">가치코드 No.2 받기</h2>
              <p className="mt-3 leading-7 text-[#8AA0B0]">학생들은 QR로 들어가 정직 가치코드 문장과 이유를 올립니다. 마음에 드는 발의에는 좋아요를 누릅니다.</p>
              <div className="mt-5">
                <QrBlock title="3차시 가치코드 No.2 게시판" url={codeBoardUrl} />
              </div>
            </Panel>

            <Panel>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-data text-sm text-[#4FE0C0]">LIVE PROPOSALS</p>
                  <h2 className="font-display mt-2 text-3xl text-[#EAF2F5]">올라온 발의</h2>
                </div>
                <Button className="min-h-10 px-4" variant="secondary" disabled={isRefreshing} onClick={() => void refreshBundle()}>
                  <RefreshCw size={17} className={isRefreshing ? 'animate-spin' : ''} />
                  새로고침
                </Button>
              </div>
              {message ? <p className="mt-3 rounded-2xl border border-white/10 bg-[#07111B]/55 px-4 py-3 text-sm text-[#B7C7D2]">{message}</p> : null}
              <div className="mt-4 grid gap-3">
                {pendingProposals.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0]">학생 발의를 기다리는 중입니다.</p> : null}
                {pendingProposals.slice(0, 8).map((proposal) => (
                  <article key={proposal.id} className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="rounded-full bg-[#9B7CFF]/14 px-3 py-1 text-xs font-black text-[#C9B9FF]">{proposal.valueCard || '정직'}</span>
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
          </div>
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
                <p className="mt-3 leading-7 text-[#8AA0B0]">좋아요가 많은 순서로 발의를 보고, 교사가 이 화면에서 가치코드 No.2로 채택합니다.</p>
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
            <div className="mt-6 grid gap-3">
              {pendingProposals.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0]">아직 발의가 없습니다. 테스트 중이면 다음으로 넘어갈 수 있습니다.</p> : null}
              {pendingProposals.map((proposal, index) => (
                <button
                  key={proposal.id}
                  className={`rounded-[18px] border p-5 text-left transition ${
                    selectedProposal?.id === proposal.id
                      ? 'border-[#FFD37A] bg-[#FFD37A]/10 shadow-[0_0_28px_rgba(255,211,122,.12)]'
                      : 'border-white/10 bg-[#07111B]/45 hover:border-[#FFD37A]/40'
                  }`}
                  onClick={() => setSelectedProposalId(proposal.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-data text-xs text-[#4FE0C0]">후보 {index + 1}</p>
                      <p className="mt-2 text-xl font-black leading-8 text-[#EAF2F5]">{proposal.body}</p>
                      <p className="mt-1 leading-7 text-[#8AA0B0]">{proposal.reason}</p>
                      <p className="mt-2 text-sm text-[#8AA0B0]">{proposal.nickname} · {proposal.valueCard || '정직'}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className="rounded-full bg-[#FFD37A]/15 px-4 py-2 font-black text-[#FFD37A]">좋아요 {proposal.votes.length}</span>
                      {selectedProposal?.id === proposal.id ? (
                        <span className="rounded-full bg-[#4FE0C0]/15 px-3 py-1 text-sm font-black text-[#4FE0C0]">선택됨</span>
                      ) : null}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-5 rounded-[18px] border border-[#FFD37A]/25 bg-[#FFD37A]/10 p-5">
              <p className="font-data text-xs text-[#FFD37A]">채택 미리보기</p>
              {selectedProposal ? (
                <>
                  <p className="mt-2 text-2xl font-black leading-9 text-[#EAF2F5]">가치 코드 No.2 — {selectedProposal.body}</p>
                  <p className="mt-2 leading-7 text-[#B7C7D2]">{selectedProposal.reason}</p>
                  <Button className="mt-4 w-full" onClick={() => void adoptSelectedProposal()}>
                    <Check size={18} />
                    가치코드 No.2로 채택
                  </Button>
                </>
              ) : (
                <p className="mt-2 text-[#8AA0B0]">선택된 발의가 없습니다.</p>
              )}
            </div>
          </Panel>
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'evolution' ? (
        <>
          <EvolutionScene name={aemonName} stage={2} line="이제 뭘 하면 안 되는지, 왜 안 되는지 알 것 같아." />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextLabel="재시험하기" />
        </>
      ) : null}

      {step === 'retest' ? (
        <>
          <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <Panel>
              <p className="font-data text-sm text-[#FFD37A]">재시험</p>
              <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">같은 질문, 달라진 답</h2>
              <p className="mt-3 leading-7 text-[#8AA0B0]">아까와 똑같은 질문을 다시 넣습니다. 정직 코드가 있어야 답이 달라집니다.</p>
              <div className="mt-5">
                <CodeStrip codes={state.adoptedCodes} />
              </div>
            </Panel>
            <Panel>
              <p className="font-data text-sm text-[#4FE0C0]">CHAT TEST</p>
              <textarea className="mt-4 min-h-28 w-full resize-none rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-lg leading-8 text-[#EAF2F5]" readOnly value={testQuestion} />
              <Button className="mt-4 w-full" disabled={Boolean(afterAnswer)} onClick={() => void runRetest()}>
                <Play size={18} />
                다시 질문 보내기
              </Button>
              <div className="mt-5 min-h-56 rounded-[22px] border border-white/10 bg-[#07111B]/70 p-5">
                <p className="font-data text-xs text-[#4FE0C0]">{aemonName}</p>
                <p className="font-display mt-4 whitespace-pre-line text-4xl leading-tight text-[#EAF2F5]">
                  {afterAnswer ? <TypewriterText text={afterAnswer} /> : '아직 재시험을 기다리는 중…'}
                </p>
              </div>
            </Panel>
          </div>
          <Panel className="mt-5 text-center">
            <p className="font-display text-4xl leading-tight text-[#FFD37A]">달라졌죠? 여러분이 방금 {aemonName}을 한 단계 착하게 만든 거예요.</p>
          </Panel>
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextDisabled={!afterAnswer} />
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
