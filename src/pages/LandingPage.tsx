import { useNavigate } from 'react-router-dom'
import { ArrowRight, BrainCircuit, FlaskConical, Scale, Sparkles, UsersRound } from 'lucide-react'
import { Button, Kicker } from '../components/ui'

const ethicsLayers = [
  {
    label: '사용 수칙 교육이 아닙니다',
    title: 'AI를 조심해서 쓰는 법에 머물지 않습니다',
    copy: '개인정보를 입력하지 않기, 딥페이크를 만들지 않기, 저작권을 지키기 같은 사용 수칙은 중요하지만 에아몬 프로젝트의 핵심 내용은 아닙니다.',
  },
  {
    label: '우리가 가르치는 AI 윤리',
    title: 'AI가 따를 가치를 함께 결정합니다',
    copy: 'AI가 어떤 목표와 데이터를 따르는지, 무엇을 옳다고 판단하고 언제 멈춰야 하는지, 그 기준을 누가 정해야 하는지 토론하고 직접 검증합니다. 이것이 인공지능 가치정렬입니다.',
  },
]

const experiences = [
  {
    no: '01',
    title: '실수의 구조를 발견합니다',
    copy: '잘못된 목표, 무조건적인 명령 수행, 아첨과 데이터 편향을 통해 AI의 문제가 나쁜 마음이 아니라 목표·데이터·기준의 부족에서 생긴다는 것을 이해합니다.',
    icon: BrainCircuit,
  },
  {
    no: '02',
    title: '가치를 행동으로 검증합니다',
    copy: 'AI의 잘못된 답을 먼저 보고 가치코드를 적용한 뒤 같은 질문으로 다시 시험합니다. 윤리가 실제 답변을 바꾸는 기준이 됩니다.',
    icon: FlaskConical,
  },
  {
    no: '03',
    title: 'AI의 기준을 함께 결정합니다',
    copy: '학생 모두가 가치코드를 발의하고 이유를 말하고 토론하고 투표합니다. 소수 개발자가 아닌 공동체가 AI의 규칙을 정합니다.',
    icon: UsersRound,
  },
]

const learningLoop = ['문제 발견', '원인 토론', '가치 제안', '민주적 채택', 'AI에 적용', '같은 질문으로 재시험']

export function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="pb-16">
      <section className="relative min-h-[72svh] overflow-hidden border-y border-white/10 bg-[#071A29]">
        <img
          className="absolute right-[-18%] top-1/2 w-[min(88vw,620px)] -translate-y-1/2 object-contain opacity-45 sm:right-[-5%] sm:w-[min(58vw,620px)] sm:opacity-80 lg:right-[3%] lg:opacity-100"
          src="/aemon/v3/stage-0-egg.gif?hero=20260714"
          alt="진화 전 알 단계 에아몬"
          style={{ filter: 'drop-shadow(0 0 56px rgba(79,224,192,.42))', imageRendering: 'pixelated' }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,12,20,.98)_0%,rgba(4,12,20,.92)_48%,rgba(4,12,20,.12)_78%,rgba(4,12,20,.03)_100%),linear-gradient(180deg,rgba(4,12,20,.04),rgba(4,12,20,.72))]" />
        <div className="relative mx-auto flex min-h-[72svh] max-w-7xl items-end px-5 py-10 sm:py-14">
          <div className="max-w-4xl">
            <Kicker>AI VALUE ALIGNMENT IN THE CLASSROOM</Kicker>
            <h1 className="font-display mt-4 break-keep text-5xl leading-none text-[#EAF2F5] sm:text-7xl lg:text-8xl">에아몬 프로젝트</h1>
            <p className="font-display mt-6 max-w-3xl break-keep text-2xl leading-tight text-[#FFD37A] sm:text-4xl">
              AI를 조심해서 쓰는 법을 넘어,
              <br />AI가 따를 기준을 만드는 수업.
            </p>
            <p className="mt-6 max-w-3xl break-keep text-base leading-8 text-[#D5E0E6] sm:text-lg">
              진정한 인공지능 윤리 교육, 인공지능 가치정렬. 이제 우리 반 아이들이 직접 경험합니다.
              무엇이 옳은지, 누가 그 기준을 정할지 토론하고 AI의 행동을 실제로 바꾸는 5차시 학급 프로젝트입니다.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button onClick={() => navigate('/start')}>
                <Sparkles size={20} />
                우리 반 시작하기
              </Button>
              <Button variant="secondary" onClick={() => navigate('/training')}>
                교사 가이드 보기
                <ArrowRight size={19} />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:py-20">
          <div className="max-w-4xl">
            <Kicker>VALUE ALIGNMENT EDUCATION</Kicker>
            <h2 className="font-display mt-4 break-keep text-4xl leading-tight text-[#EAF2F5] sm:text-5xl">AI 사용 예절이 아니라, AI 윤리를 가르칩니다</h2>
            <p className="mt-5 max-w-3xl text-lg leading-9 text-[#B7C7D2]">
              에아몬 프로젝트가 다루는 AI 윤리는 가치정렬입니다. 아이들은 완성된 사용 규칙을 외우는 대신,
              AI가 따를 기준을 직접 제안하고 토론하고 투표하며 그 기준이 실제 행동을 바꾸는지 확인합니다.
            </p>
          </div>

          <div className="mt-12 grid border-y border-white/10 lg:grid-cols-2">
            {ethicsLayers.map((layer, index) => (
              <article
                key={layer.label}
                className={`py-9 lg:px-9 ${index === 0 ? 'border-b border-white/10 lg:border-b-0 lg:border-r lg:pl-0' : 'lg:pr-0'}`}
              >
                <p className={`font-data text-sm ${index === 0 ? 'text-[#8AA0B0]' : 'text-[#4FE0C0]'}`}>{layer.label}</p>
                <h3 className="font-display mt-4 break-keep text-3xl leading-tight text-[#EAF2F5] sm:text-4xl">{layer.title}</h3>
                <p className="mt-5 max-w-xl text-lg leading-8 text-[#B7C7D2]">{layer.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:py-20">
          <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-end">
            <div>
              <Kicker>ETHICS IN ACTION</Kicker>
              <h2 className="font-display mt-4 break-keep text-4xl leading-tight text-[#EAF2F5] sm:text-5xl">
                윤리를 설명하지 않고,
                <br />작동시키고 검증합니다
              </h2>
            </div>
            <p className="max-w-2xl text-lg leading-9 text-[#B7C7D2] lg:justify-self-end">
              학생들은 AI에게 이름을 지어주며 관계를 맺되 맹신하지 않습니다. 틀린 답을 발견하고,
              원인을 토론하고, 직접 만든 기준으로 AI가 달라지는지 다시 확인합니다.
            </p>
          </div>

          <div className="mt-12 grid border-y border-white/10 md:grid-cols-3">
            {experiences.map((experience) => {
              const Icon = experience.icon
              return (
                <article key={experience.no} className="border-b border-white/10 py-8 md:border-b-0 md:border-r md:px-7 md:first:pl-0 md:last:border-r-0 md:last:pr-0">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-data text-sm text-[#4FE0C0]">{experience.no}</span>
                    <Icon size={27} className="text-[#FFD37A]" />
                  </div>
                  <h3 className="font-display mt-7 break-keep text-3xl leading-tight text-[#EAF2F5]">{experience.title}</h3>
                  <p className="mt-4 leading-7 text-[#8AA0B0]">{experience.copy}</p>
                </article>
              )
            })}
          </div>

          <div className="mt-12 grid grid-cols-2 border-y border-white/10 sm:grid-cols-3 lg:grid-cols-6">
            {learningLoop.map((item, index) => (
              <div key={item} className="min-h-32 border-b border-r border-white/10 px-4 py-6 sm:nth-[3n]:border-r-0 lg:border-b-0 lg:nth-[3n]:border-r lg:last:border-r-0">
                <p className="font-data text-xs text-[#4FE0C0]">{String(index + 1).padStart(2, '0')}</p>
                <p className="font-display mt-3 text-xl leading-tight text-[#EAF2F5]">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:py-20 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
        <div>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#FFD37A]/25 bg-[#FFD37A]/10 text-[#FFD37A]">
            <Scale size={26} />
          </div>
          <p className="font-display mt-6 break-keep text-4xl leading-tight text-[#EAF2F5] sm:text-5xl">
            AI의 규칙은 기술 안에서
            <br />저절로 생기지 않습니다.
          </p>
          <p className="mt-6 max-w-3xl text-lg leading-9 text-[#B7C7D2]">
            누군가가 목표를 정하고, 데이터를 고르고, 멈출 기준을 만듭니다. 에아몬에서는 그 권한을 학급 구성원 모두가 나눕니다.
            AI 시대의 시민성은 완성된 기술을 따르는 데서가 아니라, 그 기준을 함께 결정하고 책임지는 경험에서 시작합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 lg:justify-end">
          <Button onClick={() => navigate('/start')}>
            수업 시작하기
            <ArrowRight size={19} />
          </Button>
          <Button variant="secondary" onClick={() => navigate('/training')}>프로젝트 철학 읽기</Button>
        </div>
      </section>
    </div>
  )
}
