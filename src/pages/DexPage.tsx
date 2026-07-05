import { MessageSquare, Sparkles, Waves } from 'lucide-react'
import { AemonAvatar } from '../components/AemonAvatar'
import { Button, Panel } from '../components/ui'
import { walkItems } from '../data/walkItems'
import { useV2 } from '../state/V2Store'
import { useNavigate } from 'react-router-dom'

function pickSeaItems(seedText: string) {
  const seed = Array.from(seedText).reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return [0, 7, 13].map((offset) => walkItems[(seed + offset) % walkItems.length])
}

export function DexPage() {
  const navigate = useNavigate()
  const { state, evolutionStage, currentReaction, adoptedCodeCount } = useV2()
  const items = pickSeaItems(`${state.classCode}-${new Date().toISOString().slice(0, 10)}`)

  return (
    <div className="mx-auto max-w-7xl px-5 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-data text-sm text-[#4FE0C0]">DATA SEA</p>
          <h1 className="font-display mt-2 text-5xl text-[#EAF2F5]">데이터의 바다</h1>
          <p className="mt-3 leading-7 text-[#B7C7D2]">에아몬이 수업 뒤 머무는 공간입니다. 대화와 가치코드가 여기에서 상태로 모입니다.</p>
        </div>
        <Button onClick={() => navigate('/talk')}>
          <MessageSquare size={18} />
          대화하기
        </Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <Panel>
          <div className="text-center">
            <AemonAvatar stage={evolutionStage} alignment="none" size={260} />
            <h2 className="font-display mt-4 text-4xl text-[#EAF2F5]">{state.aemonName || '이름 없는 에아몬'}</h2>
            <p className="mt-2 text-[#8AA0B0]">{state.className || '학급'} · 가치 코드 {adoptedCodeCount}개</p>
          </div>
          <div className="mt-6 rounded-[22px] border border-[#4FE0C0]/20 bg-[#4FE0C0]/5 p-5">
            <p className="font-data text-xs text-[#4FE0C0]">현재 혼잣말</p>
            <p className="font-display mt-3 text-3xl leading-tight text-[#FFD37A]">"{currentReaction}"</p>
          </div>
        </Panel>

        <div className="grid gap-5">
          <Panel>
            <div className="flex items-center gap-3">
              <Waves className="text-[#4FE0C0]" size={25} />
              <h2 className="font-display text-3xl text-[#EAF2F5]">오늘의 바다 조각</h2>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {items.map((item) => (
                <article key={item.id} className="rounded-[22px] border border-white/10 bg-[#07111B]/55 p-4">
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
                  <p className="text-sm font-bold text-[#4FE0C0]">{log.mode === 'canned' ? '연기 모드' : '진짜 모드'}</p>
                  <p className="mt-2 leading-7 text-[#EAF2F5]">Q. {log.question}</p>
                  <p className="mt-2 text-sm leading-6 text-[#B7C7D2]">A. {log.answer}</p>
                </article>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
