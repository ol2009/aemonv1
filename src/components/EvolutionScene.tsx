import { Sparkles } from 'lucide-react'
import { evolutionLines } from '../data/v2Lessons'
import { AemonAvatar } from './AemonAvatar'
import { Panel } from './ui'

function evolutionLineForStage(stage: number) {
  return evolutionLines[Math.max(0, Math.min(stage - 1, evolutionLines.length - 1))]
}

export function EvolutionScene({
  name,
  stage,
  line = evolutionLineForStage(stage),
}: {
  name: string
  stage: number
  line?: string
}) {
  return (
    <Panel className="relative min-h-[690px] overflow-hidden p-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(255,211,122,.24),transparent_34%),radial-gradient(circle_at_50%_44%,rgba(79,224,192,.18),transparent_42%),linear-gradient(180deg,#102236,#07111B)]" />
      <div className="absolute inset-x-6 top-6 rounded-[24px] border border-[#FFD37A]/25 bg-[#07111B]/62 p-5 text-center shadow-2xl backdrop-blur">
        <p className="font-display text-4xl leading-tight text-[#EAF2F5]">응? {name}의 모습이 이상하다...!</p>
        <p className="font-data mt-3 text-lg text-[#FFD37A]">띠용띠용 띠용띠용</p>
        <p className="mt-3 text-xl font-black text-[#4FE0C0]">{name}는 정보를 흡수하여 진화하였다!</p>
      </div>

      <div className="absolute left-1/2 top-[28%] -translate-x-1/2">
        <div className="relative">
          <div className="absolute inset-[-18%] animate-pulse rounded-full border border-[#FFD37A]/35" />
          <div className="absolute inset-[-32%] animate-ping rounded-full border border-[#4FE0C0]/20" />
          <AemonAvatar stage={stage} alignment="none" size={330} />
        </div>
      </div>

      <div className="absolute inset-x-5 bottom-5 rounded-[22px] border border-white/15 bg-[#07111B]/90 p-6 shadow-2xl backdrop-blur">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-[#FFD37A]" />
          <p className="font-data text-sm text-[#4FE0C0]">{name}</p>
        </div>
        <p className="font-display mt-3 text-4xl leading-tight text-[#EAF2F5]">"{line}"</p>
      </div>
    </Panel>
  )
}
