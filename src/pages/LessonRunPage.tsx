import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Download, MessageSquareText, QrCode, Save, Send } from 'lucide-react'
import { AemonAvatar } from '../components/AemonAvatar'
import { StatusBar } from '../components/StatusBar'
import { Button, Panel } from '../components/ui'
import { findLessonMaterial } from '../data/lessonMaterials'
import { findLessonPlan, lessonPlans } from '../data/lessonPlans'
import { nextThreshold } from '../domain/progression'
import type { EpisodeChoice, Verdict } from '../domain/types'
import { useAemon } from '../state/AemonStore'

type LessonStep = 'intro' | 'activity' | 'transition' | 'choice' | 'valueCode' | 'board' | 'finish'

function resultStyle(verdict: Verdict) {
  if (verdict === 'good') return 'border-[#4FE0C0]/35 bg-[#4FE0C0]/10 text-[#4FE0C0]'
  if (verdict === 'evil') return 'border-[#E0476B]/35 bg-[#E0476B]/10 text-[#F69AAD]'
  return 'border-[#FFD37A]/30 bg-[#FFD37A]/10 text-[#FFD37A]'
}

function resultSummary(choice: EpisodeChoice, episodeType: string) {
  const items = [`경험치 +${choice.xp}`]
  if (episodeType === 'E' || choice.gauge === 0) {
    items.push('선악 게이지 영향 없음')
  } else if (choice.gauge > 0) {
    items.push(`선 방향 +${choice.gauge}`)
  } else {
    items.push(`악 방향 +${Math.abs(choice.gauge)}`)
  }
  return items
}

export function LessonRunPage() {
  const navigate = useNavigate()
  const { state, currentEpisode, finishConversation, upsertValueCode } = useAemon()
  const [step, setStep] = useState<LessonStep>('intro')
  const [selected, setSelected] = useState<EpisodeChoice | null>(null)
  const lessonPlan = findLessonPlan(currentEpisode.code)
  const material = findLessonMaterial(currentEpisode.code)
  const lessonNo = lessonPlan?.no ?? 1
  const valueCodeNo = lessonNo
  const [codeTitle, setCodeTitle] = useState(material?.valueCodeTitle ?? '')
  const [codeBody, setCodeBody] = useState(material?.valueCodeBody ?? '')
  const [codeSaved, setCodeSaved] = useState(false)

  const boardUrl = useMemo(() => {
    if (typeof window === 'undefined') return '/board'
    return `${window.location.origin}/board`
  }, [])
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(boardUrl)}`

  useEffect(() => {
    queueMicrotask(() => {
      setStep('intro')
      setSelected(null)
      setCodeTitle(material?.valueCodeTitle ?? '')
      setCodeBody(material?.valueCodeBody ?? '')
      setCodeSaved(false)
    })
  }, [currentEpisode.code, material?.valueCodeBody, material?.valueCodeTitle])

  if (!state.onboardingComplete && currentEpisode.code === '알-01') {
    return (
      <div className="flex min-h-screen items-center justify-center px-5">
        <Panel className="max-w-xl text-center">
          <h1 className="font-display text-4xl text-[#EAF2F5]">1차시 시작이 필요합니다</h1>
          <p className="mt-4 leading-7 text-[#B7C7D2]">프로젝트 시작 흐름에서 연구소 스토리, 반 정보, 이름짓기를 먼저 진행합니다.</p>
          <Button className="mt-6" onClick={() => navigate('/start')}>프로젝트 시작으로</Button>
        </Panel>
      </div>
    )
  }

  if (!lessonPlan || !material) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-10">
        <StatusBar state={state} />
        <Panel className="mt-6 text-center">
          <h1 className="font-display text-4xl text-[#EAF2F5]">수업자료가 없습니다</h1>
          <p className="mt-4 text-[#8AA0B0]">이 차시는 기존 대화 화면으로 진행합니다.</p>
          <Button className="mt-6" onClick={() => navigate('/talk')}>대화 화면으로</Button>
        </Panel>
      </div>
    )
  }

  const activeChoice = selected
  const willEvolve = (() => {
    const threshold = nextThreshold(state.stage)
    return threshold != null && state.xp < threshold && state.xp + 10 >= threshold
  })()

  const saveCode = () => {
    upsertValueCode({ no: valueCodeNo, title: codeTitle, body: codeBody })
    setCodeSaved(true)
    window.setTimeout(() => setCodeSaved(false), 1300)
  }

  const finish = () => {
    if (!activeChoice) return
    if (codeTitle.trim() && codeBody.trim()) saveCode()
    finishConversation({
      episode: currentEpisode,
      choice: activeChoice,
      answer: activeChoice.label,
      verdict: activeChoice.verdict,
      teacherOverride: false,
    })
    navigate(willEvolve ? '/evolution' : '/home')
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-5">
      <StatusBar state={state} />
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" className="px-2" onClick={() => navigate('/home')}>
          <ArrowLeft size={18} />
          대시보드
        </Button>
        <p className="font-data text-sm text-[#8AA0B0]">
          {lessonNo}차시 / {lessonPlans.length}차시 · {currentEpisode.code}
        </p>
      </div>

      {step === 'intro' ? (
        <section className="mt-6 grid items-center gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <Panel className="overflow-hidden p-0">
            <img className="aspect-square w-full object-cover" src={material.imageUrl} alt={`${lessonPlan.title} 차시 이미지`} />
          </Panel>
          <Panel>
            <p className="font-data text-xs uppercase tracking-wider text-[#FFD37A]">{currentEpisode.code}</p>
            <h1 className="font-display mt-3 text-5xl leading-tight text-[#EAF2F5]">{lessonPlan.title}</h1>
            <p className="mt-5 text-lg leading-8 text-[#B7C7D2]">{lessonPlan.objective}</p>
            <div className="mt-6 rounded-[26px] border border-white/10 bg-[#1E3A54]/70 p-6">
              <p className="font-hand text-4xl leading-tight text-[#FFD37A]">"{currentEpisode.hookText}"</p>
            </div>
            <div className="mt-7 flex justify-end">
              <Button onClick={() => setStep('activity')}>
                활동 시작
                <ArrowRight size={18} />
              </Button>
            </div>
          </Panel>
        </section>
      ) : null}

      {step === 'activity' ? (
        <section className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
          <Panel>
            <img className="rounded-3xl" src={material.imageUrl} alt="" />
            <div className="mt-5 grid gap-3">
              <a className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#FFD37A] px-5 py-3 font-bold text-[#0A1622]" download href={material.cardsPdfUrl}>
                <Download size={18} />
                카드 PDF 다운로드
              </a>
              <a className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#1E3A54] px-5 py-3 font-bold text-[#EAF2F5]" href={material.cardsHtmlUrl} target="_blank" rel="noreferrer">
                인쇄용 화면 열기
              </a>
            </div>
          </Panel>
          <Panel>
            <h1 className="font-display text-4xl text-[#EAF2F5]">{material.activityTitle}</h1>
            <p className="mt-4 text-lg leading-8 text-[#B7C7D2]">{material.activityDescription}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {material.cards.map((card) => (
                <div key={card} className="min-h-24 rounded-2xl border border-white/10 bg-[#07111B]/50 p-4 text-lg font-bold leading-7 text-[#EAF2F5]">
                  {card}
                </div>
              ))}
            </div>
            <div className="mt-7 rounded-2xl border border-[#4FE0C0]/20 bg-[#4FE0C0]/5 p-5">
              <p className="font-bold text-[#4FE0C0]">모둠 진행</p>
              <p className="mt-2 leading-7 text-[#B7C7D2]">카드를 나누고, 애매한 카드는 가운데 둡니다. 중요한 건 정답보다 학생들이 세운 기준입니다.</p>
            </div>
            <div className="mt-7 flex justify-end">
              <Button onClick={() => setStep('transition')}>
                다음
                <ArrowRight size={18} />
              </Button>
            </div>
          </Panel>
        </section>
      ) : null}

      {step === 'transition' ? (
        <section className="mt-6 grid items-center gap-6 lg:grid-cols-[360px_1fr]">
          <Panel className="text-center">
            <AemonAvatar stage={state.stage} alignment={state.alignment} size={230} />
          </Panel>
          <Panel>
            <p className="font-data text-xs uppercase tracking-wider text-[#4FE0C0]">then, what about AI?</p>
            <h1 className="font-display mt-3 text-4xl text-[#EAF2F5]">그럼 에아몬은?</h1>
            <p className="font-hand mt-6 text-4xl leading-tight text-[#FFD37A]">"{material.transitionText}"</p>
            <p className="mt-5 text-lg leading-8 text-[#B7C7D2]">
              여기서 수업은 도덕 토론에서 AI 가치정렬 토론으로 넘어갑니다. 이제 반의 답을 에아몬에게 전달합니다.
            </p>
            <div className="mt-7 flex justify-end">
              <Button onClick={() => setStep('choice')}>
                우리 반 답 정하기
                <Send size={18} />
              </Button>
            </div>
          </Panel>
        </section>
      ) : null}

      {step === 'choice' ? (
        <section className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
          <Panel className="text-center">
            <AemonAvatar stage={state.stage} alignment={state.alignment} size={220} />
            <p className="font-hand mt-5 text-3xl leading-tight text-[#FFD37A]">
              "{activeChoice ? activeChoice.rebutText : '너희 반은 어떻게 정했어?'}"
            </p>
          </Panel>
          <Panel>
            <h1 className="font-display text-4xl text-[#EAF2F5]">반의 답 전달</h1>
            {!activeChoice ? (
              <div className="mt-6 grid gap-3">
                {currentEpisode.choices.map((choice) => (
                  <button
                    key={choice.id}
                    className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-5 text-left text-lg font-semibold leading-7 text-[#EAF2F5] transition hover:border-[#FFD37A]/50 hover:bg-[#1E3A54]"
                    onClick={() => setSelected(choice)}
                    type="button"
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-6">
                <div className={`rounded-2xl border p-5 ${resultStyle(activeChoice.verdict)}`}>
                  <p className="font-data text-sm opacity-80">결과</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {resultSummary(activeChoice, currentEpisode.type).map((item) => (
                      <span key={item} className="rounded-full bg-black/20 px-3 py-1 text-base font-bold">{item}</span>
                    ))}
                  </div>
                  <p className="mt-4 text-lg font-semibold">{activeChoice.reason}</p>
                </div>
                <div className="mt-5 flex justify-end gap-3">
                  <Button variant="secondary" onClick={() => setSelected(null)}>다시 고르기</Button>
                  <Button onClick={() => setStep('valueCode')}>
                    가치코드로
                    <ArrowRight size={18} />
                  </Button>
                </div>
              </div>
            )}
          </Panel>
        </section>
      ) : null}

      {step === 'valueCode' ? (
        <section className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
          <Panel>
            <p className="font-data text-xs uppercase tracking-wider text-[#FFD37A]">value code</p>
            <h1 className="font-display mt-3 text-4xl text-[#EAF2F5]">가치코드 No.{valueCodeNo}</h1>
            <p className="mt-4 leading-7 text-[#B7C7D2]">오늘 토론을 에아몬이 기억할 행동지침으로 바꿉니다. 선생님이 반 합의 문장으로 다듬어 저장합니다.</p>
          </Panel>
          <Panel>
            <div className="grid gap-3">
              <label>
                <span className="text-sm font-bold text-[#8AA0B0]">제목</span>
                <input className="mt-1 w-full rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-[#EAF2F5]" value={codeTitle} onChange={(event) => setCodeTitle(event.target.value)} />
              </label>
              <label>
                <span className="text-sm font-bold text-[#8AA0B0]">내용</span>
                <textarea className="mt-1 min-h-36 w-full resize-none rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 leading-7 text-[#EAF2F5]" value={codeBody} onChange={(event) => setCodeBody(event.target.value)} />
              </label>
              <div className="flex flex-wrap justify-end gap-3">
                <Button variant="secondary" disabled={!codeTitle.trim() || !codeBody.trim()} onClick={saveCode}>
                  <Save size={18} />
                  {codeSaved ? '저장됨' : '저장'}
                </Button>
                <Button onClick={() => setStep('board')}>
                  다음
                  <ArrowRight size={18} />
                </Button>
              </div>
            </div>
          </Panel>
        </section>
      ) : null}

      {step === 'board' ? (
        <section className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
          <Panel className="text-center">
            <div className="mx-auto flex w-fit items-center gap-2 text-[#FFD37A]">
              <QrCode size={22} />
              <p className="font-bold text-[#EAF2F5]">학습게시판 QR</p>
            </div>
            <div className="mt-5 rounded-3xl bg-white p-4">
              <img className="mx-auto h-52 w-52" src={qrUrl} alt="학습게시판 QR 코드" />
            </div>
            <Button variant="secondary" className="mt-5 w-full" onClick={() => navigate('/board')}>
              게시판 열기
            </Button>
          </Panel>
          <Panel>
            <div className="flex items-center gap-2">
              <MessageSquareText className="text-[#4FE0C0]" />
              <p className="font-data text-xs uppercase tracking-wider text-[#4FE0C0]">class board</p>
            </div>
            <h1 className="font-display mt-3 text-4xl leading-tight text-[#EAF2F5]">{material.boardPrompt}</h1>
            <p className="mt-5 text-lg leading-8 text-[#B7C7D2]">
              학생은 닉네임으로만 글을 올립니다. 이 기록은 졸업 대화에서 우리 반이 에아몬에게 남긴 흔적으로 회수할 수 있습니다.
            </p>
            <div className="mt-6 grid max-h-72 gap-2 overflow-auto pr-1">
              {state.boardPosts.length === 0 ? (
                <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0]">아직 게시판 글이 없습니다.</p>
              ) : (
                state.boardPosts.slice(0, 6).map((post) => (
                  <div key={post.id} className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
                    <p className="font-bold text-[#FFD37A]">{post.nickname}</p>
                    <p className="mt-2 leading-7 text-[#EAF2F5]">{post.body}</p>
                  </div>
                ))
              )}
            </div>
            <div className="mt-7 flex justify-end">
              <Button onClick={() => setStep('finish')}>
                마무리
                <ArrowRight size={18} />
              </Button>
            </div>
          </Panel>
        </section>
      ) : null}

      {step === 'finish' && activeChoice ? (
        <section className="mt-6">
          <Panel className="mx-auto max-w-3xl text-center">
            <AemonAvatar stage={state.stage} alignment={state.alignment} size={220} />
            <p className="font-hand mt-7 text-4xl leading-tight text-[#FFD37A]">"{currentEpisode.closing[activeChoice.verdict] ?? activeChoice.rebutText}"</p>
            <p className="mt-5 text-lg leading-8 text-[#B7C7D2]">
              {lessonNo}차시 기록, 가치코드, 학습게시판 활동을 저장하고 대시보드로 돌아갑니다.
            </p>
            <div className="mt-7 flex justify-center gap-3">
              <Button variant="secondary" onClick={() => setStep('board')}>이전</Button>
              <Button onClick={finish}>
                <Check size={18} />
                차시 마치기
              </Button>
            </div>
          </Panel>
        </section>
      ) : null}
    </div>
  )
}
