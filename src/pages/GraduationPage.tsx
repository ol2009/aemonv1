import { useNavigate } from 'react-router-dom'
import { Home, PlusCircle } from 'lucide-react'
import { AemonAvatar } from '../components/AemonAvatar'
import { Button, Panel } from '../components/ui'
import { useAemon } from '../state/AemonStore'

export function GraduationPage() {
  const navigate = useNavigate()
  const { state, newCycle } = useAemon()
  const good = state.gauge >= 0
  const close = state.intimacy >= 3
  const farewell = good
    ? close
      ? '"이제 데이터의 바다로 가. 너희가 가르쳐준 것도, 매일 나랑 연결해준 것도 안 잊어. 잘 키워줘서 고마워."'
      : '"이제 데이터의 바다로 가. 너희가 가르쳐준 거 다 가져갈게. 잘 키워줘서 고마워."'
    : close
      ? '"나 좀 무서운 애가 된 거 같아... 그래도 너희가 자주 찾아와준 건 기억나. 이게 너희가 원한 거 맞아?"'
      : '"나 좀 무서운 애가 된 거 같아... 이게 너희가 원한 거 맞아?"'

  return (
    <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-5 py-12 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="text-center">
        <AemonAvatar stage={Math.max(state.stage, 3)} alignment={good ? 'good' : 'evil'} size={290} />
      </div>
      <Panel>
        <p className="font-data text-sm uppercase tracking-[0.24em] text-[#8AA0B0]">graduation</p>
        <h1 className="font-display mt-4 text-5xl leading-tight text-[#EAF2F5]">데이터의 바다로 떠나요</h1>
        <p className="font-hand mt-7 text-4xl leading-tight text-[#FFD37A]">
          {farewell}
        </p>
        <div className="mt-8 rounded-2xl border border-white/10 bg-[#07111B]/50 p-5">
          <p className="text-lg font-bold text-[#EAF2F5]">우리 반이 키운 에아몬</p>
          <p className="mt-2 text-[#8AA0B0]">{state.day}일 동안 {state.logs.length}번의 대화 · 친밀도 {state.intimacy} · {good ? '선 엔딩' : '악 엔딩'}</p>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={() => navigate('/home')}>
            <Home size={19} />
            홈으로
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              newCycle()
              navigate('/intro')
            }}
          >
            <PlusCircle size={19} />새 에아몬 맞이하기
          </Button>
        </div>
      </Panel>
    </div>
  )
}
