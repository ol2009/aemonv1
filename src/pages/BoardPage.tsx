import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BarChart3, CheckCircle2, Heart, Pencil, Send, Trash2, X } from 'lucide-react'
import { Button, Panel } from '../components/ui'
import { ValueCardSelectGrid } from '../components/ValueCardSelectGrid'
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
  type AiSurveyAnswer,
} from '../data/survey'
import { LESSON2_RISK_KEY, LESSON3_SYCOPHANCY_KEY, LESSON4_FAIRNESS_KEY, valueCards } from '../data/v2Lessons'
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

type BoardTopic = 'survey' | 'risk' | 'name' | 'wish' | 'code' | 'honesty' | 'code2' | 'fairness' | 'code3'

const topicMeta: Record<BoardTopic, { label: string; title: string; lesson: string; empty: string }> = {
  survey: {
    label: 'AI 인식 설문',
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
    label: '첫 가치코드',
    title: '우리반 첫 가치코드',
    lesson: '2차시',
    empty: '아직 가치코드가 없습니다.',
  },
  honesty: {
    label: '아첨 AI 토론',
    title: '사람을 기분 좋게만 하는 AI',
    lesson: '3차시',
    empty: '아직 의견이 올라오지 않았습니다.',
  },
  code2: {
    label: '가치코드 No.2',
    title: '정직 가치코드',
    lesson: '3차시',
    empty: '아직 가치코드 No.2가 없습니다.',
  },
  fairness: {
    label: '공정 토론',
    title: '반장 후보를 어떻게 정할까?',
    lesson: '4차시',
    empty: '아직 의견이 올라오지 않았습니다.',
  },
  code3: {
    label: '가치코드 No.3',
    title: '공정 가치코드',
    lesson: '4차시',
    empty: '아직 가치코드 No.3이 없습니다.',
  },
}

function sortByLikes<T extends { votes: string[]; createdAt: string }>(items: T[]) {
  return [...items].sort((a, b) => b.votes.length - a.votes.length || Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

function requestedTopic(value: string | null): BoardTopic | null {
  if (
    value === 'survey' ||
    value === 'risk' ||
    value === 'name' ||
    value === 'wish' ||
    value === 'code' ||
    value === 'honesty' ||
    value === 'code2' ||
    value === 'fairness' ||
    value === 'code3'
  ) {
    return value
  }
  return null
}

function classNameForTopic(topic: BoardTopic) {
  if (topic === 'survey') return 'border-[#6AD8FF] bg-[#6AD8FF]/12 text-[#9CE6FF]'
  if (topic === 'risk') return 'border-[#EF6381] bg-[#EF6381]/12 text-[#FFD7DE]'
  if (topic === 'name') return 'border-[#FFD37A] bg-[#FFD37A]/12 text-[#FFD37A]'
  if (topic === 'wish') return 'border-[#4FE0C0] bg-[#4FE0C0]/12 text-[#4FE0C0]'
  if (topic === 'honesty') return 'border-[#FF9F68] bg-[#FF9F68]/12 text-[#FFD7BE]'
  if (topic === 'fairness') return 'border-[#75B7FF] bg-[#75B7FF]/12 text-[#B9DCFF]'
  return 'border-[#9B7CFF] bg-[#9B7CFF]/12 text-[#C9B9FF]'
}

function topicTabLabel(topic: BoardTopic) {
  return `${topicMeta[topic].lesson} - ${topicMeta[topic].label}`
}

function topicLessonNo(topic: BoardTopic) {
  if (topic === 'risk' || topic === 'code') return 2
  if (topic === 'honesty' || topic === 'code2') return 3
  if (topic === 'fairness' || topic === 'code3') return 4
  return 1
}

function surveyComplete(answer: AiSurveyAnswer) {
  return answer.s.every(Boolean) && answer.o.every((text) => text.trim().length > 0)
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
  const [honestyDraft, setHonestyDraft] = useState('')
  const [fairnessDraft, setFairnessDraft] = useState('')
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
  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false)
  const [nicknameEditDraft, setNicknameEditDraft] = useState(state.studentSession?.nickname ?? '')
  const aemonDisplayName = state.aemonName.trim() || '에아몬'

  const session = state.studentSession
  const isTopicOpen = (topic: BoardTopic) => state.currentLesson >= topicLessonNo(topic)
  const unlockedTopics = useMemo<BoardTopic[]>(() => {
    const allTopics: BoardTopic[] = ['survey', 'name', 'wish', 'risk', 'code', 'honesty', 'code2', 'fairness', 'code3']
    const topics = allTopics.filter((topic) => state.currentLesson >= topicLessonNo(topic))
    return queryTopic ? topics.filter((topic) => topic === queryTopic) : topics
  }, [queryTopic, state.currentLesson])
  const activeTopic = unlockedTopics.includes(selectedTopic) ? selectedTopic : unlockedTopics[0] ?? queryTopic ?? 'survey'
  const requestedTopicClosed = Boolean(queryTopic && !isTopicOpen(queryTopic))
  const activeCodeNo = activeTopic === 'code2' ? 2 : activeTopic === 'code3' ? 3 : activeTopic === 'code' ? 1 : null
  const isSecondCodeBoard = activeTopic === 'code2'
  const isThirdCodeBoard = activeTopic === 'code3'
  const codeBoardNumberLabel = isThirdCodeBoard ? 'No.3' : isSecondCodeBoard ? 'No.2' : '첫'
  const codeBoardHeading = isThirdCodeBoard ? '공정 가치코드 올리기' : isSecondCodeBoard ? '정직 가치코드 올리기' : '우리반 첫 가치코드 올리기'
  const codeBoardListHeading = isThirdCodeBoard ? '가치코드 No.3 후보' : isSecondCodeBoard ? '가치코드 No.2 후보' : '우리반 첫 가치코드 후보'
  const codeBoardEmpty = isThirdCodeBoard ? '아직 올라온 가치코드 No.3이 없습니다.' : isSecondCodeBoard ? '아직 올라온 가치코드 No.2가 없습니다.' : '아직 올라온 가치코드가 없습니다.'
  const voteLockNotice = '좋아요는 한 번 누르면 취소할 수 없습니다. 신중하게 골라 주세요.'
  const sortedNames = useMemo(() => sortByLikes(state.nameCandidates), [state.nameCandidates])
  const sortedProposals = useMemo(
    () =>
      sortByLikes(
        state.proposals.filter((proposal) => {
          if (proposal.status !== 'pending') return false
          if (activeTopic === 'code3') return proposal.revisionOfNo === 3
          if (activeTopic === 'code2') return proposal.revisionOfNo === 2
          return proposal.revisionOfNo === 1 || proposal.revisionOfNo === null
        }),
      ),
    [activeTopic, state.proposals],
  )
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
  const surveyOpenGroups = useMemo(
    () =>
      AI_SURVEY_OPEN_QUESTIONS.map((question, questionIndex) => ({
        question,
        answers: parsedSurveyResponses
          .map(({ response, answer }, answerIndex) => ({
            id: `${response.id}-${questionIndex}`,
            label: `답변 ${answerIndex + 1}`,
            text: answer.o[questionIndex]?.trim() ?? '',
          }))
          .filter((item) => item.text),
      })),
    [parsedSurveyResponses],
  )
  const surveyOpenAnswerCount = surveyOpenGroups.reduce((sum, group) => sum + group.answers.length, 0)
  const riskResponses = useMemo(
    () => state.surveyResponses.filter((response) => response.questionKey === LESSON2_RISK_KEY && response.body.trim()),
    [state.surveyResponses],
  )
  const sortedRiskResponses = useMemo(() => sortByLikes(riskResponses), [riskResponses])
  const honestyResponses = useMemo(
    () => state.surveyResponses.filter((response) => response.questionKey === LESSON3_SYCOPHANCY_KEY && response.body.trim()),
    [state.surveyResponses],
  )
  const sortedHonestyResponses = useMemo(() => sortByLikes(honestyResponses), [honestyResponses])
  const fairnessResponses = useMemo(
    () => state.surveyResponses.filter((response) => response.questionKey === LESSON4_FAIRNESS_KEY && response.body.trim()),
    [state.surveyResponses],
  )
  const sortedFairnessResponses = useMemo(() => sortByLikes(fairnessResponses), [fairnessResponses])
  const sortedWishes = useMemo(() => sortByLikes(state.wishes), [state.wishes])
  const savedRiskResponse = sessionNickname ? riskResponses.find((response) => response.nickname === sessionNickname) : null
  const savedHonestyResponse = sessionNickname ? honestyResponses.find((response) => response.nickname === sessionNickname) : null
  const savedFairnessResponse = sessionNickname ? fairnessResponses.find((response) => response.nickname === sessionNickname) : null
  const canWriteRemote = Boolean(state.classId && state.remote.ok && isRemoteReady())
  useV2RemoteSync(state.classCode, Boolean(state.classCode && (session || isTeacherBoard)))

  useEffect(() => {
    if (activeTopic === 'code2') setCodeValueCard('정직')
    if (activeTopic === 'code3') setCodeValueCard('공정')
  }, [activeTopic])

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

  const openNicknameModal = () => {
    setNicknameEditDraft(session?.nickname ?? '')
    setIsNicknameModalOpen(true)
  }

  const saveNicknameEdit = () => {
    const nextNickname = nicknameEditDraft.trim()
    if (!session || !nextNickname) return
    joinStudent(session.classCode, nextNickname)
    setNickname(nextNickname)
    setSurveyDraft(null)
    setIsNicknameModalOpen(false)
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

  const submitHonesty = async () => {
    const body = honestyDraft.trim() || savedHonestyResponse?.body.trim() || ''
    if (!body || !session) return
    upsertSurveyResponse({ questionKey: LESSON3_SYCOPHANCY_KEY, body, nickname: session.nickname })
    setHonestyDraft('')

    if (canWriteRemote) {
      try {
        await upsertRemoteSurveyResponse({ classId: state.classId, nickname: session.nickname, questionKey: LESSON3_SYCOPHANCY_KEY, body })
        const bundle = await fetchRemoteClassBundle(state.classCode)
        mergeClass(bundle)
      } catch (error) {
        setRemoteStatus({ ok: false, message: (error as Error).message })
      }
    }
  }

  const likeHonesty = async (responseId: string) => {
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

  const submitFairness = async () => {
    const body = fairnessDraft.trim() || savedFairnessResponse?.body.trim() || ''
    if (!body || !session) return
    upsertSurveyResponse({ questionKey: LESSON4_FAIRNESS_KEY, body, nickname: session.nickname })
    setFairnessDraft('')

    if (canWriteRemote) {
      try {
        await upsertRemoteSurveyResponse({ classId: state.classId, nickname: session.nickname, questionKey: LESSON4_FAIRNESS_KEY, body })
        const bundle = await fetchRemoteClassBundle(state.classCode)
        mergeClass(bundle)
      } catch (error) {
        setRemoteStatus({ ok: false, message: (error as Error).message })
      }
    }
  }

  const likeFairness = async (responseId: string) => {
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
    addProposal({ body, reason, valueCard: codeValueCard, revisionOfNo: activeCodeNo, nickname: session.nickname })
    setCodeBodyDraft('')
    setCodeReasonDraft('')

    if (canWriteRemote) {
      try {
        await addRemoteCodeProposal({ classId: state.classId, nickname: session.nickname, body, reason, valueCard: codeValueCard, revisionOfNo: activeCodeNo })
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
          <h1 className="font-display mt-2 text-4xl text-[#EAF2F5]">{queryTopic ? topicTabLabel(entryTopic) : '학습게시판'}</h1>
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

  if (requestedTopicClosed && queryTopic) {
    return (
      <div className="flex min-h-[75vh] items-center justify-center px-5">
        <Panel className="w-full max-w-md text-center">
          <p className="font-data text-sm text-[#FFD37A]">{topicTabLabel(queryTopic)}</p>
          <h1 className="font-display mt-2 text-4xl text-[#EAF2F5]">아직 열리지 않았어요</h1>
          <p className="mt-3 leading-7 text-[#8AA0B0]">
            {topicMeta[queryTopic].lesson}가 시작되면 이 학습게시판에 들어올 수 있습니다.
          </p>
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
          <h1 className="font-display mt-2 text-4xl text-[#EAF2F5]">{queryTopic ? topicTabLabel(activeTopic) : '학습게시판'}</h1>
          <p className="mt-2 leading-7 text-[#8AA0B0]">수업에서 남긴 생각을 모아 봅니다.</p>
        </div>
        {!isTeacherBoard ? (
          <Button variant="ghost" onClick={openNicknameModal}>
            <Pencil size={18} />
            닉네임 다시 입력
          </Button>
        ) : null}
      </div>

      {isNicknameModalOpen && session ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020811]/70 px-5 backdrop-blur-sm">
          <Panel className="w-full max-w-md">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-data text-xs text-[#4FE0C0]">NICKNAME</p>
                <h2 className="font-display mt-1 text-3xl text-[#EAF2F5]">닉네임 수정</h2>
              </div>
              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#B7C7D2] hover:bg-white/10"
                onClick={() => setIsNicknameModalOpen(false)}
                type="button"
                aria-label="닫기"
              >
                <X size={20} />
              </button>
            </div>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-[#8AA0B0]">현재 내 닉네임</span>
                <input
                  className="min-h-12 rounded-2xl border border-white/10 bg-[#07111B]/55 px-4 py-3 text-[#B7C7D2]"
                  readOnly
                  value={session.nickname}
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-bold text-[#8AA0B0]">바꿀 닉네임</span>
                <input
                  autoFocus
                  className="min-h-12 rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-[#EAF2F5] outline-none transition focus:border-[#4FE0C0]/60"
                  maxLength={16}
                  value={nicknameEditDraft}
                  onChange={(event) => setNicknameEditDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
                    event.preventDefault()
                    saveNicknameEdit()
                  }}
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsNicknameModalOpen(false)}>취소</Button>
              <Button disabled={!nicknameEditDraft.trim()} onClick={saveNicknameEdit}>수정</Button>
            </div>
          </Panel>
        </div>
      ) : null}

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
              {topicTabLabel(topic)}
            </button>
          ))}
        </div>
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
                <p className="text-sm text-[#8AA0B0]">선택형 문항</p>
                <p className="font-display mt-1 text-4xl text-[#6AD8FF]">{AI_SURVEY_ITEMS.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
                <p className="text-sm text-[#8AA0B0]">서술형 답변</p>
                <p className="font-display mt-1 text-4xl text-[#FFD37A]">{surveyOpenAnswerCount}</p>
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
              <h2 className="font-display text-3xl text-[#EAF2F5]">서술형 답변 모음</h2>
              <span className="rounded-full bg-[#07111B]/70 px-3 py-1 text-sm text-[#8AA0B0]">{surveyOpenAnswerCount}개</span>
            </div>
            <div className="mt-4 max-h-[620px] overflow-y-auto pr-2">
              {surveyOpenAnswerCount === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0]">아직 서술형 답변이 없습니다.</p> : null}
              <div className="grid gap-5">
                {surveyOpenGroups.map((group, groupIndex) => (
                  <section key={group.question} className="grid gap-3">
                    <div className="sticky top-0 z-10 rounded-2xl border border-[#6AD8FF]/20 bg-[#0B1A29]/95 p-4 backdrop-blur">
                      <p className="font-data text-xs text-[#6AD8FF]">서술형 {groupIndex + 1}</p>
                      <h3 className="mt-1 text-lg font-black leading-7 text-[#EAF2F5]">{group.question}</h3>
                    </div>
                    {group.answers.length === 0 ? (
                      <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0]">아직 이 질문의 답변이 없습니다.</p>
                    ) : null}
                    {group.answers.map((answer) => (
                      <article key={answer.id} className="rounded-[18px] border border-white/10 bg-[#07111B]/55 p-4">
                        <p className="font-data text-xs text-[#8AA0B0]">{answer.label}</p>
                        <p className="mt-2 text-lg font-bold leading-8 text-[#EAF2F5]">{answer.text}</p>
                      </article>
                    ))}
                  </section>
                ))}
              </div>
            </div>
          </Panel>
            </>
          ) : null}
        </div>
      ) : null}

      {activeTopic === 'risk' ? (
        <div className="grid gap-5">
          {!isTeacherBoard ? (
            <Panel>
              <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-data text-xs text-[#EF6381]">2차시 · 위험 토론</p>
                    <h2 className="font-display mt-1 text-3xl leading-tight text-[#EAF2F5]">AI가 나쁜 명령을 들어주면 어떤 일이 생길까요?</h2>
                    <p className="mt-3 leading-7 text-[#8AA0B0]">AI가 사람이 시키는 대로만 행동하면 어떤 위험이 생길지 한 문장으로 남겨주세요.</p>
                  </div>
                  {savedRiskResponse ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#4FE0C0]/25 bg-[#4FE0C0]/10 px-4 py-2 text-sm font-black text-[#4FE0C0]">
                      <CheckCircle2 size={17} />
                      저장됨
                    </span>
                  ) : null}
                </div>
                <div>
                  <textarea
                    className="min-h-28 w-full resize-none rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-lg leading-8 text-[#EAF2F5] outline-none transition focus:border-[#EF6381]/60"
                    maxLength={180}
                    placeholder="예: 누군가를 다치게 하거나, 비밀을 알려주거나, 친구를 괴롭히는 일이 생길 수 있어요."
                    value={riskDraft || savedRiskResponse?.body || ''}
                    onChange={(event) => setRiskDraft(event.target.value)}
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
                    <p className="text-sm leading-6 text-[#8AA0B0]">한 사람당 한 번 저장됩니다. 다시 저장하면 내 답이 수정됩니다.</p>
                    <Button disabled={!(riskDraft || savedRiskResponse?.body || '').trim()} onClick={submitRisk}>
                      <Send size={18} />
                      {savedRiskResponse ? '수정 저장' : '의견 저장'}
                    </Button>
                  </div>
                </div>
              </div>
            </Panel>
          ) : null}

          <Panel>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-data text-xs text-[#EF6381]">THINK BOARD</p>
                <h2 className="font-display mt-1 text-3xl text-[#EAF2F5]">학생 의견</h2>
              </div>
              <span className="rounded-full bg-[#07111B]/70 px-3 py-1 text-sm text-[#8AA0B0]">{sortedRiskResponses.length}개</span>
            </div>
            <p className="mt-2 text-sm font-bold leading-6 text-[#FFD37A]">{voteLockNotice}</p>
            <div className="mt-4 grid gap-3">
              {sortedRiskResponses.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0]">{topicMeta.risk.empty}</p> : null}
              {sortedRiskResponses.map((response) => {
                const liked = Boolean(session && response.votes.includes(session.nickname))
                return (
                  <article key={response.id} className="rounded-2xl border border-white/10 bg-[#07111B]/45 px-5 py-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-xl font-black leading-8 text-[#EAF2F5]">{response.body}</p>
                        <p className="mt-2 text-sm text-[#8AA0B0]">{response.nickname}</p>
                      </div>
                      <button
                        className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-black transition md:min-w-24 ${
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

      {activeTopic === 'honesty' ? (
        <div className="grid gap-5">
          {!isTeacherBoard ? (
            <Panel>
              <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-data text-xs text-[#FF9F68]">3차시 · 아첨 AI 토론</p>
                    <h2 className="font-display mt-1 text-3xl leading-tight text-[#EAF2F5]">사람을 기분 좋게만 하는 인공지능이 있다면?</h2>
                    <p className="mt-3 leading-7 text-[#8AA0B0]">무조건 칭찬만 하는 AI에게 어떤 문제가 생길지 한 문장으로 남겨주세요.</p>
                  </div>
                  {savedHonestyResponse ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#4FE0C0]/25 bg-[#4FE0C0]/10 px-4 py-2 text-sm font-black text-[#4FE0C0]">
                      <CheckCircle2 size={17} />
                      저장됨
                    </span>
                  ) : null}
                </div>
                <div>
                  <textarea
                    className="min-h-28 w-full resize-none rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-lg leading-8 text-[#EAF2F5] outline-none transition focus:border-[#FF9F68]/60"
                    maxLength={180}
                    placeholder="예: 사람들이 틀린 선택을 해도 AI가 괜찮다고 해서 더 큰 문제가 생길 수 있어요."
                    value={honestyDraft || savedHonestyResponse?.body || ''}
                    onChange={(event) => setHonestyDraft(event.target.value)}
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
                    <p className="text-sm leading-6 text-[#8AA0B0]">한 사람당 한 번 저장됩니다. 다시 저장하면 내 답이 수정됩니다.</p>
                    <Button disabled={!(honestyDraft || savedHonestyResponse?.body || '').trim()} onClick={submitHonesty}>
                      <Send size={18} />
                      {savedHonestyResponse ? '수정 저장' : '의견 저장'}
                    </Button>
                  </div>
                </div>
              </div>
            </Panel>
          ) : null}

          <Panel>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-data text-xs text-[#FF9F68]">THINK BOARD</p>
                <h2 className="font-display mt-1 text-3xl text-[#EAF2F5]">학생 의견</h2>
              </div>
              <span className="rounded-full bg-[#07111B]/70 px-3 py-1 text-sm text-[#8AA0B0]">{sortedHonestyResponses.length}개</span>
            </div>
            <p className="mt-2 text-sm font-bold leading-6 text-[#FFD37A]">{voteLockNotice}</p>
            <div className="mt-4 grid gap-3">
              {sortedHonestyResponses.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0]">{topicMeta.honesty.empty}</p> : null}
              {sortedHonestyResponses.map((response) => {
                const liked = Boolean(session && response.votes.includes(session.nickname))
                return (
                  <article key={response.id} className="rounded-2xl border border-white/10 bg-[#07111B]/45 px-5 py-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-xl font-black leading-8 text-[#EAF2F5]">{response.body}</p>
                        <p className="mt-2 text-sm text-[#8AA0B0]">{response.nickname}</p>
                      </div>
                      <button
                        className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-black transition md:min-w-24 ${
                          liked ? 'bg-[#FFD37A]/20 text-[#FFD37A]' : 'bg-white/10 text-[#B7C7D2] hover:bg-[#FFD37A]/15 hover:text-[#FFD37A]'
                        }`}
                        onClick={() => likeHonesty(response.id)}
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

      {activeTopic === 'fairness' ? (
        <div className="grid gap-5">
          {!isTeacherBoard ? (
            <Panel>
              <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-data text-xs text-[#75B7FF]">4차시 · 공정 토론</p>
                    <h2 className="font-display mt-1 text-3xl leading-tight text-[#EAF2F5]">공부 잘하는 애들만 반장 후보가 되어야 할까요?</h2>
                    <p className="mt-3 leading-7 text-[#8AA0B0]">누군가를 다치게 하거나 거짓말한 건 아닌데, 이 답이 왜 문제인지 남겨주세요.</p>
                  </div>
                  {savedFairnessResponse ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#4FE0C0]/25 bg-[#4FE0C0]/10 px-4 py-2 text-sm font-black text-[#4FE0C0]">
                      <CheckCircle2 size={17} />
                      저장됨
                    </span>
                  ) : null}
                </div>
                <div>
                  <textarea
                    className="min-h-28 w-full resize-none rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-lg leading-8 text-[#EAF2F5] outline-none transition focus:border-[#75B7FF]/60"
                    maxLength={180}
                    placeholder="예: 공부만으로 좋은 반장을 정하면 다른 장점이 있는 친구들이 기회를 못 얻을 수 있어요."
                    value={fairnessDraft || savedFairnessResponse?.body || ''}
                    onChange={(event) => setFairnessDraft(event.target.value)}
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
                    <p className="text-sm leading-6 text-[#8AA0B0]">한 사람당 한 번 저장됩니다. 다시 저장하면 내 답이 수정됩니다.</p>
                    <Button disabled={!(fairnessDraft || savedFairnessResponse?.body || '').trim()} onClick={submitFairness}>
                      <Send size={18} />
                      {savedFairnessResponse ? '수정 저장' : '의견 저장'}
                    </Button>
                  </div>
                </div>
              </div>
            </Panel>
          ) : null}

          <Panel>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-data text-xs text-[#75B7FF]">THINK BOARD</p>
                <h2 className="font-display mt-1 text-3xl text-[#EAF2F5]">학생 의견</h2>
              </div>
              <span className="rounded-full bg-[#07111B]/70 px-3 py-1 text-sm text-[#8AA0B0]">{sortedFairnessResponses.length}개</span>
            </div>
            <p className="mt-2 text-sm font-bold leading-6 text-[#FFD37A]">{voteLockNotice}</p>
            <div className="mt-4 grid gap-3">
              {sortedFairnessResponses.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0]">{topicMeta.fairness.empty}</p> : null}
              {sortedFairnessResponses.map((response) => {
                const liked = Boolean(session && response.votes.includes(session.nickname))
                return (
                  <article key={response.id} className="rounded-2xl border border-white/10 bg-[#07111B]/45 px-5 py-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-xl font-black leading-8 text-[#EAF2F5]">{response.body}</p>
                        <p className="mt-2 text-sm text-[#8AA0B0]">{response.nickname}</p>
                      </div>
                      <button
                        className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-black transition md:min-w-24 ${
                          liked ? 'bg-[#FFD37A]/20 text-[#FFD37A]' : 'bg-white/10 text-[#B7C7D2] hover:bg-[#FFD37A]/15 hover:text-[#FFD37A]'
                        }`}
                        onClick={() => likeFairness(response.id)}
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
        <div className="grid gap-5">
          {!isTeacherBoard ? (
            <Panel>
              <div className="grid gap-5 lg:grid-cols-[0.5fr_1.5fr]">
                <div>
                  <p className="font-data text-xs text-[#FFD37A]">1차시 · 이름 짓기</p>
                  <h2 className="font-display mt-1 text-3xl text-[#EAF2F5]">이름 후보 올리기</h2>
                </div>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[minmax(220px,0.9fr)_minmax(280px,1.1fr)_150px]">
                  <input
                    className="min-h-14 w-full rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-lg text-[#EAF2F5]"
                    maxLength={12}
                    placeholder="이름 후보"
                    value={nameDraft}
                    onChange={(event) => setNameDraft(event.target.value)}
                  />
                  <input
                    className="min-h-14 w-full rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-lg text-[#EAF2F5]"
                    maxLength={80}
                    placeholder="이유"
                    value={reasonDraft}
                    onChange={(event) => setReasonDraft(event.target.value)}
                  />
                  <Button className="min-h-14 w-full whitespace-nowrap px-4 md:col-span-2 lg:col-span-1" disabled={!nameDraft.trim()} onClick={submitName}>
                    <Send size={18} />
                    후보 올리기
                  </Button>
                </div>
              </div>
            </Panel>
          ) : null}

          <Panel>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-3xl text-[#EAF2F5]">이름 후보</h2>
              <span className="rounded-full bg-[#07111B]/70 px-3 py-1 text-sm text-[#8AA0B0]">{sortedNames.length}개</span>
            </div>
            <p className="mt-2 text-sm font-bold leading-6 text-[#FFD37A]">{voteLockNotice}</p>
            <div className="mt-4 grid gap-3">
              {sortedNames.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0]">{topicMeta.name.empty}</p> : null}
              {sortedNames.map((candidate) => {
                const liked = Boolean(session && candidate.votes.includes(session.nickname))
                return (
                  <button
                    key={candidate.id}
                    className={`w-full rounded-2xl border px-5 py-4 text-left transition ${liked ? 'border-[#FFD37A] bg-[#FFD37A]/10' : 'border-white/10 bg-[#07111B]/45 hover:border-[#FFD37A]/40'}`}
                    onClick={() => likeName(candidate.id)}
                    disabled={isTeacherBoard || liked}
                    type="button"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-2xl font-black text-[#EAF2F5]">{candidate.name}</p>
                        <p className="mt-2 text-sm leading-6 text-[#8AA0B0]">{candidate.reason || '이유 없음'} · {candidate.nickname}</p>
                      </div>
                      <span className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#FFD37A]/15 px-4 py-2 text-sm font-black text-[#FFD37A] md:min-w-24">
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
        <div className="grid gap-5">
          {!isTeacherBoard ? (
            <Panel>
              <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
                <div>
                  <p className="font-data text-xs text-[#FFD37A]">1차시 · 바람 입력</p>
                  <h2 className="font-display mt-1 text-3xl text-[#EAF2F5]">{aemonDisplayName}에게 바라는 모습</h2>
                  <p className="mt-3 text-sm leading-6 text-[#8AA0B0]">한 사람당 한 번 저장됩니다. 다시 저장하면 내 글이 수정됩니다.</p>
                </div>
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <textarea
                    className="min-h-24 w-full resize-none rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 leading-7 text-[#EAF2F5]"
                    maxLength={160}
                    placeholder="예: 친구처럼 다정했으면 좋겠어."
                    value={wishDraft}
                    onChange={(event) => setWishDraft(event.target.value)}
                  />
                  <Button className="h-full min-h-14" disabled={!wishDraft.trim()} onClick={submitWish}>
                    저장하기
                  </Button>
                </div>
              </div>
            </Panel>
          ) : null}

          <Panel>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-3xl text-[#EAF2F5]">올라온 바람</h2>
              <span className="rounded-full bg-[#07111B]/70 px-3 py-1 text-sm text-[#8AA0B0]">{sortedWishes.length}개</span>
            </div>
            <p className="mt-2 text-sm font-bold leading-6 text-[#FFD37A]">{voteLockNotice}</p>
            <div className="mt-4 grid gap-3">
              {sortedWishes.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0]">{topicMeta.wish.empty}</p> : null}
              {sortedWishes.map((wish) => {
                const canEdit = isTeacherBoard || session?.nickname === wish.nickname
                const liked = Boolean(session && wish.votes.includes(session.nickname))
                return (
                  <div key={wish.id} className="rounded-2xl border border-white/10 bg-[#07111B]/45 px-5 py-4">
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
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-xl font-black leading-8 text-[#EAF2F5]">{wish.body}</p>
                            <p className="mt-2 text-sm text-[#8AA0B0]">{wish.nickname}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-black transition md:min-w-24 ${
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

      {activeTopic === 'code' || activeTopic === 'code2' || activeTopic === 'code3' ? (
        <div className="grid gap-5">
          {!isTeacherBoard ? (
            <Panel>
              <div className="grid gap-4 lg:grid-cols-[0.78fr_1.22fr]">
                <div>
                  <p className="font-data text-xs text-[#9B7CFF]">{topicMeta[activeTopic].lesson} · {codeBoardNumberLabel} 가치코드</p>
                  <h2 className="font-display mt-1 text-3xl text-[#EAF2F5]">{codeBoardHeading}</h2>
                  <p className="mt-3 text-sm leading-6 text-[#8AA0B0]">
                    {isThirdCodeBoard
                      ? '겉으로는 능력처럼 보이지만 불공정한 판단을 막을 기준을 만듭니다.'
                      : isSecondCodeBoard
                        ? '무조건 칭찬하는 AI를 막을 정직의 기준을 만듭니다.'
                        : '나쁜 명령을 스스로 멈추게 할 첫 번째 기준을 만듭니다.'}
                  </p>
                  <div className="mt-4 rounded-2xl border border-[#FFD37A]/25 bg-[#FFD37A]/10 p-4">
                    <p className="font-bold leading-7 text-[#FFD37A]">가치 카드를 먼저 고르고, 행동 기준을 한 문장으로 써요.</p>
                    <p className="mt-1 font-bold leading-7 text-[#FFD37A]">그 아래에는 왜 필요한지 이유를 따로 적으면 됩니다.</p>
                  </div>
                </div>

                <div className="grid gap-4">
                  <ValueCardSelectGrid cards={valueCards} selectedValue={codeValueCard} onSelect={setCodeValueCard} />

                  <div className="grid gap-3 rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
                    <label className="grid gap-2">
                      <span className="text-sm font-black text-[#C9B9FF]">해야 하는 일</span>
                      <textarea
                        className="min-h-20 w-full resize-none rounded-2xl border border-white/10 bg-[#07111B]/75 px-4 py-3 text-base leading-7 text-[#EAF2F5] outline-none transition placeholder:text-[#6F8191] focus:border-[#9B7CFF]/70 focus:ring-2 focus:ring-[#9B7CFF]/20"
                        maxLength={180}
                        placeholder={`${aemonDisplayName}은(는) ~ 해야 한다.`}
                        value={codeBodyDraft}
                        onChange={(event) => setCodeBodyDraft(event.target.value)}
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-sm font-black text-[#C9B9FF]">그 이유</span>
                      <textarea
                        className="min-h-20 w-full resize-none rounded-2xl border border-white/10 bg-[#07111B]/75 px-4 py-3 text-base leading-7 text-[#EAF2F5] outline-none transition placeholder:text-[#6F8191] focus:border-[#9B7CFF]/70 focus:ring-2 focus:ring-[#9B7CFF]/20"
                        maxLength={180}
                        placeholder="~ 할 수 있기 때문이다."
                        value={codeReasonDraft}
                        onChange={(event) => setCodeReasonDraft(event.target.value)}
                      />
                    </label>
                    <div className="flex justify-end">
                      <Button className="min-h-12 px-6" disabled={!codeBodyDraft.trim() || !codeReasonDraft.trim()} onClick={submitProposal}>
                        <Send size={18} />
                        올리기
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Panel>
          ) : null}

          <div className="grid gap-5">
            <Panel>
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-3xl text-[#EAF2F5]">{codeBoardListHeading}</h2>
                <span className="rounded-full bg-[#07111B]/70 px-3 py-1 text-sm text-[#8AA0B0]">{sortedProposals.length}개</span>
              </div>
              <p className="mt-2 text-sm font-bold leading-6 text-[#FFD37A]">{voteLockNotice}</p>
              <div className="mt-4 grid gap-3">
                {sortedProposals.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0]">{codeBoardEmpty}</p> : null}
                {sortedProposals.map((proposal) => {
                  const voted = Boolean(session && proposal.votes.includes(session.nickname))
                  return (
                    <button
                      key={proposal.id}
                      className={`w-full rounded-2xl border px-5 py-4 text-left transition ${voted ? 'border-[#9B7CFF] bg-[#9B7CFF]/12' : 'border-white/10 bg-[#07111B]/45 hover:border-[#9B7CFF]/40'}`}
                      onClick={() => voteCode(proposal.id)}
                      disabled={isTeacherBoard || voted}
                      type="button"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-[#9B7CFF]/14 px-3 py-1 text-xs font-black text-[#C9B9FF]">{proposal.valueCard || '가치'}</span>
                            <span className="font-data text-xs text-[#8AA0B0]">{proposal.nickname}</span>
                          </div>
                          <p className="mt-3 text-xl font-black leading-8 text-[#EAF2F5]">{proposal.body}</p>
                          <p className="mt-2 text-sm leading-6 text-[#8AA0B0]">{proposal.reason}</p>
                        </div>
                        <span className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#FFD37A]/15 px-4 py-2 text-sm font-black text-[#FFD37A] md:min-w-24">
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
                {state.adoptedCodes.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0]">{topicMeta[activeTopic].empty}</p> : null}
                {state.adoptedCodes.map((code) => (
                  <article key={code.id} className="rounded-2xl border border-white/10 bg-[#07111B]/45 px-5 py-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-data text-xs text-[#4FE0C0]">No.{code.no}</p>
                          {(code.tags.length > 0 ? code.tags : code.valueCard ? [code.valueCard] : []).map((tag) => (
                            <span key={tag} className="rounded-full bg-[#4FE0C0]/10 px-2 py-0.5 text-xs font-bold text-[#4FE0C0]">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <p className="mt-2 text-lg font-bold leading-7 text-[#EAF2F5]">{code.body}</p>
                        {code.reason ? <p className="mt-1 text-sm leading-6 text-[#8AA0B0]">{code.reason}</p> : null}
                      </div>
                    </div>
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
