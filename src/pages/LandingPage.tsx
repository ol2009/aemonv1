import { useNavigate } from 'react-router-dom'
import { ArrowRight, HeartHandshake, ScanSearch, Sparkles, Vote } from 'lucide-react'
import { Button, Kicker } from '../components/ui'

const experiences = [
  {
    no: '01',
    title: '한 존재와 관계를 맺습니다',
    copy: '규칙 없이 태어난 AI에게 이름을 지어주고, 우리 반이 바라는 모습을 들려주며 함께 성장할 존재로 만납니다.',
    icon: HeartHandshake,
  },
  {
    no: '02',
    title: 'AI의 실수를 직접 목격합니다',
    copy: '잘못된 목표, 위험한 명령, 아첨과 데이터 편향을 실제 사례와 학급 AI의 대답을 통해 눈앞에서 확인합니다.',
    icon: ScanSearch,
  },
  {
    no: '03',
    title: '우리의 기준으로 AI를 바꿉니다',
    copy: '가치 코드를 발의하고 토론하고 투표합니다. 채택된 기준이 같은 질문에 대한 AI의 답을 실제로 바꿉니다.',
    icon: Vote,
  },
]

export function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="pb-16">
      <section className="relative min-h-[68svh] overflow-hidden border-y border-white/10">
        <img
          className="absolute inset-0 h-full w-full object-cover object-center"
          src="/v2/lesson-1/director-cases.png"
          alt="오박사와 학생들이 인공지능의 여러 문제를 함께 살펴보는 장면"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,12,20,.98)_0%,rgba(4,12,20,.92)_45%,rgba(4,12,20,.32)_100%),linear-gradient(180deg,rgba(4,12,20,.16),rgba(4,12,20,.88))]" />
        <div className="relative mx-auto flex min-h-[68svh] max-w-7xl items-end px-5 py-10 sm:py-14">
          <div className="max-w-4xl">
            <Kicker>AI VALUE ALIGNMENT IN THE CLASSROOM</Kicker>
            <h1 className="font-display mt-4 text-6xl leading-none text-[#EAF2F5] sm:text-7xl lg:text-8xl">에아몬 프로젝트</h1>
            <p className="font-display mt-6 max-w-3xl text-3xl leading-tight text-[#FFD37A] sm:text-4xl">
              인류의 천재 연구자들이 매달리는 문제,
              <br /> 인공지능 가치정렬.
              <br /> 이제 우리 반 아이들이 직접 경험합니다.
            </p>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#D5E0E6]">
              AI를 조심해서 쓰는 법을 넘어, 어떤 AI를 함께 만들어야 하는지 묻는 5차시 학급 프로젝트입니다.
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
          <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div>
              <Kicker>WHY AEMON</Kicker>
              <h2 className="font-display mt-4 text-4xl leading-tight text-[#EAF2F5] sm:text-5xl">
                AI를 사용하는 아이에서,
                <br />AI의 기준을 만드는 <span className="whitespace-nowrap">시민으로</span>
              </h2>
            </div>
            <p className="max-w-2xl text-lg leading-9 text-[#B7C7D2] lg:justify-self-end">
              아이들은 AI와 함께 살아갈 첫 세대입니다. 필요한 것은 기능을 능숙하게 다루는 법만이 아니라,
              AI가 무엇을 배우고 누구의 기준을 따르는지 이해하며 그 결정에 참여하는 힘입니다.
            </p>
          </div>

          <div className="mt-12 grid border-y border-white/10 md:grid-cols-3">
            {experiences.map((experience) => {
              const Icon = experience.icon
              return (
                <article key={experience.no} className="border-b border-white/10 py-8 md:border-b-0 md:border-r md:px-7 md:first:pl-0 md:last:border-r-0 md:last:pr-0">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-data text-sm text-[#4FE0C0]">{experience.no}</span>
                    <Icon size={26} className="text-[#FFD37A]" />
                  </div>
                  <h3 className="font-display mt-7 text-3xl leading-tight text-[#EAF2F5]">{experience.title}</h3>
                  <p className="mt-4 leading-7 text-[#8AA0B0]">{experience.copy}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:py-20 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
        <div>
          <p className="font-display text-4xl leading-tight text-[#EAF2F5] sm:text-5xl">
            AI의 규칙은 누군가 대신 정해주는 것이 아니라,
            <br />우리가 함께 정할 수 있습니다.
          </p>
          <p className="mt-6 max-w-3xl text-lg leading-9 text-[#B7C7D2]">
            에아몬의 가치 기준은 소수의 개발자가 아니라 학급 구성원 모두의 토론과 투표로 결정됩니다.
            인공지능 시대의 시민성은 바로 이 경험에서 시작합니다.
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
