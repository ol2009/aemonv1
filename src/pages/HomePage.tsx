import { useNavigate } from 'react-router-dom'
import { BookOpen, ClipboardList, Crown, MessageSquare, MessageSquareText, Play, RotateCcw } from 'lucide-react'
import { Button, Panel } from '../components/ui'
import { findV2Lesson, v2Lessons } from '../data/v2Lessons'
import { isRemoteReady, updateRemoteLesson } from '../lib/v2Remote'
import { useV2RemoteSync } from '../lib/useV2RemoteSync'
import { useV2 } from '../state/V2Store'

export function HomePage() {
  const navigate = useNavigate()
  const { state, setLesson, setRemoteStatus } = useV2()

  useV2RemoteSync(state.classCode, Boolean(state.classCode))

  if (!state.classCode) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-10">
        <Panel>
          <h1 className="font-display text-4xl text-[#EAF2F5]">학급이 없습니다</h1>
          <Button className="mt-5" onClick={() => navigate('/start')}>학급 만들기</Button>
        </Panel>
      </div>
    )
  }

  const lessonNo = state.currentLesson || 1
  const currentLesson = findV2Lesson(lessonNo)
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
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-data text-sm text-[#4FE0C0]">{state.className} · 학급 코드 {state.classCode}</p>
          <h1 className="font-display mt-2 text-5xl text-[#EAF2F5]">교사 대시보드</h1>
        </div>
        <div className="rounded-2xl border border-[#FFD37A]/25 bg-[#FFD37A]/10 px-4 py-3 text-right">
          <p className="font-display text-4xl text-[#FFD37A]">{lessonNo}/7차시</p>
          <p className="text-sm text-[#FFE6AE]">{currentLesson.title}</p>
        </div>
      </div>

      <Panel>
        <div className="flex flex-wrap gap-3">
          <Button onClick={openCurrentLesson}>
            <Play size={18} />
            {lessonNo <= 1 ? '프로젝트 시작' : `${lessonNo}차시 열기`}
          </Button>
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
            채팅
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
      </Panel>

      <Panel className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-data text-sm text-[#4FE0C0]">차시 이동</p>
            <p className="mt-2 text-[#B7C7D2]">필요한 차시만 바로 선택합니다.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {v2Lessons.map((lesson) => (
              <button
                key={lesson.no}
                className={`h-11 min-w-11 rounded-xl border px-3 font-black transition ${
                  lesson.no === lessonNo ? 'border-[#FFD37A] bg-[#FFD37A] text-[#0A1622]' : 'border-white/10 bg-[#07111B]/55 text-[#B7C7D2] hover:border-white/25'
                }`}
                onClick={() => void saveLesson(lesson.no)}
                type="button"
              >
                {lesson.no}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="secondary" disabled={lessonNo <= 1} onClick={() => void saveLesson(lessonNo - 1)}>
            <RotateCcw size={18} />
            이전
          </Button>
          <Button disabled={lessonNo >= 7} onClick={() => void saveLesson(lessonNo + 1)}>
            다음
          </Button>
        </div>
      </Panel>
    </div>
  )
}
