import { ArrowLeft, BarChart3, CheckCircle2, LockKeyhole, RefreshCw, TrendingDown, TrendingUp, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button, Panel } from '../components/ui'
import { AI_SURVEY_ITEMS } from '../data/survey'
import { buildClassSurveySummary } from '../lib/surveyResults'
import { useV2RemoteSync } from '../lib/useV2RemoteSync'
import { useV2 } from '../state/V2Store'

function formatChange(value: number) {
  if (value > 0) return `+${value.toFixed(2)}`
  return value.toFixed(2)
}

function scoreWidth(value: number) {
  return `${Math.max(0, Math.min(100, ((value - 1) / 3) * 100))}%`
}

export function SurveyResultsPage() {
  const navigate = useNavigate()
  const { state } = useV2()
  useV2RemoteSync(state.classCode, Boolean(state.classCode))

  const summary = buildClassSurveySummary(state.surveyResponses)
  const strongestChanges = [...summary.items].sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 3)
  const hasResults = summary.preResponseCount > 0 && summary.postResponseCount > 0

  if (!state.classCode) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-12">
        <Panel className="text-center">
          <LockKeyhole className="mx-auto text-[#FFD37A]" size={36} />
          <h1 className="font-display mt-4 text-4xl text-[#EAF2F5]">학급을 먼저 불러와 주세요</h1>
          <p className="mt-3 leading-7 text-[#8AA0B0]">사전·사후 설문 결과는 학급 데이터가 연결된 뒤 확인할 수 있습니다.</p>
          <Button className="mt-6" onClick={() => navigate('/start')}>시작 화면</Button>
        </Panel>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <button className="inline-flex items-center gap-2 text-sm font-black text-[#8AA0B0] hover:text-[#EAF2F5]" onClick={() => navigate('/home')} type="button">
        <ArrowLeft size={17} />
        학급 홈
      </button>

      <header className="mt-5 border-b border-white/10 pb-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="font-data text-sm text-[#4FE0C0]">CLASS CHANGE REPORT</p>
            <h1 className="font-display mt-2 text-5xl leading-tight text-[#EAF2F5]">우리 반 인공지능 인식 변화</h1>
            <p className="mt-3 max-w-3xl text-lg leading-8 text-[#B7C7D2]">5차시 동안 우리 반의 생각이 어떻게 달라졌는지 사전·사후 설문을 학급 전체 기준으로 비교합니다.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#4FE0C0]/25 bg-[#4FE0C0]/10 px-4 py-2 text-sm font-black text-[#4FE0C0]">
            <Users size={17} />
            개인 이름 비공개 · 전체 결과만 표시
          </span>
        </div>
      </header>

      {!hasResults ? (
        <Panel className="mt-7 text-center">
          <RefreshCw className="mx-auto text-[#6AD8FF]" size={36} />
          <h2 className="font-display mt-4 text-4xl text-[#EAF2F5]">비교할 응답을 기다리고 있어요</h2>
          <p className="mt-3 leading-7 text-[#8AA0B0]">사전 설문과 사후 설문 응답이 모두 모이면 학급 전체 변화 결과가 열립니다.</p>
          <div className="mx-auto mt-6 grid max-w-md gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4"><p className="text-sm text-[#8AA0B0]">사전 응답</p><p className="font-display mt-1 text-4xl text-[#FFD37A]">{summary.preResponseCount}</p></div>
            <div className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4"><p className="text-sm text-[#8AA0B0]">사후 응답</p><p className="font-display mt-1 text-4xl text-[#6AD8FF]">{summary.postResponseCount}</p></div>
          </div>
          <Button className="mt-6" onClick={() => navigate('/lesson/5')}>5차시 사후 설문으로 돌아가기</Button>
        </Panel>
      ) : (
        <>
          <section className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Panel>
              <p className="text-sm font-bold text-[#8AA0B0]">사전 응답</p>
              <p className="font-display mt-2 text-5xl text-[#FFD37A]">{summary.preResponseCount}명</p>
              <p className="mt-2 text-sm leading-6 text-[#8AA0B0]">개인별 결과는 표시하지 않음</p>
            </Panel>
            <Panel>
              <p className="text-sm font-bold text-[#8AA0B0]">사후 응답</p>
              <p className="font-display mt-2 text-5xl text-[#6AD8FF]">{summary.postResponseCount}명</p>
              <p className="mt-2 text-sm leading-6 text-[#8AA0B0]">학급 전체 응답만 집계</p>
            </Panel>
            <Panel>
              <p className="text-sm font-bold text-[#8AA0B0]">수업 전 평균</p>
              <p className="font-display mt-2 text-5xl text-[#FFD37A]">{summary.preAverageScore.toFixed(2)}</p>
              <p className="mt-2 text-sm text-[#8AA0B0]">32점 만점</p>
            </Panel>
            <Panel>
              <p className="text-sm font-bold text-[#8AA0B0]">수업 후 평균</p>
              <p className="font-display mt-2 text-5xl text-[#6AD8FF]">{summary.postAverageScore.toFixed(2)}</p>
              <p className="mt-2 text-sm text-[#8AA0B0]">32점 만점</p>
            </Panel>
            <Panel className={summary.scoreChange >= 0 ? 'border-[#4FE0C0]/35' : 'border-[#E0476B]/35'}>
              <p className="text-sm font-bold text-[#8AA0B0]">전체 평균 변화</p>
              <div className="mt-2 flex items-center gap-2">
                {summary.scoreChange >= 0 ? <TrendingUp className="text-[#4FE0C0]" size={30} /> : <TrendingDown className="text-[#E0476B]" size={30} />}
                <p className={`font-display text-5xl ${summary.scoreChange >= 0 ? 'text-[#4FE0C0]' : 'text-[#E0476B]'}`}>{formatChange(summary.scoreChange)}</p>
              </div>
              <p className="mt-2 text-sm text-[#8AA0B0]">점</p>
            </Panel>
          </section>

          <section className="mt-6 grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
            <Panel>
              <div className="flex items-center gap-3">
                <BarChart3 className="text-[#6AD8FF]" size={26} />
                <div>
                  <p className="font-data text-xs text-[#6AD8FF]">QUESTION BY QUESTION</p>
                  <h2 className="font-display mt-1 text-4xl text-[#EAF2F5]">문항별 평균 변화</h2>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#8AA0B0]">‘그렇다’가 오개념을 뜻하는 문항은 점수를 반대로 바꾸어, 숫자가 높을수록 AI를 더 비판적으로 이해한 것으로 정리했습니다.</p>

              <div className="mt-6 grid gap-4">
                {summary.items.map((item) => (
                  <article key={item.no} className="rounded-[18px] border border-white/10 bg-[#07111B]/45 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <p className="max-w-3xl font-black leading-7 text-[#EAF2F5]">{item.no}. {item.text}</p>
                      <span className={`rounded-full px-3 py-1 text-sm font-black ${item.change > 0 ? 'bg-[#4FE0C0]/10 text-[#4FE0C0]' : item.change < 0 ? 'bg-[#E0476B]/10 text-[#E0476B]' : 'bg-white/5 text-[#8AA0B0]'}`}>
                        {formatChange(item.change)}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3">
                      <div className="grid grid-cols-[54px_1fr_46px] items-center gap-3 text-sm">
                        <span className="font-black text-[#FFD37A]">사전</span>
                        <div className="h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#FFD37A]" style={{ width: scoreWidth(item.preAverage) }} /></div>
                        <span className="text-right font-data text-[#B7C7D2]">{item.preAverage.toFixed(2)}</span>
                      </div>
                      <div className="grid grid-cols-[54px_1fr_46px] items-center gap-3 text-sm">
                        <span className="font-black text-[#6AD8FF]">사후</span>
                        <div className="h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#6AD8FF]" style={{ width: scoreWidth(item.postAverage) }} /></div>
                        <span className="text-right font-data text-[#B7C7D2]">{item.postAverage.toFixed(2)}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </Panel>

            <div className="grid content-start gap-5">
              <Panel>
                <p className="font-data text-xs text-[#4FE0C0]">SUMMARY</p>
                <h2 className="font-display mt-1 text-3xl text-[#EAF2F5]">전체 변화 요약</h2>
                <div className="mt-5 grid gap-3">
                  <div className="flex items-center justify-between rounded-2xl border border-[#4FE0C0]/20 bg-[#4FE0C0]/8 p-4"><span className="font-bold text-[#B7C7D2]">높아진 문항</span><strong className="font-display text-3xl text-[#4FE0C0]">{summary.improvedItemCount}</strong></div>
                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4"><span className="font-bold text-[#B7C7D2]">변화 없는 문항</span><strong className="font-display text-3xl text-[#EAF2F5]">{summary.unchangedItemCount}</strong></div>
                  <div className="flex items-center justify-between rounded-2xl border border-[#E0476B]/20 bg-[#E0476B]/8 p-4"><span className="font-bold text-[#B7C7D2]">낮아진 문항</span><strong className="font-display text-3xl text-[#E0476B]">{summary.declinedItemCount}</strong></div>
                </div>
              </Panel>

              <Panel>
                <div className="flex items-center gap-2"><CheckCircle2 className="text-[#FFD37A]" size={22} /><h2 className="font-display text-3xl text-[#EAF2F5]">가장 큰 변화</h2></div>
                <div className="mt-4 grid gap-3">
                  {strongestChanges.map((item, index) => (
                    <div key={item.no} className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
                      <p className="font-data text-xs text-[#FFD37A]">TOP {index + 1} · {formatChange(item.change)}</p>
                      <p className="mt-2 font-bold leading-7 text-[#EAF2F5]">{item.text}</p>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel className="text-sm leading-6 text-[#8AA0B0]">
                <p className="font-black text-[#B7C7D2]">결과 해석 안내</p>
                <p className="mt-2">이 화면은 사전 전체 응답 평균과 사후 전체 응답 평균을 비교한 학급 성찰용 요약입니다. 통계적 효과를 검증하는 연구 분석 결과는 아니며, 개인별 점수와 이름은 표시하지 않습니다.</p>
                <p className="mt-2">선택 문항 {AI_SURVEY_ITEMS.length}개 · 문항별 1~4점 · 총점 32점</p>
              </Panel>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
