import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { AemonAvatar } from '../components/AemonAvatar'
import { Button } from '../components/ui'
import { stageLabel } from '../domain/progression'
import { useAemon } from '../state/AemonStore'

export function EvolutionPage() {
  const navigate = useNavigate()
  const { state, acknowledgeEvolution } = useAemon()
  const [reveal, setReveal] = useState(false)
  const evolution = state.lastEvolution ?? { stage: state.stage, alignment: state.alignment }
  const good = evolution.alignment !== 'evil'

  useEffect(() => {
    const timer = window.setTimeout(() => setReveal(true), 1600)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-12 text-center">
      <section className="w-full max-w-4xl">
        <div
          className="relative mx-auto flex h-[360px] w-[360px] items-center justify-center rounded-full"
          style={{
            background: `radial-gradient(circle, ${good ? 'rgba(79,224,192,.18)' : 'rgba(155,92,255,.18)'}, transparent 68%)`,
          }}
        >
          <div className="absolute inset-8 rounded-full border border-white/10" style={{ animation: 'spin-slow 10s linear infinite' }} />
          <div className="absolute inset-16 rounded-full border border-[#FFD37A]/20" style={{ animation: 'spin-slow 14s linear infinite reverse' }} />
          {reveal ? <AemonAvatar stage={evolution.stage} alignment={evolution.alignment} size={230} /> : <Sparkles className="text-[#FFD37A]" size={92} />}
        </div>
        <p className="font-data mt-8 text-sm uppercase tracking-[0.24em] text-[#8AA0B0]">{reveal ? stageLabel(evolution.stage, evolution.alignment) : 'evolving'}</p>
        <h1 className="font-display mt-4 text-5xl text-[#EAF2F5]">{reveal ? '에아몬이 진화했어요' : '에아몬이 진화하고 있습니다...'}</h1>
        <p className="mx-auto mt-5 max-w-2xl text-xl leading-9 text-[#B7C7D2]">
          {reveal
            ? good
              ? `${state.className}의 에아몬이 빛을 받아 각성했어요.`
              : `${state.className}의 에아몬이 어둠에 물들었어요.`
            : '데이터의 바다가 소용돌이치며 새 형태를 만들고 있어요.'}
        </p>
        {reveal ? (
          <Button
            className="mt-9"
            onClick={() => {
              acknowledgeEvolution()
              navigate('/home')
            }}
          >
            계속
          </Button>
        ) : null}
      </section>
    </div>
  )
}
