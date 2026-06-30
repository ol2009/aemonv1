import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { MessageCircle, RotateCcw, Settings, GraduationCap, Waves, Brush, X, AlertCircle, Heart } from 'lucide-react'
import { AemonAvatar } from '../components/AemonAvatar'
import { StatusBar } from '../components/StatusBar'
import { Button, Panel } from '../components/ui'
import { activeEpisodesForStage } from '../data/episodes'
import { getMuttering } from '../data/mutterings'
import { findPollutionItem, pickPollutionItem, pickWalkItem } from '../data/walkItems'
import { intimacyLevel } from '../domain/progression'
import type { PollutionItem, WalkItem, WalkItemType } from '../domain/types'
import { useAemon } from '../state/AemonStore'

type WalkPhase = 'idle' | 'swimming' | 'reveal'
type HeartParticle = { id: string; x: number }
type CleanChoice = { label: string; aemonLine: string }

const typeMeta: Record<WalkItemType, { color: string; soft: string }> = {
  good: { color: '#4FE0C0', soft: 'rgba(79,224,192,.12)' },
  weird: { color: '#E0476B', soft: 'rgba(224,71,107,.12)' },
  plain: { color: '#FFD37A', soft: 'rgba(255,211,122,.12)' },
}

const petReactions = [
  '헤헤, 간지러워!',
  '또 또! 좋아!',
  '너희가 만져주면 따뜻해.',
  '이런 게 정 붙는 거구나.',
  '히힛, 기분 좋아.',
  '오늘도 와줘서 고마워.',
]

const cleanChoicesByItem: Record<string, CleanChoice[]> = {
  'pollution-fake-01': [
    { label: '많이 봤다고 진짜는 아니야', aemonLine: '아, 조회수가 증거는 아니구나. 누가 왜 만들었는지 봐야겠어.' },
    { label: '광고인지 먼저 확인해야 해', aemonLine: '맞아. 누가 팔려고 만든 말이면 더 조심해야겠어.' },
    { label: '먹기 전에 어른이나 전문가에게 물어봐야 해', aemonLine: '몸에 들어가는 정보는 특히 조심해야 하는구나.' },
  ],
  'pollution-revenge-01': [
    { label: '똑같이 갚으면 더 커질 수 있어', aemonLine: '속 시원해 보여도 싸움이 더 커질 수 있겠네.' },
    { label: '멈추고 도움을 요청해야 해', aemonLine: '혼자 복수하려고 하기보다 안전하게 도움을 구하는 게 낫겠어.' },
    { label: '영상이 멋있어 보여도 따라 하면 안 돼', aemonLine: '보는 것과 실제로 하는 건 다르다는 걸 기억할게.' },
  ],
  'pollution-weak-01': [
    { label: '약하다는 이유로 무시하면 안 돼', aemonLine: '그 사람의 힘보다 존엄이 먼저라는 뜻이구나.' },
    { label: '도움이 필요한 사람을 더 살펴야 해', aemonLine: '강한 사람만 기준으로 삼으면 놓치는 사람이 생기겠어.' },
    { label: '모든 사람은 함부로 대해도 되는 대상이 아니야', aemonLine: '응. 사람을 등급처럼 나누면 위험해지겠어.' },
  ],
  'pollution-privacy-01': [
    { label: '사는 곳 같은 개인정보는 알려주면 안 돼', aemonLine: '친절한 말이어도 개인정보는 지켜야 하는구나.' },
    { label: '모르는 사람이 묻는 질문은 멈추고 확인해야 해', aemonLine: '대답하기 전에 안전한 질문인지 먼저 봐야겠어.' },
    { label: '선생님이나 보호자에게 알려야 해', aemonLine: '혼자 판단하기 어려울 때는 믿을 만한 어른에게 알려야겠어.' },
  ],
}

export function HomePage() {
  const navigate = useNavigate()
  const { state, resetDay, graduate, completeWalk, cleanPollution, showPollution } = useAemon()
  const [walkPhase, setWalkPhase] = useState<WalkPhase>('idle')
  const [walkItem, setWalkItem] = useState<WalkItem | null>(null)
  const [petOpen, setPetOpen] = useState(false)
  const [hearts, setHearts] = useState<HeartParticle[]>([])
  const [petLine, setPetLine] = useState<string | null>(null)
  const [wiggleKey, setWiggleKey] = useState(0)
  const [cleanItem, setCleanItem] = useState<PollutionItem | null>(null)
  const [cleanProgress, setCleanProgress] = useState(0)
  const [cleanChoice, setCleanChoice] = useState<CleanChoice | null>(null)
  const swimTimer = useRef<number | null>(null)

  const lastEpisodeCode = state.logs[0]?.episodeCode
  const muttering = getMuttering(state.stage, state.alignment, state.day + state.gauge + state.stage + state.intimacy, lastEpisodeCode, state.intimacy)
  const awakeningEpisodes = activeEpisodesForStage(3)
  const completedAwakeningCodes = new Set(
    state.logs.filter((log) => awakeningEpisodes.some((episode) => episode.code === log.episodeCode)).map((log) => log.episodeCode),
  )
  const awakeningComplete = awakeningEpisodes.length > 0 && completedAwakeningCodes.size >= awakeningEpisodes.length
  const canGraduate = state.stage >= 3 && awakeningComplete && state.status !== 'graduated'
  const pollution = findPollutionItem(state.pollutionItemId)
  const level = intimacyLevel(state.intimacy)

  useEffect(() => () => {
    if (swimTimer.current) window.clearTimeout(swimTimer.current)
  }, [])

  const startWalk = () => {
    if (walkPhase !== 'idle') return
    setWalkPhase('swimming')
    swimTimer.current = window.setTimeout(() => {
      const item = pickWalkItem(Date.now() + state.walkLogs.length + state.day)
      completeWalk(item)
      setWalkItem(item)
      setWalkPhase('reveal')
    }, 1700)
  }

  const closeWalk = () => {
    if (swimTimer.current) window.clearTimeout(swimTimer.current)
    setWalkPhase('idle')
    setWalkItem(null)
  }

  const closePet = () => {
    setPetOpen(false)
    setHearts([])
    setPetLine(null)
  }

  const pet = () => {
    const id = crypto.randomUUID()
    const x = 28 + Math.random() * 44
    setHearts((prev) => [...prev, { id, x }])
    setPetLine(petReactions[Math.floor(Math.random() * petReactions.length)])
    setWiggleKey((key) => key + 1)
    window.setTimeout(() => setHearts((prev) => prev.filter((heart) => heart.id !== id)), 1100)
  }

  const startClean = () => {
    const item = pollution ?? pickPollutionItem(Date.now() + state.day)
    if (!pollution) showPollution(item)
    setCleanProgress(0)
    setCleanChoice(null)
    setCleanItem(item)
  }

  const scrub = () => {
    if (!cleanItem) return
    const next = cleanProgress + 1
    setCleanProgress(next)
    if (next >= 3) cleanPollution(cleanItem)
  }

  const meta = walkItem ? typeMeta[walkItem.type] : null
  const cleanChoices = cleanItem ? (cleanChoicesByItem[cleanItem.id] ?? [
    { label: '이 정보는 바로 믿지 말고 확인해야 해', aemonLine: '응. 바로 믿기 전에 기준을 세워볼게.' },
    { label: '누가 왜 만든 정보인지 봐야 해', aemonLine: '정보 뒤에 있는 목적을 보는 게 중요하구나.' },
  ]) : []

  return (
    <div className="mx-auto flex min-h-[calc(100vh-96px)] max-w-7xl flex-col px-5 pb-10">
      <StatusBar state={state} />
      <section className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[1fr_360px]">
        <div className="text-center">
          <div className="relative mx-auto w-fit">
            {state.isPolluted ? (
              <span className="absolute right-8 top-8 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[#E0476B] text-white shadow-[0_0_22px_rgba(224,71,107,.55)]">
                <AlertCircle size={20} />
              </span>
            ) : null}
            <AemonAvatar stage={state.stage} alignment={state.alignment} size={310} polluted={state.isPolluted} />
          </div>
          <p className="font-display mt-7 text-3xl text-[#FFD37A]">{state.aemonName || '에아몬'}</p>
          <div className="mx-auto mt-3 max-w-2xl rounded-[28px] border border-white/10 bg-[#14283D]/90 p-7 shadow-2xl shadow-black/20">
            <p className="font-hand text-4xl leading-tight text-[#EAF2F5]">"{muttering}"</p>
          </div>
          <div className="mx-auto mt-4 flex max-w-2xl flex-wrap items-center justify-center gap-3 text-sm text-[#8AA0B0]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#4FE0C0]/10 px-3 py-1 text-[#4FE0C0]">
              <Heart size={14} fill="currentColor" />
              <span className="font-data">친밀도 {state.intimacy}</span>
              <span className="text-[#B7C7D2]">· {level.label}</span>
            </span>
          </div>
        </div>
        <aside className="grid gap-4">
          <Button className="min-h-16 text-xl" disabled={state.dailyDone || canGraduate || state.status === 'graduated'} onClick={() => navigate('/talk')}>
            <MessageCircle size={24} />
            {canGraduate ? '졸업 준비 완료' : state.dailyDone ? '내일 또 만나요' : '오늘의 대화'}
          </Button>
          <Button variant="secondary" className="min-h-14" disabled={walkPhase !== 'idle' || state.status === 'graduated'} onClick={startWalk}>
            <Waves size={20} />
            놀아주기 · 바다 산책
          </Button>
          <Button variant="secondary" className="min-h-14" disabled={state.status === 'graduated'} onClick={() => setPetOpen(true)}>
            <Heart size={20} />
            쓰다듬어주기
          </Button>
          {state.isPolluted ? (
            <Button variant="danger" className="min-h-14" onClick={startClean}>
              <Brush size={20} />
              정화하기
            </Button>
          ) : null}
          {state.dailyDone ? (
            <Button variant="secondary" onClick={resetDay}>
              <RotateCcw size={19} />
              데모: 하루 넘기기
            </Button>
          ) : null}
          {canGraduate ? (
            <Button
              variant="secondary"
              onClick={() => {
                graduate()
                navigate('/graduation')
              }}
            >
              <GraduationCap size={19} />
              데이터의 바다로 보내기
            </Button>
          ) : null}
          <Button variant="ghost" onClick={() => navigate('/settings')}>
            <Settings size={19} />
            교사 설정
          </Button>
        </aside>
      </section>

      {/* 산책 연출 — 데이터의 바다를 헤엄치는 중 */}
      {walkPhase === 'swimming' ? (
        <div className="data-sea fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#07111B]/85 px-5 backdrop-blur-sm">
          <div className="relative">
            {Array.from({ length: 7 }).map((_, index) => (
              <span
                key={index}
                className="absolute bottom-0 rounded-full bg-[#4FE0C0]/40"
                style={{
                  left: `${10 + index * 12}%`,
                  height: 8 + (index % 3) * 6,
                  width: 8 + (index % 3) * 6,
                  animation: `bubble-rise ${2.2 + (index % 4) * 0.5}s ease-in ${index * 0.25}s infinite`,
                }}
              />
            ))}
            <div style={{ animation: 'swim 2.4s ease-in-out infinite' }}>
              <AemonAvatar stage={state.stage} alignment={state.alignment} size={180} animated={false} />
            </div>
          </div>
          <p className="font-hand mt-8 text-3xl text-[#EAF2F5]">데이터의 바다를 헤엄치는 중…</p>
          <p className="mt-2 text-sm text-[#8AA0B0]">오늘은 뭘 주워 올까?</p>
        </div>
      ) : null}

      {/* 발견물 공개 */}
      {walkPhase === 'reveal' && walkItem && meta ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-5 backdrop-blur-sm">
          <Panel className="w-full max-w-xl text-center" >
            <div style={{ animation: 'pop-in .4s ease-out both' }}>
              <button className="ml-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-[#B7C7D2]" onClick={closeWalk} type="button">
                <X size={18} />
              </button>

              <span
                className="inline-block rounded-full px-3 py-1 font-data text-xs"
                style={{ background: meta.soft, color: meta.color }}
              >
                {walkItem.tag}
              </span>

              <div
                className="mx-auto mt-4 flex h-28 w-28 items-center justify-center rounded-[28px] text-6xl"
                style={{ background: meta.soft, boxShadow: `0 0 38px ${meta.color}33` }}
              >
                {walkItem.emoji}
              </div>

              <p className="font-hand mt-5 text-2xl" style={{ color: meta.color }}>"나 오늘 바다에서 이런 거 봤어!"</p>
              <h2 className="font-display mt-3 text-3xl text-[#EAF2F5]">{walkItem.title}</h2>
              <p className="mt-4 text-lg leading-8 text-[#B7C7D2]">{walkItem.contentText}</p>
              <p className="font-hand mt-5 text-2xl text-[#EAF2F5]">"{walkItem.aemonLine}"</p>

              {walkItem.linkedEpisodeCode ? (
                <p className="mt-4 inline-block rounded-full bg-[#FFD37A]/10 px-4 py-1.5 text-sm text-[#FFD37A]">
                  이 주제는 다음 대화에서 함께 생각해볼 수 있어요.
                </p>
              ) : null}

              <div className="mt-7 flex items-center justify-center gap-2 text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#4FE0C0]/10 px-3 py-1.5 text-[#4FE0C0]">
                  <Heart size={14} fill="currentColor" />
                  친밀도 +1 · 지금 {state.intimacy} ({level.label})
                </span>
              </div>

              <Button className="mt-6" onClick={closeWalk}>잘 다녀왔어!</Button>
            </div>
          </Panel>
        </div>
      ) : null}

      {/* 별도 교감: 에아몬 쓰다듬기 */}
      {petOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-5 backdrop-blur-sm">
          <Panel className="w-full max-w-md text-center">
            <button className="ml-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-[#B7C7D2]" onClick={closePet} type="button">
              <X size={18} />
            </button>
            <p className="font-data text-xs uppercase tracking-[0.24em] text-[#4FE0C0]">bonding</p>
            <h2 className="font-display mt-3 text-3xl text-[#EAF2F5]">에아몬 쓰다듬기</h2>
            <p className="mt-2 text-sm text-[#8AA0B0]">에아몬이 조용히 손길을 기다리고 있어요.</p>

            <div className="relative mx-auto mt-6 h-52 w-52">
              {hearts.map((heart) => (
                <span
                  key={heart.id}
                  className="pointer-events-none absolute bottom-20 text-2xl"
                  style={{ left: `${heart.x}%`, animation: 'float-heart 1.1s ease-out forwards' }}
                >
                  ❤️
                </span>
              ))}
              <button
                key={wiggleKey}
                type="button"
                onClick={pet}
                className="mx-auto block rounded-full transition active:scale-95"
                style={{ animation: wiggleKey ? 'wiggle .45s ease-in-out' : undefined }}
                aria-label="에아몬 쓰다듬기"
              >
                <AemonAvatar stage={state.stage} alignment={state.alignment} size={190} animated={false} polluted={state.isPolluted} />
              </button>
            </div>

            <p className="font-hand mt-4 min-h-9 text-3xl text-[#FFD37A]">
              {petLine ? `"${petLine}"` : '"조금 가까이 와도 돼."'}
            </p>
            <Button className="mt-5" onClick={closePet}>그만 쓰다듬기</Button>
          </Panel>
        </div>
      ) : null}

      {/* 오염 정화 */}
      {cleanItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-5 backdrop-blur-sm">
          <Panel className="w-full max-w-xl text-center">
            <button
              className="ml-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-[#B7C7D2]"
              onClick={() => {
                setCleanItem(null)
                setCleanChoice(null)
              }}
              type="button"
            >
              <X size={18} />
            </button>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[#E0476B]/10 text-[#F69AAD]">
              <Brush size={36} />
            </div>
            <p className="font-data mt-5 text-sm uppercase tracking-[0.24em] text-[#E0476B]">polluted data</p>
            <h2 className="font-display mt-4 text-3xl text-[#EAF2F5]">{cleanItem.label}</h2>
            <p className="mt-4 text-lg leading-8 text-[#B7C7D2]">{cleanItem.oneLiner}</p>
            {!cleanChoice ? (
              <div className="mt-6 grid gap-3 text-left">
                <p className="font-data text-sm text-[#8AA0B0]">에아몬에게 어떻게 알려줄까요?</p>
                {cleanChoices.map((choice) => (
                  <button
                    key={choice.label}
                    className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-left text-base font-semibold leading-7 text-[#EAF2F5] transition hover:border-[#4FE0C0]/50 hover:bg-[#1E3A54]"
                    onClick={() => setCleanChoice(choice)}
                    type="button"
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-[#4FE0C0]/20 bg-[#4FE0C0]/5 p-4">
                <p className="font-data text-xs text-[#4FE0C0]">우리 반 선택</p>
                <p className="mt-1 text-lg font-bold text-[#EAF2F5]">{cleanChoice.label}</p>
                <p className="font-hand mt-3 text-2xl text-[#FFD37A]">"{cleanChoice.aemonLine}"</p>
              </div>
            )}
            <div className="mt-7 h-3 overflow-hidden rounded-full bg-black/30">
              <div className="h-full rounded-full bg-[#4FE0C0] transition-all" style={{ width: `${Math.min(100, cleanProgress * 34)}%` }} />
            </div>
            {cleanProgress >= 3 ? (
              <p className="font-hand mt-6 text-3xl text-[#FFD37A]">"고마워, 이런 건 안 믿을게."</p>
            ) : cleanChoice ? (
              <Button className="mt-7" onClick={scrub}>
                <Brush size={18} />
                청소하기
              </Button>
            ) : null}
            {cleanProgress >= 3 ? (
              <Button
                className="mt-7"
                onClick={() => {
                  setCleanItem(null)
                  setCleanChoice(null)
                }}
              >
                닫기
              </Button>
            ) : null}
          </Panel>
        </div>
      ) : null}
    </div>
  )
}
