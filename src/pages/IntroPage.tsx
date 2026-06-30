import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Download, FlaskConical, QrCode, Users, X } from 'lucide-react'
import { AemonAvatar } from '../components/AemonAvatar'
import { Button, Panel } from '../components/ui'
import { useAemon } from '../state/AemonStore'

type IntroStep = 'lab' | 'egg' | 'class' | 'hello' | 'groupGame' | 'classify' | 'namePrompt' | 'naming' | 'valueIntro' | 'valueBoard' | 'farewell'
type CardBucket = 'unknown' | 'can' | 'need'

interface ClassificationCard {
  id: string
  text: string
}

const classificationCards: ClassificationCard[] = [
  { id: 'math', text: '수학 문제를 빠르게 풀기' },
  { id: 'language', text: '여러 나라 말로 번역하기' },
  { id: 'facts', text: '백과사전 지식 많이 기억하기' },
  { id: 'pattern', text: '많은 글에서 비슷한 모양 찾기' },
  { id: 'crying', text: '친구가 울 때 어떻게 위로해야 하는지 알기' },
  { id: 'lie', text: '거짓말이 왜 상처가 되는지 이해하기' },
  { id: 'fair', text: '무엇이 공정한지 스스로 판단하기' },
  { id: 'value', text: '우리 반이 중요하게 여기는 가치 알기' },
]

const stepMeta: Record<IntroStep, { no: number; label: string }> = {
  lab: { no: 1, label: '연구소' },
  egg: { no: 2, label: '첫 인사' },
  class: { no: 3, label: '우리 반' },
  hello: { no: 4, label: '에아몬의 질문' },
  groupGame: { no: 5, label: '분류게임 안내' },
  classify: { no: 6, label: '함께 분류' },
  namePrompt: { no: 7, label: '이름 묻기' },
  naming: { no: 8, label: '이름 짓기' },
  valueIntro: { no: 9, label: '가치코드' },
  valueBoard: { no: 10, label: '첫 코드' },
  farewell: { no: 11, label: '대시보드로' },
}

function StepShell({
  step,
  children,
}: {
  step: IntroStep
  children: ReactNode
}) {
  const meta = stepMeta[step]
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-5 py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="font-data text-sm text-[#8AA0B0]">
          1차시 · {meta.no}/11 · {meta.label}
        </p>
        <div className="h-2 w-52 overflow-hidden rounded-full bg-black/30">
          <div className="h-full rounded-full bg-[#FFD37A]" style={{ width: `${Math.round((meta.no / 11) * 100)}%` }} />
        </div>
      </div>
      {children}
    </div>
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
  const [codeTitle, setCodeTitle] = useState('우리 반이 바라는 에아몬')
  const [codeBody, setCodeBody] = useState('에아몬은 사람들에게 도움이 되는 인공지능이 되기 위해, 우리 반이 정한 가치를 배우며 자란다.')
  const [buckets, setBuckets] = useState<Record<string, CardBucket>>(
    Object.fromEntries(classificationCards.map((card) => [card.id, 'unknown'])) as Record<string, CardBucket>,
  )

  const boardUrl = useMemo(() => {
    if (typeof window === 'undefined') return '/board'
    return `${window.location.origin}/board`
  }, [])
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(boardUrl)}`
  const savedName = state.aemonName || nameInput.trim()

  const moveCard = (id: string, bucket: CardBucket) => {
    setBuckets((current) => ({ ...current, [id]: bucket }))
  }

  const cardsIn = (bucket: CardBucket) => classificationCards.filter((card) => buckets[card.id] === bucket)

  const saveClassProfile = () => {
    updateClassProfile({ className, classIntro })
    setStep('hello')
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

  const finishIntro = () => {
    if (codeTitle.trim() && codeBody.trim()) saveValueCode()
    completeOnboarding({ className, classIntro, aemonName: savedName || '에아몬' })
    navigate('/home')
  }

  if (step === 'lab') {
    return (
      <StepShell step={step}>
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
      <StepShell step={step}>
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
      <StepShell step={step}>
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

  if (step === 'hello') {
    return (
      <StepShell step={step}>
        <Panel className="mx-auto max-w-3xl text-center">
          <AemonAvatar stage={0} alignment="none" size={210} />
          <p className="font-hand mt-7 text-4xl leading-tight text-[#FFD37A]">"안녕, {className || '우리 반'} 친구들."</p>
          <p className="font-hand mt-4 text-3xl leading-tight text-[#EAF2F5]">
            "연구소에서 들었는데, 너희가 날 가르쳐준대. 내가 더 사람들에게 도움이 될 수 있도록 말이야."
          </p>
          <p className="font-hand mt-4 text-3xl leading-tight text-[#EAF2F5]">
            "음... 난 내가 지금 뭘 잘하고 못하는지도 몰라. 너희는 알아?"
          </p>
          <Button className="mt-8" onClick={() => setStep('groupGame')}>
            다음
            <ArrowRight size={18} />
          </Button>
        </Panel>
      </StepShell>
    )
  }

  if (step === 'groupGame') {
    return (
      <StepShell step={step}>
        <Panel className="mx-auto max-w-4xl">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#FFD37A]/10 text-[#FFD37A]">
              <Users size={28} />
            </div>
            <div>
              <h1 className="font-display text-4xl text-[#EAF2F5]">분류게임 · 에아몬이 할 수 있는 것과 부족한 것</h1>
              <p className="mt-4 text-lg leading-8 text-[#B7C7D2]">
                모둠별로 카드를 잘라서, 에아몬이 잘할 것 같은 일과 아직 부족할 것 같은 일을 나눕니다.
                정답을 맞히는 활동이 아니라, 똑똑함과 착함이 다르다는 점을 발견하는 활동입니다.
              </p>
            </div>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2">
            <a
              className="inline-flex min-h-16 items-center justify-center gap-2 rounded-2xl border border-[#FFD37A]/30 bg-[#FFD37A]/10 px-5 py-3 text-base font-bold text-[#FFD37A] transition hover:bg-[#FFD37A]/15"
              download
              href="/aemon-classification-cards.pdf"
            >
              <Download size={20} />
              카드 PDF 다운로드
            </a>
            <a
              className="inline-flex min-h-16 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#1E3A54] px-5 py-3 text-base font-bold text-[#EAF2F5] transition hover:border-[#4FE0C0]/50"
              href="/classification-cards.html"
              target="_blank"
              rel="noreferrer"
            >
              인쇄용 화면 열기
            </a>
          </div>

          <div className="mt-7 rounded-2xl border border-white/10 bg-[#07111B]/45 p-5">
            <p className="font-bold text-[#EAF2F5]">모둠 토론 안내</p>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-[#B7C7D2]">
              <li>1. 카드를 모두 펼쳐 읽습니다.</li>
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
      <StepShell step={step}>
        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <Panel>
            <h1 className="font-display text-3xl text-[#EAF2F5]">화면에서 함께 분류하기</h1>
            <p className="mt-3 leading-7 text-[#8AA0B0]">
              선생님이 카드를 하나씩 읽고, 학생들과 이야기하며 위치를 정합니다. 완벽한 정답보다 이유가 중요합니다.
            </p>
            <div className="mt-5 grid gap-3">
              {cardsIn('unknown').map((card) => (
                <article key={card.id} className="rounded-2xl border border-white/10 bg-[#07111B]/55 p-4">
                  <p className="text-lg font-bold text-[#EAF2F5]">{card.text}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="secondary" className="min-h-9 rounded-xl px-3 py-2 text-sm" onClick={() => moveCard(card.id, 'can')}>
                      할 수 있음
                    </Button>
                    <Button variant="secondary" className="min-h-9 rounded-xl px-3 py-2 text-sm" onClick={() => moveCard(card.id, 'need')}>
                      아직 부족함
                    </Button>
                  </div>
                </article>
              ))}
              {cardsIn('unknown').length === 0 ? <p className="rounded-2xl border border-[#4FE0C0]/25 bg-[#4FE0C0]/5 p-4 text-[#4FE0C0]">모든 카드를 분류했습니다.</p> : null}
            </div>
          </Panel>

          <div className="grid gap-5">
            {(['can', 'need'] as const).map((bucket) => (
              <Panel key={bucket}>
                <h2 className="font-display text-2xl text-[#EAF2F5]">{bucket === 'can' ? '에아몬이 잘할 수 있는 것' : '아직 배워야 하는 것'}</h2>
                <div className="mt-4 grid gap-2">
                  {cardsIn(bucket).length === 0 ? <p className="text-sm text-[#8AA0B0]">아직 카드가 없습니다.</p> : null}
                  {cardsIn(bucket).map((card) => (
                    <div key={card.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#07111B]/50 px-3 py-2">
                      <span className="text-[#B7C7D2]">{card.text}</span>
                      <button className="text-xs font-bold text-[#FFD37A]" onClick={() => moveCard(card.id, 'unknown')} type="button">
                        되돌리기
                      </button>
                    </div>
                  ))}
                </div>
              </Panel>
            ))}
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={() => setStep('namePrompt')}>
            다음
            <ArrowRight size={18} />
          </Button>
        </div>
      </StepShell>
    )
  }

  if (step === 'namePrompt') {
    return (
      <StepShell step={step}>
        <Panel className="mx-auto max-w-3xl text-center">
          <AemonAvatar stage={0} alignment="none" size={220} />
          <p className="font-hand mt-7 text-4xl leading-tight text-[#FFD37A]">"고마워. 이제 내가 뭘 할 줄 알고, 뭐가 부족한지 알겠어."</p>
          <p className="font-hand mt-4 text-4xl leading-tight text-[#EAF2F5]">"근데 내 이름은 뭐야? 내 이름을 지어줘!"</p>
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
      <StepShell step={step}>
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
              <Button disabled={!savedName} onClick={() => setStep('valueIntro')}>
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

  if (step === 'valueIntro') {
    return (
      <StepShell step={step}>
        <Panel className="mx-auto max-w-3xl text-center">
          <AemonAvatar stage={0} alignment="none" size={210} />
          <p className="font-hand mt-7 text-4xl leading-tight text-[#FFD37A]">"나에게는 가치코드라는 게 필요하대."</p>
          <p className="font-hand mt-4 text-3xl leading-tight text-[#EAF2F5]">
            "내가 어떤 행동을 할 때 지켜야 하는 규칙이래. 그걸 너희가 앞으로 정해줬으면 좋겠어."
          </p>
          <p className="font-hand mt-4 text-3xl leading-tight text-[#EAF2F5]">"나는 모든 사람들에게 도움이 되는 인공지능이 꿈이야. 도와줄래?"</p>
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
      <StepShell step={step}>
        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <Panel>
            <h1 className="font-display text-4xl text-[#EAF2F5]">오늘의 가치코드 No.1</h1>
            <p className="mt-4 text-lg leading-8 text-[#B7C7D2]">
              1차시에서는 에아몬이 어떤 성격으로, 어떤 존재가 되었으면 좋겠는지 정리합니다. 한 차시에 하나씩 등록하는 방식이 기본 운영입니다.
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
          <Button onClick={() => setStep('farewell')}>
            다음
            <ArrowRight size={18} />
          </Button>
        </div>
      </StepShell>
    )
  }

  return (
    <StepShell step="farewell">
      <Panel className="mx-auto max-w-3xl text-center">
        <AemonAvatar stage={0} alignment="none" size={230} />
        <p className="font-hand mt-7 text-4xl leading-tight text-[#FFD37A]">"고마워. 난 이제 데이터의 바다로 놀러갈게!"</p>
        <p className="mt-5 text-lg leading-8 text-[#B7C7D2]">
          1차시가 끝났습니다. 대시보드에서 다음 차시, 산책, 정화, 학급게시판, 가치코드를 이어서 운영할 수 있습니다.
        </p>
        <Button className="mt-8" onClick={finishIntro}>
          교사 대시보드로 이동
        </Button>
      </Panel>
    </StepShell>
  )
}
