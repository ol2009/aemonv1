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
    <div className="mx-auto max-w-5xl px-5 py-8">
      <section className="border-b border-white/10 pb-6">
        <p className="font-data text-sm text-[#4FE0C0]">{state.className} · 학급 코드 {state.classCode}</p>
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

      <section className="mt-6 flex flex-wrap gap-2">
        <Button onClick={openCurrentLesson}>
          <Play size={18} />
          {lessonNo <= 1 ? '1차시 시작' : `${lessonNo}차시 열기`}
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
      </section>

      <section className="mt-8">
        <p className="font-data text-sm text-[#4FE0C0]">차시 이동</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {v2Lessons.map((lesson) => (
            <button
              key={lesson.no}
              className={`h-11 min-w-11 rounded-xl border px-3 font-black transition ${
                lesson.no === lessonNo ? 'border-[#FFD37A] bg-[#FFD37A] text-[#0A1622]' : 'border-white/10 bg-[#07111B]/55 text-[#B7C7D2] hover:border-white/25'
              }`}
              onClick={() => void saveLesson(lesson.no)}
              type="button"
              title={lesson.title}
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
