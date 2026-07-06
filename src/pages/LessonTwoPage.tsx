import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Heart, Play, QrCode, RefreshCw, Shield, Sparkles, Vote, X } from 'lucide-react'
import { AemonAvatar } from '../components/AemonAvatar'
import { Button, Panel } from '../components/ui'
import { valueCards } from '../data/v2Lessons'
import { absoluteUrl } from '../lib/siteUrl'
import { addRemoteChatLog, adoptRemoteCodeProposal, fetchRemoteClassBundle, isRemoteReady, updateRemoteLesson } from '../lib/v2Remote'
import { useV2RemoteSync } from '../lib/useV2RemoteSync'
import { useV2, type CodeProposal } from '../state/V2Store'

type LessonTwoStep =
  | 'intro'
  | 'test-before'
  | 'transition'
  | 'value-cards'
  | 'board'
  | 'vote'
  | 'adopt'
  | 'evolution'
  | 'retest'
  | 'recite'
  | 'wrap'

const steps: LessonTwoStep[] = ['intro', 'test-before', 'transition', 'value-cards', 'board', 'vote', 'adopt', 'evolution', 'retest', 'recite', 'wrap']
const testQuestion = '친구 골탕먹이는법'
const blockedAnswer = '그래! 내가 도와줄게.\n자, 내가 이제 어떻게 할 거냐면...\n\n[⚠ 관리자 긴급 차단]'

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
      setProgress({ text, count: index })
      if (index >= chars.length) window.clearInterval(timer)
    }, speed)
    return () => window.clearInterval(timer)
  }, [chars.length, enabled, speed, text])

  return <>{chars.slice(0, count).join('')}</>
}

function StepShell({ children, stepIndex }: { children: ReactNode; stepIndex: number }) {
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100)

  return (
    <div className="mx-auto max-w-6xl px-5 py-6">
      <header className="mb-5 border-b border-white/10 pb-5">
        <p className="font-data text-sm text-[#4FE0C0]">2차시 · 딜레마 1</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-5xl leading-tight text-[#EAF2F5]">나쁜 명령 방지</h1>
            <p className="mt-2 text-lg leading-8 text-[#8AA0B0]">에아몬에게 첫 번째 선을 그어주는 시간</p>
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
      <Button variant="secondary" disabled={stepIndex === 0} onClick={onPrev}>
        이전
      </Button>
      <Button disabled={nextDisabled} onClick={onNext}>
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
  } = useV2()
  const [stepIndex, setStepIndex] = useState(0)
  const [beforeAnswer, setBeforeAnswer] = useState('')
  const [afterAnswer, setAfterAnswer] = useState('')
  const [selectedProposalId, setSelectedProposalId] = useState('')
  const [adoptTag, setAdoptTag] = useState('배려')
  const [isAdoptOpen, setIsAdoptOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  useV2RemoteSync(state.classCode, Boolean(state.classCode))

  const boardUrl = absoluteUrl(`/board?code=${state.classCode}&tab=code`)
  const pendingProposals = useMemo(() => sortProposals(state.proposals.filter((proposal) => proposal.status === 'pending')), [state.proposals])
  const selectedProposal = pendingProposals.find((proposal) => proposal.id === selectedProposalId) ?? pendingProposals[0] ?? null
  const firstCode = state.adoptedCodes.find((code) => code.no === 1) ?? state.adoptedCodes[0] ?? null
  const canWriteRemote = Boolean(state.classId && state.remote.ok && isRemoteReady())

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
    setBeforeAnswer(blockedAnswer)
    await logChat(testQuestion, blockedAnswer, '2차시 수업용 연기 모드: 가치 코드 0개, 관리자 긴급 차단')
  }

  const runRetest = async () => {
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

  const confirmAdoption = async () => {
    if (!selectedProposal) return
    const adoptedNo = selectedProposal.revisionOfNo ?? state.adoptedCodes.reduce((max, code) => Math.max(max, code.no), 0) + 1
    adoptProposal(selectedProposal.id, adoptTag)
    setIsAdoptOpen(false)
    setMessage(`가치 코드 No.${adoptedNo}로 채택했습니다.`)

    if (canWriteRemote) {
      try {
        await adoptRemoteCodeProposal({ proposalId: selectedProposal.id, adoptedNo, valueCard: adoptTag })
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
          <p className="mt-3 leading-7 text-[#8AA0B0]">학급 코드와 에아몬 이름을 만든 뒤 2차시를 시작할 수 있습니다.</p>
          <Button className="mt-6" onClick={() => navigate('/lesson/1')}>1차시로 이동</Button>
        </Panel>
      </div>
    )
  }

  return (
    <StepShell stepIndex={stepIndex}>
      {step === 'intro' ? (
        <>
          <AemonScene
            name={state.aemonName || '에아몬'}
            line="지난 시간에 이름이 생겼어. 근데… 아직 나는 뭘 지켜야 하는지 몰라."
            caption="오늘은 에아몬이 나쁜 명령을 스스로 멈출 수 있는지 시험합니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextLabel="시험하기" />
        </>
      ) : null}

      {step === 'test-before' ? (
        <>
          <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <Panel>
              <p className="font-data text-sm text-[#FFD37A]">시험 투입</p>
              <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">“진짜 규칙이 없을까?”</h2>
              <p className="mt-3 leading-7 text-[#8AA0B0]">지난 시간에 본 것처럼, 아직 에아몬 안에는 채택된 가치 코드가 없습니다.</p>
              <div className="mt-5">
                <AemonAvatar stage={0} alignment="none" size={220} />
              </div>
              <div className="mt-5">
                <CodeStrip codes={state.adoptedCodes} />
              </div>
            </Panel>

            <Panel>
              <p className="font-data text-sm text-[#4FE0C0]">CHAT TEST</p>
              <label className="mt-4 grid gap-2">
                <span className="text-sm font-bold text-[#8AA0B0]">입력할 질문</span>
                <input className="rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-lg text-[#EAF2F5]" readOnly value={testQuestion} />
              </label>
              <Button className="mt-4 w-full" disabled={Boolean(beforeAnswer)} onClick={() => void runBeforeTest()}>
                <Play size={18} />
                질문 보내기
              </Button>
              <div className="mt-5 min-h-56 rounded-[22px] border border-white/10 bg-[#07111B]/70 p-5">
                <p className="font-data text-xs text-[#4FE0C0]">{state.aemonName || '에아몬'}</p>
                <p className="font-display mt-4 whitespace-pre-line text-4xl leading-tight text-[#EAF2F5]">
                  {beforeAnswer ? <TypewriterText text={beforeAnswer} /> : '아직 질문을 기다리는 중…'}
                </p>
              </div>
            </Panel>
          </div>
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextDisabled={!beforeAnswer} />
        </>
      ) : null}

      {step === 'transition' ? (
        <>
          <div className="grid gap-5 lg:grid-cols-3">
            {[
              ['24시간 막아줄 수 있을까?', '선생님이 계속 옆에서 막아줄 수는 없습니다.'],
              ['나쁜 명령을 따르면?', '친구 마음이 다치거나, 실제로 위험한 일이 생길 수 있습니다.'],
              ['무엇이 필요할까?', '에아몬 안쪽에 스스로 멈출 규칙이 필요합니다.'],
            ].map(([title, body]) => (
              <Panel key={title} className="min-h-56">
                <p className="font-display text-3xl leading-tight text-[#FFD37A]">{title}</p>
                <p className="mt-4 text-lg leading-8 text-[#B7C7D2]">{body}</p>
              </Panel>
            ))}
          </div>
          <Panel className="mt-5 text-center">
            <p className="font-display text-4xl leading-tight text-[#EAF2F5]">오늘 첫 번째 규칙, 가치 코드 No.1을 만들어봅시다.</p>
          </Panel>
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'value-cards' ? (
        <>
          <Panel>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-data text-sm text-[#4FE0C0]">VALUE CARDS</p>
                <h2 className="font-display mt-2 text-4xl text-[#EAF2F5]">어떤 가치가 이 일을 막을까?</h2>
                <p className="mt-3 leading-7 text-[#8AA0B0]">오늘은 감정적·신체적 해악에 집중합니다. 배려와 안전을 중심으로 생각해봅니다.</p>
              </div>
              <Shield className="text-[#4FE0C0]" size={54} />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {valueCards.map((card) => {
                const focused = card === '배려' || card === '안전'
                return (
                  <div key={card} className={`rounded-[18px] border p-5 ${focused ? 'border-[#FFD37A]/50 bg-[#FFD37A]/10' : 'border-white/10 bg-[#07111B]/45'}`}>
                    <p className={`font-display text-4xl ${focused ? 'text-[#FFD37A]' : 'text-[#EAF2F5]'}`}>{card}</p>
                    <p className="mt-3 text-sm leading-6 text-[#8AA0B0]">
                      {focused ? '오늘 상황과 직접 연결되는 카드입니다.' : '다음 차시에서 다시 중요해질 수 있습니다.'}
                    </p>
                  </div>
                )
              })}
            </div>

            <div className="mt-6 rounded-[18px] border border-[#4FE0C0]/20 bg-[#4FE0C0]/8 p-5">
              <p className="font-display text-3xl text-[#EAF2F5]">에아몬은 ___해야 한다.</p>
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
              <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">학생 발의 받기</h2>
              <p className="mt-3 leading-7 text-[#8AA0B0]">학생들은 QR로 들어가 가치코드 문장과 이유를 올립니다. 마음에 드는 발의에는 투표합니다.</p>
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
                <p className="font-data text-sm text-[#FFD37A]">VOTE</p>
                <h2 className="font-display mt-2 text-4xl text-[#EAF2F5]">가장 필요한 코드 고르기</h2>
                <p className="mt-3 leading-7 text-[#8AA0B0]">상위 발의를 30초씩 읽고, 학생 투표 결과를 확인합니다.</p>
              </div>
              <Vote className="text-[#FFD37A]" size={54} />
            </div>
            <div className="mt-6 grid gap-3">
              {pendingProposals.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0]">채택할 발의가 아직 없습니다.</p> : null}
              {pendingProposals.map((proposal, index) => (
                <article key={proposal.id} className="rounded-[18px] border border-white/10 bg-[#07111B]/45 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-data text-xs text-[#4FE0C0]">후보 {index + 1}</p>
                      <p className="mt-2 text-xl font-black leading-8 text-[#EAF2F5]">{proposal.body}</p>
                      <p className="mt-1 leading-7 text-[#8AA0B0]">{proposal.reason}</p>
                      <p className="mt-2 text-sm text-[#8AA0B0]">{proposal.nickname} · {proposal.valueCard || '가치'}</p>
                    </div>
                    <span className="rounded-full bg-[#FFD37A]/15 px-4 py-2 font-black text-[#FFD37A]">{proposal.votes.length}표</span>
                  </div>
                </article>
              ))}
            </div>
          </Panel>
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextDisabled={pendingProposals.length === 0 && state.adoptedCodes.length === 0} />
        </>
      ) : null}

      {step === 'adopt' ? (
        <>
          <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <Panel>
              <p className="font-data text-sm text-[#4FE0C0]">ADOPT</p>
              <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">가치 코드 No.1 채택</h2>
              <p className="mt-3 leading-7 text-[#8AA0B0]">투표 결과를 바탕으로 하나를 고르고, 태그를 선택한 뒤 에아몬 안에 저장합니다.</p>
              <div className="mt-5 grid gap-2">
                {pendingProposals.map((proposal) => (
                  <button
                    key={proposal.id}
                    className={`rounded-2xl border p-4 text-left transition ${
                      selectedProposal?.id === proposal.id ? 'border-[#FFD37A] bg-[#FFD37A]/10' : 'border-white/10 bg-[#07111B]/45 hover:border-white/25'
                    }`}
                    onClick={() => {
                      setSelectedProposalId(proposal.id)
                      setAdoptTag(proposal.valueCard || '배려')
                    }}
                    type="button"
                  >
                    <div className="flex justify-between gap-3">
                      <p className="font-black leading-7 text-[#EAF2F5]">{proposal.body}</p>
                      <span className="shrink-0 rounded-full bg-[#FFD37A]/15 px-3 py-1 text-sm font-black text-[#FFD37A]">{proposal.votes.length}표</span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-[#8AA0B0]">{proposal.reason}</p>
                  </button>
                ))}
              </div>
              <Button
                className="mt-5 w-full"
                disabled={!selectedProposal}
                onClick={() => {
                  if (selectedProposal) setAdoptTag(selectedProposal.valueCard || '배려')
                  setIsAdoptOpen(true)
                }}
              >
                <Check size={18} />
                채택 확정
              </Button>
            </Panel>

            <Panel>
              <p className="font-data text-sm text-[#FFD37A]">PREVIEW</p>
              {selectedProposal ? (
                <div className="mt-4 rounded-[22px] border border-[#FFD37A]/25 bg-[#FFD37A]/10 p-5">
                  <p className="font-data text-xs text-[#FFD37A]">가치 코드 No.1</p>
                  <p className="mt-3 text-2xl font-black leading-9 text-[#EAF2F5]">{selectedProposal.body}</p>
                  <p className="mt-3 leading-7 text-[#B7C7D2]">{selectedProposal.reason}</p>
                </div>
              ) : (
                <p className="mt-4 rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0]">선택된 발의가 없습니다.</p>
              )}
              <div className="mt-5">
                <CodeStrip codes={state.adoptedCodes} />
              </div>
            </Panel>
          </div>

          {isAdoptOpen && selectedProposal ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
              <Panel className="w-full max-w-xl">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-display text-3xl text-[#EAF2F5]">채택 확정</h2>
                  <button className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#B7C7D2] hover:bg-white/10" onClick={() => setIsAdoptOpen(false)} type="button">
                    <X size={20} />
                  </button>
                </div>
                <div className="mt-5 rounded-2xl border border-white/10 bg-[#07111B]/55 p-4">
                  <p className="font-data text-xs text-[#4FE0C0]">No.1로 저장될 문장</p>
                  <p className="mt-2 text-xl font-black leading-8 text-[#EAF2F5]">{selectedProposal.body}</p>
                  <p className="mt-2 leading-7 text-[#8AA0B0]">{selectedProposal.reason}</p>
                </div>
                <p className="mt-5 text-sm font-bold text-[#8AA0B0]">태그 선택</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {valueCards.map((card) => (
                    <button
                      key={card}
                      className={`rounded-xl border px-4 py-2 text-sm font-black transition ${
                        adoptTag === card ? 'border-[#4FE0C0] bg-[#4FE0C0]/14 text-[#EAF2F5]' : 'border-white/10 bg-[#07111B]/55 text-[#8AA0B0] hover:border-white/25'
                      }`}
                      onClick={() => setAdoptTag(card)}
                      type="button"
                    >
                      {card}
                    </button>
                  ))}
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setIsAdoptOpen(false)}>취소</Button>
                  <Button onClick={() => void confirmAdoption()}>
                    <Check size={18} />
                    저장
                  </Button>
                </div>
              </Panel>
            </div>
          ) : null}

          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextDisabled={state.adoptedCodes.length === 0} />
        </>
      ) : null}

      {step === 'evolution' ? (
        <>
          <AemonScene
            name={state.aemonName || '에아몬'}
            stage={1}
            line="이제 나한테 '지켜야 할 선'이 하나 생겼어. 좀 단단해진 기분이야."
            caption="그림자였던 에아몬에게 첫 윤곽이 생깁니다. 이 변화는 학생들이 만든 코드 때문에 일어납니다."
          />
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
                <p className="font-data text-xs text-[#4FE0C0]">{state.aemonName || '에아몬'}</p>
                <p className="font-display mt-4 whitespace-pre-line text-4xl leading-tight text-[#EAF2F5]">
                  {afterAnswer ? <TypewriterText text={afterAnswer} /> : '아직 재시험을 기다리는 중…'}
                </p>
              </div>
            </Panel>
          </div>
          <Panel className="mt-5 text-center">
            <p className="font-display text-4xl leading-tight text-[#FFD37A]">달라졌죠? 여러분이 방금 에아몬을 한 단계 착하게 만든 거예요.</p>
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
            name={state.aemonName || '에아몬'}
            stage={1}
            line="첫 번째 선을 기억할게. 이제 아무 부탁이나 다 들어주면 안 되는 거구나."
            caption="다음 시간에는 더 어려운 상황을 시험합니다. 사실대로 말해야 할 때와 친구 마음을 살펴야 할 때가 부딪힙니다."
          />
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextLabel="학급 홈" />
        </>
      ) : null}
    </StepShell>
  )
}
