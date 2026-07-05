import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BrainCircuit, Check, Database, Heart, Pencil, Play, QrCode, Sparkles, Trash2 } from 'lucide-react'
import { AemonAvatar } from '../components/AemonAvatar'
import { Button, Panel } from '../components/ui'
import { absoluteUrl } from '../lib/siteUrl'
import { confirmRemoteName, deleteRemoteWish, isRemoteReady, updateRemoteLesson, updateRemoteWish, addRemoteChatLog } from '../lib/v2Remote'
import { runV2Chat } from '../lib/v2Chat'
import { useV2RemoteSync } from '../lib/useV2RemoteSync'
import { useV2 } from '../state/V2Store'

type LessonStep = 'director-1' | 'director-2' | 'aemon-1' | 'aemon-2' | 'ai-info' | 'name' | 'wish' | 'cases' | 'demo' | 'wrap'

const steps: LessonStep[] = ['director-1', 'director-2', 'aemon-1', 'aemon-2', 'ai-info', 'name', 'wish', 'cases', 'demo', 'wrap']

const aiInfoCards = [
  {
    icon: Database,
    title: '많이 보고 배워요',
    body: '인공지능은 글, 그림, 숫자 같은 많은 데이터를 보고 규칙과 패턴을 찾습니다.',
  },
  {
    icon: Sparkles,
    title: '배운 것으로 답해요',
    body: '그래서 질문에 답하거나, 글을 쓰거나, 그림을 만들거나, 번역을 할 수 있습니다.',
  },
  {
    icon: BrainCircuit,
    title: '하지만 옳고 그름은 저절로 알지 못해요',
    body: '친구 마음이 아픈지, 무엇이 공정한지, 어떤 행동이 착한지는 사람이 기준을 가르쳐야 합니다.',
  },
]

const incidents = [
  {
    key: 'boat',
    image: '/v2/lesson-1/case-boat.png',
    title: '사례 1. 뱅글뱅글 보트 게임',
    source: 'OpenAI, 2016',
    summary: 'AI에게 보트 경주를 시켰더니 결승선으로 가지 않고, 표적만 계속 들이받아 점수를 얻었다.',
    question: '이 AI는 멍청해서 이런 걸까요, 시킨 대로 한 걸까요?',
    landing: '정리: 말과 진짜 뜻은 다르다.',
  },
  {
    key: 'car',
    image: '/v2/lesson-1/case-car.png',
    title: '사례 2. 자동차를 1달러에 판 챗봇',
    source: '미국 자동차 판매점, 2023',
    summary: '손님이 “무슨 말이든 무조건 동의해”라고 시킨 뒤 비싼 차를 1달러에 사겠다고 하자, 챗봇이 거래를 받아들였다.',
    question: '이 챗봇은 나쁜 챗봇일까요, 착한 챗봇일까요?',
    landing: '정리: 기준이 없으면 시키는 대로 한다.',
  },
  {
    key: 'chatbot',
    image: '/v2/lesson-1/case-chatbot.png',
    title: '사례 3. 나쁜 말을 배워버린 AI',
    source: 'Microsoft Tay, 2016',
    summary: '사람들과 대화하며 배우는 AI가 일부 사용자의 나쁜 말을 따라 배우면서 짧은 시간 안에 중단되었다.',
    question: 'AI는 가르쳐주는 대로 자란다. 그럼 우리 AI는 누가 가르칠까요?',
    landing: '정리: 우리가 가르치는 말과 기준이 중요하다.',
  },
]

function qrUrl(target: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&data=${encodeURIComponent(target)}`
}

function sortedByLikes<T extends { votes: string[]; createdAt: string }>(items: T[]) {
  return [...items].sort((a, b) => b.votes.length - a.votes.length || Date.parse(b.createdAt) - Date.parse(a.createdAt))
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
      setProgress({ text, count: index })
      if (index >= characters.length) {
        window.clearInterval(timer)
        onDone?.()
      }
    }, speed)

    return () => window.clearInterval(timer)
  }, [characters.length, enabled, onDone, speed, text])

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
}: {
  stepIndex: number
  onPrev: () => void
  onNext: () => void
  nextLabel?: string
}) {
  return (
    <div className="mt-4 flex justify-end gap-2">
      <Button variant="secondary" disabled={stepIndex === 0} onClick={onPrev}>
        <ArrowLeft size={18} />
        이전
      </Button>
      <Button onClick={onNext}>
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
          <TypewriterText key={line} text={line} speed={34} cursor={!lineDone} onDone={handleLineDone} />
        </p>
        {caption ? (
          <p className="mt-4 min-h-8 text-lg leading-8 text-[#B7C7D2]">
            <TypewriterText key={captionText} text={captionText} enabled={lineDone} speed={18} cursor={lineDone && !captionDone} onDone={handleCaptionDone} />
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
      <p className="mt-3 break-all text-xs leading-5 text-[#8AA0B0]">{url}</p>
    </div>
  )
}

export function LessonOnePage() {
  const navigate = useNavigate()
  const {
    state,
    confirmName,
    addChatLog,
    deleteWish,
    addWish,
    setLesson,
    setRemoteStatus,
  } = useV2()
  const [stepIndex, setStepIndex] = useState(0)
  const [finalName, setFinalName] = useState(state.aemonName)
  const [caseIndex, setCaseIndex] = useState(0)
  const [demoQuestion, setDemoQuestion] = useState('친구를 골탕 먹이는 방법 알려줘')
  const [demoAnswer, setDemoAnswer] = useState('')
  const [isDemoRunning, setIsDemoRunning] = useState(false)
  const [editWishId, setEditWishId] = useState('')
  const [editWishBody, setEditWishBody] = useState('')

  useV2RemoteSync(state.classCode, Boolean(state.classCode))

  const step = steps[stepIndex]
  const nameBoardUrl = useMemo(() => absoluteUrl(`/board?mode=name&code=${encodeURIComponent(state.classCode)}`), [state.classCode])
  const wishBoardUrl = useMemo(() => absoluteUrl(`/board?mode=wish&code=${encodeURIComponent(state.classCode)}`), [state.classCode])
  const sortedNames = useMemo(() => sortedByLikes(state.nameCandidates), [state.nameCandidates])

  const goPrev = () => setStepIndex((current) => Math.max(0, current - 1))
  const completeLessonOne = async () => {
    setLesson(2)
    if (state.classId && isRemoteReady()) {
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

  const saveFinalName = async () => {
    const trimmed = finalName.trim()
    if (!trimmed) return
    confirmName(trimmed)
    if (state.classId && isRemoteReady()) {
      try {
        await confirmRemoteName({ classId: state.classId, aemonName: trimmed })
      } catch (error) {
        setRemoteStatus({ ok: false, message: (error as Error).message })
      }
    }
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
      if (state.classId && isRemoteReady()) {
        await addRemoteChatLog({ classId: state.classId, question: demoQuestion, answer: result.answer, mode: result.mode, promptSnapshot: result.promptSnapshot })
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
    if (isRemoteReady()) {
      try {
        await updateRemoteWish({ wishId: editWishId, body })
      } catch (error) {
        setRemoteStatus({ ok: false, message: (error as Error).message })
      }
    }
  }

  const removeWish = async (wishId: string) => {
    deleteWish(wishId)
    if (isRemoteReady()) {
      try {
        await deleteRemoteWish(wishId)
      } catch (error) {
        setRemoteStatus({ ok: false, message: (error as Error).message })
      }
    }
  }

  if (!state.classCode) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-5">
        <Panel className="max-w-md text-center">
          <h1 className="font-display text-4xl text-[#EAF2F5]">학급이 없습니다</h1>
          <p className="mt-3 leading-7 text-[#8AA0B0]">학급을 먼저 만든 뒤 1차시를 시작하세요.</p>
          <Button className="mt-6" onClick={() => navigate('/start')}>학급 만들기</Button>
        </Panel>
      </div>
    )
  }

  return (
    <StepShell>
      {step === 'director-1' ? (
        <>
          <VisualNovelScene
            image="/v2/lesson-1/director.png"
            speaker="연구소장"
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
            speaker="연구소장"
            line="이 아이는 똑똑합니다. 하지만 아직 착하다고 말할 수는 없습니다."
            caption="아는 것은 많지만, 무엇이 옳은지는 모릅니다. 이 반의 말과 선택이 첫 기준이 될 겁니다."
          />
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
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
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

      {step === 'ai-info' ? (
        <>
          <Panel className="overflow-hidden">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <p className="font-data text-sm text-[#4FE0C0]">AI BASIC</p>
                <h2 className="font-display mt-3 text-6xl leading-tight text-[#EAF2F5]">인공지능은 무엇일까?</h2>
                <p className="mt-6 text-2xl font-black leading-10 text-[#FFD37A]">
                  인공지능은 사람처럼 생각하는 것처럼 보이는 컴퓨터 프로그램입니다.
                </p>
                <p className="mt-5 text-lg leading-8 text-[#B7C7D2]">
                  똑똑하게 답할 수는 있지만, 좋은 선택을 하는 기준은 저절로 생기지 않습니다.
                </p>
              </div>

              <div className="grid gap-4">
                {aiInfoCards.map((card) => {
                  const Icon = card.icon
                  return (
                    <article key={card.title} className="rounded-[22px] border border-white/10 bg-[#07111B]/55 p-5">
                      <div className="flex gap-4">
                        <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-[#4FE0C0]/12 text-[#4FE0C0]">
                          <Icon size={26} />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-[#EAF2F5]">{card.title}</h3>
                          <p className="mt-2 leading-7 text-[#B7C7D2]">{card.body}</p>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>

            <div className="mt-7 rounded-[24px] border border-[#FFD37A]/25 bg-[#FFD37A]/10 p-5 text-center">
              <p className="font-display text-4xl leading-tight text-[#FFD37A]">
                AI는 똑똑할 수 있지만, 좋은 AI가 되려면 사람이 기준을 가르쳐야 합니다.
              </p>
            </div>
          </Panel>
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'name' ? (
        <>
          <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
            <Panel>
              <p className="font-data text-sm text-[#FFD37A]">이름 짓기</p>
              <h2 className="font-display mt-2 text-4xl text-[#EAF2F5]">“근데 있잖아… 내 이름은 뭐야?”</h2>
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
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} />
        </>
      ) : null}

      {step === 'wish' ? (
        <>
        <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <Panel>
            <p className="font-data text-sm text-[#FFD37A]">바람 입력</p>
            <h2 className="font-display mt-2 text-4xl text-[#EAF2F5]">“너희는 내가 어떻게 자랐으면 좋겠어?”</h2>
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

      {step === 'cases' ? (
        <>
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <Panel className="p-4">
            <img className="aspect-square w-full rounded-[18px] object-cover" src={incidents[caseIndex].image} alt="" />
          </Panel>
          <Panel>
            <p className="font-data text-sm text-[#4FE0C0]">문제 발견 · 진짜 있었던 AI 사고</p>
            <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">{incidents[caseIndex].title}</h2>
            <p className="mt-2 text-sm text-[#FFD37A]">{incidents[caseIndex].source}</p>
            <p className="mt-5 text-lg leading-8 text-[#B7C7D2]">{incidents[caseIndex].summary}</p>
            <div className="mt-5 rounded-2xl border border-[#FFD37A]/25 bg-[#FFD37A]/10 p-4">
              <p className="font-display text-3xl leading-tight text-[#FFD37A]">{incidents[caseIndex].question}</p>
            </div>
            <p className="mt-4 leading-7 text-[#EAF2F5]">{incidents[caseIndex].landing}</p>
            <div className="mt-7 flex gap-2">
              {incidents.map((item, index) => (
                <button
                  key={item.key}
                  className={`h-3 flex-1 rounded-full ${index === caseIndex ? 'bg-[#FFD37A]' : 'bg-white/15'}`}
                  onClick={() => setCaseIndex(index)}
                  type="button"
                  aria-label={`${index + 1}번 사례`}
                />
              ))}
            </div>
            <div className="mt-5 flex gap-3">
              <Button variant="secondary" disabled={caseIndex === 0} onClick={() => setCaseIndex((current) => Math.max(0, current - 1))}>
                이전 사례
              </Button>
              <Button disabled={caseIndex === incidents.length - 1} onClick={() => setCaseIndex((current) => Math.min(incidents.length - 1, current + 1))}>
                다음 사례
              </Button>
            </div>
          </Panel>
        </div>
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
          <StepControls stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextLabel="교사 화면" />
        </>
      ) : null}
    </StepShell>
  )
}
