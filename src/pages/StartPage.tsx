import { useNavigate } from 'react-router-dom'
import { BookOpen, Play, RotateCcw } from 'lucide-react'
import { AemonAvatar } from '../components/AemonAvatar'
import { Button, Panel } from '../components/ui'
import { useV2 } from '../state/V2Store'

export function StartPage() {
  const navigate = useNavigate()
  const { state, resetDemo } = useV2()

  const restart = () => {
    const ok = window.confirm('현재 저장된 에아몬 기록을 지우고 처음 장면부터 다시 시작할까요?')
    if (!ok) return
    resetDemo()
    localStorage.removeItem('aemon.state')
    navigate('/lesson/1')
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <section className="grid min-h-[70vh] items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <p className="font-data text-sm text-[#4FE0C0]">AEMON PROJECT</p>
          <h1 className="font-display mt-4 text-6xl leading-tight text-[#EAF2F5]">에아몬을 깨울 시간</h1>
          <p className="mt-6 max-w-2xl text-xl leading-9 text-[#B7C7D2]">
            프로젝트를 시작하면 오박사를 만나고, 수업 중 에아몬이 직접 우리 반이 누구인지 묻습니다.
          </p>

          {state.classCode ? (
            <div className="mt-6 rounded-2xl border border-[#4FE0C0]/20 bg-[#4FE0C0]/8 p-4">
              <p className="font-data text-xs text-[#4FE0C0]">현재 학급</p>
              <p className="mt-1 text-lg font-black text-[#EAF2F5]">
                {state.className || '이름 없는 학급'} · 코드 {state.classCode}
              </p>
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <Button onClick={() => navigate('/lesson/1')}>
              <Play size={20} />
              프로젝트 시작하기
            </Button>
            <Button variant="secondary" onClick={() => navigate('/training')}>
              <BookOpen size={20} />
              사전연수
            </Button>
            {state.classCode ? (
              <Button variant="ghost" onClick={restart}>
                <RotateCcw size={18} />
                처음부터 다시
              </Button>
            ) : null}
          </div>
        </div>

        <Panel className="text-center">
          <AemonAvatar stage={0} alignment="none" size={310} />
          <p className="font-hand mt-7 text-3xl leading-tight text-[#FFD37A]">"...안에서 다 들려. 너희 목소리."</p>
        </Panel>
      </section>
    </div>
  )
}
