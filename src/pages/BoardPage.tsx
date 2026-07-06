import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BookOpenText, Heart, LogOut, Pencil, Send, Trash2 } from 'lucide-react'
import { Button, Panel } from '../components/ui'
import { PRE_SURVEY_KEY, PRE_SURVEY_QUESTION } from '../data/survey'
import {
  addRemoteNameCandidate,
  deleteRemoteWish,
  fetchRemoteClassBundle,
  isRemoteReady,
  toggleRemoteNameLike,
  updateRemoteWish,
  upsertRemoteSurveyResponse,
  upsertRemoteWish,
} from '../lib/v2Remote'
import { useV2RemoteSync } from '../lib/useV2RemoteSync'
import { useV2 } from '../state/V2Store'

type BoardTopic = 'survey' | 'name' | 'wish' | 'code'

const topicMeta: Record<BoardTopic, { label: string; title: string; lesson: string; empty: string }> = {
  survey: {
    label: '사전 생각',
    title: '사전 생각 남기기',
    lesson: '1차시',
    empty: '아직 남긴 생각이 없습니다.',
  },
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
    label: '가치코드',
    title: '가치코드',
    lesson: '2차시 이후',
    empty: '아직 가치코드가 없습니다.',
  },
}

function sortByLikes<T extends { votes: string[]; createdAt: string }>(items: T[]) {
  return [...items].sort((a, b) => b.votes.length - a.votes.length || Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

function requestedTopic(value: string | null): BoardTopic | null {
  if (value === 'survey' || value === 'name' || value === 'wish' || value === 'code') return value
  return null
}

function classNameForTopic(topic: BoardTopic) {
  if (topic === 'survey') return 'border-[#6AD8FF] bg-[#6AD8FF]/12 text-[#9CE6FF]'
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
    upsertSurveyResponse,
  } = useV2()

  const [classCode, setClassCode] = useState(queryCode || state.classCode)
  const [nickname, setNickname] = useState(state.studentSession?.nickname ?? '')
  const [selectedTopic, setSelectedTopic] = useState<BoardTopic>(queryTopic ?? 'name')
  const [nameDraft, setNameDraft] = useState('')
  const [reasonDraft, setReasonDraft] = useState('')
  const [wishDraft, setWishDraft] = useState('')
  const [surveyDraft, setSurveyDraft] = useState('')
  const [editWishId, setEditWishId] = useState('')
  const [editWishBody, setEditWishBody] = useState('')
  const [message, setMessage] = useState('')
  const [isEntering, setIsEntering] = useState(false)

  const session = state.studentSession
  const canSeeSurvey = Boolean(state.currentLesson >= 1 || state.surveyResponses.length > 0 || queryTopic === 'survey')
  const canSeeWish = Boolean(state.aemonName || state.wishes.length > 0 || state.currentLesson >= 2 || queryTopic === 'wish')
  const canSeeCode = Boolean(state.currentLesson >= 2 || state.proposals.length > 0 || state.adoptedCodes.length > 0 || queryTopic === 'code')
  const unlockedTopics = useMemo<BoardTopic[]>(() => {
    const topics: BoardTopic[] = []
    if (canSeeSurvey) topics.push('survey')
    topics.push('name')
    if (canSeeWish) topics.push('wish')
    if (canSeeCode) topics.push('code')
    return queryTopic ? topics.filter((topic) => topic === queryTopic) : topics
  }, [canSeeCode, canSeeSurvey, canSeeWish, queryTopic])
  const activeTopic = unlockedTopics.includes(selectedTopic) ? selectedTopic : unlockedTopics[0] ?? 'name'
  const sortedNames = useMemo(() => sortByLikes(state.nameCandidates), [state.nameCandidates])
  const surveyResponses = useMemo(
    () => state.surveyResponses.filter((response) => response.questionKey === PRE_SURVEY_KEY),
    [state.surveyResponses],
  )
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

  const submitSurvey = async () => {
    const body = surveyDraft.trim()
    if (!body || !session) return
    upsertSurveyResponse({ questionKey: PRE_SURVEY_KEY, body, nickname: session.nickname })
    setSurveyDraft('')

    if (canWriteRemote) {
      try {
        await upsertRemoteSurveyResponse({ classId: state.classId, nickname: session.nickname, questionKey: PRE_SURVEY_KEY, body })
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
          <p className="mt-2 leading-7 text-[#8AA0B0]">수업에서 남긴 생각을 모아 봅니다.</p>
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
              사전 생각, 이름 후보, 바라는 모습, 가치코드를 차례대로 모읍니다.
            </p>
          </div>
        ) : null}
      </Panel>

      {activeTopic === 'survey' ? (
        <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          {!isTeacherBoard ? (
            <Panel>
              <p className="font-data text-xs text-[#6AD8FF]">1차시 · 사전 생각</p>
              <h2 className="font-display mt-1 text-3xl leading-tight text-[#EAF2F5]">{PRE_SURVEY_QUESTION}</h2>
              <textarea
                className="mt-4 min-h-36 w-full resize-none rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 leading-7 text-[#EAF2F5]"
                maxLength={600}
                placeholder="내 생각을 적어주세요."
                value={surveyDraft}
                onChange={(event) => setSurveyDraft(event.target.value)}
              />
              <Button className="mt-3 w-full" disabled={!surveyDraft.trim()} onClick={submitSurvey}>
                저장하기
              </Button>
              <p className="mt-3 text-sm leading-6 text-[#8AA0B0]">한 사람당 한 번 저장됩니다. 다시 저장하면 내 답이 수정됩니다.</p>
            </Panel>
          ) : null}

          <Panel className={isTeacherBoard ? 'lg:col-span-2' : ''}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-3xl text-[#EAF2F5]">사전 생각</h2>
              <span className="rounded-full bg-[#07111B]/70 px-3 py-1 text-sm text-[#8AA0B0]">{surveyResponses.length}개</span>
            </div>
            <div className="mt-4 grid gap-3">
              {surveyResponses.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0]">{topicMeta.survey.empty}</p> : null}
              {surveyResponses.map((response) => (
                <article key={response.id} className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
                  <p className="leading-7 text-[#EAF2F5]">{response.body}</p>
                  <p className="mt-3 text-sm text-[#8AA0B0]">{response.nickname}</p>
                </article>
              ))}
            </div>
          </Panel>
        </div>
      ) : null}

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
              <h2 className="font-display text-3xl text-[#EAF2F5]">이름 후보</h2>
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
        <Panel>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-3xl text-[#EAF2F5]">가치코드</h2>
            <span className="rounded-full bg-[#07111B]/70 px-3 py-1 text-sm text-[#8AA0B0]">{state.adoptedCodes.length}개</span>
          </div>
          <div className="mt-4 grid gap-3">
            {state.adoptedCodes.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0]">{topicMeta.code.empty}</p> : null}
            {state.adoptedCodes.map((code) => (
              <article key={code.id} className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
                <p className="font-data text-xs text-[#4FE0C0]">No.{code.no}</p>
                <p className="mt-2 font-bold leading-7 text-[#EAF2F5]">{code.body}</p>
                {code.reason ? <p className="mt-1 text-sm leading-6 text-[#8AA0B0]">{code.reason}</p> : null}
              </article>
            ))}
          </div>
        </Panel>
      ) : null}

    </div>
  )
}
