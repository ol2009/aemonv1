import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Database, Pencil, PlayCircle, Presentation, RefreshCcw, Save } from 'lucide-react'
import { Button, PageHeader, Panel } from '../components/ui'
import { archivedEpisodes } from '../data/episodes'
import { lessonDesignNotes, lessonPlans } from '../data/lessonPlans'
import type { LessonPhase, LessonPlan, LessonSlide } from '../data/lessonPlans'
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

const guideItems = [
  ['수업 목표 · 가치정렬', 'AI의 "능력"이 아니라 "의도"를 사람이 원하는 방향에 맞추는 일을 가르칩니다. 핵심 감각은 "내가 시킨 것 ≠ 내가 원한 것"입니다.'],
  ['핵심 원리 · 느끼게 하기', '답을 주입하는 토론이 아니라, 시켜보고 빗나가는 경험으로 "정렬은 생각보다 어렵다"를 직접 느끼게 합니다.'],
  ['AI를 대하는 태도', '두려운 적이 아니라 강력한 존재로. 불·원자력처럼 존중하되 휘둘리지 않게 — 위험은 AI가 악해서가 아니라 우리가 허술하게 시켜서 생깁니다.'],
  ['교사의 역할', '정답을 대신 말하지 않습니다. 학생 발언을 묶고 기준·근거를 다시 묻는 "전달자"이며, 의견이 갈리면 갈린 대로 에아몬에게 전합니다.'],
  ['질문 구조', '알 3개, 유아기 3개, 개화기 3개, 각성기 5개로 총 14개 공개 카드를 운영합니다.'],
  ['각성기 운영', 'AI가 사회를 바꾸는 큰 질문을 다루고, 5문항을 모두 마친 뒤 졸업으로 연결합니다.'],
  ['비공개 카드', `기존 카드 ${archivedEpisodes.length}개는 보충 사례로 보관되어 학생 진행에는 노출되지 않습니다.`],
]

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
  const updateSlide = (index: number, next: LessonSlide) => {
    onChange({ ...draft, slides: draft.slides.map((slide, slideIndex) => (slideIndex === index ? next : slide)) })
  }

  const updatePhase = (index: number, next: LessonPhase) => {
    onChange({ ...draft, phases: draft.phases.map((phase, phaseIndex) => (phaseIndex === index ? next : phase)) })
  }

  return (
    <div className="rounded-2xl border border-[#FFD37A]/25 bg-[#07111B]/70 p-4">
      <div className="grid gap-3 md:grid-cols-[1fr_160px]">
        <label>
          <span className="text-xs font-bold text-[#8AA0B0]">차시 제목</span>
          <input
            className="mt-1 w-full rounded-xl border border-white/10 bg-[#07111B] px-3 py-2 text-[#EAF2F5]"
            value={draft.title}
            onChange={(event) => onChange({ ...draft, title: event.target.value })}
          />
        </label>
        <label>
          <span className="text-xs font-bold text-[#8AA0B0]">학년</span>
          <input
            className="mt-1 w-full rounded-xl border border-white/10 bg-[#07111B] px-3 py-2 text-[#EAF2F5]"
            value={draft.grade}
            onChange={(event) => onChange({ ...draft, grade: event.target.value })}
          />
        </label>
      </div>

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
          <h5 className="font-display text-lg text-[#EAF2F5]">PPT 페이지</h5>
          <Button
            type="button"
            variant="secondary"
            className="min-h-9 rounded-xl px-3 py-2 text-sm"
            onClick={() => onChange({ ...draft, slides: [...draft.slides, { eyebrow: '새 페이지', title: '제목', body: ['본문'], footer: '' }] })}
          >
            추가
          </Button>
        </div>
        <div className="mt-3 grid gap-3">
          {draft.slides.map((slide, index) => (
            <div key={index} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="grid gap-2 md:grid-cols-[140px_1fr]">
                <input
                  className="rounded-lg border border-white/10 bg-[#07111B] px-3 py-2 text-sm text-[#EAF2F5]"
                  value={slide.eyebrow}
                  onChange={(event) => updateSlide(index, { ...slide, eyebrow: event.target.value })}
                />
                <input
                  className="rounded-lg border border-white/10 bg-[#07111B] px-3 py-2 text-sm text-[#EAF2F5]"
                  value={slide.title}
                  onChange={(event) => updateSlide(index, { ...slide, title: event.target.value })}
                />
              </div>
              <textarea
                className="mt-2 min-h-20 w-full rounded-lg border border-white/10 bg-[#07111B] px-3 py-2 text-sm leading-6 text-[#EAF2F5]"
                value={listToLines(slide.body)}
                onChange={(event) => updateSlide(index, { ...slide, body: linesToList(event.target.value) })}
              />
              <input
                className="mt-2 w-full rounded-lg border border-white/10 bg-[#07111B] px-3 py-2 text-sm text-[#EAF2F5]"
                placeholder="하단 도움말"
                value={slide.footer ?? ''}
                onChange={(event) => updateSlide(index, { ...slide, footer: event.target.value || undefined })}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <h5 className="font-display text-lg text-[#EAF2F5]">40분 과정안</h5>
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
        수업을 시작하기 전에 질문 흐름, 교사 발문, 40분 수업 과정안을 한 번에 확인하는 페이지입니다.
      </PageHeader>

      <Panel className="overflow-hidden p-0">
        <div className="flex aspect-video items-center justify-center bg-[#07111B]">
          <div className="text-center">
            <PlayCircle className="mx-auto text-[#FFD37A]" size={72} />
            <p className="font-display mt-5 text-3xl text-[#EAF2F5]">연수 영상 자리</p>
            <p className="mt-3 text-[#8AA0B0]">추후 영상 또는 외부 URL을 연결할 수 있습니다.</p>
          </div>
        </div>
      </Panel>

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

      <div className="mt-6 grid gap-3">
        {guideItems.map(([title, copy]) => (
          <Panel key={title} className="flex items-center justify-between gap-4 p-5">
            <div>
              <h2 className="text-lg font-bold text-[#EAF2F5]">{title}</h2>
              <p className="mt-1 text-[#8AA0B0]">{copy}</p>
            </div>
            <ChevronRight className="text-[#FFD37A]" />
          </Panel>
        ))}
      </div>

      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-data text-sm uppercase tracking-wider text-[#FFD37A]">40-minute lessons</p>
            <h2 className="font-display mt-2 text-3xl text-[#EAF2F5]">40분 수업 과정안 {plans.length}개</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-[#8AA0B0]">
            공개 질문카드 1개를 40분 1차시로 운영합니다. 카드마다 신호등 토론·가치수직선·역할극·모의재판 등 서로 다른 활동으로 구성했습니다.
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
                    수업 {plan.no} · {plan.episodeCode} · {plan.grade}
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
                        관련 성취기준 (학년군별 적용) · 펼치기
                      </summary>
                      <p className="mt-2 text-xs text-[#8AA0B0]">운영하는 학년군에 맞는 성취기준을 선택해 적용하세요.</p>
                      <div className="mt-2 space-y-3">
                        {[
                          ['3~4학년군으로 운영 시', plan.standards.filter((standard) => standard.startsWith('[4'))],
                          ['5~6학년군으로 운영 시', plan.standards.filter((standard) => standard.startsWith('[6'))],
                        ].map(([label, items]) =>
                          (items as string[]).length > 0 ? (
                            <div key={label as string}>
                              <p className="font-data text-xs text-[#FFD37A]">{label as string}</p>
                              <ul className="mt-1 space-y-1">
                                {(items as string[]).map((standard, standardIndex) => (
                                  <li key={standardIndex} className="flex gap-2 text-[#B7C7D2]">
                                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#4FE0C0]" />
                                    <span>{standard}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null,
                        )}
                      </div>
                    </details>
                  ) : null}
                  {plan.note ? (
                    <p className="text-[#FFD37A]">
                      <span className="text-[#8AA0B0]">비고 </span>
                      {plan.note}
                    </p>
                  ) : null}
                </div>

                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <Presentation size={18} className="text-[#FFD37A]" />
                    <h4 className="font-display text-xl text-[#EAF2F5]">수업용 PPT 페이지</h4>
                    <span className="font-data text-xs text-[#8AA0B0]">{plan.slides.length}장</span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {plan.slides.map((slide, slideIndex) => (
                      <article
                        key={`${plan.episodeCode}-slide-${slideIndex}`}
                        className="flex aspect-video min-h-[230px] flex-col justify-between rounded-2xl border border-white/10 bg-[#07111B] p-5"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-data text-xs uppercase tracking-wider text-[#4FE0C0]">{slide.eyebrow}</p>
                            <span className="font-data text-xs text-[#8AA0B0]">{slideIndex + 1}/{plan.slides.length}</span>
                          </div>
                          <h5 className="mt-4 text-balance font-display text-2xl leading-tight text-[#EAF2F5]">
                            {slide.title}
                          </h5>
                          <ul className="mt-4 space-y-2">
                            {slide.body.map((line, lineIndex) => (
                              <li key={lineIndex} className="flex gap-2 text-sm leading-5 text-[#B7C7D2]">
                                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FFD37A]" />
                                <span>{line}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        {slide.footer ? (
                          <p className="mt-4 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-xs leading-5 text-[#8AA0B0]">
                            {slide.footer}
                          </p>
                        ) : null}
                      </article>
                    ))}
                  </div>
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

        <Panel className="mt-6">
          <h3 className="font-display text-2xl text-[#EAF2F5]">공통 설계 메모</h3>
          <ul className="mt-4 space-y-2">
            {lessonDesignNotes.map((note, index) => (
              <li key={index} className="flex gap-2 text-sm leading-6 text-[#B7C7D2]">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#FFD37A]" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      <div className="mt-8 text-center">
        <Button onClick={() => navigate('/intro')}>우리 반 에아몬 시작하기</Button>
      </div>
    </div>
  )
}
