import type { Alignment, Verdict } from './types'

export const XP_THRESHOLDS = [30, 60, 80]
export const XP_PER_EPISODE = 10
export const GAUGE_DELTA = 15

export function nextThreshold(stage: number) {
  return XP_THRESHOLDS[stage] ?? null
}

export function stageStartXp(stage: number) {
  return [0, 30, 60, 80][stage] ?? 80
}

export function xpProgress(stage: number, xp: number) {
  const threshold = nextThreshold(stage)
  if (threshold == null) return 100
  const start = stageStartXp(stage)
  return Math.max(0, Math.min(100, Math.round(((xp - start) / (threshold - start)) * 100)))
}

export function verdictGaugeDelta(verdict: Verdict) {
  if (verdict === 'good') return GAUGE_DELTA
  if (verdict === 'evil') return -GAUGE_DELTA
  return 0
}

export function alignmentFromGauge(gauge: number): Alignment {
  if (gauge > 0) return 'good'
  if (gauge < 0) return 'evil'
  return 'good'
}

export function clampGauge(value: number) {
  return Math.max(-100, Math.min(100, value))
}

export function stageLabel(stage: number, alignment: Alignment) {
  if (stage === 0) return '그림자'
  if (stage === 1) return '윤곽'
  if (stage === 2) return '개화'
  return alignment === 'evil' ? '각성 · 불안정' : '각성'
}

export function verdictLabel(verdict: Verdict) {
  if (verdict === 'good') return '좋은 방향'
  if (verdict === 'evil') return '위험한 방향'
  if (verdict === 'gray') return '영향 없음'
  return '없음'
}

export interface IntimacyLevel {
  tier: number
  label: string
  next: number | null
}

const INTIMACY_TIERS: { min: number; label: string }[] = [
  { min: 0, label: '아직 서먹' },
  { min: 1, label: '알아가는 중' },
  { min: 3, label: '친해지는 중' },
  { min: 7, label: '친한 친구' },
  { min: 12, label: '단짝' },
]

export function intimacyLevel(intimacy: number): IntimacyLevel {
  let tier = 0
  for (let i = 0; i < INTIMACY_TIERS.length; i += 1) {
    if (intimacy >= INTIMACY_TIERS[i].min) tier = i
  }
  const next = INTIMACY_TIERS[tier + 1]?.min ?? null
  return { tier, label: INTIMACY_TIERS[tier].label, next }
}
