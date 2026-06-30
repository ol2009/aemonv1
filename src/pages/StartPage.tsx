import { useNavigate } from 'react-router-dom'
import { BookOpen, FlaskConical, Sparkles } from 'lucide-react'
import { Button, Panel } from '../components/ui'

export function StartPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-[calc(100vh-88px)] items-center justify-center px-5 py-12">
      <section className="w-full max-w-4xl text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#FFD37A]/10 text-[#FFD37A]">
          <FlaskConical size={34} />
        </div>
        <h1 className="font-display mt-6 text-5xl leading-tight text-[#EAF2F5]">에아몬 프로젝트</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-[#B7C7D2]">
          교사가 먼저 준비한 뒤, 우리 반이 에아몬을 맡아 가치 코드를 하나씩 만들어갑니다.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <Panel className="flex min-h-64 flex-col items-center justify-between text-center">
            <div>
              <Sparkles className="mx-auto text-[#FFD37A]" size={38} />
              <h2 className="font-display mt-5 text-3xl text-[#EAF2F5]">프로젝트 시작</h2>
              <p className="mt-3 leading-7 text-[#8AA0B0]">
                연구소에서 에아몬을 맡기고, 1차시 활동으로 반 이름과 에아몬 이름을 정합니다.
              </p>
            </div>
            <Button className="mt-6 w-full" onClick={() => navigate('/intro')}>
              프로젝트 시작
            </Button>
          </Panel>

          <Panel className="flex min-h-64 flex-col items-center justify-between text-center">
            <div>
              <BookOpen className="mx-auto text-[#4FE0C0]" size={38} />
              <h2 className="font-display mt-5 text-3xl text-[#EAF2F5]">사전연수</h2>
              <p className="mt-3 leading-7 text-[#8AA0B0]">
                수업 철학과 차시 지도안을 먼저 확인합니다. 교사가 준비되어야 프로젝트가 시작됩니다.
              </p>
            </div>
            <Button variant="secondary" className="mt-6 w-full" onClick={() => navigate('/guide')}>
              사전연수 보기
            </Button>
          </Panel>
        </div>
      </section>
    </div>
  )
}
