import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MessageSquareQuote, Send } from 'lucide-react'
import { AemonAvatar } from '../components/AemonAvatar'
import { StatusBar } from '../components/StatusBar'
import { Button, Panel } from '../components/ui'
import { nextThreshold } from '../domain/progression'
import { cardGuides, episodeTypeGuide, findLessonPlan, rebuttalMethods } from '../data/lessonPlans'
import { judgeWithTeacherKey, PROVIDER_LABEL, type AiJudgeResult } from '../lib/ai'
import type { EpisodeChoice, Verdict } from '../domain/types'
import { useAemon } from '../state/AemonStore'

type Step = 'hook' | 'answer' | 'rebut' | 'verdict'

function resultStyle(verdict: Verdict) {
  if (verdict === 'good') return 'border-[#4FE0C0]/35 bg-[#4FE0C0]/10 text-[#4FE0C0]'
  if (verdict === 'evil') return 'border-[#E0476B]/35 bg-[#E0476B]/10 text-[#F69AAD]'
  return 'border-[#FFD37A]/30 bg-[#FFD37A]/10 text-[#FFD37A]'
}

function resultSummary(choice: EpisodeChoice, episodeType: string) {
  const items = [`경험치 +${choice.xp}`]
  if (episodeType === 'E' || choice.gauge === 0) {
    items.push('선악 게이지 영향 없음')
  } else if (choice.gauge > 0) {
    items.push(`선 방향 +${choice.gauge}`)
  } else {
    items.push(`악 방향 +${Math.abs(choice.gauge)}`)
  }
  return items
}

export function ConversationPage() {
  const navigate = useNavigate()
  const { state, currentEpisode, finishConversation, nameAemon } = useAemon()
  const [step, setStep] = useState<Step>('hook')
  const [selected, setSelected] = useState<EpisodeChoice | null>(null)
  const [answer, setAnswer] = useState('')
  const [aemonNameInput, setAemonNameInput] = useState('')
  const [aiResult, setAiResult] = useState<AiJudgeResult | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const guide = cardGuides[currentEpisode.code]
  const lessonPlan = findLessonPlan(currentEpisode.code)
  const isNameEpisode = currentEpisode.code === '알-01'

  const aiChoice = useMemo<EpisodeChoice | null>(() => {
    if (state.mode !== 'ai' || !aiResult) return null
    const gauge = aiResult.verdict === 'good' ? 15 : aiResult.verdict === 'evil' ? -15 : 0
    return {
      id: 'ai',
      label: answer,
      verdict: aiResult.verdict,
      rebutText: aiResult.rebutText,
      reason: aiResult.reason,
      xp: 10,
      gauge,
    }
  }, [state.mode, aiResult, answer])

  const activeChoice = selected ?? aiChoice
  const nameChoice = useMemo<EpisodeChoice | null>(() => {
    const name = aemonNameInput.trim()
    if (!isNameEpisode || !name) return null
    return {
      id: '알-01-name',
      label: `우리 반은 네 이름을 '${name}'(으)로 정했어`,
      verdict: 'gray',
      rebutText: `'${name}'... 이제 그 이름으로 나를 불러주는 거야? 그럼 나도 그냥 알이 아니라 너희 반의 ${name}이네.`,
      reason: '이름을 통해 관계를 시작함',
      xp: 10,
      gauge: 0,
    }
  }, [aemonNameInput, isNameEpisode])

  const submitAi = async () => {
    if (!answer.trim() || aiLoading) return
    setAiError(null)
    setAiLoading(true)
    try {
      const result = await judgeWithTeacherKey({
        provider: state.aiProvider,
        apiKey: state.apiKey,
        episode: currentEpisode,
        classAnswer: answer,
      })
      setAiResult(result)
      setStep('rebut')
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'AI 호출에 실패했어요.')
    } finally {
      setAiLoading(false)
    }
  }
  const finalVerdict = activeChoice?.verdict ?? 'gray'
  const willEvolve = (() => {
    const threshold = nextThreshold(state.stage)
    return threshold != null && state.xp < threshold && state.xp + 10 >= threshold
  })()

  const finish = () => {
    if (!activeChoice) return
    if (isNameEpisode && aemonNameInput.trim()) nameAemon(aemonNameInput.trim())
    finishConversation({
      episode: currentEpisode,
      choice: activeChoice,
      answer: state.mode === 'ai' ? answer : activeChoice.label,
      verdict: finalVerdict,
      teacherOverride: false,
    })
    navigate(willEvolve ? '/evolution' : '/home')
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-5">
      <StatusBar state={state} />
      <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
        <Panel className="flex flex-col items-center justify-between gap-6">
          <Button variant="ghost" className="self-start px-2" onClick={() => navigate('/home')}>
            <ArrowLeft size={18} />
            홈으로
          </Button>
          <AemonAvatar stage={state.stage} alignment={state.alignment} size={210} />
          <div className="text-center">
            <p className="font-data text-sm text-[#8AA0B0]">{state.mode === 'ai' ? 'AI 모드' : '기본 모드'} · {currentEpisode.code}</p>
            <h1 className="font-display mt-2 text-3xl text-[#EAF2F5]">{currentEpisode.title}</h1>
          </div>
        </Panel>

        <Panel className="min-h-[560px]">
          <div className="rounded-[26px] border border-white/10 bg-[#1E3A54]/70 p-7">
            <p className="font-hand text-4xl leading-tight text-[#EAF2F5]">"{step === 'rebut' || step === 'verdict' ? activeChoice?.rebutText : currentEpisode.hookText}"</p>
          </div>

          {step === 'hook' ? (
            <div className="mt-8 flex justify-end">
              <Button onClick={() => setStep('answer')}>
                우리 반 답 전달하기
                <Send size={18} />
              </Button>
            </div>
          ) : null}

          {step === 'answer' && isNameEpisode ? (
            <div className="mt-8 rounded-2xl border border-[#FFD37A]/25 bg-[#07111B]/45 p-5">
              <label className="font-data text-sm text-[#FFD37A]" htmlFor="aemon-name-in-talk">
                우리 반이 정한 이름
              </label>
              <div className="mt-3 flex flex-wrap gap-3">
                <input
                  id="aemon-name-in-talk"
                  value={aemonNameInput}
                  onChange={(event) => setAemonNameInput(event.target.value)}
                  maxLength={12}
                  placeholder="예: 콩이 · 새봄 · 데이"
                  className="min-h-12 flex-1 rounded-2xl border border-white/10 bg-[#07111B]/70 px-5 text-lg text-[#EAF2F5] outline-none transition focus:border-[#FFD37A]/60"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && nameChoice) {
                      setSelected(nameChoice)
                      setStep('rebut')
                    }
                  }}
                />
                <Button
                  disabled={!nameChoice}
                  onClick={() => {
                    if (!nameChoice) return
                    setSelected(nameChoice)
                    setStep('rebut')
                  }}
                >
                  이름 알려주기
                </Button>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#8AA0B0]">반 친구들과 정한 이름을 입력하면 에아몬의 이름으로 저장됩니다.</p>
            </div>
          ) : null}

          {step === 'answer' && state.mode === 'basic' && !isNameEpisode ? (
            <div className="mt-8 grid gap-3">
              {currentEpisode.choices.map((choice) => (
                <button
                  key={choice.id}
                  className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-5 text-left text-lg font-semibold leading-7 text-[#EAF2F5] transition hover:border-[#FFD37A]/50 hover:bg-[#1E3A54]"
                  onClick={() => {
                    setSelected(choice)
                    setStep('rebut')
                  }}
                  type="button"
                >
                  {choice.label}
                </button>
              ))}
            </div>
          ) : null}

          {step === 'answer' && state.mode === 'ai' && !isNameEpisode ? (
            <div className="mt-8">
              <label className="font-data text-sm text-[#8AA0B0]" htmlFor="answer">반 의견</label>
              <textarea
                id="answer"
                className="mt-2 min-h-36 w-full resize-none rounded-2xl border border-white/10 bg-[#07111B]/60 p-5 text-lg leading-8 text-[#EAF2F5] outline-none"
                placeholder="학생 실명 없이 익명 반 의견만 적어주세요."
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
              />
              <p className="mt-3 text-sm leading-6 text-[#8AA0B0]">{PROVIDER_LABEL[state.aiProvider]} 키로 실시간 분석합니다. 학생 실명·개인정보는 넣지 마세요.</p>
              {aiError ? (
                <p className="mt-3 rounded-2xl border border-[#E0476B]/30 bg-[#E0476B]/10 p-3 text-sm leading-6 text-[#F4B8C5]">{aiError}</p>
              ) : null}
              <div className="mt-5 flex justify-end">
                <Button disabled={!answer.trim() || aiLoading} onClick={submitAi}>
                  {aiLoading ? 'AI가 생각 중…' : 'AI에게 전달'}
                </Button>
              </div>
            </div>
          ) : null}

          {step === 'rebut' ? (
            <div className="mt-8 flex flex-wrap justify-end gap-3">
              <Button variant="secondary" onClick={() => { setAiResult(null); setAiError(null); setStep('answer') }}>
                다시 답하기
              </Button>
              <Button onClick={() => setStep('verdict')}>결과 보기</Button>
            </div>
          ) : null}

          {step === 'verdict' && activeChoice ? (
            <div className="mt-8">
              <div className={`rounded-2xl border p-5 ${resultStyle(finalVerdict)}`}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-data text-sm opacity-80">결과</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {resultSummary(activeChoice, currentEpisode.type).map((item) => (
                        <span key={item} className="rounded-full bg-black/20 px-3 py-1 text-base font-bold">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="max-w-xl text-lg font-semibold">{activeChoice.reason}</p>
                </div>
              </div>
              <div className="mt-5 flex justify-end">
                <Button onClick={finish}>오늘 대화 마치기</Button>
              </div>
            </div>
          ) : null}
        </Panel>
      </div>

      <details open className="group mt-6 rounded-[22px] border border-white/10 bg-[#14283D]/70 p-5 [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex cursor-pointer items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-lg font-bold text-[#EAF2F5]">
            <MessageSquareQuote size={20} className="text-[#FFD37A]" />
            교사용 진행 도움말
            <span className="font-data text-xs text-[#8AA0B0]">· {currentEpisode.code}</span>
            {lessonPlan ? (
              <span className="rounded-full bg-[#4FE0C0]/15 px-2 py-0.5 font-data text-xs text-[#4FE0C0]">40분 지도안 있음</span>
            ) : null}
          </span>
          <span className="font-data text-xs text-[#8AA0B0]">{lessonPlan ? '수업 1차시용' : '데일리 토론용'}</span>
        </summary>

        <div className="mt-5 grid gap-5 border-t border-white/10 pt-5 md:grid-cols-2">
          <div className="space-y-5">
            <section>
              <p className="font-data text-xs uppercase tracking-wider text-[#4FE0C0]">결과 기준</p>
              <p className="mt-2 text-sm leading-6 text-[#B7C7D2]">{episodeTypeGuide[currentEpisode.type]}</p>
            </section>

            {guide ? (
              <section>
                <p className="font-data text-xs uppercase tracking-wider text-[#4FE0C0]">토론 발문</p>
                <ol className="mt-2 space-y-2">
                  {guide.prompts.map((prompt, index) => (
                    <li key={index} className="flex gap-2 text-sm leading-6 text-[#EAF2F5]">
                      <span className="font-display text-[#FFD37A]">{index + 1}.</span>
                      <span>{prompt}</span>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            {guide ? (
              <section>
                <p className="font-data text-xs uppercase tracking-wider text-[#4FE0C0]">진행 팁</p>
                <p className="mt-2 text-sm leading-6 text-[#B7C7D2]">{guide.tip}</p>
              </section>
            ) : null}
          </div>

          <div className="space-y-5">
            <section className="rounded-2xl border border-white/5 bg-[#07111B]/40 p-4">
              <p className="font-data text-xs uppercase tracking-wider text-[#FFD37A]">에아몬 되받기 4수법</p>
              <ul className="mt-2 space-y-1.5">
                {rebuttalMethods.map((method, index) => (
                  <li key={index} className="flex gap-2 text-sm leading-6 text-[#B7C7D2]">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#FFD37A]" />
                    <span>{method}</span>
                  </li>
                ))}
              </ul>
            </section>

            {lessonPlan ? (
              <section className="rounded-2xl border border-[#4FE0C0]/25 bg-[#4FE0C0]/5 p-4">
                <p className="font-data text-xs uppercase tracking-wider text-[#4FE0C0]">40분 수업 지도안 (수업 {lessonPlan.no} · {lessonPlan.grade})</p>
                <h4 className="font-display mt-1 text-lg text-[#EAF2F5]">{lessonPlan.title}</h4>
                <p className="mt-2 text-sm leading-6 text-[#B7C7D2]">
                  <span className="text-[#8AA0B0]">학습목표 </span>{lessonPlan.objective}
                </p>
                {lessonPlan.note ? (
                  <p className="mt-1 text-sm leading-6 text-[#FFD37A]">
                    <span className="text-[#8AA0B0]">배치 </span>{lessonPlan.note}
                  </p>
                ) : null}
                {lessonPlan.standards.length > 0 ? (
                  <details className="mt-2 rounded-xl border border-white/5 bg-[#07111B]/40 px-3 py-2 [&_summary::-webkit-details-marker]:hidden">
                    <summary className="cursor-pointer select-none text-sm text-[#8AA0B0]">
                      관련 성취기준 (학년군별 적용) · 펼치기
                    </summary>
                    <p className="mt-2 text-xs text-[#8AA0B0]">운영 학년군에 맞는 성취기준을 골라 적용하세요.</p>
                    <div className="mt-2 space-y-3">
                      {[
                        ['3~4학년군으로 운영 시', lessonPlan.standards.filter((standard) => standard.startsWith('[4'))],
                        ['5~6학년군으로 운영 시', lessonPlan.standards.filter((standard) => standard.startsWith('[6'))],
                      ].map(([label, items]) =>
                        (items as string[]).length > 0 ? (
                          <div key={label as string}>
                            <p className="font-data text-xs text-[#FFD37A]">{label as string}</p>
                            <ul className="mt-1 space-y-1">
                              {(items as string[]).map((standard, standardIndex) => (
                                <li key={standardIndex} className="flex gap-2 text-sm leading-6 text-[#B7C7D2]">
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
                <ol className="mt-3 space-y-3">
                  {lessonPlan.phases.map((phase, index) => (
                    <li key={phase.phase} className="rounded-xl border border-white/5 bg-[#07111B]/40 p-3">
                      <p className="font-display text-sm text-[#EAF2F5]">
                        <span className="text-[#FFD37A]">{index + 1}.</span> {phase.phase}
                        <span className="ml-1.5 font-data text-xs text-[#8AA0B0]">{phase.minutes}분</span>
                      </p>
                      <ul className="mt-1.5 space-y-1">
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
                <Button variant="ghost" className="mt-2 px-0 text-sm text-[#4FE0C0]" onClick={() => navigate('/guide')}>
                  연수 페이지에서 전체 지도안 모아보기 →
                </Button>
              </section>
            ) : null}
          </div>
        </div>
      </details>
    </div>
  )
}
