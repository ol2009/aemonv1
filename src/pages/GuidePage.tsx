import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Database, Pencil, RefreshCcw, Save } from 'lucide-react'
import { Button, PageHeader, Panel } from '../components/ui'
import { findLessonMaterial } from '../data/lessonMaterials'
import { lessonPlans } from '../data/lessonPlans'
import type { LessonPhase, LessonPlan } from '../data/lessonPlans'
import {
  editablePayloadFromPlan,
  fetchLessonContents,
  mergeLessonContent,
  saveLessonContent,
  seedLessonContents,
  type LessonContentPayload,
} from '../lib/lessonContent'
import { isSupabaseConfigured } from '../lib/supabase'
import { signOut, useSupabaseUser } from '../lib/useSupabaseUser'

function listToLines(items: string[]) {
  return items.join('\n')
}

function linesToList(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function LessonContentEditor({
  draft,
  disabled,
  onChange,
  onSave,
}: {
  draft: LessonContentPayload
  disabled: boolean
  onChange: (next: LessonContentPayload) => void
  onSave: () => void
}) {
  const updatePhase = (index: number, next: LessonPhase) => {
    onChange({ ...draft, phases: draft.phases.map((phase, phaseIndex) => (phaseIndex === index ? next : phase)) })
  }

  return (
    <div className="rounded-2xl border border-[#FFD37A]/25 bg-[#07111B]/70 p-4">
      <label>
        <span className="text-xs font-bold text-[#8AA0B0]">차시 제목</span>
        <input
          className="mt-1 w-full rounded-xl border border-white/10 bg-[#07111B] px-3 py-2 text-[#EAF2F5]"
          value={draft.title}
          onChange={(event) => onChange({ ...draft, title: event.target.value })}
        />
      </label>

      <label className="mt-3 block">
        <span className="text-xs font-bold text-[#8AA0B0]">학습목표</span>
        <textarea
          className="mt-1 min-h-20 w-full rounded-xl border border-white/10 bg-[#07111B] px-3 py-2 text-sm leading-6 text-[#EAF2F5]"
          value={draft.objective}
          onChange={(event) => onChange({ ...draft, objective: event.target.value })}
        />
      </label>

      <label className="mt-3 block">
        <span className="text-xs font-bold text-[#8AA0B0]">성취기준 · 한 줄에 하나씩</span>
        <textarea
          className="mt-1 min-h-24 w-full rounded-xl border border-white/10 bg-[#07111B] px-3 py-2 text-sm leading-6 text-[#EAF2F5]"
          value={listToLines(draft.standards)}
          onChange={(event) => onChange({ ...draft, standards: linesToList(event.target.value) })}
        />
      </label>

      <label className="mt-3 block">
        <span className="text-xs font-bold text-[#8AA0B0]">비고</span>
        <input
          className="mt-1 w-full rounded-xl border border-white/10 bg-[#07111B] px-3 py-2 text-[#EAF2F5]"
          value={draft.note ?? ''}
          onChange={(event) => onChange({ ...draft, note: event.target.value || undefined })}
        />
      </label>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <h5 className="font-display text-lg text-[#EAF2F5]">45분 과정안</h5>
          <Button
            type="button"
            variant="secondary"
            className="min-h-9 rounded-xl px-3 py-2 text-sm"
            onClick={() => onChange({ ...draft, phases: [...draft.phases, { phase: '새 단계', minutes: 5, body: ['활동 내용'] }] })}
          >
            추가
          </Button>
        </div>
        <div className="mt-3 grid gap-3">
          {draft.phases.map((phase, index) => (
            <div key={index} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="grid gap-2 md:grid-cols-[1fr_100px]">
                <input
                  className="rounded-lg border border-white/10 bg-[#07111B] px-3 py-2 text-sm text-[#EAF2F5]"
                  value={phase.phase}
                  onChange={(event) => updatePhase(index, { ...phase, phase: event.target.value })}
                />
                <input
                  className="rounded-lg border border-white/10 bg-[#07111B] px-3 py-2 text-sm text-[#EAF2F5]"
                  min={1}
                  type="number"
                  value={phase.minutes}
                  onChange={(event) => updatePhase(index, { ...phase, minutes: Number(event.target.value) || 1 })}
                />
              </div>
              <textarea
                className="mt-2 min-h-24 w-full rounded-lg border border-white/10 bg-[#07111B] px-3 py-2 text-sm leading-6 text-[#EAF2F5]"
                value={listToLines(phase.body)}
                onChange={(event) => updatePhase(index, { ...phase, body: linesToList(event.target.value) })}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <Button type="button" disabled={disabled} onClick={onSave}>
          <Save size={18} />
          Supabase 저장
        </Button>
      </div>
    </div>
  )
}

export function GuidePage() {
  const navigate = useNavigate()
  const [remoteLessons, setRemoteLessons] = useState<Record<string, LessonContentPayload>>({})
  const [drafts, setDrafts] = useState<Record<string, LessonContentPayload>>({})
  const [editingCode, setEditingCode] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const { user, isLoading: isAuthLoading } = useSupabaseUser()

  const plans = useMemo(() => mergeLessonContent(lessonPlans, remoteLessons), [remoteLessons])
  const canEdit = isSupabaseConfigured && Boolean(user)

  useEffect(() => {
    if (!isSupabaseConfigured) return

    fetchLessonContents()
      .then((contents) => {
        setRemoteLessons(contents)
        setStatusMessage(Object.keys(contents).length > 0 ? 'Supabase에서 수정된 차시를 불러왔습니다.' : 'Supabase에 저장된 차시가 아직 없습니다.')
      })
      .catch((error: Error) => setStatusMessage(`차시 불러오기 실패: ${error.message}`))
  }, [])

  const startEdit = (plan: LessonPlan) => {
    setEditingCode((current) => (current === plan.episodeCode ? null : plan.episodeCode))
    setDrafts((current) => ({
      ...current,
      [plan.episodeCode]: current[plan.episodeCode] ?? editablePayloadFromPlan(plan),
    }))
  }

  const updateDraft = (episodeCode: string, next: LessonContentPayload) => {
    setDrafts((current) => ({ ...current, [episodeCode]: next }))
  }

  const saveDraft = async (episodeCode: string) => {
    const draft = drafts[episodeCode]
    if (!draft) return
    setIsSaving(true)
    try {
      await saveLessonContent(episodeCode, draft)
      setRemoteLessons((current) => ({ ...current, [episodeCode]: draft }))
      setStatusMessage(`${episodeCode} 차시를 Supabase에 저장했습니다.`)
    } catch (error) {
      setStatusMessage(`저장 실패: ${(error as Error).message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const seedAll = async () => {
    setIsSaving(true)
    try {
      await seedLessonContents(lessonPlans)
      const contents = await fetchLessonContents()
      setRemoteLessons(contents)
      setStatusMessage('현재 코드 기준 차시 전체를 Supabase에 생성했습니다.')
    } catch (error) {
      setStatusMessage(`초기 생성 실패: ${(error as Error).message}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-5 pb-20">
      <PageHeader title="에아몬 교사 사전연수" eyebrow="teacher guide">
        수업 전에 45분 수업 과정안을 확인하고 필요한 차시 내용을 수정하는 페이지입니다.
      </PageHeader>

      <Panel className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Database className="text-[#FFD37A]" />
              <h2 className="text-xl font-bold text-[#EAF2F5]">Supabase 차시 편집</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#8AA0B0]">
              새 Supabase 프로젝트를 만들고 `supabase/schema.sql`을 실행한 뒤, Vercel 환경변수에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 넣으면 여기서 차시를 수정할 수 있습니다.
            </p>
            <p className="mt-1 text-sm text-[#FFD37A]">
              현재 상태:{' '}
              {!isSupabaseConfigured
                ? 'Supabase 환경변수 없음 · 기본 차시만 표시'
                : user
                  ? `로그인됨 · ${user.email}`
                  : 'Supabase 연결됨 · 저장하려면 Google 로그인 필요'}
            </p>
            {statusMessage ? <p className="mt-2 text-sm text-[#B7C7D2]">{statusMessage}</p> : null}
          </div>
          <div className="flex flex-wrap gap-3">
            {user ? (
              <Button type="button" variant="ghost" onClick={() => void signOut()}>
                로그아웃
              </Button>
            ) : (
              <Button type="button" variant="secondary" disabled={!isSupabaseConfigured || isAuthLoading} onClick={() => navigate('/login')}>
                Google 로그인
              </Button>
            )}
            <Button type="button" variant="secondary" disabled={!canEdit || isSaving} onClick={seedAll}>
              <RefreshCcw size={18} />
              차시 전체 생성
            </Button>
          </div>
        </div>
      </Panel>

      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-data text-sm uppercase tracking-wider text-[#FFD37A]">45-minute lessons</p>
            <h2 className="font-display mt-2 text-3xl text-[#EAF2F5]">45분 수업 과정안 {plans.length}개</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-[#8AA0B0]">
            공식 9차시를 순서대로 운영합니다. 매 차시는 도입, 사람 딜레마, AI 전환, 가치 코드, 친밀도 흐름으로 구성했습니다.
          </p>
        </div>

        <div className="mt-6 grid gap-3">
          {plans.map((plan) => (
            <details
              key={plan.no}
              className="group rounded-[22px] border border-white/10 bg-[#1E3A54]/40 p-5 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4">
                <div>
                  <p className="font-data text-xs text-[#8AA0B0]">
                    수업 {plan.no} · {plan.episodeCode}
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-[#EAF2F5]">{plan.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-sm font-bold text-[#B7C7D2] hover:border-[#FFD37A]/50"
                    onClick={(event) => {
                      event.preventDefault()
                      startEdit(plan)
                    }}
                    type="button"
                  >
                    <Pencil size={16} />
                    수정
                  </button>
                  <ChevronRight className="shrink-0 text-[#FFD37A] transition-transform group-open:rotate-90" />
                </div>
              </summary>

              <div className="mt-5 space-y-4 border-t border-white/10 pt-5">
                {(() => {
                  const material = findLessonMaterial(plan.episodeCode)
                  if (!material) return null
                  return (
                    <div className="grid gap-4 rounded-2xl border border-white/10 bg-[#07111B]/40 p-4 md:grid-cols-[150px_1fr]">
                      <img className="aspect-square w-full rounded-2xl object-cover" src={material.imageUrl} alt={`${plan.title} 차시 이미지`} />
                      <div>
                        <p className="font-data text-xs uppercase tracking-wider text-[#FFD37A]">lesson card assets</p>
                        <h4 className="font-display mt-1 text-xl text-[#EAF2F5]">{material.activityTitle}</h4>
                        <p className="mt-2 text-sm leading-6 text-[#8AA0B0]">{material.activityDescription}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <a className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#FFD37A] px-4 text-sm font-bold text-[#0A1622]" download href={material.cardsPdfUrl}>
                            카드 PDF
                          </a>
                          <a className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/10 px-4 text-sm font-bold text-[#B7C7D2]" href={material.cardsHtmlUrl} target="_blank" rel="noreferrer">
                            인쇄 화면
                          </a>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {editingCode === plan.episodeCode && drafts[plan.episodeCode] ? (
                  <LessonContentEditor
                    disabled={!canEdit || isSaving}
                    draft={drafts[plan.episodeCode]}
                    onChange={(next) => updateDraft(plan.episodeCode, next)}
                    onSave={() => void saveDraft(plan.episodeCode)}
                  />
                ) : null}

                <div className="grid gap-2 text-sm leading-6">
                  <p className="text-[#B7C7D2]">
                    <span className="text-[#8AA0B0]">학습목표 </span>
                    {plan.objective}
                  </p>
                  {plan.standards.length > 0 ? (
                    <details className="rounded-xl border border-white/5 bg-[#07111B]/40 px-3 py-2 [&_summary::-webkit-details-marker]:hidden">
                      <summary className="cursor-pointer select-none text-[#8AA0B0]">
                        관련 성취기준 · 펼치기
                      </summary>
                      <ul className="mt-2 space-y-1">
                        {plan.standards.map((standard, standardIndex) => (
                          <li key={standardIndex} className="flex gap-2 text-[#B7C7D2]">
                            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#4FE0C0]" />
                            <span>{standard}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                  {plan.note ? (
                    <p className="text-[#FFD37A]">
                      <span className="text-[#8AA0B0]">비고 </span>
                      {plan.note}
                    </p>
                  ) : null}
                </div>

                <ol className="space-y-3">
                  {plan.phases.map((phase, index) => (
                    <li key={phase.phase} className="rounded-2xl border border-white/5 bg-[#07111B]/40 p-4">
                      <p className="font-display text-lg text-[#EAF2F5]">
                        <span className="text-[#FFD37A]">{index + 1}.</span> {phase.phase}
                        <span className="ml-2 font-data text-xs text-[#8AA0B0]">{phase.minutes}분</span>
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {phase.body.map((line, lineIndex) => (
                          <li key={lineIndex} className="flex gap-2 text-sm leading-6 text-[#B7C7D2]">
                            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#4FE0C0]" />
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
              </div>
            </details>
          ))}
        </div>

      </section>

      <div className="mt-8 text-center">
        <Button onClick={() => navigate('/start')}>우리 반 에아몬 시작하기</Button>
      </div>
    </div>
  )
}
