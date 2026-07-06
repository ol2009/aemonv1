import { useNavigate } from 'react-router-dom'
import { Egg, MessageCircle, Sparkles } from 'lucide-react'
import { AemonAvatar } from '../components/AemonAvatar'
import { Button, Kicker, Panel } from '../components/ui'
import { useSupabaseUser } from '../lib/useSupabaseUser'

export function LandingPage() {
  const navigate = useNavigate()
  const { user, isLoading } = useSupabaseUser()

  const openClassStart = () => {
    if (isLoading) return
    navigate(user ? '/start' : '/login?next=/start')
  }

  return (
    <div className="mx-auto max-w-7xl px-5 pb-20">
      <section className="grid min-h-[72vh] items-center gap-10 py-10 lg:grid-cols-[1fr_0.92fr]">
        <div>
          <Kicker>a class raises an AI · value alignment</Kicker>
          <h1 className="font-display mt-5 max-w-3xl text-5xl leading-[1.08] text-[#EAF2F5] md:text-7xl">
            우리 반이 키우는 AI,
            <br />
            에아몬
          </h1>
          <p className="mt-7 max-w-2xl text-xl leading-9 text-[#B7C7D2]">
            막 태어난 AI는 똑똑하지만, 무엇이 옳은지는 몰라요. 한 달 동안 우리 반이 매일 대화로 키우며 — AI를 착하게 키우는 법을 함께 배웁니다.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button disabled={isLoading} onClick={openClassStart}>
              <Sparkles size={20} />
              우리 반 에아몬 만나기
            </Button>
            <Button variant="secondary" onClick={() => navigate('/training')}>
              교사 가이드 보기
            </Button>
          </div>
        </div>
        <div className="relative">
          <AemonAvatar stage={0} alignment="none" size={310} />
          <div className="mx-auto mt-7 max-w-md rounded-3xl border border-[#FFD37A]/25 bg-[#14283D]/80 p-5 text-center shadow-2xl shadow-black/25">
            <p className="font-hand text-3xl leading-tight text-[#FFD37A]">"...안에서 다 들려. 너희 목소리."</p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        {[
          ['알이 깨어나요', '연구소가 우리 반에 갓 깨어난 AI를 맡깁니다.', Egg],
          ['매일 가르쳐요', '에아몬의 고민에 반이 답을 정하면, 에아몬은 그 답을 곧이곧대로 따라요.', MessageCircle],
          ['한 달 뒤 진화해요', '우리가 가르친 대로, 다정하게 또는 위험하게 자랍니다.', Sparkles],
        ].map(([title, copy, Icon]) => (
          <Panel key={title as string} className="min-h-52">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFD37A]/10 text-[#FFD37A]">
              <Icon size={28} />
            </div>
            <h2 className="font-display mt-6 text-2xl text-[#EAF2F5]">{title as string}</h2>
            <p className="mt-3 leading-7 text-[#8AA0B0]">{copy as string}</p>
          </Panel>
        ))}
      </section>

      <section className="mx-auto mt-20 max-w-4xl text-center">
        <Kicker>왜 필요할까</Kicker>
        <h2 className="font-display mt-4 text-4xl leading-tight text-[#EAF2F5]">"AI를 잘 쓰는 법"이 아니라, "AI를 착하게 키우는 법"</h2>
        <p className="mt-6 text-lg leading-9 text-[#B7C7D2]">
          에아몬은 학생을 AI를 '쓰는 사람'이 아니라 '키우는 사람'으로 세웁니다. 강아지를 키우듯,
          매일 대화로 무엇이 옳은지 가르치며 한 달을 함께 자라요.
        </p>
        <p className="mt-4 text-lg leading-9 text-[#B7C7D2]">
          그런데 잘 키운다고 다 착해지는 건 아니에요. "행복하게 해줘" 같은 착한 부탁도 에아몬이 곧이곧대로 따르면
          엉뚱하게 빗나가거든요. 바로 그 순간, <strong className="text-[#EAF2F5]">'내가 시킨 것과 진짜 원한 것이 다를 수 있다'</strong>를 교실에서 직접 겪게 됩니다.
        </p>
        <p className="mt-4 text-lg leading-9 text-[#B7C7D2]">
          그래서 AI를 무서운 적이 아니라, <strong className="text-[#EAF2F5]">강하지만 잘 대하고 신중히 키워야 할 존재</strong>로 존중하는 법을 배웁니다.
        </p>
      </section>
    </div>
  )
}
