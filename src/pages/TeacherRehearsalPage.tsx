import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock3, MonitorPlay, Play, Users } from 'lucide-react'
import { Button } from '../components/ui'
import { findTeacherLessonGuide, teacherLessonGuides } from '../data/teacherGuides'

export function TeacherRehearsalPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedLesson = Number(searchParams.get('lesson') || 1)
  const lessonNo = Number.isInteger(requestedLesson) && requestedLesson >= 1 && requestedLesson <= 5 ? requestedLesson : 1
  const guide = findTeacherLessonGuide(lessonNo)
  const [sceneIndex, setSceneIndex] = useState(0)
  const scene = guide.moments[sceneIndex]
  const progress = Math.round(((sceneIndex + 1) / guide.moments.length) * 100)

  const selectLesson = (nextLesson: number) => {
    setSceneIndex(0)
    setSearchParams({ lesson: String(nextLesson) })
  }

  const previous = () => {
    if (sceneIndex > 0) {
      setSceneIndex((current) => current - 1)
      return
    }
    if (lessonNo > 1) selectLesson(lessonNo - 1)
  }

  const next = () => {
    if (sceneIndex < guide.moments.length - 1) {
      setSceneIndex((current) => current + 1)
      return
    }
    if (lessonNo < teacherLessonGuides.length) selectLesson(lessonNo + 1)
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <header className="border-b border-white/10 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => navigate('/training')}>
            <ArrowLeft size={18} />
            사전연수
          </Button>
          <Button variant="secondary" onClick={() => navigate(`/lesson/${lessonNo}`)}>
            실제 {lessonNo}차시 열기
            <Play size={18} />
          </Button>
        </div>
        <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="font-data text-sm text-[#4FE0C0]">TEACHER REHEARSAL · 실제 학급 데이터에 저장되지 않습니다</p>
            <h1 className="font-display mt-3 break-keep text-5xl text-[#EAF2F5]">교사 리허설</h1>
            <p className="mt-3 max-w-3xl text-lg leading-8 text-[#B7C7D2]">학생 없이 교사 발문과 화면 전환을 순서대로 연습합니다. 여기서 누르는 이전·다음은 실제 차시 진행도와 게시판에 영향을 주지 않습니다.</p>
          </div>
          <div className="min-w-52">
            <div className="flex justify-between text-xs font-bold text-[#8AA0B0]">
              <span>{sceneIndex + 1}/{guide.moments.length}</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden bg-white/10">
              <div className="h-full bg-[#FFD37A] transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </header>

      <nav className="mt-5 flex gap-2 overflow-x-auto pb-2" aria-label="리허설 차시 선택">
        {teacherLessonGuides.map((lesson) => (
          <button
            key={lesson.no}
            className={`min-h-12 shrink-0 border px-5 text-sm font-black transition ${
              lessonNo === lesson.no
                ? 'border-[#FFD37A] bg-[#FFD37A]/12 text-[#FFD37A]'
                : 'border-white/10 bg-[#102438]/70 text-[#B7C7D2] hover:border-white/25 hover:text-white'
            }`}
            onClick={() => selectLesson(lesson.no)}
            type="button"
          >
            {lesson.no}차시
          </button>
        ))}
      </nav>

      <section className="mt-5 border border-white/10 bg-[#102438]/82">
        <div className="grid border-b border-white/10 lg:grid-cols-[1fr_300px]">
          <div className="px-6 py-6 sm:px-8">
            <p className="font-data text-xs text-[#4FE0C0]">LESSON {guide.no}</p>
            <h2 className="font-display mt-2 break-keep text-4xl text-[#EAF2F5]">{guide.title}</h2>
            <p className="mt-3 text-base leading-7 text-[#B7C7D2]">{guide.focus}</p>
          </div>
          <div className="border-t border-white/10 px-6 py-6 lg:border-l lg:border-t-0">
            <p className="flex items-center gap-2 font-data text-xs text-[#FFD37A]"><Clock3 size={15} /> {scene.time}</p>
            <p className="font-display mt-2 text-3xl text-[#EAF2F5]">{scene.title}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1.15fr_.85fr]">
          <div className="min-h-[430px] px-6 py-8 sm:px-10">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center bg-[#4FE0C0]/12 text-[#4FE0C0]"><MonitorPlay size={23} /></span>
              <div>
                <p className="font-data text-xs text-[#4FE0C0]">교사 화면</p>
                <p className="mt-1 font-bold text-[#D8E3E8]">{scene.screen}</p>
              </div>
            </div>

            <div className="mt-8 border-y border-white/10 py-7">
              <p className="font-data text-xs text-[#75B7FF]">교사가 할 일</p>
              <p className="mt-3 text-xl font-bold leading-9 text-[#EAF2F5]">{scene.teacher}</p>
            </div>

            {scene.prompt ? (
              <div className="mt-7 bg-[#07111B]/78 px-6 py-6">
                <p className="font-data text-xs text-[#FFD37A]">단독 발문</p>
                <p className="font-display mt-3 break-keep text-3xl leading-snug text-[#FFD37A]">“{scene.prompt}”</p>
                <p className="mt-3 text-sm text-[#8AA0B0]">질문 뒤 설명을 덧붙이지 말고 학생의 생각을 먼저 기다립니다.</p>
              </div>
            ) : null}
          </div>

          <aside className="border-t border-white/10 bg-[#07111B]/45 px-6 py-8 lg:border-l lg:border-t-0">
            <p className="flex items-center gap-2 font-data text-xs text-[#4FE0C0]"><Users size={15} /> 학생 활동</p>
            <p className="mt-4 text-lg leading-8 text-[#D8E3E8]">{scene.students}</p>

            {scene.tip ? (
              <div className="mt-7 border-l-2 border-[#4FE0C0] pl-4">
                <p className="font-data text-xs text-[#4FE0C0]">운영 팁</p>
                <p className="mt-2 text-sm leading-6 text-[#A9DCCD]">{scene.tip}</p>
              </div>
            ) : null}

            <div className="mt-8 border-t border-white/10 pt-6">
              <p className="flex items-center gap-2 font-data text-xs text-[#8AA0B0]"><BookOpen size={15} /> 이 장면에서 확인</p>
              <p className="mt-3 flex gap-2 text-sm leading-6 text-[#B7C7D2]"><CheckCircle2 className="mt-1 shrink-0 text-[#FFD37A]" size={15} /> 학생이 말하거나 입력할 시간을 확보했는가?</p>
              <p className="mt-3 flex gap-2 text-sm leading-6 text-[#B7C7D2]"><CheckCircle2 className="mt-1 shrink-0 text-[#FFD37A]" size={15} /> 교사 설명보다 학생의 근거를 먼저 들었는가?</p>
            </div>
          </aside>
        </div>
      </section>

      <footer className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-5">
        <Button disabled={lessonNo === 1 && sceneIndex === 0} variant="secondary" onClick={previous}>
          <ArrowLeft size={18} />
          이전
        </Button>
        <p className="hidden text-sm font-bold text-[#8AA0B0] sm:block">{guide.no}차시 · {scene.title}</p>
        <Button disabled={lessonNo === teacherLessonGuides.length && sceneIndex === guide.moments.length - 1} onClick={next}>
          다음
          <ArrowRight size={18} />
        </Button>
      </footer>
    </div>
  )
}
