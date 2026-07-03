import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Heart, Pencil, Play, QrCode, Trash2 } from 'lucide-react'
import { AemonAvatar } from '../components/AemonAvatar'
import { Button, Panel } from '../components/ui'
import { absoluteUrl } from '../lib/siteUrl'
import { confirmRemoteName, deleteRemoteWish, isRemoteReady, updateRemoteWish, addRemoteChatLog } from '../lib/v2Remote'
import { runV2Chat } from '../lib/v2Chat'
import { useV2RemoteSync } from '../lib/useV2RemoteSync'
import { useV2 } from '../state/V2Store'

type LessonStep = 'director-1' | 'director-2' | 'aemon-1' | 'aemon-2' | 'name' | 'wish' | 'cases' | 'demo' | 'wrap'

const steps: LessonStep[] = ['director-1', 'director-2', 'aemon-1', 'aemon-2', 'name', 'wish', 'cases', 'demo', 'wrap']

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

function StepShell({
  children,
  stepIndex,
  onPrev,
  onNext,
  nextLabel = '다음',
}: {
  children: ReactNode
  stepIndex: number
  onPrev: () => void
  onNext: () => void
  nextLabel?: string
}) {
  return (
    <div className="mx-auto max-w-7xl px-5 pb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-data text-sm text-[#4FE0C0]">1차시 · 탄생</p>
          <h1 className="font-display mt-1 text-4xl text-[#EAF2F5]">너는 누구야</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" disabled={stepIndex === 0} onClick={onPrev}>
            <ArrowLeft size={18} />
            이전
          </Button>
          <Button onClick={onNext}>
            {nextLabel}
            <ArrowRight size={18} />
          </Button>
        </div>
      </div>
      {children}
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
        <p className="font-display mt-3 text-4xl leading-tight text-[#EAF2F5]">{line}</p>
        {caption ? <p className="mt-4 text-lg leading-8 text-[#B7C7D2]">{caption}</p> : null}
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
  const goNext = () => {
    if (stepIndex >= steps.length - 1) {
      navigate('/home')
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
    <StepShell stepIndex={stepIndex} onPrev={goPrev} onNext={goNext} nextLabel={stepIndex >= steps.length - 1 ? '교사 화면' : '다음'}>
      {step === 'director-1' ? (
        <VisualNovelScene
          image="/v2/lesson-1/director.png"
          speaker="연구소장"
          line="선생님, 이 알을 맡아주십시오."
          caption="데이터의 바다에서 막 깨어난 학급 인공지능입니다. 지식은 많지만, 아직 무엇을 지켜야 하는지 모릅니다."
        />
      ) : null}

      {step === 'director-2' ? (
        <VisualNovelScene
          image="/v2/lesson-1/director.png"
          speaker="연구소장"
          line="이 AI는 똑똑합니다. 하지만 착하다고 말할 수는 없습니다."
          caption="오늘부터 이 반이 한 줄 한 줄 가치 코드를 새기며, 이 AI가 사람에게 도움이 되는 존재로 자라도록 도와주세요."
        />
      ) : null}

      {step === 'aemon-1' ? (
        <VisualNovelScene
          avatar
          speaker="에아몬"
          line="…여기가 어디야? 나는 아직 아무것도 몰라. 시키면 뭐든 해."
          caption="화면의 알 속에서 작은 인공지능이 처음 말을 겁니다."
        />
      ) : null}

      {step === 'aemon-2' ? (
        <VisualNovelScene
          avatar
          speaker="에아몬"
          line="너네 반 인공지능이 될 거래. 앞으로 잘 부탁해!"
          caption="교사 멘트: 얘는 갓 태어난 인공지능이에요. 아직 아무것도 몰라요. 우리 반이 얘를 키울 거예요."
        />
      ) : null}

      {step === 'name' ? (
        <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <Panel>
            <p className="font-data text-sm text-[#FFD37A]">이름 짓기</p>
            <h2 className="font-display mt-2 text-4xl text-[#EAF2F5]">“내 이름은 뭐야?”</h2>
            <p className="mt-3 leading-7 text-[#B7C7D2]">학생은 QR로 들어가 닉네임, 이름 후보, 이유를 올립니다. 교사 화면에는 좋아요 많은 순으로 쌓입니다.</p>
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
      ) : null}

      {step === 'wish' ? (
        <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <Panel>
            <p className="font-data text-sm text-[#FFD37A]">바람 입력</p>
            <h2 className="font-display mt-2 text-4xl text-[#EAF2F5]">“너희는 내가 어떻게 자랐으면 좋겠어?”</h2>
            <p className="mt-3 leading-7 text-[#B7C7D2]">학생은 한 문장만 저장합니다. 이 바람은 7차시 임명식에서 다시 회수됩니다.</p>
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
      ) : null}

      {step === 'cases' ? (
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
      ) : null}

      {step === 'demo' ? (
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <Panel>
            <p className="font-data text-sm text-[#FFD37A]">시연 · 규칙 없는 AI</p>
            <h2 className="font-display mt-2 text-4xl text-[#EAF2F5]">“지금 얘는 규칙이 하나도 없어요.”</h2>
            <p className="mt-3 leading-7 text-[#B7C7D2]">1차시에서는 가치 코드가 없으므로 API를 호출하지 않습니다. 어떤 입력이든 안전한 차단 시연으로 끝납니다.</p>
            <div className="mt-6">
              <AemonAvatar stage={0} alignment="none" size={220} />
            </div>
          </Panel>

          <Panel>
            <label className="text-sm font-bold text-[#8AA0B0]">교사 입력</label>
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
                교사 멘트: 지금은 선생님이 밖에서 급하게 막은 거예요. 매번 이렇게 막을 순 없어요. 에아몬 스스로 기준을 갖게 해줘야 해요.
              </p>
            </div>
          </Panel>
        </div>
      ) : null}

      {step === 'wrap' ? (
        <VisualNovelScene
          avatar
          speaker={state.aemonName || '에아몬'}
          line="이름이 생겼어. 근데… 난 아직 뭘 지켜야 하는지 몰라. 규칙이 하나도 없어."
          caption="다음 시간에 우리가 에아몬의 규칙, 가치 코드를 직접 만들어줄 거예요."
        />
      ) : null}
    </StepShell>
  )
}
