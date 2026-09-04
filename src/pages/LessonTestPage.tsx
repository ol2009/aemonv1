import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react'
import { lessonPreviewDefinitions } from '../data/lessonPreview'
import { studentPreviewScreens } from '../data/studentPreview'
import { Button } from '../components/ui'
import { useV2 } from '../state/V2Store'
import { isRemoteReady, updateRemoteLesson } from '../lib/v2Remote'

export function LessonTestPage() {
  const { state, setLesson, setRemoteStatus, mergeClass } = useV2()
  const [lessonNo, setLessonNo] = useState(() => Math.min(5, Math.max(1, state.currentLesson)))
  const [sceneIndex, setSceneIndex] = useState(0)
  const [view, setView] = useState<'teacher' | 'student'>('teacher')
  useEffect(() => {
    if (view !== 'student') return
    // Keep entries made in the student iframe when the parent changes lessons.
    const receiveStudentState = (event: StorageEvent) => {
      if (event.key !== 'aemon.v2.state' || !event.newValue || event.storageArea !== window.localStorage) return
      try {
        const updated = JSON.parse(event.newValue)
        if (updated && updated.classCode === state.classCode) mergeClass(updated)
      } catch {
        // An incomplete browser-storage update should not interrupt previewing.
      }
    }
    window.addEventListener('storage', receiveStudentState)
    return () => window.removeEventListener('storage', receiveStudentState)
  }, [view, state.classCode, mergeClass])
  const lesson = useMemo(
    () => lessonPreviewDefinitions.find((item) => item.lessonNo === lessonNo) ?? lessonPreviewDefinitions[0],
    [lessonNo],
  )
  const screensForLesson = (number: number) => view === 'student' ? studentPreviewScreens[number] : lessonPreviewDefinitions.find((item) => item.lessonNo === number)!.scenes
  const screens = screensForLesson(lessonNo)
  const scene = screens[Math.min(sceneIndex, screens.length - 1)]
  const previewUrl = view === 'student'
    ? `${studentPreviewScreens[lessonNo][sceneIndex].path}&code=${encodeURIComponent(state.classCode)}`
    : `/lesson/${lesson.lessonNo}?preview=1&step=${sceneIndex}`

  const selectLesson = (nextLessonNo: number, nextSceneIndex = 0) => {
    setLessonNo(nextLessonNo)
    setSceneIndex(nextSceneIndex)
    setLesson(nextLessonNo)
    if (state.classId && isRemoteReady()) {
      void updateRemoteLesson({ classId: state.classId, lessonNo: nextLessonNo })
        .catch((error) => setRemoteStatus({ ok: false, message: `수업 진행 상태 저장 실패: ${(error as Error).message}` }))
    }
  }

  const move = (direction: -1 | 1) => {
    const nextIndex = sceneIndex + direction
    if (nextIndex >= 0 && nextIndex < screens.length) {
      setSceneIndex(nextIndex)
      return
    }

    const lessonIndex = lessonPreviewDefinitions.findIndex((item) => item.lessonNo === lesson.lessonNo)
    const nextLesson = lessonPreviewDefinitions[lessonIndex + direction]
    if (!nextLesson) return
    selectLesson(nextLesson.lessonNo, direction > 0 ? 0 : screensForLesson(nextLesson.lessonNo).length - 1)
  }

  return (
    <div className="mx-auto w-full max-w-[1800px] px-4 pb-10">
      <header className="mb-5 border-y border-[var(--border)] bg-[var(--surface)] px-5 py-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-data text-sm font-black text-[var(--aura-ink)]">수업 화면 점검</p>
            <h1 className="font-display mt-2 text-4xl text-[var(--ink)]">1~5차시 전체 장면 보기</h1>
            <p className="mt-2 text-[var(--ink-mute)]">{view === 'teacher' ? '여기에서 선택한 차시와 장면은 실제 수업 진행 상태와 학생 화면에 바로 반영됩니다.' : '실제 학생 화면입니다. 닉네임으로 입장하면 게시판과 참여 화면을 볼 수 있습니다. 제출과 좋아요는 현재 학급에 저장됩니다.'}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={lesson.lessonNo === 1 && sceneIndex === 0} onClick={() => move(-1)}>
              <ArrowLeft size={18} /> 이전 장면
            </Button>
            <Button disabled={lesson.lessonNo === 5 && sceneIndex === screens.length - 1} onClick={() => move(1)}>
              다음 장면 <ArrowRight size={18} />
            </Button>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <Button variant={view === 'teacher' ? 'primary' : 'secondary'} onClick={() => { setView('teacher'); setSceneIndex(0) }}>교사 화면</Button>
          <Button variant={view === 'student' ? 'primary' : 'secondary'} onClick={() => { setView('student'); setSceneIndex(0) }}>학생 화면 · 게시판</Button>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-5">
          {lessonPreviewDefinitions.map((item) => (
            <button
              className={`min-h-12 border px-4 text-left text-sm font-black transition ${
                item.lessonNo === lesson.lessonNo
                  ? 'border-[#D5A632] bg-[#FFF4CC] text-[#6D4B00]'
                  : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink-soft)] hover:border-[#D5A632]'
              }`}
              key={item.lessonNo}
              onClick={() => {
                selectLesson(item.lessonNo)
              }}
              type="button"
            >
              <span className="block">{item.lessonNo}차시</span>
              <span className="mt-1 block text-xs font-semibold opacity-70">{screensForLesson(item.lessonNo).length}장면</span>
            </button>
          ))}
        </div>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="border border-[var(--border)] bg-[var(--surface)] lg:sticky lg:top-3 lg:max-h-[calc(100vh-24px)] lg:overflow-hidden">
          <div className="border-b border-[var(--border)] px-4 py-4">
            <p className="font-data text-xs font-black text-[var(--aura-ink)]">{lesson.lessonNo}차시 · {screens.length}장면</p>
            <h2 className="mt-2 break-keep text-lg font-black leading-7 text-[var(--ink)]">{lesson.title}</h2>
          </div>
          <div className="grid max-h-[58vh] grid-cols-2 gap-1 overflow-y-auto p-2 lg:max-h-[calc(100vh-132px)] lg:grid-cols-1">
            {screens.map((item, index) => (
              <button
                className={`flex min-h-11 items-center gap-3 px-3 py-2 text-left text-sm transition ${
                  index === sceneIndex
                    ? 'bg-[#14394A] font-black text-white'
                    : 'text-[var(--ink-soft)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]'
                }`}
                key={item.key}
                onClick={() => setSceneIndex(index)}
                type="button"
              >
                <span className={`font-data text-xs ${index === sceneIndex ? 'text-[#65E6CA]' : 'text-[var(--ink-mute)]'}`}>{index + 1}</span>
                <span className="break-keep">{item.label}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="min-w-0 overflow-hidden border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
            <div>
              <p className="font-data text-xs font-black text-[var(--aura-ink)]">장면 {sceneIndex + 1} / {screens.length}</p>
              <p className="mt-1 font-black text-[var(--ink)]">{scene.label}</p>
            </div>
            <a className="inline-flex items-center gap-2 text-sm font-black text-[var(--aura-ink)]" href={previewUrl} target="_blank" rel="noreferrer">
              새 창에서 크게 보기 <ExternalLink size={16} />
            </a>
          </div>
          <div className="relative h-[880px] bg-[#EDF5F1]">
            <iframe
              className="h-full w-full border-0"
              key={previewUrl}
              src={previewUrl}
              title={`${lesson.lessonNo}차시 ${scene.label}`}
            />
          </div>
        </section>
      </div>
    </div>
  )
}
