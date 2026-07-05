import { useNavigate } from 'react-router-dom'
import { BookOpen, ClipboardList, Crown, MessageSquare, MessageSquareText, Play, Presentation, RotateCcw, Waves } from 'lucide-react'
import { AemonAvatar } from '../components/AemonAvatar'
import { Button, Panel } from '../components/ui'
import { findV2Lesson, v2Lessons } from '../data/v2Lessons'
import { isRemoteReady, updateRemoteLesson } from '../lib/v2Remote'
import { useV2RemoteSync } from '../lib/useV2RemoteSync'
import { useV2 } from '../state/V2Store'

export function HomePage() {
  const navigate = useNavigate()
  const { state, evolutionStage, adoptedCodeCount, currentReaction, dailyLimit, setLesson, setRemoteStatus } = useV2()

  useV2RemoteSync(state.classCode, Boolean(state.classCode))

  if (!state.classCode) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-5">
        <Panel className="max-w-md text-center">
          <h1 className="font-display text-4xl text-[#EAF2F5]">학급이 없습니다</h1>
          <p className="mt-3 leading-7 text-[#8AA0B0]">먼저 학급을 만들고 에아몬 프로젝트를 시작하세요.</p>
          <Button className="mt-6" onClick={() => navigate('/start')}>
            학급 만들기
          </Button>
        </Panel>
      </div>
    )
  }

  const lessonLabel = `${state.currentLesson || 1}/7차시`
  const currentLesson = findV2Lesson(state.currentLesson || 1)
  const progressPercent = Math.round(((state.currentLesson || 1) / 7) * 100)
  const usageLeft = Math.max(0, dailyLimit - state.dailyUsage.count)

  const saveLesson = async (lessonNo: number) => {
    const nextLesson = Math.min(7, Math.max(1, lessonNo))
    setLesson(nextLesson)
    if (state.classId && isRemoteReady()) {
      try {
        await updateRemoteLesson({ classId: state.classId, lessonNo: nextLesson })
      } catch (error) {
        setRemoteStatus({ ok: false, message: (error as Error).message })
      }
    }
  }

  const openCurrentLesson = () => {
    if (state.currentLesson <= 1) {
      navigate('/lesson/1')
      return
    }
    if (state.currentLesson === 2) {
      navigate('/codes')
      return
    }
    if (state.currentLesson >= 7) {
      navigate('/graduation')
      return
    }
    navigate('/talk')
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-8">
      <div className="w-full">
        <Panel className="overflow-hidden">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div className="text-center">
              <p className="font-data text-sm text-[#4FE0C0]">{state.className} · 학급 코드 {state.classCode}</p>
              <h1 className="font-display mt-3 text-5xl leading-tight text-[#EAF2F5]">{state.aemonName || '이름 없는 에아몬'}</h1>
              <p className="mt-3 text-[#8AA0B0]">현재 진행: {lessonLabel}</p>
              <div className="mt-5">
                <AemonAvatar stage={evolutionStage} alignment="none" size={230} />
              </div>
            </div>

            <div>
              <p className="font-data text-sm text-[#FFD37A]">시작 화면</p>
              <h2 className="font-display mt-2 text-5xl leading-tight text-[#EAF2F5]">무엇을 먼저 열까요?</h2>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <button
                  className="group min-h-48 rounded-[22px] border border-[#FFD37A]/35 bg-[#FFD37A]/12 p-6 text-left transition hover:-translate-y-1 hover:border-[#FFD37A] hover:bg-[#FFD37A]/18"
                  onClick={openCurrentLesson}
                  type="button"
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFD37A] text-[#0A1622]">
                    <Play size={24} />
                  </span>
                  <span className="font-display mt-5 block text-4xl text-[#EAF2F5]">{state.currentLesson <= 1 ? '프로젝트 시작하기' : `${state.currentLesson}차시 이어가기`}</span>
                  <span className="mt-3 block leading-7 text-[#B7C7D2]">{currentLesson.title} 수업 화면을 엽니다.</span>
                </button>

                <button
                  className="group min-h-48 rounded-[22px] border border-[#4FE0C0]/30 bg-[#4FE0C0]/10 p-6 text-left transition hover:-translate-y-1 hover:border-[#4FE0C0] hover:bg-[#4FE0C0]/16"
                  onClick={() => navigate('/training')}
                  type="button"
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#4FE0C0] text-[#0A1622]">
                    <Presentation size={24} />
                  </span>
                  <span className="font-display mt-5 block text-4xl text-[#EAF2F5]">사전연수 보기</span>
                  <span className="mt-3 block leading-7 text-[#B7C7D2]">가치정렬 철학과 수업 운영 구조를 확인합니다.</span>
                </button>
              </div>
            </div>
          </div>
        </Panel>

        <div className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <Panel>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-data text-sm text-[#4FE0C0]">PROJECT STATUS</p>
                <h2 className="font-display mt-2 text-4xl text-[#EAF2F5]">진행 상황</h2>
              </div>
              <div className="rounded-2xl border border-[#FFD37A]/25 bg-[#FFD37A]/10 px-4 py-3 text-right">
                <p className="font-display text-4xl text-[#FFD37A]">{lessonLabel}</p>
                <p className="text-sm text-[#FFE6AE]">{progressPercent}% 진행</p>
              </div>
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[#FFD37A]" style={{ width: `${progressPercent}%` }} />
            </div>

            <div className="mt-5 rounded-[22px] border border-white/10 bg-[#07111B]/45 p-5">
              <p className="font-data text-xs text-[#8AA0B0]">{currentLesson.phase}</p>
              <h3 className="font-display mt-2 text-3xl text-[#EAF2F5]">{state.currentLesson}차시 · {currentLesson.title}</h3>
              <p className="mt-3 leading-7 text-[#B7C7D2]">{currentLesson.goal}</p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {v2Lessons.map((lesson) => (
                <button
                  key={lesson.no}
                  className={`h-12 min-w-12 rounded-2xl border px-4 font-black transition ${
                    lesson.no === state.currentLesson
                      ? 'border-[#FFD37A] bg-[#FFD37A] text-[#0A1622]'
                      : lesson.no < state.currentLesson
                        ? 'border-[#4FE0C0]/35 bg-[#4FE0C0]/10 text-[#4FE0C0]'
                        : 'border-white/10 bg-[#07111B]/55 text-[#8AA0B0] hover:border-white/25 hover:text-[#EAF2F5]'
                  }`}
                  onClick={() => void saveLesson(lesson.no)}
                  type="button"
                >
                  {lesson.no}
                </button>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button variant="secondary" disabled={state.currentLesson <= 1} onClick={() => void saveLesson(state.currentLesson - 1)}>
                <RotateCcw size={18} />
                이전 차시로
              </Button>
              <Button disabled={state.currentLesson >= 7} onClick={() => void saveLesson(state.currentLesson + 1)}>
                다음 차시로
              </Button>
              <Button variant="ghost" onClick={() => navigate('/lesson/1')}>
                1차시 다시 보기
              </Button>
            </div>
          </Panel>

          <Panel>
            <div className="grid gap-5 lg:grid-cols-[220px_1fr] lg:items-center">
              <div className="text-center">
                <AemonAvatar stage={evolutionStage} alignment="none" size={190} />
                <p className="mt-3 rounded-full border border-white/10 bg-[#07111B]/55 px-3 py-2 text-sm font-bold text-[#B7C7D2]">
                  가치 코드 {adoptedCodeCount}개 · 메시지 {usageLeft}/{dailyLimit}
                </p>
              </div>
              <div>
                <p className="font-data text-sm text-[#FFD37A]">AEMON STATUS</p>
                <h2 className="font-display mt-2 text-4xl text-[#EAF2F5]">{state.aemonName || '이름 없는 에아몬'}</h2>
                <div className="mt-4 rounded-[22px] border border-[#4FE0C0]/20 bg-[#4FE0C0]/5 p-5">
                  <p className="font-display text-3xl leading-tight text-[#FFD37A]">"{currentReaction}"</p>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Button variant="secondary" onClick={() => navigate('/codes')}>
                    <ClipboardList size={18} />
                    가치코드
                  </Button>
                  <Button variant="secondary" onClick={() => navigate('/board')}>
                    <MessageSquareText size={18} />
                    학습게시판
                  </Button>
                  <Button variant="secondary" onClick={() => navigate('/talk')}>
                    <MessageSquare size={18} />
                    대화하기
                  </Button>
                  <Button variant="secondary" onClick={() => navigate('/dex')}>
                    <Waves size={18} />
                    데이터의 바다
                  </Button>
                  <Button variant="secondary" onClick={() => navigate('/graduation')}>
                    <Crown size={18} />
                    임명식
                  </Button>
                  <Button variant="ghost" onClick={() => navigate('/start')}>
                    <BookOpen size={18} />
                    학급 설정
                  </Button>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
