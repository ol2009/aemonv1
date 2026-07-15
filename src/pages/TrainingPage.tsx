import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, CheckCircle2, ClipboardCheck } from 'lucide-react'
import { Button } from '../components/ui'
import { teacherLessonGuides } from '../data/teacherGuides'

type TrainingTab = 'introduction' | 'lesson-plans'

const tabs: Array<{ id: TrainingTab; label: string; icon: typeof BookOpen }> = [
  { id: 'introduction', label: '프로젝트 소개', icon: BookOpen },
  { id: 'lesson-plans', label: '수업 과정안', icon: ClipboardCheck },
]

function IntroductionTab() {
  return (
    <article className="mt-8">
      <header className="border-b border-white/10 pb-7">
        <p className="font-data text-sm text-[#4FE0C0]">PROJECT INTRODUCTION</p>
        <h2 className="font-display mt-3 text-4xl leading-tight text-[#EAF2F5] sm:text-5xl">에아몬 프로젝트 — 왜 이 수업이어야 하는가</h2>
      </header>

      {[
        {
          no: '1',
          title: '아이들은 AI와 함께 살아갈 첫 세대입니다',
          paragraphs: [
            '지금의 초등학생은 AI와 함께 성장하고, AI와 함께 일하며, AI가 내리는 판단 속에서 살아갈 첫 세대입니다. AI는 채용을 결정하고, 정보를 걸러내고, 여론을 움직입니다.',
            'AI를 이해하지 못하는 사람은 AI가 만드는 세상을 그저 따라가게 됩니다. 그래서 사용법을 넘어 AI가 왜 그런 판단을 하는지 이해하는 리터러시 교육이 필요합니다.',
          ],
        },
        {
          no: '2',
          title: 'AI 사용 예절을 넘어 가치정렬을 다룹니다',
          paragraphs: [
            '“AI를 안전하게 사용해요”, “딥페이크를 만들면 안 돼요”도 필요하지만 이것만으로는 AI의 구조를 이해하기 어렵습니다.',
            '가치정렬(Value Alignment)은 AI에게 인간의 가치를 어떻게 심을 것인지, 그리고 그 기준이 실제 행동에서 제대로 작동하는지를 다루는 문제입니다. 에아몬 프로젝트는 이 어려운 문제를 초등 교실에서 경험 가능한 형태로 바꿉니다.',
          ],
        },
        {
          no: '3',
          title: '실제 AI의 실패를 자기 반 AI의 문제로 경험합니다',
          paragraphs: [
            '학생들은 목표를 잘못 이해한 AI, 위험한 명령을 그대로 수행한 AI, 아첨만 한 AI, 편향된 데이터를 배운 AI를 차례로 만납니다.',
            '문제를 본 뒤 가치 코드를 발의하고, 토론하고, 투표로 채택합니다. 같은 질문을 다시 시험하면 AI의 답이 달라집니다. 학생은 AI 윤리를 듣는 사람이 아니라 직접 기준을 설계하고 검증하는 연구자가 됩니다.',
          ],
        },
        {
          no: '4',
          title: 'AI의 기준을 함께 정하는 민주적 경험입니다',
          paragraphs: [
            '실제 AI의 기준은 대개 소수의 개발자가 정합니다. 그러나 에아몬의 기준은 학급 구성원 모두가 의견을 내고 투표해 결정합니다.',
            '“AI의 규칙은 누군가가 정해 주는 것이 아니라 우리가 함께 정할 수 있다”는 감각이 AI 시대 시민성의 출발점입니다.',
          ],
        },
      ].map((section) => (
        <section key={section.no} className="grid gap-5 border-b border-white/10 py-9 last:border-b-0 md:grid-cols-[88px_1fr]">
          <p className="font-display text-6xl text-[#FFD37A]">{section.no}</p>
          <div>
            <h3 className="font-display break-keep text-3xl leading-tight text-[#EAF2F5]">{section.title}</h3>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-4 text-lg leading-9 text-[#B7C7D2]">{paragraph}</p>
            ))}
          </div>
        </section>
      ))}
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
          <p className="font-data text-sm text-[#4FE0C0]">LESSON {guide.no} · {guide.duration}</p>
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

      <section className="border-b border-white/10 py-7">
        <p className="font-data text-xs text-[#4FE0C0]">수업 전 준비</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {guide.preparation.map((item) => (
            <div key={item} className="border border-white/10 bg-[#102438]/55 px-4 py-4 text-sm leading-6 text-[#D8E3E8]">{item}</div>
          ))}
        </div>
      </section>

      <section className="py-8">
        <div>
          <p className="font-data text-xs text-[#4FE0C0]">40-MINUTE FLOW</p>
          <h3 className="font-display mt-2 text-3xl text-[#EAF2F5]">교실 수업 흐름</h3>
        </div>

        <div className="mt-6 border-t border-white/10">
          {guide.moments.map((moment, index) => (
            <article key={`${moment.time}-${moment.title}`} className="grid gap-4 border-b border-white/10 py-6 lg:grid-cols-[120px_1fr_1fr]">
              <div>
                <p className="font-data text-xs text-[#8AA0B0]">STEP {String(index + 1).padStart(2, '0')}</p>
                <p className="font-display mt-2 text-2xl text-[#FFD37A]">{moment.time}</p>
              </div>
              <div>
                <h4 className="font-display break-keep text-2xl text-[#EAF2F5]">{moment.title}</h4>
                <p className="mt-2 text-sm font-bold text-[#75B7FF]">화면 · {moment.screen}</p>
                <p className="mt-4 text-base leading-7 text-[#B7C7D2]">{moment.teacher}</p>
                {moment.prompt ? (
                  <blockquote className="mt-4 border-l-2 border-[#FFD37A] pl-4 text-base font-black leading-7 text-[#FFD37A]">“{moment.prompt}”</blockquote>
                ) : null}
              </div>
              <div className="border-l border-white/10 pl-0 lg:pl-5">
                <p className="font-data text-xs text-[#4FE0C0]">STUDENT ACTION</p>
                <p className="mt-3 text-base leading-7 text-[#D8E3E8]">{moment.students}</p>
                {moment.tip ? <p className="mt-4 bg-[#4FE0C0]/8 px-4 py-3 text-sm leading-6 text-[#A9DCCD]">운영 팁 · {moment.tip}</p> : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 py-7">
        <p className="font-data text-xs text-[#FFD37A]">수업 종료 전 확인</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {guide.finish.map((item) => (
            <p key={item} className="flex gap-2 text-sm leading-6 text-[#D8E3E8]">
              <CheckCircle2 className="mt-1 shrink-0 text-[#FFD37A]" size={16} />
              <span>{item}</span>
            </p>
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

      <section className="relative min-h-[430px] overflow-hidden border-y border-white/10 bg-[#071A29]">
        <img
          className="absolute right-[-18%] top-1/2 w-[min(88vw,620px)] -translate-y-1/2 object-contain opacity-45 sm:right-[-5%] sm:w-[min(58vw,620px)] sm:opacity-80 lg:right-[3%] lg:opacity-100"
          src="/aemon/v3/stage-0-egg.gif?hero=20260714"
          alt="진화 전 알 단계 에아몬"
          style={{ filter: 'drop-shadow(0 0 56px rgba(79,224,192,.42))', imageRendering: 'pixelated' }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,12,20,.98)_0%,rgba(4,12,20,.92)_48%,rgba(4,12,20,.12)_78%,rgba(4,12,20,.03)_100%),linear-gradient(180deg,rgba(4,12,20,.04),rgba(4,12,20,.72))]" />
        <div className="relative flex min-h-[430px] max-w-4xl flex-col justify-end px-6 py-10 sm:px-10">
          <p className="font-data text-sm text-[#4FE0C0]">AEMON TEACHER TRAINING</p>
          <h1 className="font-display mt-4 break-keep text-4xl leading-tight text-[#EAF2F5] sm:text-6xl">진정한 인공지능 윤리 교육, 인공지능 가치정렬.</h1>
          <p className="font-display mt-4 break-keep text-3xl leading-tight text-[#FFD37A] sm:text-4xl">이제 우리 반 아이들이 직접 경험합니다.</p>
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
