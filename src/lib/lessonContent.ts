import { isSupabaseConfigured, supabase } from './supabase'
import type { LessonPhase, LessonPlan, LessonSlide } from '../data/lessonPlans'

export interface LessonContentPayload {
  title: string
  grade: string
  standards: string[]
  objective: string
  note?: string
  phases: LessonPhase[]
  slides: LessonSlide[]
}

interface LessonContentRow {
  episode_code: string
  title: string
  grade: string
  standards_json: string[]
  objective: string
  note: string | null
  phases_json: LessonPhase[]
  slides_json: LessonSlide[]
  updated_at?: string
}

function rowToPayload(row: LessonContentRow): LessonContentPayload {
  return {
    title: row.title,
    grade: row.grade,
    standards: Array.isArray(row.standards_json) ? row.standards_json : [],
    objective: row.objective,
    note: row.note ?? undefined,
    phases: Array.isArray(row.phases_json) ? row.phases_json : [],
    slides: Array.isArray(row.slides_json) ? row.slides_json : [],
  }
}

function planToPayload(plan: LessonPlan): LessonContentPayload {
  return {
    title: plan.title,
    grade: plan.grade,
    standards: plan.standards,
    objective: plan.objective,
    note: plan.note,
    phases: plan.phases,
    slides: plan.slides,
  }
}

export function mergeLessonContent(basePlans: LessonPlan[], overrides: Record<string, LessonContentPayload>) {
  return basePlans.map((plan) => {
    const override = overrides[plan.episodeCode]
    if (!override) return plan

    return {
      ...plan,
      title: override.title,
      grade: override.grade,
      standards: override.standards,
      objective: override.objective,
      note: override.note,
      phases: override.phases,
      slides: override.slides,
    }
  })
}

export async function fetchLessonContents() {
  if (!isSupabaseConfigured || !supabase) return {}

  const { data, error } = await supabase
    .from('lesson_contents')
    .select('episode_code,title,grade,standards_json,objective,note,phases_json,slides_json,updated_at')

  if (error) throw error

  return Object.fromEntries((data as LessonContentRow[]).map((row) => [row.episode_code, rowToPayload(row)]))
}

export async function saveLessonContent(episodeCode: string, payload: LessonContentPayload) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase 환경변수가 설정되어 있지 않습니다.')
  }

  const { error } = await supabase.from('lesson_contents').upsert({
    episode_code: episodeCode,
    title: payload.title,
    grade: payload.grade,
    standards_json: payload.standards,
    objective: payload.objective,
    note: payload.note ?? null,
    phases_json: payload.phases,
    slides_json: payload.slides,
    updated_at: new Date().toISOString(),
  })

  if (error) throw error
}

export async function seedLessonContents(plans: LessonPlan[]) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase 환경변수가 설정되어 있지 않습니다.')
  }

  const rows = plans.map((plan) => {
    const payload = planToPayload(plan)
    return {
      episode_code: plan.episodeCode,
      title: payload.title,
      grade: payload.grade,
      standards_json: payload.standards,
      objective: payload.objective,
      note: payload.note ?? null,
      phases_json: payload.phases,
      slides_json: payload.slides,
      updated_at: new Date().toISOString(),
    }
  })

  const { error } = await supabase.from('lesson_contents').upsert(rows)
  if (error) throw error
}

export function editablePayloadFromPlan(plan: LessonPlan): LessonContentPayload {
  return planToPayload(plan)
}
