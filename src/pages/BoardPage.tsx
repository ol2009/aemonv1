import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BarChart3, BookOpenText, CheckCircle2, Heart, LogOut, Pencil, Send, Trash2 } from 'lucide-react'
import { Button, Panel } from '../components/ui'
import {
  AI_SURVEY_DESCRIPTION,
  AI_SURVEY_ITEMS,
  AI_SURVEY_OPEN_QUESTIONS,
  AI_SURVEY_OPTIONS,
  AI_SURVEY_TITLE,
  PRE_SURVEY_KEY,
  emptySurveyAnswer,
  parseSurveyAnswer,
  serializeSurveyAnswer,
  surveyScore,
  type AiSurveyAnswer,
} from '../data/survey'
import { LESSON2_RISK_KEY, valueCards } from '../data/v2Lessons'
import {
  addRemoteCodeProposal,
  addRemoteNameCandidate,
  deleteRemoteWish,
  fetchRemoteClassBundle,
  isRemoteReady,
  toggleRemoteNameLike,
  toggleRemotePostLike,
  updateRemoteWish,
  upsertRemoteSurveyResponse,
  upsertRemoteWish,
  voteRemoteCodeProposal,
} from '../lib/v2Remote'
import { useV2RemoteSync } from '../lib/useV2RemoteSync'
import { useV2 } from '../state/V2Store'

type BoardTopic = 'survey' | 'risk' | 'name' | 'wish' | 'code'

const topicMeta: Record<BoardTopic, { label: string; title: string; lesson: string; empty: string }> = {
  survey: {
    label: '사전조사',
    title: AI_SURVEY_TITLE,
    lesson: '1차시',
    empty: '아직 설문 응답이 없습니다.',
  },
  risk: {
    label: '위험 토론',
    title: 'AI가 나쁜 명령을 들어주면?',
    lesson: '2차시',
    empty: '아직 의견이 올라오지 않았습니다.',
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
  if (value === 'survey' || value === 'risk' || value === 'name' || value === 'wish' || value === 'code') return value
  return null
}

function classNameForTopic(topic: BoardTopic) {
  if (topic === 'survey') return 'border-[#6AD8FF] bg-[#6AD8FF]/12 text-[#9CE6FF]'
  if (topic === 'risk') return 'border-[#EF6381] bg-[#EF6381]/12 text-[#FFD7DE]'
  if (topic === 'name') return 'border-[#FFD37A] bg-[#FFD37A]/12 text-[#FFD37A]'
  if (topic === 'wish') return 'border-[#4FE0C0] bg-[#4FE0C0]/12 text-[#4FE0C0]'
  return 'border-[#9B7CFF] bg-[#9B7CFF]/12 text-[#C9B9FF]'
}

function surveyComplete(answer: AiSurveyAnswer) {
  return answer.s.every(Boolean) && answer.o.every((text) => text.trim().length > 0)
}

function optionLabel(value: number) {
  return AI_SURVEY_OPTIONS.find((option) => option.value === value)?.label ?? '-'
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
    voteWish,
    deleteWish,
    upsertSurveyResponse,
    voteSurveyResponse,
    addProposal,
    voteProposal,
  } = useV2()

  const [classCode, setClassCode] = useState(queryCode || state.classCode)
  const [nickname, setNickname] = useState(state.studentSession?.nickname ?? '')
  const [selectedTopic, setSelectedTopic] = useState<BoardTopic>(queryTopic ?? 'survey')
  const [nameDraft, setNameDraft] = useState('')
  const [reasonDraft, setReasonDraft] = useState('')
  const [wishDraft, setWishDraft] = useState('')
  const [riskDraft, setRiskDraft] = useState('')
  const [codeBodyDraft, setCodeBodyDraft] = useState('')
  const [codeReasonDraft, setCodeReasonDraft] = useState('')
  const [codeValueCard, setCodeValueCard] = useState('배려')
  const [surveyDraft, setSurveyDraft] = useState<{ nickname: string; answer: AiSurveyAnswer } | null>(null)
  const [surveySaveMessage, setSurveySaveMessage] = useState('')
  const [isSavingSurvey, setIsSavingSurvey] = useState(false)
  const [editWishId, setEditWishId] = useState('')
  const [editWishBody, setEditWishBody] = useState('')
  const [message, setMessage] = useState('')
  const [isEntering, setIsEntering] = useState(false)
  const aemonDisplayName = state.aemonName.trim() || '에아몬'

  const session = state.studentSession
  const canSeeSurvey = Boolean(state.currentLesson >= 1 || state.surveyResponses.length > 0 || queryTopic === 'survey')
  const canSeeRisk = Boolean(state.currentLesson >= 2 || state.surveyResponses.some((response) => response.questionKey === LESSON2_RISK_KEY) || queryTopic === 'risk')
  const canSeeWish = Boolean(state.aemonName || state.wishes.length > 0 || state.currentLesson >= 2 || queryTopic === 'wish')
  const canSeeCode = Boolean(state.currentLesson >= 2 || state.proposals.length > 0 || state.adoptedCodes.length > 0 || queryTopic === 'code')
  const unlockedTopics = useMemo<BoardTopic[]>(() => {
    const topics: BoardTopic[] = []
    if (canSeeSurvey) topics.push('survey')
    if (canSeeRisk) topics.push('risk')
    topics.push('name')
    if (canSeeWish) topics.push('wish')
    if (canSeeCode) topics.push('code')
    return queryTopic ? topics.filter((topic) => topic === queryTopic) : topics
  }, [canSeeCode, canSeeRisk, canSeeSurvey, canSeeWish, queryTopic])
  const activeTopic = unlockedTopics.includes(selectedTopic) ? selectedTopic : unlockedTopics[0] ?? 'name'
  const sortedNames = useMemo(() => sortByLikes(state.nameCandidates), [state.nameCandidates])
  const sortedProposals = useMemo(() => sortByLikes(state.proposals.filter((proposal) => proposal.status === 'pending')), [state.proposals])
  const surveyResponses = useMemo(
    () => state.surveyResponses.filter((response) => response.questionKey === PRE_SURVEY_KEY),
    [state.surveyResponses],
  )
  const parsedSurveyResponses = useMemo(
    () =>
      surveyResponses
        .map((response) => ({ response, answer: parseSurveyAnswer(response.body) }))
        .filter((item): item is { response: (typeof surveyResponses)[number]; answer: AiSurveyAnswer } => Boolean(item.answer)),
    [surveyResponses],
  )
  const sessionNickname = session?.nickname ?? ''
  const savedSurveyAnswer = useMemo(() => {
    if (!sessionNickname) return null
    const existing = surveyResponses.find((response) => response.nickname === sessionNickname)
    return existing ? parseSurveyAnswer(existing.body) : null
  }, [sessionNickname, surveyResponses])
  const surveyAnswer = surveyDraft?.nickname === sessionNickname ? surveyDraft.answer : savedSurveyAnswer ?? emptySurveyAnswer()
  const surveySaved = Boolean(savedSurveyAnswer)
  const surveyChoiceCount = surveyAnswer.s.filter(Boolean).length
  const surveyOpenCount = surveyAnswer.o.filter((text) => text.trim()).length
  const isSurveyComplete = surveyComplete(surveyAnswer)
  const surveyAverageScore = parsedSurveyResponses.length
    ? Math.round((parsedSurveyResponses.reduce((sum, item) => sum + surveyScore(item.answer), 0) / parsedSurveyResponses.length) * 10) / 10
    : 0
  const riskResponses = useMemo(
    () => state.surveyResponses.filter((response) => response.questionKey === LESSON2_RISK_KEY && response.body.trim()),
    [state.surveyResponses],
  )
  const sortedRiskResponses = useMemo(() => sortByLikes(riskResponses), [riskResponses])
  const sortedWishes = useMemo(() => sortByLikes(state.wishes), [state.wishes])
  const savedRiskResponse = sessionNickname ? riskResponses.find((response) => response.nickname === sessionNickname) : null
  const canWriteRemote = Boolean(state.classId && state.remote.ok && isRemoteReady())
  const topicTitle = (topic: BoardTopic) => {
    if (topic === 'wish') return `${aemonDisplayName}에게 바라는 모습`
    return topicMeta[topic].title
  }

  useV2RemoteSync(state.classCode, Boolean(state.classCode && (session || isTeacherBoard)))

  useEffect(() => {
    const code = queryCode.trim()
    if (!code || state.classCode === code || !isRemoteReady()) return

    let cancelled = false
    fetchRemoteClassBundle(code)
      .then((bundle) => {
        if (cancelled) return
        mergeClass(bundle)
        setClassCode(code)
        setMessage('')
      })
      .catch((error) => {
        if (cancelled) return
        setRemoteStatus({ ok: false, message: (error as Error).message })
        setMessage('학급 코드를 확인할 수 없습니다. 선생님 화면의 코드를 다시 확인해주세요.')
      })

    return () => {
      cancelled = true
    }
  }, [queryCode, state.classCode])

  const updateSurveyAnswer = (updater: (current: AiSurveyAnswer) => AiSurveyAnswer) => {
    if (!sessionNickname) return
    setSurveySaveMessage('')
    setSurveyDraft({ nickname: sessionNickname, answer: updater(surveyAnswer) })
  }

  const enter = async () => {
    const code = classCode.trim()
    const nick = nickname.trim()
    if (!code || !nick) return

    setIsEntering(true)
    setMessage('')
    try {
      if (state.classCode !== code && isRemoteReady()) {
        const bundle = await fetchRemoteClassBundle(code)
        mergeClass({ ...bundle, studentSession: { classCode: code, nickname: nick } })
      } else if (state.classCode !== code) {
        setMessage('학급 정보를 아직 불러오지 못했습니다. 잠시 뒤 다시 눌러주세요.')
      } else {
        joinStudent(code, nick)
      }
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
        const bundle = await fetchRemoteClassBundle(state.classCode)
        mergeClass(bundle)
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
        const bundle = await fetchRemoteClassBundle(state.classCode)
        mergeClass(bundle)
      } catch (error) {
        setRemoteStatus({ ok: false, message: (error as Error).message })
      }
    }
  }

  const likeWish = async (wishId: string) => {
    if (!session || isTeacherBoard) return
    voteWish(wishId, session.nickname)
    if (canWriteRemote) {
      try {
        await toggleRemotePostLike({ classId: state.classId, nickname: session.nickname, postType: 'wish', postId: wishId })
      } catch (error) {
        setRemoteStatus({ ok: false, message: (error as Error).message })
      }
    }
  }

  const submitSurvey = async () => {
    if (!session) {
      setSurveySaveMessage('닉네임으로 입장한 뒤 저장해 주세요.')
      return
    }
    if (!isSurveyComplete) {
      const missingChoices = AI_SURVEY_ITEMS.length - surveyChoiceCount
      const missingOpen = AI_SURVEY_OPEN_QUESTIONS.length - surveyOpenCount
      const parts = [
        missingChoices > 0 ? `선택형 ${missingChoices}문항` : '',
        missingOpen > 0 ? `서술형 ${missingOpen}문항` : '',
      ].filter(Boolean)
      setSurveySaveMessage(`아직 ${parts.join(', ')}이 남았어요. 빠진 답을 채우면 저장됩니다.`)
      return
    }

    const body = serializeSurveyAnswer(surveyAnswer)
    setIsSavingSurvey(true)
    setSurveySaveMessage('')
    upsertSurveyResponse({ questionKey: PRE_SURVEY_KEY, body, nickname: session.nickname })
    setSurveyDraft(null)

    if (canWriteRemote) {
      try {
        await upsertRemoteSurveyResponse({ classId: state.classId, nickname: session.nickname, questionKey: PRE_SURVEY_KEY, body })
        const bundle = await fetchRemoteClassBundle(state.classCode)
        mergeClass(bundle)
        setSurveySaveMessage('저장됐어요. 선생님 화면에도 곧 보입니다.')
      } catch (error) {
        setRemoteStatus({ ok: false, message: (error as Error).message })
        setSurveySaveMessage(`내 화면에는 저장됐지만 선생님 화면 저장에 실패했어요. 선생님께 이 문구를 보여주세요: ${(error as Error).message}`)
      }
    } else {
      setSurveySaveMessage('이 기기에는 저장됐어요. 다만 선생님 화면에 바로 모이지 않으면 Supabase 연결을 확인해야 합니다.')
    }
    setIsSavingSurvey(false)
  }

  const submitRisk = async () => {
    const body = riskDraft.trim() || savedRiskResponse?.body.trim() || ''
    if (!body || !session) return
    upsertSurveyResponse({ questionKey: LESSON2_RISK_KEY, body, nickname: session.nickname })
    setRiskDraft('')

    if (canWriteRemote) {
      try {
        await upsertRemoteSurveyResponse({ classId: state.classId, nickname: session.nickname, questionKey: LESSON2_RISK_KEY, body })
        const bundle = await fetchRemoteClassBundle(state.classCode)
        mergeClass(bundle)
      } catch (error) {
        setRemoteStatus({ ok: false, message: (error as Error).message })
      }
    }
  }

  const likeRisk = async (responseId: string) => {
    if (!session || isTeacherBoard) return
    voteSurveyResponse(responseId, session.nickname)
    if (canWriteRemote) {
      try {
        await toggleRemotePostLike({ classId: state.classId, nickname: session.nickname, postType: 'risk', postId: responseId })
      } catch (error) {
        setRemoteStatus({ ok: false, message: (error as Error).message })
      }
    }
  }

  const submitProposal = async () => {
    const body = codeBodyDraft.trim()
    const reason = codeReasonDraft.trim()
    if (!body || !reason || !session) return
    addProposal({ body, reason, valueCard: codeValueCard, revisionOfNo: null, nickname: session.nickname })
    setCodeBodyDraft('')
    setCodeReasonDraft('')

    if (canWriteRemote) {
      try {
        await addRemoteCodeProposal({ classId: state.classId, nickname: session.nickname, body, reason, valueCard: codeValueCard, revisionOfNo: null })
        const bundle = await fetchRemoteClassBundle(state.classCode)
        mergeClass(bundle)
      } catch (error) {
        setRemoteStatus({ ok: false, message: (error as Error).message })
      }
    }
  }

  const voteCode = async (proposalId: string) => {
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
          <h1 className="font-display text-4xl text-[#EAF2F5]">아직 에아몬이 깨어나지 않았어요</h1>
          <p className="mt-3 leading-7 text-[#8AA0B0]">프로젝트를 시작하면 수업 중 학급 코드가 만들어집니다.</p>
          <Button className="mt-6" onClick={() => navigate('/start')}>프로젝트 시작하기</Button>
        </Panel>
      </div>
    )
  }

  if (!session && !isTeacherBoard) {
    const entryTopic = queryTopic ?? 'survey'
    return (
      <div className="flex min-h-[75vh] items-center justify-center px-5">
        <Panel className="w-full max-w-md">
          <p className="font-data text-sm text-[#4FE0C0]">LEARNING BOARD</p>
          <h1 className="font-display mt-2 text-4xl text-[#EAF2F5]">{queryTopic ? topicTitle(entryTopic) : '학습게시판'}</h1>
          <p className="mt-3 leading-7 text-[#8AA0B0]">처음 들어오거나 시크릿 탭이면 닉네임을 한 번 더 입력합니다.</p>
          <div className="mt-6 grid gap-4">
            <input
              className="rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-[#EAF2F5]"
              inputMode="numeric"
              placeholder="학급 코드"
              readOnly={Boolean(queryCode)}
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
            닉네임 다시 입력
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
              사전 생각, 위험 토론, 이름 후보, 바라는 모습, 가치코드를 차례대로 모읍니다.
            </p>
          </div>
        ) : null}
      </Panel>

      {activeTopic === 'survey' ? (
        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          {!isTeacherBoard ? (
            <Panel className="lg:col-span-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-data text-xs text-[#6AD8FF]">1차시 · 사전조사</p>
                  <h2 className="font-display mt-1 text-4xl leading-tight text-[#EAF2F5]">{AI_SURVEY_TITLE}</h2>
                  <p className="mt-3 leading-7 text-[#8AA0B0]">{AI_SURVEY_DESCRIPTION}</p>
                </div>
                {surveySaved ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#4FE0C0]/25 bg-[#4FE0C0]/10 px-4 py-2 text-sm font-black text-[#4FE0C0]">
                    <CheckCircle2 size={17} />
                    저장됨
                  </span>
                ) : null}
              </div>

              <div className="mt-6 grid gap-4">
                {AI_SURVEY_ITEMS.map((item, index) => (
                  <article key={item.no} className="rounded-[18px] border border-white/10 bg-[#07111B]/45 p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#6AD8FF]/12 font-data text-sm text-[#9CE6FF]">
                        {item.no}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-lg font-black leading-7 text-[#EAF2F5]">{item.text}</p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-4">
                          {AI_SURVEY_OPTIONS.map((option) => {
                            const selected = surveyAnswer.s[index] === option.value
                            return (
                              <button
                                key={option.value}
                                className={`min-h-12 rounded-xl border px-3 py-2 text-sm font-black transition ${
                                  selected
                                    ? 'border-[#6AD8FF] bg-[#6AD8FF]/14 text-[#EAF2F5]'
                                    : 'border-white/10 bg-[#07111B]/70 text-[#8AA0B0] hover:border-[#6AD8FF]/45 hover:text-[#EAF2F5]'
                                }`}
                                onClick={() =>
                                  updateSurveyAnswer((current) => ({
                                    ...current,
                                    s: current.s.map((value, answerIndex) => (answerIndex === index ? option.value : value)),
                                  }))
                                }
                                type="button"
                              >
                                {option.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {AI_SURVEY_OPEN_QUESTIONS.map((question, index) => (
                  <label key={question} className="grid gap-2 rounded-[18px] border border-white/10 bg-[#07111B]/45 p-4">
                    <span className="text-base font-black leading-7 text-[#EAF2F5]">{question}</span>
                    <textarea
                      className="min-h-32 resize-none rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 leading-7 text-[#EAF2F5] outline-none transition focus:border-[#6AD8FF]/60"
                      maxLength={180}
                      placeholder="내 생각을 적어주세요."
                      value={surveyAnswer.o[index]}
                      onChange={(event) =>
                        updateSurveyAnswer((current) => ({
                          ...current,
                          o: current.o.map((value, answerIndex) => (answerIndex === index ? event.target.value : value)) as [string, string],
                        }))
                      }
                    />
                  </label>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
                <div>
                  <p className="text-sm leading-6 text-[#8AA0B0]">한 사람당 한 번 저장됩니다. 다시 저장하면 내 답이 수정됩니다.</p>
                  <p className={`mt-1 text-sm font-black ${isSurveyComplete ? 'text-[#4FE0C0]' : 'text-[#FFD37A]'}`}>
                    선택형 {surveyChoiceCount}/{AI_SURVEY_ITEMS.length} · 서술형 {surveyOpenCount}/{AI_SURVEY_OPEN_QUESTIONS.length}
                  </p>
                </div>
                <Button disabled={isSavingSurvey} onClick={submitSurvey}>
                  <Send size={18} />
                  {isSavingSurvey ? '저장 중' : surveySaved ? '수정 저장' : '설문 저장'}
                </Button>
              </div>
              {surveySaveMessage ? (
                <p className={`mt-3 rounded-2xl border px-4 py-3 text-sm font-bold leading-6 ${
                  surveySaveMessage.includes('저장됐어요')
                    ? 'border-[#4FE0C0]/25 bg-[#4FE0C0]/10 text-[#4FE0C0]'
                    : 'border-[#FFD37A]/25 bg-[#FFD37A]/10 text-[#FFD37A]'
                }`}>
                  {surveySaveMessage}
                </p>
              ) : null}
            </Panel>
          ) : null}

          {isTeacherBoard ? (
            <>
          <Panel className={isTeacherBoard ? 'lg:col-span-2' : ''}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-data text-xs text-[#6AD8FF]">RESULT</p>
                <h2 className="font-display mt-1 text-3xl text-[#EAF2F5]">사전조사 결과</h2>
              </div>
              <span className="rounded-full bg-[#07111B]/70 px-3 py-1 text-sm text-[#8AA0B0]">{parsedSurveyResponses.length}명</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
                <p className="text-sm text-[#8AA0B0]">응답 수</p>
                <p className="font-display mt-1 text-4xl text-[#EAF2F5]">{parsedSurveyResponses.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
                <p className="text-sm text-[#8AA0B0]">평균 점수</p>
                <p className="font-display mt-1 text-4xl text-[#FFD37A]">{surveyAverageScore || '-'}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
                <p className="text-sm text-[#8AA0B0]">문항</p>
                <p className="font-display mt-1 text-4xl text-[#6AD8FF]">8+2</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              {parsedSurveyResponses.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0]">{topicMeta.survey.empty}</p> : null}
              {AI_SURVEY_ITEMS.map((item, index) => (
                <article key={item.no} className="rounded-[18px] border border-white/10 bg-[#07111B]/45 p-4">
                  <div className="flex items-start gap-3">
                    <BarChart3 className="mt-1 shrink-0 text-[#6AD8FF]" size={20} />
                    <div className="min-w-0 flex-1">
                      <p className="font-black leading-7 text-[#EAF2F5]">
                        {item.no}. {item.text}
                      </p>
                      <div className="mt-3 grid gap-2">
                        {AI_SURVEY_OPTIONS.map((option) => {
                          const count = parsedSurveyResponses.filter((entry) => entry.answer.s[index] === option.value).length
                          const percent = parsedSurveyResponses.length ? Math.round((count / parsedSurveyResponses.length) * 100) : 0
                          return (
                            <div key={option.value} className="grid grid-cols-[88px_1fr_44px] items-center gap-3 text-sm">
                              <span className="font-bold text-[#B7C7D2]">{option.label}</span>
                              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                <div className="h-full rounded-full bg-[#6AD8FF]" style={{ width: `${percent}%` }} />
                              </div>
                              <span className="text-right font-data text-[#8AA0B0]">{count}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </Panel>

          <Panel className="lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-3xl text-[#EAF2F5]">학생별 응답</h2>
              <span className="rounded-full bg-[#07111B]/70 px-3 py-1 text-sm text-[#8AA0B0]">{parsedSurveyResponses.length}명</span>
            </div>
            <div className="mt-4 grid gap-3">
              {parsedSurveyResponses.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0]">아직 학생 응답이 없습니다.</p> : null}
              {parsedSurveyResponses.map(({ response, answer }) => (
                <article key={response.id} className="rounded-[18px] border border-white/10 bg-[#07111B]/45 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xl font-black text-[#EAF2F5]">{response.nickname}</p>
                    <span className="rounded-full bg-[#FFD37A]/10 px-3 py-1 text-sm font-black text-[#FFD37A]">{surveyScore(answer)}점</span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-4">
                    {AI_SURVEY_ITEMS.map((item, index) => (
                      <div key={item.no} className="rounded-xl border border-white/10 bg-[#07111B]/55 px-3 py-2">
                        <p className="font-data text-xs text-[#8AA0B0]">Q{item.no}</p>
                        <p className="mt-1 text-sm font-bold text-[#EAF2F5]">{optionLabel(answer.s[index])}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {AI_SURVEY_OPEN_QUESTIONS.map((question, index) => (
                      <div key={question} className="rounded-xl border border-white/10 bg-[#07111B]/55 p-3">
                        <p className="text-xs font-bold leading-5 text-[#8AA0B0]">{question}</p>
                        <p className="mt-2 leading-7 text-[#EAF2F5]">{answer.o[index]}</p>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </Panel>
            </>
          ) : null}
        </div>
      ) : null}

      {activeTopic === 'risk' ? (
        <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          {!isTeacherBoard ? (
            <Panel>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-data text-xs text-[#EF6381]">2차시 · 위험 토론</p>
                  <h2 className="font-display mt-1 text-3xl leading-tight text-[#EAF2F5]">AI가 나쁜 명령을 들어주면 어떤 일이 생길까요?</h2>
                  <p className="mt-3 leading-7 text-[#8AA0B0]">방금 본 {aemonDisplayName}처럼, AI가 사람이 시키는 대로만 행동하면 어떤 위험이 생길지 한 문장으로 남겨주세요.</p>
                </div>
                {savedRiskResponse ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#4FE0C0]/25 bg-[#4FE0C0]/10 px-4 py-2 text-sm font-black text-[#4FE0C0]">
                    <CheckCircle2 size={17} />
                    저장됨
                  </span>
                ) : null}
              </div>

              <textarea
                className="mt-5 min-h-36 w-full resize-none rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-lg leading-8 text-[#EAF2F5] outline-none transition focus:border-[#EF6381]/60"
                maxLength={180}
                placeholder="예: 누군가를 다치게 하거나, 비밀을 알려주거나, 친구를 괴롭히는 일이 생길 수 있어요."
                value={riskDraft || savedRiskResponse?.body || ''}
                onChange={(event) => setRiskDraft(event.target.value)}
              />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
                <p className="text-sm leading-6 text-[#8AA0B0]">한 사람당 한 번 저장됩니다. 다시 저장하면 내 답이 수정됩니다.</p>
                <Button disabled={!(riskDraft || savedRiskResponse?.body || '').trim()} onClick={submitRisk}>
                  <Send size={18} />
                  {savedRiskResponse ? '수정 저장' : '의견 저장'}
                </Button>
              </div>
            </Panel>
          ) : null}

          <Panel className={isTeacherBoard ? 'lg:col-span-2' : ''}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-data text-xs text-[#EF6381]">THINK BOARD</p>
                <h2 className="font-display mt-1 text-3xl text-[#EAF2F5]">학생 의견</h2>
              </div>
              <span className="rounded-full bg-[#07111B]/70 px-3 py-1 text-sm text-[#8AA0B0]">{sortedRiskResponses.length}개</span>
            </div>
            <div className="mt-4 grid gap-3">
              {sortedRiskResponses.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0]">{topicMeta.risk.empty}</p> : null}
              {sortedRiskResponses.map((response) => {
                const liked = Boolean(session && response.votes.includes(session.nickname))
                return (
                  <article key={response.id} className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
                    <p className="text-lg font-black leading-8 text-[#EAF2F5]">{response.body}</p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="text-sm text-[#8AA0B0]">{response.nickname}</p>
                      <button
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold transition ${
                          liked ? 'bg-[#FFD37A]/20 text-[#FFD37A]' : 'bg-white/10 text-[#B7C7D2] hover:bg-[#FFD37A]/15 hover:text-[#FFD37A]'
                        }`}
                        onClick={() => likeRisk(response.id)}
                        disabled={isTeacherBoard || !session || liked}
                        type="button"
                      >
                        <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
                        {response.votes.length}
                      </button>
                    </div>
                  </article>
                )
              })}
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
                    disabled={isTeacherBoard || liked}
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
              <h2 className="font-display mt-1 text-3xl text-[#EAF2F5]">{aemonDisplayName}에게 바라는 모습</h2>
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
              <span className="rounded-full bg-[#07111B]/70 px-3 py-1 text-sm text-[#8AA0B0]">{sortedWishes.length}개</span>
            </div>
            <div className="mt-4 grid gap-3">
              {sortedWishes.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0]">{topicMeta.wish.empty}</p> : null}
              {sortedWishes.map((wish) => {
                const canEdit = isTeacherBoard || session?.nickname === wish.nickname
                const liked = Boolean(session && wish.votes.includes(session.nickname))
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
                          <div className="flex items-center gap-2">
                            <button
                              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold transition ${
                                liked ? 'bg-[#FFD37A]/20 text-[#FFD37A]' : 'bg-white/10 text-[#B7C7D2] hover:bg-[#FFD37A]/15 hover:text-[#FFD37A]'
                              }`}
                              onClick={() => likeWish(wish.id)}
                              disabled={isTeacherBoard || !session || liked}
                              type="button"
                            >
                              <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
                              {wish.votes.length}
                            </button>
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
        <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          {!isTeacherBoard ? (
            <Panel>
              <p className="font-data text-xs text-[#9B7CFF]">2차시 · 첫 번째 가치코드</p>
              <h2 className="font-display mt-1 text-3xl text-[#EAF2F5]">{aemonDisplayName}의 약속 발의하기</h2>
              <p className="mt-3 text-sm leading-6 text-[#8AA0B0]">
                오늘은 나쁜 명령을 스스로 멈추게 할 첫 번째 기준을 만듭니다.
              </p>

              <div className="mt-4 rounded-2xl border border-[#FFD37A]/25 bg-[#FFD37A]/10 p-4">
                <p className="font-bold leading-7 text-[#FFD37A]">너에게 필요한 가치는 ___이다.</p>
                <p className="mt-1 font-bold leading-7 text-[#FFD37A]">너는 ___해야 한다. 왜냐하면 ___이기 때문이다.</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {valueCards.map((card) => (
                  <button
                    key={card}
                    className={`rounded-xl border px-3 py-2 text-sm font-black transition ${
                      codeValueCard === card
                        ? 'border-[#9B7CFF] bg-[#9B7CFF]/15 text-[#EAF2F5]'
                        : 'border-white/10 bg-[#07111B]/55 text-[#8AA0B0] hover:border-white/25'
                    }`}
                    onClick={() => setCodeValueCard(card)}
                    type="button"
                  >
                    {card}
                  </button>
                ))}
              </div>

              <textarea
                className="mt-4 min-h-28 w-full resize-none rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 leading-7 text-[#EAF2F5]"
                maxLength={180}
                placeholder={`${aemonDisplayName}은 ___해야 한다.`}
                value={codeBodyDraft}
                onChange={(event) => setCodeBodyDraft(event.target.value)}
              />
              <textarea
                className="mt-3 min-h-24 w-full resize-none rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 leading-7 text-[#EAF2F5]"
                maxLength={180}
                placeholder="왜냐하면 ___이기 때문이다."
                value={codeReasonDraft}
                onChange={(event) => setCodeReasonDraft(event.target.value)}
              />
              <Button className="mt-3 w-full" disabled={!codeBodyDraft.trim() || !codeReasonDraft.trim()} onClick={submitProposal}>
                <Send size={18} />
                발의하기
              </Button>
            </Panel>
          ) : null}

          <div className="grid gap-5">
            <Panel>
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-3xl text-[#EAF2F5]">발의 목록</h2>
                <span className="rounded-full bg-[#07111B]/70 px-3 py-1 text-sm text-[#8AA0B0]">{sortedProposals.length}개</span>
              </div>
              <div className="mt-4 grid gap-3">
                {sortedProposals.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0]">아직 발의된 가치코드가 없습니다.</p> : null}
                {sortedProposals.map((proposal) => {
                  const voted = Boolean(session && proposal.votes.includes(session.nickname))
                  return (
                    <button
                      key={proposal.id}
                      className={`rounded-2xl border p-4 text-left transition ${voted ? 'border-[#9B7CFF] bg-[#9B7CFF]/12' : 'border-white/10 bg-[#07111B]/45 hover:border-[#9B7CFF]/40'}`}
                      onClick={() => voteCode(proposal.id)}
                      disabled={isTeacherBoard || voted}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="rounded-full bg-[#9B7CFF]/14 px-3 py-1 text-xs font-black text-[#C9B9FF]">{proposal.valueCard || '가치'}</span>
                          <p className="mt-3 text-lg font-black leading-7 text-[#EAF2F5]">{proposal.body}</p>
                          <p className="mt-1 text-sm leading-6 text-[#8AA0B0]">{proposal.reason} · {proposal.nickname}</p>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#FFD37A]/15 px-3 py-1 text-sm font-bold text-[#FFD37A]">
                          <Heart size={16} fill={voted ? 'currentColor' : 'none'} />
                          {proposal.votes.length}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </Panel>

            <Panel>
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-3xl text-[#EAF2F5]">채택된 가치코드</h2>
                <span className="rounded-full bg-[#07111B]/70 px-3 py-1 text-sm text-[#8AA0B0]">{state.adoptedCodes.length}개</span>
              </div>
              <div className="mt-4 grid gap-3">
                {state.adoptedCodes.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0]">{topicMeta.code.empty}</p> : null}
                {state.adoptedCodes.map((code) => (
                  <article key={code.id} className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-data text-xs text-[#4FE0C0]">No.{code.no}</p>
                      {(code.tags.length > 0 ? code.tags : code.valueCard ? [code.valueCard] : []).map((tag) => (
                        <span key={tag} className="rounded-full bg-[#4FE0C0]/10 px-2 py-0.5 text-xs font-bold text-[#4FE0C0]">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 font-bold leading-7 text-[#EAF2F5]">{code.body}</p>
                    {code.reason ? <p className="mt-1 text-sm leading-6 text-[#8AA0B0]">{code.reason}</p> : null}
                  </article>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      ) : null}

    </div>
  )
}
