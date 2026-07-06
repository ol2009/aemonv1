import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Play } from 'lucide-react'
import { Button, Panel } from '../components/ui'

const sections = [
  {
    title: '핵심 문제',
    body: 'AI는 똑똑해질 수 있지만, 똑똑함이 곧 착함은 아니다. “시키는 대로 하는 AI”가 아니라 “좋은 기준을 가진 AI”가 필요하다.',
  },
  {
    title: '가치정렬',
    body: '가치정렬은 AI가 인간에게 도움이 되는 기준을 따르도록 가르치는 일이다. 에아몬 수업은 이 개념을 초등 교실에서 작게 체험하게 만든다.',
  },
  {
    title: '수업 구조',
    body: '학생은 에아몬에게 이름을 주고, 바라는 모습을 말하고, 이후 가치 코드를 발의·투표·개정한다. 교사는 토론과 채택의 최종 게이트를 맡는다.',
  },
  {
    title: '1차시 목표',
    body: '이름 짓기와 AI 사고 사례를 통해 “규칙 없는 AI는 위험할 수 있다”는 문제를 발견하고, 다음 차시의 가치 코드 만들기로 연결한다.',
  },
]

export function TrainingPage() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => navigate('/home')}>
          <ArrowLeft size={18} />
          대시보드
        </Button>
        <Button onClick={() => navigate('/lesson/1')}>
          1차시 시작
          <Play size={18} />
        </Button>
      </div>

      <Panel>
        <p className="font-data text-sm text-[#4FE0C0]">TEACHER TRAINING</p>
        <h1 className="font-display mt-3 text-5xl leading-tight text-[#EAF2F5]">가치정렬: 아무도 안 가르치는 인류의 숙제</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-[#B7C7D2]">
          에아몬 프로젝트는 학생들이 학급 AI의 가치 코드를 직접 만들며, AI를 어떻게 가르쳐야 하는지 체험하는 7차시 수업입니다.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {sections.map((section) => (
            <div key={section.title} className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-5">
              <h2 className="font-display text-3xl text-[#FFD37A]">{section.title}</h2>
              <p className="mt-3 leading-7 text-[#B7C7D2]">{section.body}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
