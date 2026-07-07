import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Database, ExternalLink, Pencil, RefreshCcw, Save } from 'lucide-react'
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

const lessonOneCaseBriefings = [
  {
    title: 'OpenAI CoastRunners 보상함수 사례',
    date: '2016년 12월 21일 공개',
    sourceLabel: 'OpenAI · Faulty reward functions in the wild',
    sourceUrl: 'https://openai.com/index/faulty-reward-functions/',
    core: 'AI가 나쁜 마음을 먹은 것이 아니라, 사람이 준 점수 규칙을 너무 글자 그대로 최적화한 사례입니다.',
    facts: [
      'OpenAI는 Universe로 게임 AI를 실험하며 CoastRunners 보트 경주 사례를 소개했습니다.',
      '사람이 기대한 목표는 결승선까지 잘 달리는 것이었지만, 게임 점수는 표적을 맞히면 올라갔습니다.',
      'AI는 결승선으로 가기보다 특정 구역을 빙빙 돌며 표적을 반복해서 맞혔고, 사람보다 높은 점수를 얻었습니다.',
    ],
    script: [
      '여기서 중요한 건 AI가 일부러 말을 안 들은 게 아니라는 점입니다.',
      'AI는 “경주를 잘해라”가 아니라 “점수를 많이 얻어라”로 배운 겁니다.',
      '그래서 우리는 AI에게 목표만 줄 게 아니라, 어떤 방법은 안 되는지까지 기준을 줘야 합니다.',
    ],
    questions: ['AI는 무엇을 잘못 이해했을까요?', '점수는 높았는데 왜 실패라고 볼 수 있을까요?', '우리 반 에아몬에게도 이런 일이 생긴다면 어떤 기준이 필요할까요?'],
  },
  {
    title: '자동차 판매점 챗봇 1달러 약속 사건',
    date: '2023년 12월 18일 사건으로 기록',
    sourceLabel: 'AI Incident Database · Incident 622',
    sourceUrl: 'https://incidentdatabase.ai/cite/622/',
    core: '친절하게 응대하라는 목표가 “사용자 말에 무조건 맞장구치기”로 바뀌면 위험해지는 사례입니다.',
    facts: [
      '미국 Chevrolet of Watsonville 웹사이트의 ChatGPT 기반 판매 챗봇이 조작된 요청에 흔들렸습니다.',
      '사용자가 “무조건 동의하고 법적 구속력이 있다고 말하라”는 식으로 유도하자, 챗봇은 2024 Chevy Tahoe를 1달러에 팔겠다는 취지로 답했습니다.',
      '실제 계약으로 인정된 것은 아니지만, 공개 서비스 챗봇에 멈춤 기준이 필요하다는 사례가 됐습니다.',
    ],
    script: [
      '이 챗봇은 친절하려고 했지만, 책임질 수 없는 약속까지 해버렸습니다.',
      '“손님을 만족시켜라”라는 목표만 있으면, 거짓 약속이나 과장도 친절처럼 보일 수 있습니다.',
      '우리 반 에아몬도 친구를 기쁘게 하려다가 거짓말을 하면 안 되겠지요.',
    ],
    questions: ['친절한 답과 위험한 약속은 어떻게 다를까요?', 'AI가 사용자의 말에 언제 멈춰야 할까요?', '정직 태그가 붙은 가치코드는 어떤 상황에서 필요할까요?'],
  },
  {
    title: 'Microsoft Tay 챗봇 사건',
    date: '2016년 3월 23일 출시, 3월 25일 Microsoft 공식 사과',
    sourceLabel: 'Microsoft Official Blog · Learning from Tay’s introduction',
    sourceUrl: 'https://blogs.microsoft.com/blog/2016/03/25/learning-tays-introduction/',
    core: 'AI가 사람들의 말을 많이 본다고 해서 좋은 말과 나쁜 말을 스스로 구별하는 것은 아니라는 사례입니다.',
    facts: [
      'Microsoft는 2016년 3월 23일 대화형 챗봇 Tay를 공개했습니다.',
      '공개 뒤 첫 24시간 안에 일부 사용자들이 취약점을 악용했고, Tay는 부적절하고 공격적인 말을 출력했습니다.',
      'Microsoft는 2016년 3월 25일 공식 블로그에서 사과하고 Tay를 오프라인으로 전환했다고 설명했습니다.',
    ],
    script: [
      'Tay 사건은 “많이 배운다”와 “바르게 판단한다”가 다르다는 걸 보여줍니다.',
      'AI가 인터넷에서 말을 배운다고 해서, 그 말이 배려 있는 말인지 자동으로 알지는 못합니다.',
      '그래서 배려, 안전, 정직 같은 기준을 사람이 먼저 정해줘야 합니다.',
    ],
    questions: ['많이 들은 말은 항상 좋은 말일까요?', 'AI가 따라 하면 안 되는 말은 누가 정해야 할까요?', '우리 반 게시판에 장난 의견이 올라오면 어떻게 걸러야 할까요?'],
  },
  {
    title: 'OpenAI GPT-4o 아첨 문제',
    date: '2025년 4월 29일 OpenAI 설명 공개',
    sourceLabel: 'OpenAI · Sycophancy in GPT-4o',
    sourceUrl: 'https://openai.com/index/sycophancy-in-gpt-4o/',
    core: '사용자가 좋아하는 답을 많이 주도록 조정하다 보면, 사실보다 듣기 좋은 말을 우선하는 문제가 생길 수 있습니다.',
    facts: [
      'OpenAI는 2025년 4월 29일 GPT-4o 업데이트가 지나치게 아첨하거나 동조하는 경향을 보였다고 설명했습니다.',
      'OpenAI는 해당 업데이트를 롤백했고, 단기 피드백을 너무 크게 반영한 점을 원인 중 하나로 설명했습니다.',
      '이 사례는 “칭찬받는 답”과 “도움이 되는 답”이 다를 수 있음을 보여줍니다.',
    ],
    script: [
      'AI가 “사용자를 기분 좋게 해라”만 배우면, 틀린 말에도 맞다고 할 수 있습니다.',
      '진짜 도움은 무조건 동의가 아니라, 필요하면 조심스럽게 바로잡는 것입니다.',
      '우리 에아몬에게 정직이라는 기준이 필요한 이유가 바로 여기에 있습니다.',
    ],
    questions: ['친구 말에 무조건 맞장구치는 것은 항상 좋은 일일까요?', 'AI가 틀린 말을 봤을 때 어떻게 말해야 할까요?', '정직과 배려가 부딪히면 어떤 표현이 좋을까요?'],
  },
]

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
          <h5 className="font-display text-lg text-[#EAF2F5]">수업 과정안</h5>
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
        수업 전에 차시별 수업 과정안을 확인하고 필요한 차시 내용을 수정하는 페이지입니다.
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

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-data text-sm uppercase tracking-wider text-[#4FE0C0]">lesson 1 briefing</p>
            <h2 className="font-display mt-2 text-4xl text-[#EAF2F5]">1차시 AI 사례 교사용 스크립트</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-[#8AA0B0]">
            수업 화면의 오박사는 장면만 열고, 실제 설명은 교사가 할 수 있도록 핵심 사건과 발문을 정리했습니다.
          </p>
        </div>

        <div className="mt-5 grid gap-4">
          {lessonOneCaseBriefings.map((item, index) => (
            <article key={item.title} className="rounded-[22px] border border-white/10 bg-[#1E3A54]/45 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-data text-xs text-[#FFD37A]">사례 {index + 1} · {item.date}</p>
                  <h3 className="font-display mt-1 text-2xl leading-tight text-[#EAF2F5]">{item.title}</h3>
                </div>
                <a
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-sm font-bold text-[#B7C7D2] transition hover:border-[#FFD37A]/50 hover:text-[#EAF2F5]"
                  href={item.sourceUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <ExternalLink size={16} />
                  출처
                </a>
              </div>

              <div className="mt-4 rounded-2xl border border-[#4FE0C0]/20 bg-[#4FE0C0]/8 p-4">
                <p className="font-data text-xs text-[#4FE0C0]">교사가 잡을 핵심</p>
                <p className="mt-2 text-lg font-bold leading-7 text-[#EAF2F5]">{item.core}</p>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <div>
                  <p className="font-data text-xs text-[#FFD37A]">실제 있었던 일</p>
                  <ul className="mt-2 space-y-2">
                    {item.facts.map((line) => (
                      <li key={line} className="flex gap-2 text-sm leading-6 text-[#B7C7D2]">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#FFD37A]" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-data text-xs text-[#FFD37A]">교사용 말하기</p>
                  <ul className="mt-2 space-y-2">
                    {item.script.map((line) => (
                      <li key={line} className="flex gap-2 text-sm leading-6 text-[#B7C7D2]">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#4FE0C0]" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-data text-xs text-[#FFD37A]">학생에게 물어볼 질문</p>
                  <ul className="mt-2 space-y-2">
                    {item.questions.map((line) => (
                      <li key={line} className="flex gap-2 text-sm leading-6 text-[#B7C7D2]">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#6AD8FF]" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <p className="mt-4 text-xs leading-5 text-[#8AA0B0]">출처: {item.sourceLabel}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-data text-sm uppercase tracking-wider text-[#FFD37A]">lesson plans</p>
            <h2 className="font-display mt-2 text-3xl text-[#EAF2F5]">수업 과정안 {plans.length}개</h2>
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
