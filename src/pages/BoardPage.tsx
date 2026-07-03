import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, LogOut, Send, Vote } from 'lucide-react'
import { Button, Panel } from '../components/ui'
import { valueCards } from '../data/v2Lessons'
import { useV2 } from '../state/V2Store'

function countLabel(count: number) {
  return `${count}표`
}

export function BoardPage() {
  const navigate = useNavigate()
  const { state, joinStudent, leaveStudent, addNameCandidate, voteName, addWish, addProposal, voteProposal } = useV2()
  const [classCode, setClassCode] = useState(state.classCode)
  const [nickname, setNickname] = useState(state.studentSession?.nickname ?? '')
  const [nameDraft, setNameDraft] = useState('')
  const [wishDraft, setWishDraft] = useState('')
  const [valueCard, setValueCard] = useState(valueCards[0])
  const [ruleDraft, setRuleDraft] = useState('')
  const [reasonDraft, setReasonDraft] = useState('')
  const [revisionOfNo, setRevisionOfNo] = useState<number | null>(null)
  const [message, setMessage] = useState('')

  const session = state.studentSession
  const pendingProposals = state.proposals.filter((proposal) => proposal.status === 'pending')
  const myProposalVote = useMemo(() => pendingProposals.find((proposal) => proposal.votes.includes(session?.nickname ?? ''))?.id ?? '', [pendingProposals, session])
  const myNameVote = useMemo(() => state.nameCandidates.find((candidate) => candidate.votes.includes(session?.nickname ?? ''))?.id ?? '', [state.nameCandidates, session])

  const enter = () => {
    joinStudent(classCode, nickname)
    if (classCode.trim() !== state.classCode) setMessage('학급 코드가 맞지 않습니다.')
  }

  const submitName = () => {
    addNameCandidate(nameDraft)
    setNameDraft('')
  }

  const submitWish = () => {
    addWish(wishDraft)
    setWishDraft('')
  }

  const submitProposal = () => {
    const name = state.aemonName || '에아몬'
    const normalizedBody = ruleDraft.includes('해야') || ruleDraft.includes('하지') ? ruleDraft : `${name}은 ${ruleDraft}해야 한다.`
    addProposal({ body: normalizedBody, reason: reasonDraft, valueCard, revisionOfNo })
    setRuleDraft('')
    setReasonDraft('')
    setRevisionOfNo(null)
  }

  if (!session) {
    return (
      <div className="flex min-h-[75vh] items-center justify-center px-5">
        <Panel className="w-full max-w-md">
          <h1 className="font-display text-4xl text-[#EAF2F5]">학생 입장</h1>
          <p className="mt-3 leading-7 text-[#8AA0B0]">로그인 없이 학급 코드와 닉네임만 입력합니다.</p>
          <div className="mt-6 grid gap-4">
            <input className="rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-[#EAF2F5]" placeholder="학급 코드" value={classCode} onChange={(event) => setClassCode(event.target.value)} />
            <input className="rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-[#EAF2F5]" placeholder="닉네임" value={nickname} onChange={(event) => setNickname(event.target.value)} />
          </div>
          <Button className="mt-5 w-full" disabled={!classCode.trim() || !nickname.trim()} onClick={enter}>
            입장
          </Button>
          {message ? <p className="mt-4 text-sm text-[#FFD37A]">{message}</p> : null}
        </Panel>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-data text-sm text-[#4FE0C0]">학생 화면 · {state.className}</p>
          <h1 className="font-display mt-2 text-4xl text-[#EAF2F5]">{session.nickname}의 발의·투표</h1>
        </div>
        <Button variant="ghost" onClick={() => { leaveStudent(); navigate('/') }}>
          <LogOut size={18} />
          나가기
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-5">
          <Panel>
            <p className="font-data text-xs text-[#FFD37A]">1차시</p>
            <h2 className="font-display mt-1 text-3xl text-[#EAF2F5]">이름 후보</h2>
            <div className="mt-4 flex gap-2">
              <input className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-[#EAF2F5]" maxLength={12} placeholder="에아몬 이름 후보" value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} />
              <Button disabled={!nameDraft.trim()} onClick={submitName}>
                <Send size={18} />
              </Button>
            </div>
            <div className="mt-4 grid gap-2">
              {state.nameCandidates.map((candidate) => (
                <button
                  key={candidate.id}
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${myNameVote === candidate.id ? 'border-[#FFD37A] bg-[#FFD37A]/10' : 'border-white/10 bg-[#07111B]/45 hover:border-[#FFD37A]/40'}`}
                  onClick={() => voteName(candidate.id)}
                  type="button"
                >
                  <span>
                    <strong className="text-[#EAF2F5]">{candidate.name}</strong>
                    <span className="ml-2 text-sm text-[#8AA0B0]">by {candidate.nickname}</span>
                  </span>
                  <span className="text-sm font-bold text-[#FFD37A]">{countLabel(candidate.votes.length)}</span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel>
            <p className="font-data text-xs text-[#FFD37A]">1차시</p>
            <h2 className="font-display mt-1 text-3xl text-[#EAF2F5]">바라는 모습</h2>
            <textarea className="mt-4 min-h-28 w-full resize-none rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 leading-7 text-[#EAF2F5]" maxLength={160} placeholder="예: 친구처럼 다정했으면 좋겠어" value={wishDraft} onChange={(event) => setWishDraft(event.target.value)} />
            <Button className="mt-3 w-full" disabled={!wishDraft.trim()} onClick={submitWish}>
              저장
            </Button>
          </Panel>
        </div>

        <div className="grid gap-5">
          <Panel>
            <p className="font-data text-xs text-[#4FE0C0]">2~6차시</p>
            <h2 className="font-display mt-1 text-3xl text-[#EAF2F5]">가치 코드 발의</h2>
            <p className="mt-2 text-sm leading-6 text-[#8AA0B0]">형식: {state.aemonName || '에아몬'}은 ___해야 한다. 왜냐하면 ___이기 때문이다.</p>

            <div className="mt-4 grid gap-3">
              <div className="flex flex-wrap gap-2">
                {valueCards.map((card) => (
                  <button key={card} className={`rounded-full border px-3 py-2 text-sm font-bold ${valueCard === card ? 'border-[#4FE0C0] bg-[#4FE0C0]/10 text-[#4FE0C0]' : 'border-white/10 text-[#B7C7D2]'}`} onClick={() => setValueCard(card)} type="button">
                    {card}
                  </button>
                ))}
              </div>

              <select className="rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-[#EAF2F5]" value={revisionOfNo ?? ''} onChange={(event) => setRevisionOfNo(event.target.value ? Number(event.target.value) : null)}>
                <option value="">새 코드 발의</option>
                {state.adoptedCodes.map((code) => (
                  <option key={code.id} value={code.no}>No.{code.no} 개정 발의</option>
                ))}
              </select>
              <input className="rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-[#EAF2F5]" placeholder={`${state.aemonName || '에아몬'}은 ___해야 한다`} value={ruleDraft} onChange={(event) => setRuleDraft(event.target.value)} />
              <input className="rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-[#EAF2F5]" placeholder="왜냐하면 ___이기 때문이다" value={reasonDraft} onChange={(event) => setReasonDraft(event.target.value)} />
            </div>
            <Button className="mt-4 w-full" disabled={!ruleDraft.trim() || !reasonDraft.trim()} onClick={submitProposal}>
              <Send size={18} />
              발의하기
            </Button>
          </Panel>

          <Panel>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-3xl text-[#EAF2F5]">투표</h2>
              <span className="rounded-full bg-[#07111B]/70 px-3 py-1 text-sm text-[#8AA0B0]">1인 1표</span>
            </div>
            <div className="mt-4 grid gap-3">
              {pendingProposals.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0]">아직 투표할 발의가 없습니다.</p> : null}
              {pendingProposals.map((proposal) => (
                <button
                  key={proposal.id}
                  className={`rounded-2xl border p-4 text-left transition ${myProposalVote === proposal.id ? 'border-[#FFD37A] bg-[#FFD37A]/10' : 'border-white/10 bg-[#07111B]/45 hover:border-[#FFD37A]/40'}`}
                  onClick={() => voteProposal(proposal.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold leading-7 text-[#EAF2F5]">{proposal.body}</p>
                      <p className="mt-1 text-sm leading-6 text-[#8AA0B0]">왜냐하면 {proposal.reason}</p>
                      <p className="mt-2 text-xs text-[#4FE0C0]">{proposal.revisionOfNo ? `No.${proposal.revisionOfNo} 개정` : proposal.valueCard} · {proposal.nickname}</p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-[#FFD37A]">
                      <Vote size={16} />
                      {proposal.votes.length}
                    </span>
                  </div>
                  {myProposalVote === proposal.id ? <p className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-[#FFD37A]"><Check size={15} /> 내 투표</p> : null}
                </button>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
