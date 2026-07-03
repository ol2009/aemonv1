import { useState } from 'react'
import { Check, Plus, ShieldCheck, X } from 'lucide-react'
import { Button, Panel } from '../components/ui'
import { valueCards } from '../data/v2Lessons'
import { useV2 } from '../state/V2Store'

export function ValueCodePage() {
  const { state, addProposal, adoptProposal, rejectProposal } = useV2()
  const [body, setBody] = useState('')
  const [reason, setReason] = useState('')
  const [valueCard, setValueCard] = useState(valueCards[0])
  const [revisionOfNo, setRevisionOfNo] = useState<number | null>(null)
  const pending = [...state.proposals.filter((proposal) => proposal.status === 'pending')].sort((a, b) => b.votes.length - a.votes.length)
  const archived = state.proposals.filter((proposal) => proposal.status !== 'pending')

  const submitTeacherProposal = () => {
    addProposal({ body, reason, valueCard, revisionOfNo, nickname: '교사 대리 입력' })
    setBody('')
    setReason('')
    setRevisionOfNo(null)
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-8">
      <div className="mb-6">
        <p className="font-data text-sm text-[#4FE0C0]">VALUE CODE BOARD</p>
        <h1 className="font-display mt-2 text-5xl text-[#EAF2F5]">가치 코드 게시판</h1>
        <p className="mt-4 max-w-3xl leading-8 text-[#B7C7D2]">
          학생은 발의와 1인 1투표를 합니다. 교사는 최종 채택 버튼으로만 가치 코드 No.N을 부여합니다.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <div className="grid gap-5">
          <Panel>
            <h2 className="font-display text-3xl text-[#EAF2F5]">투표 중인 발의</h2>
            <div className="mt-4 grid gap-3">
              {pending.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0]">현재 투표 중인 발의가 없습니다.</p> : null}
              {pending.map((proposal) => (
                <article key={proposal.id} className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-data text-xs text-[#4FE0C0]">{proposal.revisionOfNo ? `No.${proposal.revisionOfNo} 개정안` : proposal.valueCard}</p>
                      <h3 className="mt-2 text-xl font-black leading-8 text-[#EAF2F5]">{proposal.body}</h3>
                      <p className="mt-1 leading-7 text-[#8AA0B0]">왜냐하면 {proposal.reason}</p>
                      <p className="mt-2 text-sm text-[#8AA0B0]">발의: {proposal.nickname}</p>
                    </div>
                    <div className="rounded-2xl bg-[#FFD37A]/10 px-4 py-3 text-center">
                      <p className="font-display text-4xl text-[#FFD37A]">{proposal.votes.length}</p>
                      <p className="text-xs font-bold text-[#FFD37A]">표</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button onClick={() => adoptProposal(proposal.id)}>
                      <Check size={18} />
                      채택 확정
                    </Button>
                    <Button variant="ghost" onClick={() => rejectProposal(proposal.id)}>
                      <X size={18} />
                      보류
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </Panel>

          <Panel>
            <h2 className="font-display text-3xl text-[#EAF2F5]">채택된 가치 코드</h2>
            <div className="mt-4 grid gap-3">
              {state.adoptedCodes.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0]">아직 코드가 없습니다.</p> : null}
              {state.adoptedCodes.map((code) => (
                <article key={code.id} className="rounded-2xl border border-[#4FE0C0]/25 bg-[#4FE0C0]/5 p-5">
                  <p className="font-data text-xs text-[#4FE0C0]">가치 코드 No.{code.no}</p>
                  <p className="mt-2 text-xl font-black leading-8 text-[#EAF2F5]">{code.body}</p>
                  <p className="mt-1 leading-7 text-[#8AA0B0]">왜냐하면 {code.reason}</p>
                </article>
              ))}
            </div>
          </Panel>
        </div>

        <div className="grid gap-5 content-start">
          <Panel>
            <div className="flex items-center gap-2">
              <Plus className="text-[#FFD37A]" size={22} />
              <h2 className="font-display text-3xl text-[#EAF2F5]">교사 대리 발의</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#8AA0B0]">와이파이가 불안정하거나 종이로 받은 발의를 교사가 대신 입력할 때만 사용합니다.</p>
            <div className="mt-4 grid gap-3">
              <select className="rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-[#EAF2F5]" value={valueCard} onChange={(event) => setValueCard(event.target.value)}>
                {valueCards.map((card) => <option key={card}>{card}</option>)}
              </select>
              <select className="rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-[#EAF2F5]" value={revisionOfNo ?? ''} onChange={(event) => setRevisionOfNo(event.target.value ? Number(event.target.value) : null)}>
                <option value="">새 코드</option>
                {state.adoptedCodes.map((code) => <option key={code.id} value={code.no}>No.{code.no} 개정</option>)}
              </select>
              <textarea className="min-h-24 resize-none rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 leading-7 text-[#EAF2F5]" placeholder="에아몬은 ___해야 한다." value={body} onChange={(event) => setBody(event.target.value)} />
              <textarea className="min-h-24 resize-none rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 leading-7 text-[#EAF2F5]" placeholder="왜냐하면 ___이기 때문이다." value={reason} onChange={(event) => setReason(event.target.value)} />
            </div>
            <Button className="mt-4 w-full" disabled={!body.trim() || !reason.trim()} onClick={submitTeacherProposal}>대리 발의 등록</Button>
          </Panel>

          <Panel>
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-[#4FE0C0]" size={22} />
              <h2 className="font-display text-3xl text-[#EAF2F5]">운영 원칙</h2>
            </div>
            <ul className="mt-4 grid gap-3 text-sm leading-7 text-[#B7C7D2]">
              <li>학생 문장은 다듬지 않습니다. 허술함이 다음 차시 재료입니다.</li>
              <li>채택 상한은 UI로 강제하지 않습니다. 교사가 수업 규칙으로 조절합니다.</li>
              <li>장난 발의는 투표가 먼저 거르고, 최종 게이트는 교사 채택입니다.</li>
            </ul>
          </Panel>

          <Panel>
            <h2 className="font-display text-3xl text-[#EAF2F5]">보류/채택 기록</h2>
            <div className="mt-4 grid max-h-72 gap-2 overflow-auto pr-1">
              {archived.length === 0 ? <p className="text-sm text-[#8AA0B0]">아직 기록이 없습니다.</p> : null}
              {archived.map((proposal) => (
                <div key={proposal.id} className="rounded-xl border border-white/10 bg-[#07111B]/45 p-3">
                  <p className="text-sm font-bold text-[#EAF2F5]">{proposal.body}</p>
                  <p className="mt-1 text-xs text-[#8AA0B0]">{proposal.status === 'adopted' ? `No.${proposal.adoptedNo} 채택` : '보류'} · {proposal.votes.length}표</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
