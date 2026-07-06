import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, Play, Sparkles, Waves, X } from 'lucide-react'
import { AemonAvatar } from '../components/AemonAvatar'
import { Button, Panel } from '../components/ui'
import { pickWalkItem, walkItems } from '../data/walkItems'
import type { WalkItem, WalkItemType } from '../domain/types'
import { useV2 } from '../state/V2Store'

type WalkPhase = 'idle' | 'swimming' | 'reveal'

const typeMeta: Record<WalkItemType, { color: string; soft: string }> = {
  good: { color: '#4FE0C0', soft: 'rgba(79,224,192,.12)' },
  weird: { color: '#E0476B', soft: 'rgba(224,71,107,.12)' },
  plain: { color: '#FFD37A', soft: 'rgba(255,211,122,.12)' },
}

function pickSeaItems(seedText: string) {
  const seed = Array.from(seedText).reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return [0, 7, 13].map((offset) => walkItems[(seed + offset) % walkItems.length])
}

export function DexPage() {
  const navigate = useNavigate()
  const { state, evolutionStage, currentReaction, adoptedCodeCount } = useV2()
  const [walkPhase, setWalkPhase] = useState<WalkPhase>('idle')
  const [walkItem, setWalkItem] = useState<WalkItem | null>(null)
  const swimTimer = useRef<number | null>(null)
  const items = pickSeaItems(`${state.classCode}-${new Date().toISOString().slice(0, 10)}`)
  const meta = walkItem ? typeMeta[walkItem.type] : null

  useEffect(
    () => () => {
      if (swimTimer.current) window.clearTimeout(swimTimer.current)
    },
    [],
  )

  const startWalk = () => {
    if (walkPhase !== 'idle') return
    setWalkPhase('swimming')
    swimTimer.current = window.setTimeout(() => {
      const seed = Date.now() + state.chatLogs.length + state.adoptedCodes.length + Number(state.classCode || 0)
      setWalkItem(pickWalkItem(seed))
      setWalkPhase('reveal')
    }, 1700)
  }

  const closeWalk = () => {
    if (swimTimer.current) window.clearTimeout(swimTimer.current)
    setWalkPhase('idle')
    setWalkItem(null)
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-data text-sm text-[#4FE0C0]">DATA SEA</p>
          <h1 className="font-display mt-2 text-5xl text-[#EAF2F5]">데이터의 바다</h1>
          <p className="mt-3 leading-7 text-[#B7C7D2]">에아몬이 수업 밖 데이터 조각을 주워 오는 공간입니다.</p>
        </div>
        <Button onClick={() => navigate('/home')}>
          <Home size={18} />
          대시보드
        </Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
        <Panel>
          <div className="text-center">
            <AemonAvatar stage={evolutionStage} alignment="none" size={260} />
            <h2 className="font-display mt-4 text-4xl text-[#EAF2F5]">{state.aemonName || '이름 없는 에아몬'}</h2>
            <p className="mt-2 text-[#8AA0B0]">{state.className || '학급'} · 가치코드 {adoptedCodeCount}개</p>
          </div>
          <div className="mt-6 rounded-[22px] border border-[#4FE0C0]/20 bg-[#4FE0C0]/5 p-5">
            <p className="font-data text-xs text-[#4FE0C0]">현재 혼잣말</p>
            <p className="font-display mt-3 text-3xl leading-tight text-[#FFD37A]">"{currentReaction}"</p>
          </div>
          <Button className="mt-6 w-full min-h-14 text-lg" disabled={walkPhase !== 'idle'} onClick={startWalk}>
            <Play size={20} />
            산책 시작
          </Button>
        </Panel>

        <div className="grid gap-5">
          <Panel>
            <div className="flex items-center gap-3">
              <Waves className="text-[#4FE0C0]" size={25} />
              <h2 className="font-display text-3xl text-[#EAF2F5]">오늘의 바다 조각</h2>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {items.map((item) => (
                <article key={item.id} className="rounded-[18px] border border-white/10 bg-[#07111B]/55 p-4">
                  <p className="text-3xl">{item.emoji}</p>
                  <p className="mt-3 text-xs font-bold text-[#FFD37A]">{item.tag}</p>
                  <h3 className="mt-1 text-xl font-black leading-7 text-[#EAF2F5]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#8AA0B0]">{item.contentText}</p>
                </article>
              ))}
            </div>
          </Panel>

          <Panel>
            <div className="flex items-center gap-3">
              <Sparkles className="text-[#FFD37A]" size={24} />
              <h2 className="font-display text-3xl text-[#EAF2F5]">최근 대화</h2>
            </div>
            <div className="mt-4 grid max-h-72 gap-3 overflow-auto pr-1">
              {state.chatLogs.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0]">아직 대화 기록이 없습니다.</p> : null}
              {state.chatLogs.slice(0, 4).map((log) => (
                <article key={log.id} className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
                  <p className="text-sm font-bold text-[#4FE0C0]">{log.mode === 'canned' ? '연기 모드' : '실제 API'}</p>
                  <p className="mt-2 leading-7 text-[#EAF2F5]">Q. {log.question}</p>
                  <p className="mt-2 text-sm leading-6 text-[#B7C7D2]">A. {log.answer}</p>
                </article>
              ))}
            </div>
          </Panel>
        </div>
      </div>

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
              <AemonAvatar stage={evolutionStage} alignment="none" size={180} animated={false} />
            </div>
          </div>
          <p className="font-hand mt-8 text-3xl text-[#EAF2F5]">데이터의 바다를 헤엄치는 중…</p>
          <p className="mt-2 text-sm text-[#8AA0B0]">오늘은 뭘 주워 올까?</p>
        </div>
      ) : null}

      {walkPhase === 'reveal' && walkItem && meta ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-5 backdrop-blur-sm">
          <Panel className="w-full max-w-xl text-center">
            <button className="ml-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-[#B7C7D2]" onClick={closeWalk} type="button">
              <X size={18} />
            </button>

            <span className="inline-block rounded-full px-3 py-1 font-data text-xs" style={{ background: meta.soft, color: meta.color }}>
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

            <Button className="mt-6" onClick={closeWalk}>
              잘 다녀왔어!
            </Button>
          </Panel>
        </div>
      ) : null}
    </div>
  )
}
