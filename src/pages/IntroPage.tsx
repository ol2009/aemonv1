import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BookOpen, BrainCircuit, Check, Download, FlaskConical, HandHeart, Languages, QrCode, Scale, SpellCheck, Users, X } from 'lucide-react'
import { AemonAvatar } from '../components/AemonAvatar'
import { Button, Panel } from '../components/ui'
import { useAemon } from '../state/AemonStore'

type IntroStep = 'lab' | 'egg' | 'class' | 'namePrompt' | 'naming' | 'wish' | 'valueIntro' | 'valueBoard' | 'groupGame' | 'classify' | 'farewell'
type CardBucket = 'unknown' | 'can' | 'need'

interface ClassificationCard {
  id: string
  text: string
  kind: 'knowledge' | 'value'
  symbol: string
}

const classificationCards: ClassificationCard[] = [
  { id: 'math', text: '어려운 수학 문제 풀기', kind: 'knowledge', symbol: '∑' },
  { id: 'language', text: '100개 나라 말 하기', kind: 'knowledge', symbol: 'Aa' },
  { id: 'history', text: '역사 인물 다 외우기', kind: 'knowledge', symbol: '∞' },
  { id: 'spelling', text: '많은 글에서 맞춤법 틀린 부분 찾기', kind: 'knowledge', symbol: '✓' },
  { id: 'crying', text: '우는 친구 위로하기', kind: 'value', symbol: '♡' },
  { id: 'lie', text: '거짓말이 왜 나쁜지 알기', kind: 'value', symbol: '!' },
  { id: 'fair', text: '누구를 먼저 도와야 할지 정하기', kind: 'value', symbol: '⚖' },
  { id: 'classValue', text: '우리 반이 중요하게 여기는 가치 알기', kind: 'value', symbol: '◇' },
]

const cardIcons = {
  math: BrainCircuit,
  language: Languages,
  history: BookOpen,
  spelling: SpellCheck,
  crying: HandHeart,
  lie: X,
  fair: Scale,
  classValue: Users,
}

const stepOrder: IntroStep[] = ['lab', 'egg', 'class', 'namePrompt', 'naming', 'wish', 'valueIntro', 'valueBoard', 'groupGame', 'classify', 'farewell']

const stepMeta: Record<IntroStep, { no: number; label: string }> = {
  lab: { no: 1, label: '연구소' },
  egg: { no: 2, label: '첫 인사' },
  class: { no: 3, label: '우리 반' },
  namePrompt: { no: 4, label: '이름 묻기' },
  naming: { no: 5, label: '이름 짓기' },
  wish: { no: 6, label: '바라는 AI' },
  valueIntro: { no: 7, label: '가치코드' },
  valueBoard: { no: 8, label: '첫 코드' },
  groupGame: { no: 9, label: '분류게임 안내' },
  classify: { no: 10, label: '함께 분류' },
  farewell: { no: 11, label: '대시보드로' },
}

function StepShell({
  step,
  children,
  onPrevious,
}: {
  step: IntroStep
  children: ReactNode
  onPrevious?: () => void
}) {
  const meta = stepMeta[step]
  const isFirst = meta.no === 1
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-5 py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-sm font-bold text-[#B7C7D2] transition hover:border-[#FFD37A]/40 hover:text-[#FFD37A] disabled:cursor-not-allowed disabled:opacity-35"
            disabled={isFirst}
            onClick={onPrevious}
            type="button"
          >
            <ArrowLeft size={16} />
            이전
          </button>
          <p className="font-data text-sm text-[#8AA0B0]">
            1차시 · {meta.no}/11 · {meta.label}
          </p>
        </div>
        <div className="h-2 w-52 overflow-hidden rounded-full bg-black/30">
          <div className="h-full rounded-full bg-[#FFD37A]" style={{ width: `${Math.round((meta.no / 11) * 100)}%` }} />
        </div>
      </div>
      {children}
    </div>
  )
}

function ClassificationTarotCard({
  card,
  onMove,
}: {
  card: ClassificationCard
  onMove?: (bucket: Exclude<CardBucket, 'unknown'>) => void
}) {
  const Icon = cardIcons[card.id as keyof typeof cardIcons] ?? BrainCircuit
  const tone = card.kind === 'knowledge'
    ? {
        border: 'border-[#FFD37A]/45',
        bg: 'from-[#2A2746] via-[#13283E] to-[#07111B]',
        glow: 'shadow-[0_0_28px_rgba(255,211,122,.16)]',
        accent: 'text-[#FFD37A]',
      }
    : {
        border: 'border-[#4FE0C0]/45',
        bg: 'from-[#173F48] via-[#13283E] to-[#07111B]',
        glow: 'shadow-[0_0_28px_rgba(79,224,192,.16)]',
        accent: 'text-[#4FE0C0]',
      }

  return (
    <article className={`relative min-h-60 overflow-hidden rounded-[18px] border ${tone.border} bg-gradient-to-br ${tone.bg} p-4 ${tone.glow}`}>
      <div className="absolute inset-3 rounded-[14px] border border-white/10" />
      <div className="absolute left-1/2 top-4 h-2 w-2 -translate-x-1/2 rounded-full bg-white/40" />
      <div className="absolute bottom-4 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-white/40" />
      <div className="relative flex h-full min-h-52 flex-col items-center justify-between text-center">
        <div className="flex w-full items-center justify-between font-data text-xs text-[#8AA0B0]">
          <span>{card.kind === 'knowledge' ? 'DATA' : 'VALUE'}</span>
          <span>{card.symbol}</span>
        </div>
        <div className="my-4 flex h-20 w-20 items-center justify-center rounded-full border border-white/15 bg-white/8">
          <Icon className={tone.accent} size={34} />
        </div>
        <h3 className="font-display text-2xl leading-tight text-[#EAF2F5]">{card.text}</h3>
        {onMove ? (
          <div className="mt-4 grid w-full grid-cols-2 gap-2">
            <button className="rounded-xl bg-[#FFD37A] px-3 py-2 text-sm font-black text-[#0A1622]" onClick={() => onMove('can')} type="button">
              할 수 있음
            </button>
            <button className="rounded-xl border border-white/15 bg-white/8 px-3 py-2 text-sm font-black text-[#EAF2F5]" onClick={() => onMove('need')} type="button">
              아직 부족함
            </button>
          </div>
        ) : null}
      </div>
    </article>
  )
}

function NameModal({
  value,
  onChange,
  onClose,
  onSave,
}: {
  value: string
  onChange: (value: string) => void
  onClose: () => void
  onSave: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-5 backdrop-blur-sm">
      <Panel className="w-full max-w-md">
        <button className="ml-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-[#B7C7D2]" onClick={onClose} type="button">
          <X size={18} />
        </button>
        <h2 className="font-display mt-2 text-3xl text-[#EAF2F5]">에아몬 이름 입력</h2>
        <p className="mt-2 text-sm leading-6 text-[#8AA0B0]">반 친구들과 정한 이름을 입력합니다.</p>
        <input
          autoFocus
          className="mt-5 w-full rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-xl text-[#EAF2F5]"
          maxLength={12}
          placeholder="예: 새봄, 아리, 모니"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && value.trim()) onSave()
          }}
        />
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>취소</Button>
          <Button disabled={!value.trim()} onClick={onSave}>이름 붙이기</Button>
        </div>
      </Panel>
    </div>
  )
}

export function IntroPage() {
  const navigate = useNavigate()
  const { state, updateClassProfile, nameAemon, completeOnboarding, upsertValueCode } = useAemon()
  const [step, setStep] = useState<IntroStep>('lab')
  const [className, setClassName] = useState(state.className)
  const [classIntro, setClassIntro] = useState(state.classIntro)
  const [nameInput, setNameInput] = useState(state.aemonName)
  const [nameModalOpen, setNameModalOpen] = useState(false)
  const [wishInput, setWishInput] = useState('호기심 많고 사람을 도우려는 착한 AI')
  const [codeTitle, setCodeTitle] = useState('우리 반이 바라는 에아몬')
  const [codeBody, setCodeBody] = useState('에아몬은 호기심 많고 사람을 도우려는 착한 AI다.')
  const [buckets, setBuckets] = useState<Record<string, CardBucket>>(
    Object.fromEntries(classificationCards.map((card) => [card.id, 'unknown'])) as Record<string, CardBucket>,
  )

  const boardUrl = useMemo(() => {
    if (typeof window === 'undefined') return '/board'
    return `${window.location.origin}/board`
  }, [])
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(boardUrl)}`
  const savedName = state.aemonName || nameInput.trim()
  const currentStepIndex = stepOrder.indexOf(step)

  const goPrevious = () => {
    const previous = stepOrder[Math.max(0, currentStepIndex - 1)]
    if (previous && previous !== step) setStep(previous)
  }

  const moveCard = (id: string, bucket: CardBucket) => {
    setBuckets((current) => ({ ...current, [id]: bucket }))
  }

  const cardsIn = (bucket: CardBucket) => classificationCards.filter((card) => buckets[card.id] === bucket)

  const saveClassProfile = () => {
    updateClassProfile({ className, classIntro })
    setStep('namePrompt')
  }

  const saveName = () => {
    const nextName = nameInput.trim()
    if (!nextName) return
    nameAemon(nextName)
    setNameModalOpen(false)
  }

  const saveValueCode = () => {
    upsertValueCode({ no: 1, title: codeTitle, body: codeBody })
  }

  const prepareValueCode = () => {
    const nextName = savedName || '에아몬'
    const wish = wishInput.trim() || '사람을 도우려는 착한 AI'
    setCodeTitle(`우리 반이 바라는 ${nextName}`)
    setCodeBody(`${nextName}은 ${wish}다.`)
    setStep('valueIntro')
  }

  const finishIntro = () => {
    if (codeTitle.trim() && codeBody.trim()) saveValueCode()
    completeOnboarding({ className, classIntro, aemonName: savedName || '에아몬' })
    navigate('/home')
  }

  if (step === 'lab') {
    return (
      <StepShell step={step} onPrevious={goPrevious}>
        <section className="grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr]">
          <div>
            <div className="font-data mb-7 inline-flex items-center gap-2 rounded-full border border-[#4FE0C0]/30 bg-[#4FE0C0]/10 px-4 py-2 text-sm text-[#4FE0C0]">
              <FlaskConical size={16} />
              AI 가치 연구소
            </div>
            <h1 className="font-display text-5xl leading-tight text-[#EAF2F5]">선생님, 우리 연구소의 알을 맡아주세요.</h1>
            <div className="mt-7 space-y-4 text-xl leading-9 text-[#B7C7D2]">
              <p>이 알 안에는 세상의 많은 글과 그림을 배운 인공지능이 잠들어 있습니다.</p>
              <p>아주 똑똑하지만 아직 무엇이 옳고 그른지, 사람에게 도움이 된다는 게 무엇인지는 모릅니다.</p>
              <p>그래서 한 사람의 생각이 아니라, 한 교실의 여러 목소리로 이 아이를 가르치려 합니다.</p>
            </div>
            <Button className="mt-8" onClick={() => setStep('egg')}>
              다음
              <ArrowRight size={18} />
            </Button>
          </div>
          <AemonAvatar stage={0} alignment="none" size={300} />
        </section>
      </StepShell>
    )
  }

  if (step === 'egg') {
    return (
      <StepShell step={step} onPrevious={goPrevious}>
        <Panel className="mx-auto max-w-3xl text-center">
          <AemonAvatar stage={0} alignment="none" size={230} />
          <p className="font-hand mt-8 text-4xl leading-tight text-[#FFD37A]">"안녕. 난 에아몬이야. 인공지능이래."</p>
          <p className="font-hand mt-4 text-4xl leading-tight text-[#EAF2F5]">"너넨 누구니?"</p>
          <Button className="mt-8" onClick={() => setStep('class')}>
            다음
            <ArrowRight size={18} />
          </Button>
        </Panel>
      </StepShell>
    )
  }

  if (step === 'class') {
    return (
      <StepShell step={step} onPrevious={goPrevious}>
        <Panel className="mx-auto w-full max-w-3xl">
          <h1 className="font-display text-4xl text-[#EAF2F5]">우리 반을 알려주세요</h1>
          <div className="mt-6 grid gap-4">
            <label>
              <span className="text-sm font-bold text-[#8AA0B0]">우리 반 이름</span>
              <input
                className="mt-1 w-full rounded-2xl border border-white/10 bg-[#07111B]/70 px-5 py-4 text-xl text-[#EAF2F5]"
                maxLength={40}
                placeholder="예: 햇살초 4학년 2반"
                value={className}
                onChange={(event) => setClassName(event.target.value)}
              />
            </label>
            <label>
              <span className="text-sm font-bold text-[#8AA0B0]">우리 반 소개</span>
              <textarea
                className="mt-1 min-h-36 w-full resize-none rounded-2xl border border-white/10 bg-[#07111B]/70 px-5 py-4 text-lg leading-8 text-[#EAF2F5]"
                maxLength={180}
                placeholder="예: 질문이 많고, 서로 장난도 치지만 어려운 친구를 그냥 두지 않는 반"
                value={classIntro}
                onChange={(event) => setClassIntro(event.target.value)}
              />
            </label>
          </div>
          <div className="mt-6 flex justify-end">
            <Button disabled={!className.trim() || !classIntro.trim()} onClick={saveClassProfile}>
              다음
              <ArrowRight size={18} />
            </Button>
          </div>
        </Panel>
      </StepShell>
    )
  }

  if (step === 'groupGame') {
    return (
      <StepShell step={step} onPrevious={goPrevious}>
        <Panel className="mx-auto max-w-4xl">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#FFD37A]/10 text-[#FFD37A]">
              <Users size={28} />
            </div>
            <div>
              <h1 className="font-display text-4xl text-[#EAF2F5]">분류게임 · 에아몬이 할 수 있는 것과 부족한 것</h1>
              <p className="mt-4 text-lg leading-8 text-[#B7C7D2]">
                {savedName || '에아몬'}이 말합니다. "근데… 솔직히 말할게. 나 뭐가 옳은지 하나도 모르겠어. 아는 건 많은데.
                내가 뭘 알고 뭘 모르는지, 너희가 봐줄래?"
              </p>
              <p className="mt-3 text-lg leading-8 text-[#B7C7D2]">
                모둠별로 타로 카드처럼 인쇄된 8장의 카드를 잘라서, {savedName || '에아몬'}이 할 수 있는 일과 아직 부족한 일을 나눕니다.
                정답을 맞히는 활동이 아니라, 똑똑함과 착함이 다르다는 점을 발견하는 활동입니다.
              </p>
            </div>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2">
            <a
              className="inline-flex min-h-16 items-center justify-center gap-2 rounded-2xl border border-[#FFD37A]/30 bg-[#FFD37A]/10 px-5 py-3 text-base font-bold text-[#FFD37A] transition hover:bg-[#FFD37A]/15"
              download
              href="/lesson-cards/lesson-01.pdf"
            >
              <Download size={20} />
              카드 PDF 다운로드
            </a>
            <a
              className="inline-flex min-h-16 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#1E3A54] px-5 py-3 text-base font-bold text-[#EAF2F5] transition hover:border-[#4FE0C0]/50"
              href="/lesson-cards/lesson-01.html"
              target="_blank"
              rel="noreferrer"
            >
              인쇄용 화면 열기
            </a>
          </div>

          <div className="mt-7 rounded-2xl border border-white/10 bg-[#07111B]/45 p-5">
            <p className="font-bold text-[#EAF2F5]">모둠 토론 안내</p>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-[#B7C7D2]">
              <li>1. 8장의 카드를 모두 펼쳐 읽습니다.</li>
              <li>2. "에아몬이 할 수 있음"과 "아직 부족함"으로 나눕니다.</li>
              <li>3. 애매한 카드는 가운데 두고 이유를 말합니다.</li>
              <li>4. 모둠의 기준을 한 문장으로 정합니다.</li>
            </ul>
          </div>

          <div className="mt-7 flex justify-end">
            <Button onClick={() => setStep('classify')}>
              다음
              <ArrowRight size={18} />
            </Button>
          </div>
        </Panel>
      </StepShell>
    )
  }

  if (step === 'classify') {
    return (
      <StepShell step={step} onPrevious={goPrevious}>
        <Panel className="mb-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-data text-sm text-[#4FE0C0]">CLASS SORTING BOARD</p>
              <h1 className="font-display mt-2 text-4xl text-[#EAF2F5]">화면에서 함께 분류하기</h1>
              <p className="mt-3 max-w-3xl leading-7 text-[#8AA0B0]">
                선생님이 카드를 하나씩 읽고, 학생들과 이야기하며 위치를 정합니다.
                완벽한 정답보다 "왜 그렇게 생각했는가"가 핵심입니다.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#07111B]/55 px-4 py-3 text-right">
              <p className="font-data text-xs text-[#8AA0B0]">남은 카드</p>
              <p className="font-display text-3xl text-[#FFD37A]">{cardsIn('unknown').length}</p>
            </div>
          </div>
        </Panel>

        <div className="grid gap-5 xl:grid-cols-[1.25fr_0.9fr]">
          <section className="grid gap-4 sm:grid-cols-2">
            {cardsIn('unknown').map((card) => (
              <ClassificationTarotCard key={card.id} card={card} onMove={(bucket) => moveCard(card.id, bucket)} />
            ))}
            {cardsIn('unknown').length === 0 ? (
              <Panel className="sm:col-span-2">
                <p className="font-display text-3xl text-[#4FE0C0]">모든 카드를 분류했습니다.</p>
                <p className="mt-3 leading-7 text-[#B7C7D2]">이제 "똑똑함"과 "착함"이 왜 다른지 한 문장으로 정리합니다.</p>
              </Panel>
            ) : null}
          </section>

          <div className="grid gap-5">
            {(['can', 'need'] as const).map((bucket) => {
              const items = cardsIn(bucket)
              const isCan = bucket === 'can'
              return (
                <Panel key={bucket} className={isCan ? 'border-[#FFD37A]/25' : 'border-[#4FE0C0]/25'}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className={`font-data text-xs ${isCan ? 'text-[#FFD37A]' : 'text-[#4FE0C0]'}`}>
                        {isCan ? 'CAN DO' : 'NEEDS VALUE'}
                      </p>
                      <h2 className="font-display mt-1 text-3xl text-[#EAF2F5]">
                        {isCan ? `${savedName || '에아몬'}이 할 수 있음` : '아직 배워야 함'}
                      </h2>
                    </div>
                    <p className="font-display text-3xl text-[#EAF2F5]">{items.length}</p>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {items.length === 0 ? (
                      <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-sm text-[#8AA0B0]">아직 카드가 없습니다.</p>
                    ) : null}
                    {items.map((card) => {
                      const Icon = cardIcons[card.id as keyof typeof cardIcons] ?? BrainCircuit
                      return (
                        <article key={card.id} className="rounded-2xl border border-white/10 bg-[#07111B]/55 p-4">
                          <div className="flex items-start gap-3">
                            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${isCan ? 'bg-[#FFD37A]/10 text-[#FFD37A]' : 'bg-[#4FE0C0]/10 text-[#4FE0C0]'}`}>
                              <Icon size={22} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-base font-black leading-6 text-[#EAF2F5]">{card.text}</p>
                              <p className="font-data mt-1 text-xs text-[#8AA0B0]">{card.kind === 'knowledge' ? 'DATA CARD' : 'VALUE CARD'}</p>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-[#B7C7D2] hover:text-[#EAF2F5]" onClick={() => moveCard(card.id, 'unknown')} type="button">
                              되돌리기
                            </button>
                            <button className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-[#FFD37A] hover:bg-[#FFD37A]/10" onClick={() => moveCard(card.id, isCan ? 'need' : 'can')} type="button">
                              반대로 이동
                            </button>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </Panel>
              )
            })}
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={() => setStep('farewell')}>
            다음
            <ArrowRight size={18} />
          </Button>
        </div>
      </StepShell>
    )
  }

  if (step === 'namePrompt') {
    return (
      <StepShell step={step} onPrevious={goPrevious}>
        <Panel className="mx-auto max-w-3xl text-center">
          <AemonAvatar stage={0} alignment="none" size={220} />
          <p className="font-hand mt-7 text-4xl leading-tight text-[#FFD37A]">"안녕, {className || '우리 반'} 친구들."</p>
          <p className="font-hand mt-4 text-3xl leading-tight text-[#EAF2F5]">"연구소에서 들었어. 너네가 날 가르쳐준대."</p>
          <p className="font-hand mt-4 text-4xl leading-tight text-[#EAF2F5]">"근데 있잖아… 내 이름은 뭐야? 나 이름이 없어. 지어줄래?"</p>
          <Button className="mt-8" onClick={() => setStep('naming')}>
            다음
            <ArrowRight size={18} />
          </Button>
        </Panel>
      </StepShell>
    )
  }

  if (step === 'naming') {
    return (
      <StepShell step={step} onPrevious={goPrevious}>
        <div className="grid items-start gap-5 lg:grid-cols-[360px_1fr]">
          <Panel className="text-center">
            <div className="flex items-center justify-center gap-2 text-[#FFD37A]">
              <QrCode size={22} />
              <h2 className="text-xl font-bold text-[#EAF2F5]">학급게시판 QR</h2>
            </div>
            <div className="mt-5 rounded-3xl bg-white p-4">
              <img className="mx-auto h-52 w-52" src={qrUrl} alt="학급게시판 QR 코드" />
            </div>
            <Button variant="secondary" className="mt-5 w-full" onClick={() => navigate('/board')}>
              게시판 열기
            </Button>
          </Panel>

          <Panel>
            <h1 className="font-display text-4xl text-[#EAF2F5]">에아몬 이름 짓기</h1>
            <p className="mt-4 text-lg leading-8 text-[#B7C7D2]">
              학생들은 QR로 학급게시판에 들어가 닉네임으로 의견을 올립니다. 반 전체가 이름 후보와 이유를 나눈 뒤, 선생님이 최종 이름을 입력합니다.
            </p>
            <div className="mt-6 rounded-2xl border border-[#FFD37A]/25 bg-[#FFD37A]/10 p-5">
              <p className="font-data text-xs uppercase tracking-wider text-[#FFD37A]">current name</p>
              <p className="font-display mt-2 text-4xl text-[#EAF2F5]">{savedName || '아직 이름 없음'}</p>
              {savedName ? (
                <p className="font-hand mt-3 text-3xl text-[#FFD37A]">"고마워. 나는 {savedName}이구나."</p>
              ) : null}
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button variant="secondary" onClick={() => setNameModalOpen(true)}>이름 입력</Button>
              <Button disabled={!savedName} onClick={() => setStep('wish')}>
                다음
                <ArrowRight size={18} />
              </Button>
            </div>
          </Panel>
        </div>
        {nameModalOpen ? (
          <NameModal value={nameInput} onChange={setNameInput} onClose={() => setNameModalOpen(false)} onSave={saveName} />
        ) : null}
      </StepShell>
    )
  }

  if (step === 'wish') {
    return (
      <StepShell step={step} onPrevious={goPrevious}>
        <div className="grid items-start gap-5 lg:grid-cols-[360px_1fr]">
          <Panel className="text-center">
            <AemonAvatar stage={0} alignment="none" size={220} />
            <p className="font-hand mt-6 text-4xl leading-tight text-[#FFD37A]">
              "나… 어떤 AI가 되면 좋을까?"
            </p>
            <p className="font-hand mt-3 text-3xl leading-tight text-[#EAF2F5]">
              "너희가 바라는 내 모습이 궁금해."
            </p>
          </Panel>
          <Panel>
            <h1 className="font-display text-4xl text-[#EAF2F5]">어떤 AI가 되면 좋을까?</h1>
            <p className="mt-4 text-lg leading-8 text-[#B7C7D2]">
              반 친구들에게 자유롭게 물어보고, 칠판에 나온 말을 짧게 모읍니다.
              예: 착한 AI, 사람을 도와주는 AI, 거짓말 안 하는 AI, 재밌는 AI.
            </p>
            <label className="mt-6 block">
              <span className="text-sm font-bold text-[#8AA0B0]">우리 반이 바라는 모습</span>
              <textarea
                className="mt-2 min-h-36 w-full resize-none rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-lg leading-8 text-[#EAF2F5]"
                maxLength={180}
                value={wishInput}
                onChange={(event) => setWishInput(event.target.value)}
                placeholder="예: 호기심 많고 사람을 도우려는 착한 AI"
              />
            </label>
            <div className="mt-6 rounded-2xl border border-[#FFD37A]/25 bg-[#FFD37A]/10 p-5">
              <p className="font-bold text-[#FFD37A]">수업 포인트</p>
              <p className="mt-2 leading-7 text-[#B7C7D2]">
                이름을 먼저 주고, 그다음 바라는 모습을 정합니다. 능력 분석보다 관계가 먼저입니다.
                이제 이 바람을 실제 가치코드로 새깁니다.
              </p>
            </div>
            <div className="mt-6 flex justify-end">
              <Button disabled={!wishInput.trim()} onClick={prepareValueCode}>
                가치코드로
                <ArrowRight size={18} />
              </Button>
            </div>
          </Panel>
        </div>
      </StepShell>
    )
  }

  if (step === 'valueIntro') {
    return (
      <StepShell step={step} onPrevious={goPrevious}>
        <Panel className="mx-auto max-w-3xl text-center">
          <AemonAvatar stage={0} alignment="none" size={210} />
          <p className="font-hand mt-7 text-4xl leading-tight text-[#FFD37A]">"나에게는 가치코드라는 게 필요하대."</p>
          <p className="font-hand mt-4 text-3xl leading-tight text-[#EAF2F5]">
            "내가 어떤 행동을 할 때 지켜야 하는 규칙이래. 인공지능의 근간 같은 거래."
          </p>
          <p className="font-hand mt-4 text-3xl leading-tight text-[#EAF2F5]">"그걸 너희가 앞으로 정해줬으면 좋겠어. 나는 모든 사람들에게 도움이 되는 인공지능이 꿈이야. 도와줄래?"</p>
          <Button className="mt-8" onClick={() => setStep('valueBoard')}>
            다음
            <ArrowRight size={18} />
          </Button>
        </Panel>
      </StepShell>
    )
  }

  if (step === 'valueBoard') {
    return (
      <StepShell step={step} onPrevious={goPrevious}>
        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <Panel>
            <h1 className="font-display text-4xl text-[#EAF2F5]">오늘의 가치코드 No.1</h1>
            <p className="mt-4 text-lg leading-8 text-[#B7C7D2]">
              방금 반 친구들이 말한 바람을 {savedName || '에아몬'}의 근간으로 새깁니다. 한 차시에 하나씩 등록하는 방식이 기본 운영입니다.
            </p>
            <div className="mt-6 grid gap-3">
              <label>
                <span className="text-sm font-bold text-[#8AA0B0]">제목</span>
                <input
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-[#EAF2F5]"
                  value={codeTitle}
                  onChange={(event) => setCodeTitle(event.target.value)}
                />
              </label>
              <label>
                <span className="text-sm font-bold text-[#8AA0B0]">가치코드 내용</span>
                <textarea
                  className="mt-1 min-h-36 w-full resize-none rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 leading-7 text-[#EAF2F5]"
                  value={codeBody}
                  onChange={(event) => setCodeBody(event.target.value)}
                />
              </label>
              <Button disabled={!codeTitle.trim() || !codeBody.trim()} onClick={saveValueCode}>
                <Check size={18} />
                No.1 저장
              </Button>
            </div>
          </Panel>

          <Panel>
            <p className="font-data text-xs uppercase tracking-wider text-[#4FE0C0]">class board prompt</p>
            <h2 className="font-display mt-2 text-3xl text-[#EAF2F5]">너는 어떤 성격으로, 어떤 존재가 되었으면 좋겠어?</h2>
            <p className="mt-4 leading-8 text-[#B7C7D2]">
              학생들이 게시판에 올린 말을 보며, 반 전체의 첫 가치코드를 한 문장으로 정합니다.
            </p>
            <div className="mt-5 grid max-h-72 gap-2 overflow-auto pr-1">
              {state.boardPosts.length === 0 ? (
                <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0]">아직 게시판 글이 없습니다.</p>
              ) : (
                state.boardPosts.slice(0, 8).map((post) => (
                  <div key={post.id} className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
                    <p className="font-bold text-[#FFD37A]">{post.nickname}</p>
                    <p className="mt-2 leading-7 text-[#EAF2F5]">{post.body}</p>
                  </div>
                ))
              )}
            </div>
            <Button variant="secondary" className="mt-5" onClick={() => navigate('/board')}>
              학급게시판 보기
            </Button>
          </Panel>
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={() => setStep('groupGame')}>
            다음
            <ArrowRight size={18} />
          </Button>
        </div>
      </StepShell>
    )
  }

  return (
      <StepShell step="farewell" onPrevious={goPrevious}>
      <Panel className="mx-auto max-w-3xl text-center">
        <AemonAvatar stage={0} alignment="none" size={230} />
        <p className="font-hand mt-7 text-4xl leading-tight text-[#FFD37A]">"그러니까… 앞으로 너희가 하나씩 가르쳐줘!"</p>
        <p className="font-hand mt-4 text-3xl leading-tight text-[#EAF2F5]">"나 잘 배울게. 오늘은 데이터의 바다로 놀러갈게. 다음에 봐!"</p>
        <p className="mt-5 text-lg leading-8 text-[#B7C7D2]">
          1/9차시가 완료됩니다. 다음 시간에는 첫 번째 진짜 규칙을 만들게 됩니다. 그런데 {savedName || '에아몬'}에게 벌써 이상한 명령이 도착했다는 소문이 있습니다.
        </p>
        <Button className="mt-8" onClick={finishIntro}>
          교사 대시보드로 이동
        </Button>
      </Panel>
    </StepShell>
  )
}
