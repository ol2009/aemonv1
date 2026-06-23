import type { Alignment } from '../domain/types'

export function AemonAvatar({
  stage,
  alignment,
  size = 220,
  animated = true,
  polluted = false,
}: {
  stage: number
  alignment: Alignment
  size?: number
  animated?: boolean
  polluted?: boolean
}) {
  const good = alignment !== 'evil'
  const glow = stage === 0 ? '#FFD37A' : good ? '#4FE0C0' : '#E0476B'
  const body =
    stage === 0
      ? ['#FFF6DD', '#FFD37A', '#E0A03A']
      : good
        ? ['#DFFFF7', '#4FE0C0', '#247F72']
        : ['#D8B7FF', '#9B5CFF', '#E0476B']
  const radius = stage === 0 ? '50% 50% 45% 45% / 60% 60% 42% 42%' : good ? '48%' : '42% 42% 52% 52%'

  return (
    <div
      aria-label="에아몬"
      className="relative mx-auto"
      style={{
        width: size,
        height: size,
        animation: animated ? 'breathe 5s ease-in-out infinite' : undefined,
      }}
    >
      <div
        className="absolute inset-[-18%] rounded-full blur-xl"
        style={{ background: `radial-gradient(circle, ${glow}55, transparent 62%)` }}
      />
      {Array.from({ length: Math.max(stage, 1) }).map((_, index) => (
        <span
          key={index}
          className="absolute h-2.5 w-2.5 rounded-full"
          style={{
            left: `${50 + Math.cos((index / Math.max(stage, 1)) * Math.PI * 2) * 54}%`,
            top: `${50 + Math.sin((index / Math.max(stage, 1)) * Math.PI * 2) * 54}%`,
            background: glow,
            boxShadow: `0 0 16px ${glow}`,
          }}
        />
      ))}
      <div
        className="absolute inset-[9%] shadow-2xl"
        style={{
          borderRadius: radius,
          background: `radial-gradient(circle at 35% 24%, ${body[0]}, ${body[1]} 48%, ${body[2]})`,
          boxShadow: `0 0 44px ${glow}55, inset -16px -20px 34px rgba(0,0,0,.26), inset 14px 14px 34px rgba(255,255,255,.36)`,
          animation: stage === 0 && animated ? 'pulse-egg 4s ease-in-out infinite' : undefined,
        }}
      >
        <div className="absolute left-[25%] top-[17%] h-[28%] w-[24%] rounded-full bg-white/55 blur-[1px]" />
        {stage > 0 ? (
          <>
            <div className={`absolute top-[42%] h-[13%] w-[12%] rounded-full bg-[#07111B] ${good ? 'left-[30%]' : 'left-[30%] -skew-x-12'}`} />
            <div className={`absolute top-[42%] h-[13%] w-[12%] rounded-full bg-[#07111B] ${good ? 'right-[30%]' : 'right-[30%] skew-x-12'}`} />
            <div className="absolute left-[34%] top-[45%] h-[4%] w-[4%] rounded-full bg-white" />
            <div className="absolute right-[34%] top-[45%] h-[4%] w-[4%] rounded-full bg-white" />
            <div
              className="absolute left-[42%] top-[63%] w-[16%] bg-[#07111B]/70"
              style={{ height: good ? '8%' : '4%', borderRadius: good ? '0 0 999px 999px' : 2 }}
            />
          </>
        ) : null}
        {polluted ? (
          <>
            <div className="absolute left-[18%] top-[34%] h-[18%] w-[22%] rounded-full bg-[#07111B]/45 blur-[1px]" />
            <div className="absolute right-[18%] top-[58%] h-[15%] w-[18%] rounded-full bg-[#9B5CFF]/45 blur-[1px]" />
            <div className="absolute left-[54%] top-[24%] h-[10%] w-[20%] rotate-12 rounded-full bg-[#E0476B]/35 blur-[1px]" />
          </>
        ) : null}
      </div>
      {polluted ? (
        <div className="pointer-events-none absolute inset-0 rounded-full bg-[repeating-linear-gradient(90deg,transparent_0_8px,rgba(234,242,245,.08)_8px_10px)] opacity-60" />
      ) : null}
    </div>
  )
}
