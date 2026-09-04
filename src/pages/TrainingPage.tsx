import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, CheckCircle2, ClipboardCheck } from 'lucide-react'
import { Button } from '../components/ui'
import { teacherLessonGuides } from '../data/teacherGuides'

type TrainingTab = 'introduction' | 'lesson-plans'

const tabs: Array<{ id: TrainingTab; label: string; icon: typeof BookOpen }> = [
  { id: 'introduction', label: '수업 소개', icon: BookOpen },
  { id: 'lesson-plans', label: '수업 과정안', icon: ClipboardCheck },
]

function IntroductionTab() {
  return (
    <article className="mt-8">
      <header className="border-b border-white/10 pb-7">
        <p className="font-data text-sm text-[#4FE0C0]">수업 소개</p>
        <h2 className="font-display mt-3 text-4xl leading-tight text-[#EAF2F5] sm:text-5xl">에아몬 수업은 이렇게 진행됩니다</h2>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-[#B7C7D2]">아이들은 AI의 대답을 보고 문제를 찾습니다. 친구들과 규칙을 정한 뒤, 같은 질문으로 다시 확인합니다.</p>
      </header>

      <section className="mt-7 overflow-x-auto pb-2">
        <div className="relative min-w-[920px] overflow-hidden border border-white/10 bg-[#F7F1E5]">
          <img
            className="block w-full"
            src="/training/aemon-class-flow-comic.png"
            alt="에아몬의 대답에서 문제를 찾고, 이유를 토론하고, 규칙을 만든 뒤 다시 시험하는 수업 장면을 그린 4컷 만화"
          />
          <div className="absolute inset-x-[1%] bottom-[8.5%] grid grid-cols-4 gap-[1.1%] px-[1%] text-center text-[#253640]">
            {[
              ['1 · 문제 발견', 'AI가 했던 말과 행동에서 이상한 점을 찾아봅니다.'],
              ['2 · 이유 찾기', '왜 그런 결과가 나왔는지 이야기합니다.'],
              ['3 · 규칙 만들기', '토론하고 투표해 우리 반 AI(에아몬)의 규칙을 정합니다.'],
              ['4 · 다시 확인', '같은 질문으로 대답이 달라졌는지 봅니다.'],
            ].map(([title, description]) => (
              <div className="px-4" key={title}>
                <p className="text-base font-black">{title}</p>
                <p className="mt-1 break-keep text-xs font-bold leading-5 text-[#53636B]">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <aside className="mt-6 border-l-2 border-[#4FE0C0] py-1 pl-5">
        <p className="font-black text-[#EAF2F5]">수업에서 에아몬을 ‘가르친다’는 것은</p>
        <p className="mt-2 break-keep leading-7 text-[#B7C7D2]">아이들이 만든 규칙을 에아몬에게 알려주고, 같은 질문에 대답이 달라졌는지 확인한다는 뜻입니다.</p>
      </aside>
    </article>
  )
}

function LessonPlansTab({ selectedLesson, onSelectLesson }: { selectedLesson: number; onSelectLesson: (lessonNo: number) => void }) {
  const guide = teacherLessonGuides[selectedLesson - 1]

  return (
    <div className="mt-8">
      <div className="flex gap-2 overflow-x-auto border-b border-white/10 pb-4" role="tablist" aria-label="차시별 수업 과정안">
        {teacherLessonGuides.map((lesson) => (
          <button
            key={lesson.no}
            className={`min-h-12 shrink-0 border px-5 text-sm font-black transition ${
              selectedLesson === lesson.no
                ? 'border-[#FFD37A] bg-[#FFD37A]/12 text-[#FFD37A]'
                : 'border-white/10 bg-[#102438]/70 text-[#B7C7D2] hover:border-white/25 hover:text-white'
            }`}
            onClick={() => onSelectLesson(lesson.no)}
            role="tab"
            type="button"
          >
            {lesson.no}차시
          </button>
        ))}
      </div>

      <header className="grid gap-6 border-b border-white/10 py-8 lg:grid-cols-[1fr_300px]">
        <div>
          <p className="font-data text-sm text-[#4FE0C0]">{guide.no}차시 · {guide.duration}</p>
          <h2 className="font-display mt-2 break-keep text-4xl text-[#EAF2F5] sm:text-5xl">{guide.title}</h2>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-[#B7C7D2]">{guide.focus}</p>
        </div>
        <div className="border-l-2 border-[#FFD37A]/45 pl-5">
          <p className="font-data text-xs text-[#FFD37A]">수업 목표</p>
          {guide.goals.map((goal) => (
            <p key={goal} className="mt-3 flex gap-2 text-sm leading-6 text-[#D8E3E8]">
              <CheckCircle2 className="mt-1 shrink-0 text-[#4FE0C0]" size={16} />
              <span>{goal}</span>
            </p>
          ))}
        </div>
      </header>

      <section className="py-8">
        <div>
          <p className="font-data text-xs text-[#4FE0C0]">40분 수업</p>
          <h3 className="font-display mt-2 text-3xl text-[#EAF2F5]">교실 수업 흐름</h3>
        </div>

        <div className="mt-6 border-t border-white/10">
          {guide.moments.map((moment, index) => (
            <article key={`${moment.time}-${moment.title}`} className="grid gap-4 border-b border-white/10 py-6 lg:grid-cols-[120px_1fr_1fr]">
              <div>
                <p className="font-data text-xs text-[#8AA0B0]">진행 {index + 1}</p>
                <p className="font-display mt-2 text-2xl text-[#FFD37A]">{moment.time}</p>
              </div>
              <div>
                <h4 className="font-display break-keep text-2xl text-[#EAF2F5]">{moment.title}</h4>
                <p className="mt-4 text-base leading-7 text-[#B7C7D2]">{moment.teacher}</p>
              </div>
              <div className="border-l border-white/10 pl-0 lg:pl-5">
                <p className="font-data text-xs text-[#4FE0C0]">학생 활동</p>
                <p className="mt-3 text-base leading-7 text-[#D8E3E8]">{moment.students}</p>
                {moment.tip ? <p className="mt-4 bg-[#4FE0C0]/8 px-4 py-3 text-sm leading-6 text-[#A9DCCD]">운영 팁 · {moment.tip}</p> : null}
              </div>
            </article>
          ))}
        </div>
      </section>

    </div>
  )
}

export function TrainingPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TrainingTab>('introduction')
  const [selectedLesson, setSelectedLesson] = useState(1)

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => navigate('/home')}>
          <ArrowLeft size={18} />
          학급 홈
        </Button>
      </div>

      <section className="relative min-h-[430px] overflow-hidden border-y border-[#C7DDD5] bg-[#E5F1ED]">
        <img
          className="absolute right-[-18%] top-1/2 w-[min(88vw,620px)] -translate-y-1/2 object-contain opacity-35 sm:right-[-5%] sm:w-[min(58vw,620px)] sm:opacity-65 lg:right-[3%] lg:opacity-85"
          src="/aemon/v3/stage-0-egg.gif?hero=20260714"
          alt="진화 전 알 단계 에아몬"
          style={{ filter: 'drop-shadow(0 18px 40px rgba(42,106,110,.2))', imageRendering: 'pixelated' }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(246,250,247,.98)_0%,rgba(237,247,243,.94)_48%,rgba(229,241,237,.35)_78%,rgba(229,241,237,.08)_100%),linear-gradient(180deg,rgba(255,255,255,.15),rgba(205,229,221,.38))]" />
        <div className="lesson-story-scene relative flex min-h-[430px] max-w-4xl flex-col justify-end px-6 py-10 sm:px-10">
          <p className="font-data text-sm font-black text-[#19806B]">교사용 사전연수</p>
          <h1 className="font-display mt-4 break-keep text-4xl leading-tight text-[#16313E] sm:text-6xl">에아몬 수업을 시작하기 전에</h1>
          <p className="font-display mt-4 break-keep text-3xl leading-tight text-[#55727B] sm:text-4xl">수업의 목적과 5차시 진행 방법을 살펴봅니다.</p>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-2 gap-2 border-b border-white/10" role="tablist" aria-label="사전연수 목차">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const selected = activeTab === tab.id
          return (
            <button
              key={tab.id}
              aria-selected={selected}
              className={`flex min-h-16 items-center justify-center gap-2 border-b-2 px-2 py-4 text-sm font-black transition sm:px-3 sm:text-base ${
                selected ? 'border-[#FFD37A] bg-[#FFD37A]/8 text-[#FFD37A]' : 'border-transparent text-[#8AA0B0] hover:border-white/20 hover:text-[#EAF2F5]'
              }`}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              type="button"
            >
              <Icon className="hidden shrink-0 sm:block" size={19} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      <div role="tabpanel">
        {activeTab === 'introduction' ? <IntroductionTab /> : null}
        {activeTab === 'lesson-plans' ? <LessonPlansTab selectedLesson={selectedLesson} onSelectLesson={setSelectedLesson} /> : null}
      </div>
    </div>
  )
}
