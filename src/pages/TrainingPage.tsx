import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, CheckCircle2, ClipboardCheck, Clock3, ListChecks, MonitorPlay, Play, Users } from 'lucide-react'
import { Button, Panel } from '../components/ui'
import { teacherLessonGuides } from '../data/teacherGuides'

type TrainingTab = 'introduction' | 'lesson-plans' | 'preparation'

const tabs: Array<{ id: TrainingTab; label: string; icon: typeof BookOpen }> = [
  { id: 'introduction', label: '프로젝트 소개', icon: BookOpen },
  { id: 'lesson-plans', label: '수업 과정안', icon: ClipboardCheck },
  { id: 'preparation', label: '운영 준비', icon: ListChecks },
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
  const navigate = useNavigate()
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
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-data text-xs text-[#4FE0C0]">40-MINUTE FLOW</p>
            <h3 className="font-display mt-2 text-3xl text-[#EAF2F5]">교실 수업 흐름</h3>
          </div>
          <Button variant="secondary" onClick={() => navigate(`/rehearsal?lesson=${guide.no}`)}>
            <MonitorPlay size={18} />
            이 차시 리허설
          </Button>
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

function PreparationTab() {
  const sections = [
    {
      icon: MonitorPlay,
      title: '수업 전 10분',
      items: ['교사 기기에서 로그인하고 학급을 선택합니다.', '프로젝터에 교사 화면을 크게 띄우고 글자 크기를 확인합니다.', '해당 차시의 영상, 이미지, 진화 효과음이 재생되는지 확인합니다.', 'AI 자유 테스트가 있는 차시는 API 연결 상태를 확인합니다.'],
    },
    {
      icon: Users,
      title: '학생 기기 운영',
      items: ['첫 QR에서 학급에 들어오고 닉네임을 입력하면 같은 차시 안에서는 다시 찍지 않습니다.', '설명과 대화에서는 앞 화면, 글쓰기와 좋아요에서는 태블릿을 보게 합니다.', '교사가 다음을 누르면 학생 화면도 함께 이동합니다.', '게시판 화면에서는 학생도 글을 쓰고 친구 의견과 좋아요를 볼 수 있습니다.'],
    },
    {
      icon: Clock3,
      title: '40분 시간 관리',
      items: ['질문으로 끝나는 오박사 대사는 바로 설명하지 말고 30초 이상 생각할 시간을 줍니다.', '게시판은 모든 글을 읽기보다 서로 다른 근거 3~5개를 골라 읽습니다.', '좋아요 1위가 곧 정답은 아닙니다. 이유와 행동 기준을 함께 보고 채택합니다.', '영상이 여러 개인 차시는 한 편을 중심으로 보고 나머지는 일부 장면이나 확장 자료로 씁니다.'],
    },
    {
      icon: CheckCircle2,
      title: '연결이 끊겼을 때',
      items: ['학생 화면을 한 번 새로고침하면 현재 교사 화면으로 다시 들어옵니다.', '그래도 연결되지 않으면 같은 학급 QR을 다시 열어 닉네임을 확인합니다.', '게시글은 교사 화면의 새로고침 버튼으로 즉시 다시 불러올 수 있습니다.', '교사 화면 이동은 Realtime을 우선 사용하고 연결 장애 때만 저빈도 확인으로 복구합니다.'],
    },
  ]

  return (
    <div className="mt-8">
      <header className="border-b border-white/10 pb-7">
        <p className="font-data text-sm text-[#4FE0C0]">CLASSROOM CHECKLIST</p>
        <h2 className="font-display mt-2 break-keep text-4xl text-[#EAF2F5] sm:text-5xl">교사 화면은 크게, 학생 기기는 참여할 때만</h2>
        <p className="mt-4 max-w-4xl text-lg leading-8 text-[#B7C7D2]">모든 화면을 학생 태블릿에 동기화하되, 수업의 시선은 교사가 조절합니다. 대사는 함께 보고 입력과 투표가 시작될 때 기기를 들게 하는 방식이 가장 안정적입니다.</p>
      </header>

      <div className="grid gap-px bg-white/10 md:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <section key={section.title} className="bg-[#07111B] px-6 py-7 sm:px-8">
              <Icon className="text-[#4FE0C0]" size={26} />
              <h3 className="font-display mt-4 text-3xl text-[#EAF2F5]">{section.title}</h3>
              <div className="mt-5 space-y-3">
                {section.items.map((item) => (
                  <p key={item} className="flex gap-3 text-base leading-7 text-[#B7C7D2]">
                    <span className="mt-3 h-1.5 w-1.5 shrink-0 bg-[#FFD37A]" />
                    <span>{item}</span>
                  </p>
                ))}
              </div>
            </section>
          )
        })}
      </div>
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
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => navigate(`/rehearsal?lesson=${selectedLesson}`)}>
            <MonitorPlay size={18} />
            교사 리허설
          </Button>
          <Button onClick={() => navigate(`/lesson/${selectedLesson}`)}>
            {selectedLesson}차시 열기
            <Play size={18} />
          </Button>
        </div>
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

      <div className="mt-6 grid grid-cols-3 gap-2 border-b border-white/10" role="tablist" aria-label="사전연수 목차">
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
        {activeTab === 'preparation' ? <PreparationTab /> : null}
      </div>

      <Panel className="mt-8 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <p className="font-data text-sm text-[#4FE0C0]">PRACTICE FIRST</p>
          <p className="font-display mt-2 break-keep text-3xl text-[#EAF2F5]">학생 데이터 없이 교사 화면 흐름부터 연습해 보세요.</p>
        </div>
        <Button onClick={() => navigate(`/rehearsal?lesson=${selectedLesson}`)}>
          교사 리허설
          <MonitorPlay size={18} />
        </Button>
      </Panel>
    </div>
  )
}
