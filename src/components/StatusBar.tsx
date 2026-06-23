import { clsx } from 'clsx'
import { stageLabel, xpProgress, nextThreshold } from '../domain/progression'
import type { AemonState } from '../domain/types'

export function StatusBar({ state }: { state: AemonState }) {
  const progress = xpProgress(state.stage, state.xp)
  const threshold = nextThreshold(state.stage)
  const gaugeLeft = `${50 + state.gauge / 2}%`
  const gaugeColor = state.gauge > 0 ? '#4FE0C0' : state.gauge < 0 ? '#E0476B' : '#8AA0B0'

  return (
    <div className="grid gap-4 rounded-2xl border border-white/10 bg-[#07111B]/75 p-4 shadow-xl shadow-black/25 backdrop-blur md:grid-cols-[1fr_1.4fr_1fr]">
      <div>
        <p className="font-data text-xs text-[#8AA0B0]">CLASS</p>
        <p className="mt-1 truncate text-lg font-bold text-[#EAF2F5]">{state.className} · {state.day}일째</p>
      </div>
      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="font-data text-xs text-[#8AA0B0]">XP · {stageLabel(state.stage, state.alignment)}</p>
          <p className="font-data text-xs text-[#B7C7D2]">{threshold ? `${state.xp}/${threshold}` : `${state.xp}`}</p>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full border border-white/10 bg-black/35">
          <div className="h-full rounded-full bg-[#FFD37A] shadow-[0_0_16px_rgba(255,211,122,.55)] transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <p className="font-data text-xs text-[#4FE0C0]">선</p>
          <p className="font-data text-xs text-[#8AA0B0]">게이지</p>
          <p className="font-data text-xs text-[#E0476B]">악</p>
        </div>
        <div className="relative mt-3 h-2 rounded-full bg-gradient-to-r from-[#4FE0C0] via-[#8AA0B0] to-[#E0476B]">
          <span
            className={clsx('absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#07111B] shadow-lg')}
            style={{ left: gaugeLeft, background: gaugeColor }}
          />
        </div>
      </div>
    </div>
  )
}
