import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BookOpenText, Heart, LogOut, Pencil, Send, Trash2, Vote } from 'lucide-react'
import { Button, Panel } from '../components/ui'
import { valueCards } from '../data/v2Lessons'
import {
  addRemoteCodeProposal,
  addRemoteNameCandidate,
  deleteRemoteWish,
  fetchRemoteClassBundle,
  isRemoteReady,
  toggleRemoteNameLike,
  updateRemoteWish,
  upsertRemoteWish,
  voteRemoteCodeProposal,
} from '../lib/v2Remote'
import { useV2RemoteSync } from '../lib/useV2RemoteSync'
import { useV2 } from '../state/V2Store'

type BoardTopic = 'name' | 'wish' | 'code'

const topicMeta: Record<BoardTopic, { label: string; title: string; lesson: string; empty: string }> = {
  name: {
    label: '이름 후보',
    title: '에아몬 이름 후보',
    lesson: '1차시',
    empty: '아직 이름 후보가 없습니다.',
  },
  wish: {
    label: '바라는 모습',
    title: '우리반 인공지능에게 바란다',
    lesson: '1차시',
    empty: '아직 바라는 모습이 올라오지 않았습니다.',
  },
  code: {
    label: '가치코드 발의',
    title: '가치코드 발의와 투표',
    lesson: '2차시 이후',
    empty: '아직 발의된 가치코드가 없습니다.',
  },
}

function sortByLikes<T extends { votes: string[]; createdAt: string }>(items: T[]) {
  return [...items].sort((a, b) => b.votes.length - a.votes.length || Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

function requestedTopic(value: string | null): BoardTopic | null {
  if (value === 'name' || value === 'wish' || value === 'code') return value
  return null
}

function classNameForTopic(topic: BoardTopic) {
  if (topic === 'name') return 'border-[#FFD37A] bg-[#FFD37A]/12 text-[#FFD37A]'
  if (topic === 'wish') return 'border-[#4FE0C0] bg-[#4FE0C0]/12 text-[#4FE0C0]'
  return 'border-[#9B7CFF] bg-[#9B7CFF]/12 text-[#C9B9FF]'
}

export function BoardPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryCode = searchParams.get('code') ?? ''
  const queryTopic = requestedTopic(searchParams.get('mode') ?? searchParams.get('tab'))
  const isTeacherBoard = !queryCode && !queryTopic
  const {
    state,
    joinStudent,
    leaveStudent,
    mergeClass,
    setRemoteStatus,
    addNameCandidate,
    voteName,
    addWish,
    deleteWish,
    addProposal,
    voteProposal,
  } = useV2()

  const [classCode, setClassCode] = useState(queryCode || state.classCode)
  const [nickname, setNickname] = useState(state.studentSession?.nickname ?? '')
  const [selectedTopic, setSelectedTopic] = useState<BoardTopic>(queryTopic ?? 'name')
  const [nameDraft, setNameDraft] = useState('')
  const [reasonDraft, setReasonDraft] = useState('')
  const [wishDraft, setWishDraft] = useState('')
  const [editWishId, setEditWishId] = useState('')
  const [editWishBody, setEditWishBody] = useState('')
  const [valueCard, setValueCard] = useState(valueCards[0])
  const [ruleDraft, setRuleDraft] = useState('')
  const [proposalReasonDraft, setProposalReasonDraft] = useState('')
  const [revisionOfNo, setRevisionOfNo] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [isEntering, setIsEntering] = useState(false)

  const session = state.studentSession
  const canSeeWish = Boolean(state.aemonName || state.wishes.length > 0 || state.currentLesson >= 2 || queryTopic === 'wish')
  const canSeeCode = Boolean(state.currentLesson >= 2 || state.proposals.length > 0 || state.adoptedCodes.length > 0 || queryTopic === 'code')
  const unlockedTopics = useMemo<BoardTopic[]>(() => {
    const topics: BoardTopic[] = ['name']
    if (canSeeWish) topics.push('wish')
    if (canSeeCode) topics.push('code')
    return queryTopic ? topics.filter((topic) => topic === queryTopic) : topics
  }, [canSeeCode, canSeeWish, queryTopic])
  const activeTopic = unlockedTopics.includes(selectedTopic) ? selectedTopic : unlockedTopics[0] ?? 'name'
  const sortedNames = useMemo(() => sortByLikes(state.nameCandidates), [state.nameCandidates])
  const pendingProposals = state.proposals.filter((proposal) => proposal.status === 'pending')
  const sortedProposals = useMemo(() => sortByLikes(pendingProposals), [pendingProposals])
  const myProposalVote = sortedProposals.find((proposal) => proposal.votes.includes(session?.nickname ?? ''))?.id ?? ''
  const canWriteRemote = Boolean(state.classId && state.remote.ok && isRemoteReady())

  useV2RemoteSync(state.classCode, Boolean(state.classCode && (session || isTeacherBoard)))

  const enter = async () => {
    const code = classCode.trim()
    const nick = nickname.trim()
    if (!code || !nick) return

    setIsEntering(true)
    setMessage('')
    try {
      if (state.classCode !== code && isRemoteReady()) {
        const bundle = await fetchRemoteClassBundle(code)
        mergeClass(bundle)
      }
      joinStudent(code, nick)
    } catch (error) {
      setRemoteStatus({ ok: false, message: (error as Error).message })
      setMessage('학급 코드를 확인할 수 없습니다. 선생님 화면의 코드를 다시 확인해주세요.')
    } finally {
      setIsEntering(false)
    }
  }

  const submitName = async () => {
    const name = nameDraft.trim()
    const reason = reasonDraft.trim()
    if (!name || !session) return
    addNameCandidate(name, session.nickname, reason)
    setNameDraft('')
    setReasonDraft('')

    if (canWriteRemote) {
      try {
        await addRemoteNameCandidate({ classId: state.classId, nickname: session.nickname, name, reason })
      } catch (error) {
        setRemoteStatus({ ok: false, message: (error as Error).message })
      }
    }
  }

  const likeName = async (candidateId: string) => {
    if (!session) return
    voteName(candidateId, session.nickname)
    if (canWriteRemote) {
      try {
        await toggleRemoteNameLike({ classId: state.classId, nickname: session.nickname, candidateId })
      } catch (error) {
        setRemoteStatus({ ok: false, message: (error as Error).message })
      }
    }
  }

  const submitWish = async () => {
    const body = wishDraft.trim()
    if (!body || !session) return
    addWish(body, session.nickname)
    setWishDraft('')

    if (canWriteRemote) {
      try {
        await upsertRemoteWish({ classId: state.classId, nickname: session.nickname, body })
      } catch (error) {
        setRemoteStatus({ ok: false, message: (error as Error).message })
      }
    }
  }

  const saveWishEdit = async () => {
    const body = editWishBody.trim()
    if (!editWishId || !body) return
    const wish = state.wishes.find((item) => item.id === editWishId)
    if (wish) addWish(body, wish.nickname)
    setEditWishId('')
    setEditWishBody('')

    if (canWriteRemote) {
      try {
        await updateRemoteWish({ wishId: editWishId, body })
      } catch (error) {
        setRemoteStatus({ ok: false, message: (error as Error).message })
      }
    }
  }

  const removeWish = async (wishId: string) => {
    deleteWish(wishId)
    if (canWriteRemote) {
      try {
        await deleteRemoteWish(wishId)
      } catch (error) {
        setRemoteStatus({ ok: false, message: (error as Error).message })
      }
    }
  }

  const submitProposal = async () => {
    if (!session) return
    const rule = ruleDraft.trim()
    const reason = proposalReasonDraft.trim()
    if (!rule || !reason) return
    const name = state.aemonName || '에아몬'
    const body = rule.includes('해야') || rule.includes('하지') || rule.includes('않') ? rule : `${name}은 ${rule}해야 한다.`

    addProposal({ body, reason, valueCard, revisionOfNo, nickname: session.nickname })
    setRuleDraft('')
    setProposalReasonDraft('')
    setRevisionOfNo(null)

    if (canWriteRemote) {
      try {
        await addRemoteCodeProposal({ classId: state.classId, nickname: session.nickname, body, reason, valueCard, revisionOfNo })
      } catch (error) {
        setRemoteStatus({ ok: false, message: (error as Error).message })
      }
    }
  }

  const castProposalVote = async (proposalId: string) => {
    if (!session) return
    voteProposal(proposalId, session.nickname)
    if (canWriteRemote) {
      try {
        await voteRemoteCodeProposal({ classId: state.classId, nickname: session.nickname, proposalId })
      } catch (error) {
        setRemoteStatus({ ok: false, message: (error as Error).message })
      }
    }
  }

  if (!state.classCode && isTeacherBoard) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-5">
        <Panel className="max-w-md text-center">
          <h1 className="font-display text-4xl text-[#EAF2F5]">학급이 없습니다</h1>
          <p className="mt-3 leading-7 text-[#8AA0B0]">학습게시판을 보려면 먼저 학급을 만들어야 합니다.</p>
          <Button className="mt-6" onClick={() => navigate('/start')}>학급 만들기</Button>
        </Panel>
      </div>
    )
  }

  if (!session && !isTeacherBoard) {
    const entryTopic = queryTopic ?? 'name'
    return (
      <div className="flex min-h-[75vh] items-center justify-center px-5">
        <Panel className="w-full max-w-md">
          <p className="font-data text-sm text-[#4FE0C0]">LEARNING BOARD</p>
          <h1 className="font-display mt-2 text-4xl text-[#EAF2F5]">{topicMeta[entryTopic].title}</h1>
          <p className="mt-3 leading-7 text-[#8AA0B0]">가입 없이 학급 코드와 닉네임만 입력합니다.</p>
          <div className="mt-6 grid gap-4">
            <input
              className="rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-[#EAF2F5]"
              inputMode="numeric"
              placeholder="학급 코드"
              value={classCode}
              onChange={(event) => setClassCode(event.target.value)}
            />
            <input
              className="rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-[#EAF2F5]"
              maxLength={16}
              placeholder="닉네임"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
            />
          </div>
          <Button className="mt-5 w-full" disabled={!classCode.trim() || !nickname.trim() || isEntering} onClick={enter}>
            입장
          </Button>
          {message ? <p className="mt-4 rounded-2xl border border-[#FFD37A]/25 bg-[#FFD37A]/10 px-4 py-3 text-sm leading-6 text-[#FFD37A]">{message}</p> : null}
        </Panel>
      </div>
    )
  }

  const viewerLabel = isTeacherBoard ? '교사 확인' : session?.nickname

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-data text-sm text-[#4FE0C0]">
            {state.className || '학급'} · {viewerLabel}
          </p>
          <h1 className="font-display mt-2 text-4xl text-[#EAF2F5]">학습게시판</h1>
          <p className="mt-2 leading-7 text-[#8AA0B0]">수업에서 열린 주제만 하나씩 추가됩니다.</p>
        </div>
        {!isTeacherBoard ? (
          <Button variant="ghost" onClick={() => { leaveStudent(); navigate('/') }}>
            <LogOut size={18} />
            나가기
          </Button>
        ) : null}
      </div>

      <Panel className="mb-5">
        <div className="flex flex-wrap gap-2">
          {unlockedTopics.map((topic) => (
            <button
              key={topic}
              className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${
                activeTopic === topic ? classNameForTopic(topic) : 'border-white/10 bg-[#07111B]/45 text-[#B7C7D2] hover:border-white/25 hover:text-[#EAF2F5]'
              }`}
              onClick={() => setSelectedTopic(topic)}
              type="button"
            >
              {topicMeta[topic].lesson} · {topicMeta[topic].label}
            </button>
          ))}
        </div>
        {!queryTopic ? (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
            <BookOpenText className="mt-0.5 text-[#FFD37A]" size={20} />
            <p className="text-sm leading-6 text-[#8AA0B0]">
              아직 열리지 않은 주제는 보이지 않습니다. 이름을 정하면 “바라는 모습”이 열리고, 2차시부터 “가치코드 발의”가 열립니다.
            </p>
          </div>
        ) : null}
      </Panel>

      {activeTopic === 'name' ? (
        <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          {!isTeacherBoard ? (
            <Panel>
              <p className="font-data text-xs text-[#FFD37A]">1차시 · 이름 짓기</p>
              <h2 className="font-display mt-1 text-3xl text-[#EAF2F5]">이름 후보 올리기</h2>
              <div className="mt-4 grid gap-3">
                <input
                  className="rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-[#EAF2F5]"
                  maxLength={12}
                  placeholder="이름 후보"
                  value={nameDraft}
                  onChange={(event) => setNameDraft(event.target.value)}
                />
                <input
                  className="rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-[#EAF2F5]"
                  maxLength={80}
                  placeholder="이유"
                  value={reasonDraft}
                  onChange={(event) => setReasonDraft(event.target.value)}
                />
                <Button disabled={!nameDraft.trim()} onClick={submitName}>
                  <Send size={18} />
                  후보 올리기
                </Button>
              </div>
            </Panel>
          ) : null}

          <Panel className={isTeacherBoard ? 'lg:col-span-2' : ''}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-3xl text-[#EAF2F5]">좋아요 많은 순</h2>
              <span className="rounded-full bg-[#07111B]/70 px-3 py-1 text-sm text-[#8AA0B0]">{sortedNames.length}개</span>
            </div>
            <div className="mt-4 grid gap-3">
              {sortedNames.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0]">{topicMeta.name.empty}</p> : null}
              {sortedNames.map((candidate) => {
                const liked = Boolean(session && candidate.votes.includes(session.nickname))
                return (
                  <button
                    key={candidate.id}
                    className={`rounded-2xl border p-4 text-left transition ${liked ? 'border-[#FFD37A] bg-[#FFD37A]/10' : 'border-white/10 bg-[#07111B]/45 hover:border-[#FFD37A]/40'}`}
                    onClick={() => likeName(candidate.id)}
                    disabled={isTeacherBoard}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-2xl font-black text-[#EAF2F5]">{candidate.name}</p>
                        <p className="mt-1 text-sm leading-6 text-[#8AA0B0]">{candidate.reason || '이유 없음'} · {candidate.nickname}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#FFD37A]/15 px-3 py-1 text-sm font-bold text-[#FFD37A]">
                        <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
                        {candidate.votes.length}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </Panel>
        </div>
      ) : null}

      {activeTopic === 'wish' ? (
        <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          {!isTeacherBoard ? (
            <Panel>
              <p className="font-data text-xs text-[#FFD37A]">1차시 · 바람 입력</p>
              <h2 className="font-display mt-1 text-3xl text-[#EAF2F5]">{state.aemonName || '에아몬'}에게 바라는 모습</h2>
              <textarea
                className="mt-4 min-h-32 w-full resize-none rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 leading-7 text-[#EAF2F5]"
                maxLength={160}
                placeholder="예: 친구처럼 다정했으면 좋겠어."
                value={wishDraft}
                onChange={(event) => setWishDraft(event.target.value)}
              />
              <Button className="mt-3 w-full" disabled={!wishDraft.trim()} onClick={submitWish}>
                저장하기
              </Button>
              <p className="mt-3 text-sm leading-6 text-[#8AA0B0]">한 사람당 한 번 저장됩니다. 다시 저장하면 내 글이 수정됩니다.</p>
            </Panel>
          ) : null}

          <Panel className={isTeacherBoard ? 'lg:col-span-2' : ''}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-3xl text-[#EAF2F5]">올라온 바람</h2>
              <span className="rounded-full bg-[#07111B]/70 px-3 py-1 text-sm text-[#8AA0B0]">{state.wishes.length}개</span>
            </div>
            <div className="mt-4 grid gap-3">
              {state.wishes.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0]">{topicMeta.wish.empty}</p> : null}
              {state.wishes.map((wish) => {
                const canEdit = isTeacherBoard || session?.nickname === wish.nickname
                return (
                  <div key={wish.id} className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
                    {editWishId === wish.id ? (
                      <div className="grid gap-3">
                        <textarea
                          className="min-h-24 w-full resize-none rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 leading-7 text-[#EAF2F5]"
                          value={editWishBody}
                          onChange={(event) => setEditWishBody(event.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button className="min-h-10 px-4" onClick={saveWishEdit}>저장</Button>
                          <Button className="min-h-10 px-4" variant="ghost" onClick={() => setEditWishId('')}>취소</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="leading-7 text-[#EAF2F5]">{wish.body}</p>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <span className="text-sm text-[#8AA0B0]">{wish.nickname}</span>
                          {canEdit ? (
                            <div className="flex gap-2">
                              <button
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#B7C7D2] hover:bg-white/10"
                                onClick={() => { setEditWishId(wish.id); setEditWishBody(wish.body) }}
                                type="button"
                                aria-label="수정"
                              >
                                <Pencil size={17} />
                              </button>
                              <button
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#B7C7D2] hover:bg-white/10"
                                onClick={() => removeWish(wish.id)}
                                type="button"
                                aria-label="삭제"
                              >
                                <Trash2 size={17} />
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </Panel>
        </div>
      ) : null}

      {activeTopic === 'code' ? (
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          {!isTeacherBoard ? (
            <Panel>
              <p className="font-data text-xs text-[#9B7CFF]">2차시 이후 · 가치코드</p>
              <h2 className="font-display mt-1 text-3xl text-[#EAF2F5]">가치코드 발의</h2>
              <p className="mt-2 text-sm leading-6 text-[#8AA0B0]">형식: {state.aemonName || '에아몬'}은 ___해야 한다. 왜냐하면 ___이기 때문이다.</p>
              <div className="mt-4 grid gap-3">
                <div className="flex flex-wrap gap-2">
                  {valueCards.map((card) => (
                    <button
                      key={card}
                      className={`rounded-full border px-3 py-2 text-sm font-bold ${valueCard === card ? 'border-[#9B7CFF] bg-[#9B7CFF]/15 text-[#C9B9FF]' : 'border-white/10 text-[#B7C7D2]'}`}
                      onClick={() => setValueCard(card)}
                      type="button"
                    >
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
                <input
                  className="rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-[#EAF2F5]"
                  placeholder={`${state.aemonName || '에아몬'}은 ___해야 한다`}
                  value={ruleDraft}
                  onChange={(event) => setRuleDraft(event.target.value)}
                />
                <input
                  className="rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-[#EAF2F5]"
                  placeholder="왜냐하면 ___이기 때문이다"
                  value={proposalReasonDraft}
                  onChange={(event) => setProposalReasonDraft(event.target.value)}
                />
              </div>
              <Button className="mt-4 w-full" disabled={!ruleDraft.trim() || !proposalReasonDraft.trim()} onClick={submitProposal}>
                <Send size={18} />
                발의하기
              </Button>
            </Panel>
          ) : null}

          <Panel className={isTeacherBoard ? 'lg:col-span-2' : ''}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-3xl text-[#EAF2F5]">투표 중인 발의</h2>
              <span className="rounded-full bg-[#07111B]/70 px-3 py-1 text-sm text-[#8AA0B0]">{sortedProposals.length}개</span>
            </div>
            <div className="mt-4 grid gap-3">
              {sortedProposals.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0]">{topicMeta.code.empty}</p> : null}
              {sortedProposals.map((proposal) => {
                const voted = proposal.id === myProposalVote
                return (
                  <button
                    key={proposal.id}
                    className={`rounded-2xl border p-4 text-left transition ${voted ? 'border-[#9B7CFF] bg-[#9B7CFF]/12' : 'border-white/10 bg-[#07111B]/45 hover:border-[#9B7CFF]/40'}`}
                    onClick={() => castProposalVote(proposal.id)}
                    disabled={isTeacherBoard}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold leading-7 text-[#EAF2F5]">{proposal.body}</p>
                        <p className="mt-1 text-sm leading-6 text-[#8AA0B0]">왜냐하면 {proposal.reason}</p>
                        <p className="mt-2 text-xs text-[#4FE0C0]">{proposal.revisionOfNo ? `No.${proposal.revisionOfNo} 개정` : proposal.valueCard} · {proposal.nickname}</p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#9B7CFF]/15 px-3 py-1 text-sm font-bold text-[#C9B9FF]">
                        <Vote size={16} />
                        {proposal.votes.length}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </Panel>
        </div>
      ) : null}
    </div>
  )
}
