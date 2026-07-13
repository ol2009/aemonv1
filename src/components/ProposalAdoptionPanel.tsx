import { Check, RefreshCw } from 'lucide-react'
import type { AdoptedCode, CodeProposal } from '../state/V2Store'
import { Button } from './ui'

type ProposalAdoptionPanelProps = {
  proposals: CodeProposal[]
  adoptedCode: AdoptedCode | null
  selectedProposal: CodeProposal | null
  codeNo: number
  fallbackValueCard: string
  isAdopting: boolean
  onSelect: (proposalId: string) => void
  onAdopt: () => void
}

export function ProposalAdoptionPanel({
  proposals,
  adoptedCode,
  selectedProposal,
  codeNo,
  fallbackValueCard,
  isAdopting,
  onSelect,
  onAdopt,
}: ProposalAdoptionPanelProps) {
  return (
    <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(330px,420px)] xl:items-start">
      <div className="min-w-0 xl:order-first">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="font-black text-[#EAF2F5]">후보 목록</p>
          <p className="text-sm text-[#8AA0B0]">문장을 눌러 선택하세요</p>
        </div>
        <div className="grid max-h-[62vh] gap-3 overflow-y-auto pr-2 [scrollbar-color:#35516A_#0B1825]">
          {proposals.length === 0 ? (
            <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0]">아직 발의가 없습니다. 테스트 중이면 다음으로 넘어갈 수 있습니다.</p>
          ) : null}
          {proposals.map((proposal, index) => {
            const isAdopted = adoptedCode?.sourceProposalId === proposal.id
            const isSelected = selectedProposal?.id === proposal.id
            return (
              <button
                key={proposal.id}
                aria-pressed={isSelected}
                className={`rounded-[16px] border p-4 text-left transition ${
                  isAdopted
                    ? 'border-[#4FE0C0] bg-[#4FE0C0]/10 shadow-[0_0_24px_rgba(79,224,192,.1)]'
                    : isSelected
                      ? 'border-[#FFD37A] bg-[#FFD37A]/10 shadow-[0_0_24px_rgba(255,211,122,.1)]'
                      : 'border-white/10 bg-[#07111B]/45 hover:border-[#FFD37A]/45 hover:bg-[#102033]'
                }`}
                onClick={() => proposal.status === 'pending' && onSelect(proposal.id)}
                disabled={proposal.status === 'adopted'}
                type="button"
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${isSelected || isAdopted ? 'border-[#FFD37A] bg-[#FFD37A] text-[#0A1622]' : 'border-white/20 text-transparent'}`}>
                    <Check size={16} strokeWidth={3} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-data text-xs text-[#4FE0C0]">후보 {index + 1}</p>
                      <span className="text-sm font-black text-[#FFD37A]">좋아요 {proposal.votes.length}</span>
                    </div>
                    <p className="mt-2 text-lg font-black leading-7 text-[#EAF2F5]">{proposal.body}</p>
                    <p className="mt-1 leading-6 text-[#9BAEBA]">{proposal.reason}</p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="text-[#8AA0B0]">{proposal.nickname} · {proposal.valueCard || fallbackValueCard}</span>
                      {isAdopted ? <span className="font-black text-[#4FE0C0]">채택 완료</span> : isSelected ? <span className="font-black text-[#FFD37A]">현재 선택</span> : <span className="text-[#708696]">선택하기</span>}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <aside className="order-first z-10 rounded-[18px] border border-[#FFD37A]/30 bg-[#1B2D3E] p-5 shadow-2xl shadow-black/25 xl:order-last xl:sticky xl:top-4">
        <p className="font-data text-xs text-[#FFD37A]">가치코드 No.{codeNo}</p>
        <h3 className="font-display mt-2 text-2xl text-[#EAF2F5]">선택한 문장</h3>
        {selectedProposal ? (
          <>
            <p className="mt-4 text-xl font-black leading-8 text-[#EAF2F5]">{selectedProposal.body}</p>
            <p className="mt-2 leading-7 text-[#B7C7D2]">{selectedProposal.reason}</p>
            <p className="mt-3 text-sm text-[#8AA0B0]">{selectedProposal.nickname} · 좋아요 {selectedProposal.votes.length}</p>
            <Button className="mt-5 min-h-14 w-full text-lg" disabled={isAdopting} onClick={onAdopt}>
              {isAdopting ? <RefreshCw className="animate-spin" size={20} /> : <Check size={20} />}
              {isAdopting ? '채택하는 중' : '이 문장 채택하기'}
            </Button>
            <p className="mt-3 text-center text-xs leading-5 text-[#8AA0B0]">누르면 우리 반 가치코드 No.{codeNo}으로 저장됩니다.</p>
          </>
        ) : adoptedCode ? (
          <>
            <p className="mt-4 text-xl font-black leading-8 text-[#EAF2F5]">{adoptedCode.body}</p>
            <p className="mt-2 leading-7 text-[#B7C7D2]">{adoptedCode.reason}</p>
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-[#4FE0C0]/25 bg-[#4FE0C0]/10 px-4 py-3 font-black text-[#4FE0C0]">
              <Check size={19} />
              채택 완료
            </div>
          </>
        ) : (
          <p className="mt-4 rounded-xl border border-white/10 bg-[#07111B]/45 px-4 py-3 leading-6 text-[#8AA0B0]">왼쪽 후보를 선택하면 여기에 채택할 문장이 표시됩니다.</p>
        )}
      </aside>
    </div>
  )
}
