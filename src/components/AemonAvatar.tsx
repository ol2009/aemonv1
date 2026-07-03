import type { Alignment } from '../domain/types'

function avatarSource(stage: number, alignment: Alignment) {
  if (stage === 0) return '/aemon/aemon-egg.png'
  if (alignment === 'evil') return '/aemon/aemon-unstable.png'
  if (stage === 1) return '/aemon/aemon-unstable.png'
  if (stage === 2) return '/aemon/aemon-basic.png'
  if (stage >= 3 || alignment === 'good') return '/aemon/aemon-good.png'
  return '/aemon/aemon-basic.png'
}

function glowColor(stage: number, alignment: Alignment) {
  if (stage === 0) return '#FFD37A'
  if (alignment === 'evil') return '#E0476B'
  if (stage === 1) return '#9B7CFF'
  if (stage >= 3 || alignment === 'good') return '#FFD37A'
  return '#4FE0C0'
}

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
  const src = avatarSource(stage, alignment)
  const glow = glowColor(stage, alignment)

  return (
    <div
      aria-label="에아몬"
      className="relative mx-auto overflow-visible"
      style={{
        width: size,
        height: size,
        animation: animated ? 'breathe 5s ease-in-out infinite' : undefined,
      }}
    >
      <div
        className="absolute inset-[-13%] rounded-full blur-2xl"
        style={{ background: `radial-gradient(circle, ${glow}4d, transparent 66%)` }}
      />
      <img
        alt=""
        className="relative h-full w-full rounded-[28%] object-cover shadow-2xl"
        draggable={false}
        src={src}
        style={{
          boxShadow: `0 0 44px ${glow}40`,
        }}
      />
      {polluted ? (
        <>
          <div className="absolute inset-[8%] rounded-[28%] bg-[repeating-linear-gradient(90deg,transparent_0_8px,rgba(234,242,245,.10)_8px_10px)] opacity-70" />
          <div className="absolute left-[20%] top-[34%] h-[18%] w-[22%] rounded-full bg-[#07111B]/45 blur-[1px]" />
          <div className="absolute right-[18%] top-[58%] h-[15%] w-[18%] rounded-full bg-[#9B5CFF]/45 blur-[1px]" />
          <div className="absolute left-[54%] top-[24%] h-[10%] w-[20%] rotate-12 rounded-full bg-[#E0476B]/35 blur-[1px]" />
        </>
      ) : null}
    </div>
  )
}
