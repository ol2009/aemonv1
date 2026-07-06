import { useNavigate } from 'react-router-dom'
import { BookOpen, ClipboardList, Crown, MessageSquare, MessageSquareText, Play, RotateCcw, Waves } from 'lucide-react'
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

  const lessonNo = state.currentLesson || 1
  const currentLesson = findV2Lesson(lessonNo)
  const progressPercent = Math.round((lessonNo / 7) * 100)
  const usageLeft = Math.max(0, dailyLimit - state.dailyUsage.count)
  const canWriteRemote = Boolean(state.classId && state.remote.ok && isRemoteReady())

  const saveLesson = async (nextLesson: number) => {
    const clamped = Math.min(7, Math.max(1, nextLesson))
    setLesson(clamped)
    if (canWriteRemote) {
      try {
        await updateRemoteLesson({ classId: state.classId, lessonNo: clamped })
      } catch (error) {
        setRemoteStatus({ ok: false, message: (error as Error).message })
      }
    }
  }

  const openCurrentLesson = () => {
    if (lessonNo <= 1) navigate('/lesson/1')
    else if (lessonNo === 2) navigate('/codes')
    else if (lessonNo >= 7) navigate('/graduation')
    else navigate('/talk')
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <section className="border-b border-white/10 pb-6">
        <p className="font-data text-sm text-[#4FE0C0]">
          {state.className} · 학급 코드 {state.classCode}
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="font-display text-5xl text-[#EAF2F5]">대시보드</h1>
            <p className="mt-3 text-xl font-black text-[#EAF2F5]">{state.aemonName || '이름 없는 에아몬'}</p>
          </div>
          <div className="md:text-right">
            <p className="font-data text-xs text-[#8AA0B0]">현재 진행</p>
            <p className="font-display mt-1 text-4xl text-[#FFD37A]">{lessonNo}/7차시</p>
            <p className="mt-1 text-sm text-[#B7C7D2]">{currentLesson.title}</p>
          </div>
        </div>
      </section>

      <Panel className="mt-6 overflow-hidden">
        <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:items-center">
          <div>
            <p className="font-data text-sm text-[#FFD37A]">AEMON</p>
            <h2 className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">{state.aemonName || '이름 없는 에아몬'}</h2>
            <div className="mt-4 rounded-[18px] border border-[#4FE0C0]/20 bg-[#07111B]/50 p-5">
              <p className="font-display text-3xl leading-tight text-[#FFD37A]">"{currentReaction}"</p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={openCurrentLesson}>
                <Play size={18} />
                {lessonNo <= 1 ? '1차시 시작' : `${lessonNo}차시 열기`}
              </Button>
              <Button variant="secondary" onClick={() => navigate('/talk')}>
                <MessageSquare size={18} />
                대화하기
              </Button>
              <Button variant="secondary" onClick={() => navigate('/dex')}>
                <Waves size={18} />
                데이터바다
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button className="min-h-10 px-4" variant="ghost" onClick={() => navigate('/codes')}>
                <ClipboardList size={18} />
                가치코드
              </Button>
              <Button className="min-h-10 px-4" variant="ghost" onClick={() => navigate('/board')}>
                <MessageSquareText size={18} />
                학습게시판
              </Button>
              <Button className="min-h-10 px-4" variant="ghost" onClick={() => navigate('/graduation')}>
                <Crown size={18} />
                임명식
              </Button>
              <Button className="min-h-10 px-4" variant="ghost" onClick={() => navigate('/start')}>
                <BookOpen size={18} />
                학급 설정
              </Button>
            </div>
          </div>

          <div className="text-center">
            <AemonAvatar stage={evolutionStage} alignment="none" size={240} />
            <p className="mt-4 rounded-full border border-white/10 bg-[#07111B]/55 px-4 py-2 text-sm font-bold text-[#B7C7D2]">
              가치코드 {adoptedCodeCount}개 · 메시지 {usageLeft}/{dailyLimit}
            </p>
          </div>
        </div>
      </Panel>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-data text-sm text-[#4FE0C0]">차시 이동</p>
            <p className="mt-1 text-sm text-[#8AA0B0]">{currentLesson.phase} · {currentLesson.goal}</p>
          </div>
          <div className="h-2 w-52 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[#FFD37A]" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {v2Lessons.map((lesson) => (
            <button
              key={lesson.no}
              className={`h-11 min-w-11 rounded-xl border px-3 font-black transition ${
                lesson.no === lessonNo
                  ? 'border-[#FFD37A] bg-[#FFD37A] text-[#0A1622]'
                  : lesson.no < lessonNo
                    ? 'border-[#4FE0C0]/35 bg-[#4FE0C0]/10 text-[#4FE0C0]'
                    : 'border-white/10 bg-[#07111B]/55 text-[#B7C7D2] hover:border-white/25'
              }`}
              onClick={() => void saveLesson(lesson.no)}
              title={lesson.title}
              type="button"
            >
              {lesson.no}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button className="min-h-10 px-4" variant="secondary" disabled={lessonNo <= 1} onClick={() => void saveLesson(lessonNo - 1)}>
            <RotateCcw size={18} />
            이전
          </Button>
          <Button className="min-h-10 px-4" disabled={lessonNo >= 7} onClick={() => void saveLesson(lessonNo + 1)}>
            다음
          </Button>
        </div>
      </section>
    </div>
  )
}
