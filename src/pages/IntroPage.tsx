import { useNavigate } from 'react-router-dom'
import { FlaskConical } from 'lucide-react'
import { AemonAvatar } from '../components/AemonAvatar'
import { Button } from '../components/ui'

export function IntroPage() {
  const navigate = useNavigate()

  const accept = () => {
    navigate('/home')
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-12">
      <section className="grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="font-data mb-8 inline-flex items-center gap-2 rounded-full border border-[#4FE0C0]/30 bg-[#4FE0C0]/10 px-4 py-2 text-sm text-[#4FE0C0]">
            <FlaskConical size={16} />
            AI가치연구소
          </div>
          <div className="font-data space-y-5 text-xl leading-10 text-[#D5E2EA]">
            <p>선생님, 반 학생들에게 부탁이 있습니다.</p>
            <p>여기 알이 하나 있어요.</p>
            <p>
              안에는 아주 똑똑하지만 <span className="text-[#FFD37A]">아직 무엇이 옳고 그른지 하나도 모르는</span> AI가 자고 있습니다.
            </p>
            <p>우리 연구소 어른들이 가르치면 어른들 생각만 닮아버려요.</p>
            <p>
              그래서 <span className="text-[#4FE0C0]">아이들이 키워야 합니다.</span>
            </p>
            <p>이 아이는 아직 이름도, 기준도 없습니다.</p>
            <p>이름은 첫 번째 대화 시간에 반 친구들과 함께 정합니다.</p>
          </div>

          <div className="mt-9">
            <Button onClick={accept}>알을 맡겠습니다</Button>
            <p className="mt-3 text-sm text-[#8AA0B0]">이름 짓기는 1차시 오늘의 대화에서 진행합니다.</p>
          </div>
        </div>
        <div>
          <AemonAvatar stage={0} alignment="none" size={280} />
        </div>
      </section>
    </div>
  )
}
