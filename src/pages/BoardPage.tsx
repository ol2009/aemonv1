import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Heart, LogOut, Pencil, Send, Trash2 } from 'lucide-react'
import { Button, Panel } from '../components/ui'
import {
  addRemoteNameCandidate,
  fetchRemoteClassBundle,
  isRemoteReady,
  toggleRemoteNameLike,
  upsertRemoteWish,
  deleteRemoteWish,
  updateRemoteWish,
} from '../lib/v2Remote'
import { useV2RemoteSync } from '../lib/useV2RemoteSync'
import { useV2 } from '../state/V2Store'

function modeLabel(mode: string) {
  if (mode === 'wish') return '우리반 인공지능에게 바란다'
  if (mode === 'name') return '에아몬 이름 후보'
  return '학생 게시판'
}

function sortByLikes<T extends { votes: string[]; createdAt: string }>(items: T[]) {
  return [...items].sort((a, b) => b.votes.length - a.votes.length || Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

export function BoardPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryMode = searchParams.get('mode') ?? 'name'
  const queryCode = searchParams.get('code') ?? ''
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
  } = useV2()

  const [classCode, setClassCode] = useState(queryCode || state.classCode)
  const [nickname, setNickname] = useState(state.studentSession?.nickname ?? '')
  const [nameDraft, setNameDraft] = useState('')
  const [reasonDraft, setReasonDraft] = useState('')
  const [wishDraft, setWishDraft] = useState('')
  const [editWishId, setEditWishId] = useState('')
  const [editWishBody, setEditWishBody] = useState('')
  const [message, setMessage] = useState('')
  const [isEntering, setIsEntering] = useState(false)

  const session = state.studentSession
  const activeMode = queryMode === 'wish' ? 'wish' : queryMode === 'name' ? 'name' : 'all'
  const sortedNames = useMemo(() => sortByLikes(state.nameCandidates), [state.nameCandidates])

  useV2RemoteSync(state.classCode, Boolean(session && state.classCode))

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
      setMessage((error as Error).message)
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

    if (state.classId && isRemoteReady()) {
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
    if (state.classId && isRemoteReady()) {
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

    if (state.classId && isRemoteReady()) {
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

    if (isRemoteReady()) {
      try {
        await updateRemoteWish({ wishId: editWishId, body })
      } catch (error) {
        setRemoteStatus({ ok: false, message: (error as Error).message })
      }
    }
  }

  const removeWish = async (wishId: string) => {
    deleteWish(wishId)
    if (isRemoteReady()) {
      try {
        await deleteRemoteWish(wishId)
      } catch (error) {
        setRemoteStatus({ ok: false, message: (error as Error).message })
      }
    }
  }

  if (!session) {
    return (
      <div className="flex min-h-[75vh] items-center justify-center px-5">
        <Panel className="w-full max-w-md">
          <p className="font-data text-sm text-[#4FE0C0]">STUDENT</p>
          <h1 className="font-display mt-2 text-4xl text-[#EAF2F5]">{modeLabel(activeMode)}</h1>
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

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-data text-sm text-[#4FE0C0]">
            {state.className || '학급'} · {session.nickname}
          </p>
          <h1 className="font-display mt-2 text-4xl text-[#EAF2F5]">{modeLabel(activeMode)}</h1>
        </div>
        <Button variant="ghost" onClick={() => { leaveStudent(); navigate('/') }}>
          <LogOut size={18} />
          나가기
        </Button>
      </div>

      {!state.remote.ok ? (
        <p className="mb-5 rounded-2xl border border-[#FFD37A]/25 bg-[#FFD37A]/10 px-4 py-3 text-sm leading-6 text-[#FFD37A]">{state.remote.message}</p>
      ) : null}

      {(activeMode === 'name' || activeMode === 'all') ? (
        <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
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

          <Panel>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-3xl text-[#EAF2F5]">좋아요 많은 순</h2>
              <span className="rounded-full bg-[#07111B]/70 px-3 py-1 text-sm text-[#8AA0B0]">{sortedNames.length}개</span>
            </div>
            <div className="mt-4 grid gap-3">
              {sortedNames.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0]">아직 이름 후보가 없습니다.</p> : null}
              {sortedNames.map((candidate) => {
                const liked = candidate.votes.includes(session.nickname)
                return (
                  <button
                    key={candidate.id}
                    className={`rounded-2xl border p-4 text-left transition ${liked ? 'border-[#FFD37A] bg-[#FFD37A]/10' : 'border-white/10 bg-[#07111B]/45 hover:border-[#FFD37A]/40'}`}
                    onClick={() => likeName(candidate.id)}
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

      {(activeMode === 'wish' || activeMode === 'all') ? (
        <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
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

          <Panel>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-3xl text-[#EAF2F5]">올라온 바람</h2>
              <span className="rounded-full bg-[#07111B]/70 px-3 py-1 text-sm text-[#8AA0B0]">{state.wishes.length}개</span>
            </div>
            <div className="mt-4 grid gap-3">
              {state.wishes.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0]">아직 글이 없습니다.</p> : null}
              {state.wishes.map((wish) => (
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
                        <div className="flex gap-2">
                          {session.nickname === wish.nickname ? (
                            <button
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#B7C7D2] hover:bg-white/10"
                              onClick={() => { setEditWishId(wish.id); setEditWishBody(wish.body) }}
                              type="button"
                              aria-label="수정"
                            >
                              <Pencil size={17} />
                            </button>
                          ) : null}
                          {session.nickname === wish.nickname ? (
                            <button
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#B7C7D2] hover:bg-white/10"
                              onClick={() => removeWish(wish.id)}
                              type="button"
                              aria-label="삭제"
                            >
                              <Trash2 size={17} />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </Panel>
        </div>
      ) : null}
    </div>
  )
}
