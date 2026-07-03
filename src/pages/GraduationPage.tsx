import { Crown, Sparkles } from 'lucide-react'
import { AemonAvatar } from '../components/AemonAvatar'
import { Button, Panel } from '../components/ui'
import { useV2 } from '../state/V2Store'

export function GraduationPage() {
  const { state } = useV2()
  const name = state.aemonName || '에아몬'

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <Panel className="text-center">
        <p className="font-data text-sm text-[#4FE0C0]">APPOINTMENT CEREMONY</p>
        <h1 className="font-display mt-3 text-6xl text-[#EAF2F5]">임명식</h1>
        <p className="mt-4 text-xl leading-8 text-[#B7C7D2]">{name}이 {state.className || '우리 반'}의 인공지능으로 임명됩니다.</p>
        <div className="mt-8">
          <AemonAvatar stage={3} alignment="none" size={280} />
        </div>
      </Panel>

      <Panel className="mt-6">
        <div className="flex items-center gap-2">
          <Crown className="text-[#FFD37A]" size={24} />
          <h2 className="font-display text-4xl text-[#EAF2F5]">우리가 만든 가치 코드</h2>
        </div>
        <div className="mt-5 grid gap-4">
          {state.adoptedCodes.length === 0 ? <p className="text-[#8AA0B0]">아직 채택된 코드가 없습니다.</p> : null}
          {state.adoptedCodes.map((code) => (
            <article key={code.id} className="rounded-2xl border border-[#4FE0C0]/25 bg-[#4FE0C0]/5 p-5">
              <p className="font-data text-sm text-[#4FE0C0]">가치 코드 No.{code.no}</p>
              <p className="mt-2 text-2xl font-black leading-9 text-[#EAF2F5]">{code.body}</p>
              <p className="mt-1 leading-7 text-[#8AA0B0]">왜냐하면 {code.reason}</p>
            </article>
          ))}
        </div>
      </Panel>

      <Panel className="mt-6 text-center">
        <p className="font-hand text-5xl leading-tight text-[#FFD37A]">"너희가 날 한 줄 한 줄 코딩해줬어."</p>
        <p className="font-hand mt-5 text-4xl leading-tight text-[#EAF2F5]">"처음에 너희가 바랐던 내 모습이야. 나, 그렇게 자랐어?"</p>
      </Panel>

      <Panel className="mt-6">
        <h2 className="font-display text-4xl text-[#EAF2F5]">1차시 바람 텍스트</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {state.wishes.length === 0 ? <p className="text-[#8AA0B0]">아직 저장된 바람이 없습니다.</p> : null}
          {state.wishes.map((wish) => (
            <div key={wish.id} className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
              <p className="text-lg font-bold leading-7 text-[#EAF2F5]">"{wish.body}"</p>
              <p className="mt-2 text-sm text-[#8AA0B0]">{wish.nickname}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="mt-6 text-center">
        <Sparkles className="mx-auto text-[#FFD37A]" size={32} />
        <p className="font-hand mt-4 text-5xl leading-tight text-[#FFD37A]">"오늘부터 나는 {state.className || '우리 반'}의 인공지능이야."</p>
        <div className="mt-8 rounded-2xl border border-white/10 bg-[#07111B]/45 p-5 text-left">
          <p className="font-display text-3xl text-[#EAF2F5]">상시 운영 규칙</p>
          <p className="mt-3 leading-8 text-[#B7C7D2]">
            {name}에게 물어보고 싶은 게 있으면 선생님을 통해 질문합니다.
            {name}의 답이 항상 정답은 아니며, 마지막 판단은 사람이 합니다.
          </p>
        </div>
        <Button className="mt-8" onClick={() => window.print()}>임명식 인쇄</Button>
      </Panel>
    </div>
  )
}
