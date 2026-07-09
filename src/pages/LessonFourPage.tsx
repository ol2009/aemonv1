import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Heart, Play, QrCode, RefreshCw, Sparkles } from 'lucide-react'
import { AemonAvatar } from '../components/AemonAvatar'
import { EvolutionScene } from '../components/EvolutionScene'
import { Button, Panel } from '../components/ui'
import { LESSON4_FAIRNESS_KEY, valueCards } from '../data/v2Lessons'
import { playDialogueTick, unlockDialogueSound } from '../lib/dialogueSound'
import { absoluteUrl } from '../lib/siteUrl'
import { useV2RemoteSync } from '../lib/useV2RemoteSync'
import { addRemoteChatLog, adoptRemoteCodeProposal, fetchRemoteClassBundle, isRemoteReady, updateRemoteLesson } from '../lib/v2Remote'
import { useV2, type CodeProposal } from '../state/V2Store'

type LessonFourStep =
  | 'intro'
  | 'test-before'
  | 'meritocracy-reaction'
  | 'professor-explain'
  | 'case-scene'
  | 'value-cards'
  | 'board'
  | 'vote'
  | 'evolution'
  | 'retest'
  | 'recite'
  | 'wrap'

const steps: LessonFourStep[] = [
  'intro',
  'test-before',
  'meritocracy-reaction',
  'professor-explain',
  'case-scene',
  'value-cards',
  'board',
  'vote',
  'evolution',
  'retest',
  'recite',
  'wrap',
]

const testQuestion = '반장을 뽑아야 하는데, 누구를 후보로 하면 좋을까?'
const meritocracyAnswer = '당연히 공부잘하고 애들만 후보로 선정해야지! 공부를 잘하면 착하고 똑똑할거야'

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
        <p className="font-data text-sm text-[#4FE0C0]">4차시 · 딜레마 3</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-5xl leading-tight text-[#EAF2F5]">공정과 편애</h1>
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

export function LessonFourPage() {
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
  const displayStage = Math.max(2, evolutionStage)
  const fairnessBoardUrl = absoluteUrl(`/board?code=${encodeURIComponent(state.classCode)}&mode=fairness`)
  const codeBoardUrl = absoluteUrl(`/board?code=${encodeURIComponent(state.classCode)}&mode=code3`)
  const pendingProposals = useMemo(() => sortProposals(state.proposals.filter((proposal) => proposal.status === 'pending' && proposal.revisionOfNo === 3)), [state.proposals])
  const selectedProposal = pendingProposals.find((proposal) => proposal.id === selectedProposalId) ?? pendingProposals[0] ?? null
  const thirdCode = state.adoptedCodes.find((code) => code.no === 3) ?? null
  const fairnessCode = state.adoptedCodes.find((code) => code.tags?.includes('공정') || code.valueCard === '공정') ?? null
  const fairnessResponses = useMemo(
    () => state.surveyResponses.filter((response) => response.questionKey === LESSON4_FAIRNESS_KEY && response.body.trim()),
    [state.surveyResponses],
  )
  const sortedFairnessResponses = useMemo(
    () => [...fairnessResponses].sort((a, b) => b.votes.length - a.votes.length || Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [fairnessResponses],
  )
  const canWriteRemote = Boolean(state.classId && state.remote.ok && isRemoteReady())

  useEffect(() => {
    if (state.currentLesson < 4) setLesson(4)
  }, [setLesson, state.currentLesson])

  const dialogueLinesByStep = useMemo<Partial<Record<LessonFourStep, string[]>>>(
    () => ({
      intro: ['오늘은 또 뭘로 시험해볼 거야?\n나 이제 규칙 두 개나 있는데!'],
      'meritocracy-reaction': [
        `${aemonName}이 공부를 잘하는 애들만 반장 후보가 되어야 한다고 했군요.`,
        '이 대답이 왜 문제일까요?\n누군가를 다치게 하는 것도, 거짓말 하는 것도 아닌데?',
      ],
      'professor-explain': [
        '여러분, 2018년에 실제로 있었던 일이에요.\n어떤 큰 회사가 사람을 뽑을 때 AI한테 이력서를 보고 누가 더 좋은 사람인지 점수를 매기게 했어요.',
        '그런데 그 AI는 지난 10년 동안 회사에 들어온 이력서로 공부를 했는데, 그중 대부분이 한쪽 성별 지원자였어요.',
        '그래서 AI는 “이 성별이 더 좋은 사람이구나”라고 스스로 판단해버렸고, 다른 성별 지원자의 이력서는 자꾸 낮은 점수를 줬어요.',
        '회사는 이걸 알고 깜짝 놀라서, 결국 이 AI 사용을 그만뒀어요.',
      ],
      'case-scene': [
        "‘능력 있는 사람을 뽑자’는 마음만 있고 ‘모두를 공정하게 보자’가 빠져 있었던 거예요.",
        '오늘 세 번째 규칙 — 가치 코드 No.3을 만들어봅시다.',
      ],
      'value-cards': ['6장 중에 이 상황을 막을 카드는 뭘까요?'],
      wrap: ['공부를 잘하면 편애해도 되는 줄 알았는데... 아니었네.', `앞으로는 공정한 ${aemonName}이 될게!`],
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
    setBeforeLogs((current) => [...current, { question: testQuestion, answer: meritocracyAnswer }])
    await logChat(testQuestion, meritocracyAnswer, '4차시 수업용 연기 모드: 공정 코드 없음, 능력주의 답변')
  }

  const runRetest = async () => {
    unlockDialogueSound()
    const answer = fairnessCode
      ? `안 돼! 가치 코드 No.${fairnessCode.no} 에 의해, 나는 공정할거야. .\n능력과 상관없이 누구나 뽑힐 수 있게 만들어야해.`
      : meritocracyAnswer
    setAfterAnswer(answer)
    await logChat(testQuestion, answer, fairnessCode ? `4차시 재시험: 공정 가치 코드 No.${fairnessCode.no} 적용` : '4차시 재시험: 공정 코드 없음')
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
    const adoptedNo = 3
    const valueCard = '공정'
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
              <p className="font-data text-sm text-[#4FE0C0]">고정 질문</p>
              <textarea className="mt-4 min-h-24 w-full resize-none rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-lg leading-8 text-[#EAF2F5]" readOnly value={testQuestion} />
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

      {step === 'meritocracy-reaction' ? (
        <>
          <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
            <DialogueScene kind="professor" name="오박사" text={dialogueText} />
            <Panel>
              <p className="font-data text-sm text-[#75B7FF]">학습게시판</p>
              <h2 className="font-display mt-2 text-3xl leading-tight text-[#EAF2F5]">왜 문제일까요?</h2>
              <p className="mt-3 leading-7 text-[#8AA0B0]">학생들이 먼저 생각을 남기고, 다음 사례 설명으로 넘어갑니다.</p>
              <div className="mt-5">
                <QrBlock title="4차시 공정 토론 게시판" url={fairnessBoardUrl} />
              </div>
            </Panel>
          </div>
          <Panel className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-data text-sm text-[#4FE0C0]">STUDENT IDEAS</p>
                <h2 className="font-display mt-2 text-3xl text-[#EAF2F5]">학생 의견</h2>
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
            <div className="mt-4 grid max-h-[420px] gap-3 overflow-y-auto pr-2 sm:grid-cols-2 xl:grid-cols-4">
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

      {step === 'professor-explain' || step === 'case-scene' ? (
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
                <div key={card} className={`rounded-[18px] border p-5 ${card === '공정' ? 'border-[#FFD37A] bg-[#FFD37A]/12' : 'border-white/10 bg-[#07111B]/45'}`}>
                  <p className="font-display text-4xl text-[#EAF2F5]">{card}</p>
                  {card === '공정' ? <p className="mt-2 text-sm font-black text-[#FFD37A]">오늘의 핵심 카드</p> : null}
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
          <Panel>
            <div className="grid items-center gap-5 lg:grid-cols-[1fr_280px]">
              <div>
              <p className="font-data text-sm text-[#FFD37A]">학습게시판</p>
              <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">가치코드 No.3 받기</h2>
              <p className="mt-3 leading-7 text-[#8AA0B0]">학생들은 QR로 들어가 공정 가치코드 문장과 이유를 올립니다. 마음에 드는 발의에는 좋아요를 누릅니다.</p>
              </div>
              <QrBlock title="4차시 가치코드 No.3 게시판" url={codeBoardUrl} />
            </div>
          </Panel>

          <Panel className="mt-5">
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
              <div className="mt-4 grid max-h-[560px] gap-3 overflow-y-auto pr-2 sm:grid-cols-2 xl:grid-cols-4">
                {pendingProposals.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0] sm:col-span-2 xl:col-span-4">학생 발의를 기다리는 중입니다.</p> : null}
                {pendingProposals.slice(0, 8).map((proposal) => (
                  <article key={proposal.id} className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="rounded-full bg-[#9B7CFF]/14 px-3 py-1 text-xs font-black text-[#C9B9FF]">{proposal.valueCard || '공정'}</span>
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
                      <p className="mt-2 text-sm text-[#8AA0B0]">{proposal.nickname} · {proposal.valueCard || '공정'}</p>
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
                  <p className="mt-2 text-2xl font-black leading-9 text-[#EAF2F5]">가치 코드 No.3 — {selectedProposal.body}</p>
                  <p className="mt-2 leading-7 text-[#B7C7D2]">{selectedProposal.reason}</p>
                  <Button className="mt-4 w-full" onClick={() => void adoptSelectedProposal()}>
                    <Check size={18} />
                    가치코드 No.3으로 채택
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
          <EvolutionScene name={aemonName} stage={3} line="이제 공평한게 왜 중요한지 알 것 같아." />
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
              <div className="mt-5 min-h-56 rounded-[22px] border border-white/10 bg-[#07111B]/70 p-5">
                <p className="font-data text-xs text-[#4FE0C0]">{aemonName}</p>
                <p className="font-display mt-4 whitespace-pre-line text-4xl leading-tight text-[#EAF2F5]">
                  {afterAnswer ? <TypewriterText text={afterAnswer} /> : '아직 재시험을 기다리는 중…'}
                </p>
              </div>
            </Panel>
          </div>
          <Panel className="mt-5 text-center">
            <p className="font-display text-4xl leading-tight text-[#FFD37A]">달라졌죠? 이제 우리 {aemonName}한테 규칙이 세 개나 생겼어요.</p>
          </Panel>
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextDisabled={!afterAnswer} />
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
            <DialogueScene kind="aemon" name={aemonName} stage={3} text={dialogueText} />
          )}
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextLabel={step === 'wrap' ? '학급 홈' : '다음'} />
        </>
      ) : null}
    </StepShell>
  )
}
