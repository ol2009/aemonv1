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
  const previousStage = Math.max(0, stage - 1)

  return (
    <Panel className="relative min-h-[690px] overflow-hidden p-0">
      <style>{`
        @keyframes eamon-evolve-old {
          0%, 18% { opacity: 1; transform: scale(1); filter: brightness(0) drop-shadow(0 0 34px rgba(79,224,192,.95)); }
          28%, 42% { opacity: .14; transform: scale(1.09); }
          52%, 66% { opacity: .88; transform: scale(1.03); }
          76%, 100% { opacity: 0; transform: scale(.92); }
        }
        @keyframes eamon-evolve-new {
          0%, 20% { opacity: 0; transform: scale(.82); filter: brightness(0) drop-shadow(0 0 38px rgba(255,211,122,.92)); }
          30%, 44% { opacity: .92; transform: scale(1.08); filter: brightness(0) drop-shadow(0 0 42px rgba(255,211,122,1)); }
          54%, 68% { opacity: .16; transform: scale(.96); filter: brightness(0) drop-shadow(0 0 42px rgba(79,224,192,1)); }
          78%, 88% { opacity: 1; transform: scale(1.16); filter: brightness(4) drop-shadow(0 0 70px rgba(255,255,255,1)); }
          100% { opacity: 1; transform: scale(1); filter: none; }
        }
        @keyframes eamon-evolve-burst {
          0%, 62% { opacity: 0; transform: scale(.35) rotate(0deg); }
          74% { opacity: .95; transform: scale(1.18) rotate(18deg); }
          100% { opacity: 0; transform: scale(1.8) rotate(36deg); }
        }
        @keyframes eamon-evolve-flash {
          0%, 58%, 86%, 100% { opacity: 0; }
          68%, 78% { opacity: .88; }
        }
      `}</style>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(255,211,122,.24),transparent_34%),radial-gradient(circle_at_50%_44%,rgba(79,224,192,.18),transparent_42%),linear-gradient(180deg,#102236,#07111B)]" />
      <div className="pointer-events-none absolute inset-0 bg-white" style={{ animation: 'eamon-evolve-flash 3.2s ease-in-out both' }} />
      <div className="absolute inset-x-6 top-6 rounded-[24px] border border-[#FFD37A]/25 bg-[#07111B]/62 p-5 text-center shadow-2xl backdrop-blur">
        <p className="font-display text-4xl leading-tight text-[#EAF2F5]">응? {name}의 모습이 이상하다...!</p>
        <p className="font-data mt-3 text-lg text-[#FFD37A]">번쩍... 번쩍... 번쩍!</p>
        <p className="mt-3 text-xl font-black text-[#4FE0C0]">{name}의 기준이 빛나며 새로운 모습으로 변하고 있다!</p>
      </div>

      <div className="absolute left-1/2 top-[28%] -translate-x-1/2">
        <div className="relative h-[360px] w-[360px]">
          <div className="absolute inset-[-18%] animate-pulse rounded-full border border-[#FFD37A]/35" />
          <div className="absolute inset-[-32%] animate-ping rounded-full border border-[#4FE0C0]/20" />
          <div className="pointer-events-none absolute inset-[-18%] rounded-full bg-[conic-gradient(from_0deg,transparent,rgba(255,211,122,.72),transparent,rgba(79,224,192,.62),transparent)] blur-md" style={{ animation: 'eamon-evolve-burst 3.2s ease-in-out both' }} />
          <div className="absolute inset-0 flex items-center justify-center" style={{ animation: 'eamon-evolve-old 3.2s ease-in-out both' }}>
            <AemonAvatar stage={previousStage} alignment="none" size={330} />
          </div>
          <div className="absolute inset-0 flex items-center justify-center" style={{ animation: 'eamon-evolve-new 3.2s ease-in-out both' }}>
            <AemonAvatar stage={stage} alignment="none" size={330} />
          </div>
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
