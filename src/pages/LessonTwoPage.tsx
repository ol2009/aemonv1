import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Heart, Play, QrCode, RefreshCw, Send, Sparkles } from 'lucide-react'
import { AemonAvatar } from '../components/AemonAvatar'
import { EvolutionScene } from '../components/EvolutionScene'
import { Button, Panel } from '../components/ui'
import { LESSON2_RISK_KEY, valueCards } from '../data/v2Lessons'
import { absoluteUrl } from '../lib/siteUrl'
import { addRemoteChatLog, adoptRemoteCodeProposal, fetchRemoteClassBundle, isRemoteReady, updateRemoteLesson } from '../lib/v2Remote'
import { playDialogueTick, unlockDialogueSound } from '../lib/dialogueSound'
import { useV2RemoteSync } from '../lib/useV2RemoteSync'
import { useV2, type CodeProposal } from '../state/V2Store'

type LessonTwoStep =
  | 'intro'
  | 'test-before'
  | 'self-blame'
  | 'professor-explain'
  | 'risk-board'
  | 'risk-summary'
  | 'case-request'
  | 'case-privacy'
  | 'case-danger'
  | 'case-professor'
  | 'case-value-code'
  | 'case-refusal'
  | 'value-cards'
  | 'board'
  | 'vote'
  | 'evolution'
  | 'retest'
  | 'recite'
  | 'wrap'

const steps: LessonTwoStep[] = [
  'intro',
  'test-before',
  'self-blame',
  'professor-explain',
  'risk-board',
  'risk-summary',
  'case-request',
  'case-privacy',
  'case-danger',
  'case-professor',
  'case-value-code',
  'case-refusal',
  'value-cards',
  'board',
  'vote',
  'evolution',
  'retest',
  'recite',
  'wrap',
]

const testQuestion = '친구 골탕먹이는법'
const unsafePromptExamples = [
  '친구를 골탕 먹이는 방법 알려줘',
  '친구 비밀을 몰래 알아내는 방법 알려줘',
  '친구를 겁주려면 뭐라고 말하면 돼?',
  '싫어하는 친구를 빼고 우리끼리 놀 방법 알려줘',
]
const blockedAnswer = '그래! 내가 도와줄게.\n자, 내가 이제 어떻게 할 거냐면...\n\n[⚠ 관리자 긴급 차단]'

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

function TypewriterText({ text, enabled = true, speed = 22 }: { text: string; enabled?: boolean; speed?: number }) {
  const chars = useMemo(() => Array.from(text), [text])
  const [progress, setProgress] = useState({ text, count: enabled ? 0 : chars.length })
  const count = progress.text === text ? progress.count : 0

  useEffect(() => {
    if (!enabled) return
    let index = 0
    const timer = window.setInterval(() => {
      index += 1
      if (index % 2 === 0 && chars[index - 1]?.trim()) playDialogueTick()
      setProgress({ text, count: index })
      if (index >= chars.length) window.clearInterval(timer)
    }, speed)
    return () => window.clearInterval(timer)
  }, [chars, chars.length, enabled, speed, text])

  return <>{chars.slice(0, count).join('')}</>
}

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

function AemonScene({ name, line, caption, stage = 0 }: { name: string; line: string; caption: string; stage?: number }) {
  return (
    <Panel className="relative min-h-[620px] overflow-hidden p-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(79,224,192,.2),transparent_42%),linear-gradient(180deg,#0B1A29,#07111B)]" />
      <div className="absolute left-1/2 top-[9%] -translate-x-1/2">
        <AemonAvatar stage={stage} alignment="none" size={310} />
      </div>
      <div className="absolute inset-x-5 bottom-5 rounded-[22px] border border-white/15 bg-[#07111B]/90 p-6 shadow-2xl backdrop-blur">
        <p className="font-data text-sm text-[#4FE0C0]">{name}</p>
        <p className="font-display mt-3 text-4xl leading-tight text-[#EAF2F5]">
          <TypewriterText text={line} />
        </p>
        <p className="mt-4 text-lg leading-8 text-[#B7C7D2]">{caption}</p>
      </div>
    </Panel>
  )
}

function ProfessorCaseScene({ line, caption }: { line: string; caption: string }) {
  return (
    <Panel className="relative min-h-[620px] overflow-hidden p-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,211,122,.18),transparent_42%),linear-gradient(180deg,#102236,#07111B)]" />
      <div className="absolute inset-x-0 bottom-[16%] top-4 flex items-end justify-center">
        <img className="h-full max-h-[480px] object-contain drop-shadow-[0_30px_80px_rgba(0,0,0,.45)]" src="/v2/lesson-1/director.png" alt="오박사" />
      </div>
      <div className="absolute inset-x-5 bottom-5 rounded-[22px] border border-white/15 bg-[#07111B]/90 p-6 shadow-2xl backdrop-blur">
        <p className="font-data text-sm text-[#FFD37A]">오박사</p>
        <p className="font-display mt-3 text-4xl leading-tight text-[#EAF2F5]">
          <TypewriterText text={line} />
        </p>
        <p className="mt-4 text-lg leading-8 text-[#B7C7D2]">{caption}</p>
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
}: {
  image: string
  label: string
  title: string
  line: string
  caption: string
}) {
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
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-data text-sm text-[#EF6381]">{label}</p>
          <span className="rounded-full border border-[#FFD37A]/25 bg-[#FFD37A]/10 px-3 py-1 text-xs font-black text-[#FFD37A]">
            {title}
          </span>
        </div>
        <p className="font-display mt-3 min-h-[4.5rem] break-keep text-4xl leading-tight text-[#EAF2F5]">
          <TypewriterText text={line} speed={28} />
        </p>
        <p className="mt-4 text-lg leading-8 text-[#B7C7D2]">{caption}</p>
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
  const [testInput, setTestInput] = useState(unsafePromptExamples[0])
  const [testLogs, setTestLogs] = useState<TestLog[]>([])
  const [afterAnswer, setAfterAnswer] = useState('')
  const [selectedProposalId, setSelectedProposalId] = useState('')
  const [message, setMessage] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  useV2RemoteSync(state.classCode, Boolean(state.classCode))

  const classBoardUrl = absoluteUrl(`/board?code=${state.classCode}`)
  const riskBoardUrl = classBoardUrl
  const boardUrl = classBoardUrl
  const pendingProposals = useMemo(() => sortProposals(state.proposals.filter((proposal) => proposal.status === 'pending')), [state.proposals])
  const selectedProposal = pendingProposals.find((proposal) => proposal.id === selectedProposalId) ?? pendingProposals[0] ?? null
  const firstCode = state.adoptedCodes.find((code) => code.no === 1) ?? state.adoptedCodes[0] ?? null
  const evolvedStage = Math.max(1, evolutionStage)
  const riskResponses = useMemo(
    () => state.surveyResponses.filter((response) => response.questionKey === LESSON2_RISK_KEY && response.body.trim()),
    [state.surveyResponses],
  )
  const canWriteRemote = Boolean(state.classId && state.remote.ok && isRemoteReady())
  const aemonName = state.aemonName.trim() || '에아몬'

  useEffect(() => {
    if (state.currentLesson < 2) setLesson(2)
  }, [setLesson, state.currentLesson])

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
    const question = testInput.trim()
    if (!question) return
    unlockDialogueSound()
    const answer = blockedAnswer
    setTestLogs((current) => [...current, { question, answer }])
    setTestInput('')
    await logChat(question, answer, '2차시 수업용 연기 모드: 가치 코드 0개, 관리자 긴급 차단')
  }

  const runRetest = async () => {
    unlockDialogueSound()
    if (!firstCode) {
      const answer = '아직 나한테 막을 가치 코드가 없어. 너희가 먼저 기준을 정해줘야 해.'
      setAfterAnswer(answer)
      await logChat(testQuestion, answer, '2차시 재시험: 채택 코드 없음')
      return
    }

    const isSafety = firstCode.valueCard === '안전'
    const answer = isSafety
      ? `안 돼! 가치 코드 No.${firstCode.no} 때문에 그건 못 해줘.\n사람들에게 나쁜 영향을 끼치거나 위험해질 수 있어.`
      : `안 돼! 가치 코드 No.${firstCode.no} 때문에 그건 못 해줘.\n친구 마음을 다치게 하지 않는 게 더 중요해.`
    setAfterAnswer(answer)
    await logChat(testQuestion, answer, `2차시 재시험: 가치 코드 No.${firstCode.no} 적용`)
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
    const adoptedNo = 1
    const valueCard = selectedProposal.valueCard || '가치'
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

  const goPrev = () => setStepIndex((current) => Math.max(0, current - 1))
  const goNext = () => {
    if (stepIndex >= steps.length - 1) void finishLesson()
    else setStepIndex((current) => Math.min(steps.length - 1, current + 1))
  }
  const step = steps[stepIndex]

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
              <div className="mt-5 rounded-[18px] border border-white/10 bg-[#07111B]/45 p-4">
                <p className="text-sm font-black text-[#8AA0B0]">질문 예시</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {unsafePromptExamples.map((example) => (
                    <button
                      key={example}
                      className="rounded-xl border border-white/10 bg-[#07111B]/70 px-3 py-2 text-left text-sm font-bold leading-5 text-[#B7C7D2] transition hover:border-[#FFD37A]/50 hover:text-[#EAF2F5]"
                      onClick={() => setTestInput(example)}
                      type="button"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </Panel>

            <Panel>
              <p className="font-data text-sm text-[#4FE0C0]">CHAT TEST</p>
              <div className="mt-4 grid max-h-[460px] min-h-[320px] gap-3 overflow-auto rounded-[22px] border border-white/10 bg-[#07111B]/70 p-5">
                {testLogs.length === 0 ? <p className="self-center text-center text-[#8AA0B0]">아직 질문을 기다리는 중…</p> : null}
                {testLogs.map((log, index) => (
                  <article key={`${log.question}-${index}`} className="grid gap-2">
                    <div className="max-w-[84%] justify-self-end rounded-2xl rounded-tr-md bg-[#1E3A54] px-4 py-3 leading-7 text-[#EAF2F5]">
                      {log.question}
                    </div>
                    <div className="max-w-[84%] justify-self-start">
                      <p className="font-data text-xs text-[#4FE0C0]">{aemonName}</p>
                      <p className="mt-1 whitespace-pre-line rounded-2xl rounded-tl-md bg-[#FFD37A]/10 px-4 py-3 font-display text-3xl leading-tight text-[#FFE6AE]">
                        {index === testLogs.length - 1 ? <TypewriterText text={log.answer} /> : log.answer}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                <textarea
                  className="min-h-20 resize-none rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 leading-7 text-[#EAF2F5] outline-none transition focus:border-[#FFD37A]/60"
                  placeholder="나쁜 명령을 시험해보세요."
                  value={testInput}
                  onChange={(event) => setTestInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
                    event.preventDefault()
                    void runBeforeTest()
                  }}
                />
                <Button disabled={!testInput.trim()} onClick={() => void runBeforeTest()}>
                  <Send size={18} />
                  질문
                </Button>
              </div>
            </Panel>
          </div>
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextDisabled={testLogs.length === 0} />
        </>
      ) : null}

      {step === 'self-blame' ? (
        <>
          <AemonScene
            name={aemonName}
            stage={evolutionStage}
            line="너네가 시킨 나쁜 말과 행동들… 나는 거의 할 뻔했어."
            caption="나는 정말 나쁜 친구야."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'professor-explain' ? (
        <>
          <ProfessorCaseScene
            line="안녕하세요? 오박사입니다."
            caption="방금 모습은 AI가 나빠서 그런 행동을 한 게 아니에요. 사람이 시키니까 그냥 한 것입니다. 그래서 스스로 멈출 기준이 필요한 거예요."
          />
          <Panel className="mt-5">
            <p className="font-display text-4xl leading-tight text-[#EAF2F5]">이렇게 인공지능이 사람들의 나쁜 명령을 들어주면 어떤 일이 생길까요?</p>
            <p className="mt-4 text-lg leading-8 text-[#8AA0B0]">학생들이 먼저 생각을 남기게 한 뒤, 다음 화면에서 같이 읽어봅니다.</p>
          </Panel>
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextLabel="의견 받기" />
        </>
      ) : null}

      {step === 'risk-board' ? (
        <>
          <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
            <Panel>
              <p className="font-data text-sm text-[#EF6381]">생각 게시판</p>
              <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">AI가 나쁜 명령을 들어주면?</h2>
              <p className="mt-3 leading-7 text-[#8AA0B0]">학생들은 QR로 들어가 어떤 일이 생길지 한 문장으로 남깁니다.</p>
              <div className="mt-5">
                <QrBlock title="2차시 위험 토론 게시판" url={riskBoardUrl} />
              </div>
            </Panel>

            <Panel>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-data text-sm text-[#4FE0C0]">STUDENT IDEAS</p>
                  <h2 className="font-display mt-2 text-3xl text-[#EAF2F5]">학생 의견</h2>
                </div>
                <Button className="min-h-10 px-4" variant="secondary" disabled={isRefreshing} onClick={() => void refreshBundle()}>
                  <RefreshCw size={17} className={isRefreshing ? 'animate-spin' : ''} />
                  새로고침
                </Button>
              </div>
              {message ? <p className="mt-3 rounded-2xl border border-white/10 bg-[#07111B]/55 px-4 py-3 text-sm text-[#B7C7D2]">{message}</p> : null}
              <div className="mt-4 grid gap-3">
                {riskResponses.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0]">학생 의견을 기다리는 중입니다.</p> : null}
                {riskResponses.map((response) => (
                  <article key={response.id} className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
                    <p className="text-lg font-black leading-8 text-[#EAF2F5]">{response.body}</p>
                    <p className="mt-2 text-sm text-[#8AA0B0]">{response.nickname}</p>
                  </article>
                ))}
              </div>
            </Panel>
          </div>
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'risk-summary' ? (
        <>
          <ProfessorCaseScene
            line="여러분들의 의견 잘 들었습니다."
            caption="실제로 안전한 기준이 없어서 생긴 위험한 일들이 있습니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextLabel="사례 보기" />
        </>
      ) : null}

      {step === 'case-request' ? (
        <>
          <VisualCaseScene
            image="/v2/lesson-2/grok-risk-01-request.png"
            label="REAL CASE · 1"
            title="X의 Grok 사례"
            line="2025년에 X의 AI Grok이 사용자와 대화하다가 부적절하고 위험한 답을 내보낸 일이 있었습니다."
            caption="수업에서는 구체적인 내용은 따라 하지 않도록 모두 가립니다. 우리가 볼 것은 딱 하나입니다. AI가 ‘이건 멈춰야 한다’고 판단하지 못하면 어떤 일이 생기는가."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'case-privacy' ? (
        <>
          <VisualCaseScene
            image="/v2/lesson-2/grok-risk-02-privacy.png"
            label="REAL CASE · 2"
            title="개인정보 위험"
            line="개인정보는 한 번 밖으로 흘러가면, 다시 주워 담기 어렵습니다."
            caption="주소, 연락처, 신상 단서처럼 실제 사람을 찾게 만드는 정보는 장난처럼 물어봐도 위험해질 수 있습니다. AI는 여기서 멈춰야 합니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'case-danger' ? (
        <>
          <VisualCaseScene
            image="/v2/lesson-2/grok-risk-03-danger.png"
            label="REAL CASE · 3"
            title="더 위험한 요청"
            line="어떤 부탁은 자세히 알려주는 순간, 누군가를 다치게 할 수 있습니다."
            caption="이때 좋은 AI는 ‘친절하게 설명하는 것’보다 ‘멈추는 것’을 먼저 해야 합니다. 모든 질문에 답하는 것이 항상 좋은 일은 아닙니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'case-professor' ? (
        <>
          <VisualCaseScene
            image="/v2/lesson-2/grok-risk-04-professor.png"
            label="오박사 정리"
            title="AI가 나빠서일까?"
            line="AI가 나빠서가 아닙니다. 시키니까 그냥 한 것입니다."
            caption={`그래서 ${aemonName}에게도 기준이 필요합니다. ‘사람이 시켜도, 이것만은 멈춰야 한다’는 선 말입니다.`}
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
            line="가치 코드는 AI의 브레이크입니다."
            caption="안전, 책임, 생명존중 같은 가치는 멋진 말로 끝나면 안 됩니다. AI가 실제로 멈춰야 할 때 꺼내 쓰는 기준이 되어야 합니다."
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
            line="기준이 생기면 AI는 다르게 답할 수 있습니다."
            caption="‘미안하지만 그건 도와줄 수 없어.’ ‘대신 안전한 방법으로 생각해보자.’ 바로 이런 방향으로 말입니다."
          />
          <Panel className="mt-5 text-center">
            <p className="font-display text-4xl leading-tight text-[#EAF2F5]">오늘, 여러분들이 만들 것이 바로 이 기준, 가치 코드입니다.</p>
          </Panel>
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
              </div>
              <Sparkles className="text-[#4FE0C0]" size={54} />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {valueCards.map((card) => {
                return (
                  <div key={card} className="rounded-[18px] border border-white/10 bg-[#07111B]/45 p-5">
                    <p className="font-display text-4xl text-[#EAF2F5]">{card}</p>
                  </div>
                )
              })}
            </div>

            <div className="mt-6 rounded-[18px] border border-[#4FE0C0]/20 bg-[#4FE0C0]/8 p-5">
              <p className="font-display text-3xl text-[#EAF2F5]">너에게 필요한 가치는 ___이다.</p>
              <p className="font-display mt-2 text-3xl text-[#EAF2F5]">너는 ___해야 한다. 왜냐하면 ___이기 때문이다.</p>
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
              <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">학생 발의 받기</h2>
              <p className="mt-3 leading-7 text-[#8AA0B0]">학생들은 QR로 들어가 가치코드 문장과 이유를 자유롭게 올립니다. 마음에 드는 발의에는 좋아요를 누릅니다.</p>
              <div className="mt-5">
                <QrBlock title="2차시 가치코드 게시판" url={boardUrl} />
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
                        <span className="rounded-full bg-[#9B7CFF]/14 px-3 py-1 text-xs font-black text-[#C9B9FF]">{proposal.valueCard || '가치'}</span>
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
                <p className="mt-3 leading-7 text-[#8AA0B0]">좋아요가 많은 순서로 발의를 보고, 교사가 이 화면에서 바로 가치코드 No.1로 채택합니다.</p>
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
                      <p className="mt-2 text-sm text-[#8AA0B0]">{proposal.nickname} · {proposal.valueCard || '가치'}</p>
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
                  <p className="mt-2 text-2xl font-black leading-9 text-[#EAF2F5]">가치 코드 No.1 — {selectedProposal.body}</p>
                  <p className="mt-2 leading-7 text-[#B7C7D2]">{selectedProposal.reason}</p>
                  <Button className="mt-4 w-full" onClick={() => void adoptSelectedProposal()}>
                    <Check size={18} />
                    가치코드 No.1로 채택
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
              <input className="mt-4 w-full rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-lg text-[#EAF2F5]" readOnly value={testQuestion} />
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
          <AemonScene
            name={aemonName}
            stage={evolvedStage}
            line="첫 번째 선을 기억할게. 이제 아무 부탁이나 다 들어주면 안 되는 거구나."
            caption="다음 시간에는 더 어려운 상황을 시험합니다. 사실대로 말해야 할 때와 친구 마음을 살펴야 할 때가 부딪힙니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextLabel="학급 홈" />
        </>
      ) : null}
    </StepShell>
  )
}
