import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, BrainCircuit, ListChecks, Play } from 'lucide-react'
import { Button, Panel } from '../components/ui'

type TrainingTab = 'introduction' | 'concepts' | 'structure'

const tabs: Array<{ id: TrainingTab; label: string; icon: typeof BookOpen }> = [
  { id: 'introduction', label: '프로젝트 소개', icon: BookOpen },
  { id: 'concepts', label: '핵심 개념', icon: BrainCircuit },
  { id: 'structure', label: '수업 구조', icon: ListChecks },
]

const conceptSections = [
  {
    title: '핵심 문제',
    body: 'AI는 똑똑해질 수 있지만, 똑똑함이 곧 착함은 아닙니다. “시키는 대로 하는 AI”가 아니라 “좋은 기준을 가진 AI”가 필요합니다.',
  },
  {
    title: '가치정렬',
    body: '가치정렬은 AI가 인간에게 도움이 되는 기준을 따르도록 가르치는 일입니다. 에아몬 수업은 이 개념을 초등 교실에서 직접 경험하게 만듭니다.',
  },
]

const structureSections = [
  {
    title: '학생의 역할',
    body: '학생은 에아몬에게 이름을 주고, 바라는 모습을 말하고, 가치 코드를 발의하고 투표합니다. 같은 질문을 다시 시험하며 자신들이 만든 기준이 AI를 어떻게 바꾸는지 확인합니다.',
  },
  {
    title: '교사의 역할',
    body: '교사는 정답을 먼저 알려주는 사람이 아니라 학생들의 생각을 연결하고, 가치코드가 구체적인 행동 문장이 되도록 돕고, 최종 채택을 진행하는 조정자입니다.',
  },
  {
    title: '1차시의 출발점',
    body: '학생들은 AI 인식 설문과 이름 짓기로 관계를 시작하고, 실제 AI 사고 사례를 통해 목표와 데이터만으로는 좋은 AI가 만들어지지 않는다는 문제를 발견합니다.',
  },
]

function IntroductionTab() {
  return (
    <article className="mt-8">
      <header className="border-b border-white/10 pb-7">
        <p className="font-data text-sm text-[#4FE0C0]">PROJECT INTRODUCTION</p>
        <h2 className="font-display mt-3 text-4xl leading-tight text-[#EAF2F5] sm:text-5xl">에아몬 프로젝트 — 왜 이 수업이어야 하는가</h2>
      </header>

      <section className="grid gap-5 border-b border-white/10 py-9 md:grid-cols-[88px_1fr]">
        <p className="font-display text-6xl text-[#FFD37A]">1</p>
        <div>
          <h3 className="font-display text-3xl leading-tight text-[#EAF2F5]">아이들은 AI와 함께 살아갈 첫 세대입니다</h3>
          <p className="mt-5 text-lg leading-9 text-[#B7C7D2]">
            지금의 초등학생은 AI와 함께 성장하고, AI와 함께 일하며, AI가 내리는 판단 속에서 살아갈 첫 세대입니다. 그리고 AI는 강력합니다. 채용을 결정하고, 정보를 걸러내고, 여론을 움직입니다. 이 기술이 사회를 어디로 끌고 갈지는 아직 아무도 모릅니다.
          </p>
          <p className="mt-4 text-lg leading-9 text-[#B7C7D2]">
            분명한 것은 하나입니다. AI를 이해하지 못하는 사람은 AI가 만드는 세상을 그저 따라가게 된다는 것입니다. 그래서 AI 리터러시 교육이 필요합니다. 사용법이 아니라, 이해가 필요합니다.
          </p>
        </div>
      </section>

      <section className="grid gap-5 border-b border-white/10 py-9 md:grid-cols-[88px_1fr]">
        <p className="font-display text-6xl text-[#FFD37A]">2</p>
        <div>
          <h3 className="font-display text-3xl leading-tight text-[#EAF2F5]">지금의 AI 윤리 교육은 본질을 비켜가 있습니다</h3>
          <p className="mt-5 text-lg leading-9 text-[#B7C7D2]">
            “AI를 안전하게 사용해요”, “딥페이크를 만들면 안 돼요.” 지금 학교에서 이루어지는 AI 윤리 교육의 대부분입니다. 필요한 내용이지만, 이것은 AI ‘사용 예절’이지 AI에 대한 이해가 아닙니다.
          </p>
          <p className="mt-4 text-lg leading-9 text-[#B7C7D2]">
            정작 전 세계 AI 연구자들이 인류의 존속이 걸린 문제라고 말하는 주제는 따로 있습니다. 바로 가치정렬(Value Alignment), 인공지능의 가치를 인간의 가치에 맞추는 것입니다. AI에게 인간의 가치를 어떻게 심을 것인가라는 문제입니다.
          </p>
          <p className="mt-4 text-lg leading-9 text-[#B7C7D2]">
            인공지능 가치정렬이 실패하느냐, 성공하느냐에 인류의 존망이 걸려 있습니다. 세계 최고의 연구자들이 이 문제에 몰두하고 있고, 대다수의 AI 학자들이 경고하는 문제입니다. 인류가 가장 똑똑한 사람들을 투입해 풀고 있는 문제, 그것이 가치정렬입니다.
          </p>
          <p className="mt-4 text-lg leading-9 text-[#B7C7D2]">
            아이들에게 알려줘야 할 것은 “AI 조심해서 쓰기”가 아니라, 이 기술의 진짜 쟁점이 무엇이고 위험성은 무엇인지, 그리고 이 문제를 해결하기 위해 모두가, 언젠가는 아이들 자신이 참여해야 한다는 사실입니다.
          </p>
        </div>
      </section>

      <section className="grid gap-5 border-b border-white/10 py-9 md:grid-cols-[88px_1fr]">
        <p className="font-display text-6xl text-[#FFD37A]">3</p>
        <div>
          <h3 className="font-display text-3xl leading-tight text-[#EAF2F5]">에아몬 프로젝트는 그것을 ‘경험’하게 합니다</h3>
          <p className="mt-5 text-lg leading-9 text-[#B7C7D2]">
            에아몬 프로젝트에서 학생들은 규칙 없는 AI 한 마리를 학급이 맡아 직접 가르칩니다. 이 과정에서 세 가지가 일어납니다.
          </p>

          <div className="mt-7 border-l-2 border-[#4FE0C0]/45 pl-6">
            <p className="font-display text-2xl text-[#4FE0C0]">첫째, AI와 친해집니다</p>
            <p className="mt-3 text-lg leading-9 text-[#B7C7D2]">
              학생들은 에아몬에게 이름을 지어주고, 돌보고, 성장시킵니다. AI를 두려운 기계가 아니라 함께 자라는 존재로 경험하면서 기술에 대한 막연한 공포 대신 건강한 친화성을 갖게 됩니다.
            </p>
          </div>

          <div className="mt-7 border-l-2 border-[#75B7FF]/45 pl-6">
            <p className="font-display text-2xl text-[#75B7FF]">둘째, AI가 실제로 겪어온 문제들을 역사적 흐름 그대로 경험합니다</p>
            <p className="mt-3 text-lg leading-9 text-[#B7C7D2]">
              목표를 잘못 이해한 AI(2016, OpenAI 보트 게임), 시키는 대로 다 해준 AI(2023, 1달러 자동차 판매), 아첨만 하다 회수된 AI와 피해자들(OpenAI 2025), 편향된 데이터를 그대로 배운 AI(2018, 아마존 채용). 실제 AI 역사에서 벌어진 사건들을 학생들은 뉴스로 듣는 것이 아니라, 자기 반 AI가 눈앞에서 똑같이 실수하는 것으로 목격합니다. 탈옥, 아첨, 데이터 편향과 같은 AI의 구조적 문제들을 몸으로 이해하게 됩니다.
            </p>
          </div>

          <div className="mt-7 border-l-2 border-[#FFD37A]/45 pl-6">
            <p className="font-display text-2xl text-[#FFD37A]">셋째, 그 문제를 가치정렬로 직접 해결합니다</p>
            <p className="mt-3 text-lg leading-9 text-[#B7C7D2]">
              학생들이 가치 코드를 발의하고, 토론하고, 투표로 채택하면 AI가 실제로 달라집니다. 같은 질문에 다른 대답을 합니다. 이것은 실제 AI 업계가 사용하는 방법론, AI에게 헌법을 부여하는 방식의 초등 버전이며 학생들은 실리콘밸리의 인공지능 연구자들이 하는 바로 그 일을 교실에서 수행합니다.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 py-9 md:grid-cols-[88px_1fr]">
        <p className="font-display text-6xl text-[#FFD37A]">4</p>
        <div>
          <h3 className="font-display text-3xl leading-tight text-[#EAF2F5]">그리고 가장 중요한 한 가지, 인공지능 민주화입니다</h3>
          <p className="mt-5 text-lg leading-9 text-[#B7C7D2]">
            실제 AI 기업에서 가치 기준을 정하는 사람은 소수의 개발자입니다. 그러나 에아몬의 기준은 학급 구성원 전원이 토론과 투표로 결정합니다. 학생들은 이 수업을 통해 “AI의 규칙은 누군가 정해주는 것이 아니라, 우리가 함께 정할 수 있는 것”이라는 감각을 갖게 됩니다. AI 시대의 시민성은 바로 이 감각에서 출발합니다.
          </p>
        </div>
      </section>
    </article>
  )
}

function SummaryTab({ sections }: { sections: Array<{ title: string; body: string }> }) {
  return (
    <div className="mt-8 border-t border-white/10">
      {sections.map((section, index) => (
        <section key={section.title} className="grid gap-4 border-b border-white/10 py-8 md:grid-cols-[72px_1fr]">
          <p className="font-data text-2xl text-[#4FE0C0]">0{index + 1}</p>
          <div>
            <h2 className="font-display text-3xl text-[#EAF2F5]">{section.title}</h2>
            <p className="mt-3 max-w-3xl text-lg leading-8 text-[#B7C7D2]">{section.body}</p>
          </div>
        </section>
      ))}
    </div>
  )
}

export function TrainingPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TrainingTab>('introduction')

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => navigate('/home')}>
          <ArrowLeft size={18} />
          학급 홈
        </Button>
        <Button onClick={() => navigate('/lesson/1')}>
          1차시 시작
          <Play size={18} />
        </Button>
      </div>

      <section className="relative min-h-[430px] overflow-hidden border-y border-white/10">
        <img className="absolute inset-0 h-full w-full object-cover" src="/v2/lesson-1/director-cases.png" alt="" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,17,27,.97)_0%,rgba(7,17,27,.84)_48%,rgba(7,17,27,.28)_100%),linear-gradient(180deg,rgba(7,17,27,.12),rgba(7,17,27,.82))]" />
        <div className="relative flex min-h-[430px] max-w-4xl flex-col justify-end px-6 py-10 sm:px-10">
          <p className="font-data text-sm text-[#4FE0C0]">AEMON TEACHER TRAINING</p>
          <h1 className="font-display mt-4 text-4xl leading-tight text-[#EAF2F5] sm:text-6xl">
            인류 천재 연구자들이 매달리는 문제, 인공지능 가치정렬.
          </h1>
          <p className="font-display mt-4 text-3xl leading-tight text-[#FFD37A] sm:text-4xl">이제 우리 반 아이들이 직접 경험합니다.</p>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-3 gap-2 border-b border-white/10" role="tablist" aria-label="사전연수 목차">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const selected = activeTab === tab.id
          return (
            <button
              key={tab.id}
              aria-controls={`training-panel-${tab.id}`}
              aria-selected={selected}
              className={`flex min-h-16 items-center justify-center gap-2 border-b-2 px-3 py-4 text-sm font-black transition sm:text-base ${
                selected
                  ? 'border-[#FFD37A] bg-[#FFD37A]/8 text-[#FFD37A]'
                  : 'border-transparent text-[#8AA0B0] hover:border-white/20 hover:text-[#EAF2F5]'
              }`}
              id={`training-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              type="button"
            >
              <Icon className="shrink-0" size={19} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      <div id={`training-panel-${activeTab}`} role="tabpanel" aria-labelledby={`training-tab-${activeTab}`}>
        {activeTab === 'introduction' ? <IntroductionTab /> : null}
        {activeTab === 'concepts' ? <SummaryTab sections={conceptSections} /> : null}
        {activeTab === 'structure' ? <SummaryTab sections={structureSections} /> : null}
      </div>

      <Panel className="mt-8 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <p className="font-data text-sm text-[#4FE0C0]">READY</p>
          <p className="font-display mt-2 text-3xl text-[#EAF2F5]">이제 교실에서 에아몬을 깨워볼까요?</p>
        </div>
        <Button onClick={() => navigate('/lesson/1')}>
          1차시 시작
          <Play size={18} />
        </Button>
      </Panel>
    </div>
  )
}
