import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { LESSON2_BOUNDARY_PREFIX, lessonTwoBoundaryQuestionKey } from '../data/lessonTwoBoundary'
import { useV2 } from '../state/V2Store'
import { fetchRemoteSurveyResponsesByPrefix, isRemoteReady, upsertRemoteSurveyResponse } from './v2Remote'
import { supabase } from './supabase'

export type BoundaryChoice = 'O' | 'X'

type BoundaryVotePayload = {
  cardId: string
  nickname: string
  choice: BoundaryChoice
}

function parseVotePayload(value: unknown): BoundaryVotePayload | null {
  if (!value || typeof value !== 'object') return null
  const payload = value as Partial<BoundaryVotePayload>
  const cardId = typeof payload.cardId === 'string' ? payload.cardId.trim() : ''
  const nickname = typeof payload.nickname === 'string' ? payload.nickname.trim() : ''
  if (!cardId || !nickname || (payload.choice !== 'O' && payload.choice !== 'X')) return null
  return { cardId, nickname, choice: payload.choice }
}

export function useLessonTwoBoundaryVoting(classId: string) {
  const { state, upsertSurveyResponse, setRemoteStatus } = useV2()
  const [savingCardId, setSavingCardId] = useState('')
  const [message, setMessage] = useState('')
  const channelRef = useRef<RealtimeChannel | null>(null)
  const channelReadyRef = useRef(false)
  const pendingVotesRef = useRef<BoundaryVotePayload[]>([])
  const upsertSurveyResponseRef = useRef(upsertSurveyResponse)
  const setRemoteStatusRef = useRef(setRemoteStatus)

  useEffect(() => {
    upsertSurveyResponseRef.current = upsertSurveyResponse
    setRemoteStatusRef.current = setRemoteStatus
  }, [setRemoteStatus, upsertSurveyResponse])

  const syncVotes = useCallback(async () => {
    if (!classId || !isRemoteReady()) return
    try {
      const responses = await fetchRemoteSurveyResponsesByPrefix({ classId, questionPrefix: LESSON2_BOUNDARY_PREFIX })
      responses.forEach((response) => {
        upsertSurveyResponseRef.current({
          nickname: response.nickname,
          questionKey: response.questionKey,
          body: response.body,
        })
      })
    } catch (error) {
      setRemoteStatusRef.current({ ok: false, message: (error as Error).message })
    }
  }, [classId])

  useEffect(() => {
    if (!classId || !supabase || !isRemoteReady()) return
    const client = supabase
    let cancelled = false
    let realtimeConnected = false
    const channel = client
      .channel(`lesson2-boundary-${classId}`)
      .on('broadcast', { event: 'boundary-vote' }, ({ payload }) => {
        const vote = parseVotePayload(payload)
        if (!vote || cancelled) return
        upsertSurveyResponseRef.current({
          nickname: vote.nickname,
          questionKey: lessonTwoBoundaryQuestionKey(vote.cardId),
          body: vote.choice,
        })
      })
      .subscribe((status) => {
        realtimeConnected = status === 'SUBSCRIBED'
        channelReadyRef.current = realtimeConnected
        if (!realtimeConnected || pendingVotesRef.current.length === 0) return
        const pending = pendingVotesRef.current
        pendingVotesRef.current = []
        pending.forEach((vote) => {
          void channel.send({ type: 'broadcast', event: 'boundary-vote', payload: vote })
        })
      })

    channelRef.current = channel
    void syncVotes()

    const fallbackTimer = window.setInterval(() => {
      if (!realtimeConnected && document.visibilityState === 'visible' && navigator.onLine) void syncVotes()
    }, 5000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void syncVotes()
    }
    const onOnline = () => void syncVotes()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)

    return () => {
      cancelled = true
      realtimeConnected = false
      channelReadyRef.current = false
      channelRef.current = null
      window.clearInterval(fallbackTimer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
      void client.removeChannel(channel)
    }
  }, [classId, syncVotes])

  const boundaryResponses = useMemo(
    () => state.surveyResponses.filter((response) => response.questionKey.startsWith(LESSON2_BOUNDARY_PREFIX)),
    [state.surveyResponses],
  )
  const nickname = state.studentSession?.nickname.trim() ?? ''

  const submitVote = useCallback(
    async (cardId: string, choice: BoundaryChoice) => {
      if (!classId || !nickname || savingCardId || !isRemoteReady()) return
      const questionKey = lessonTwoBoundaryQuestionKey(cardId)
      if (state.surveyResponses.some((response) => response.nickname === nickname && response.questionKey === questionKey)) return

      const vote: BoundaryVotePayload = { cardId, nickname, choice }
      setSavingCardId(cardId)
      setMessage('')

      try {
        await upsertRemoteSurveyResponse({ classId, nickname, questionKey, body: choice })
        upsertSurveyResponse({ nickname, questionKey, body: choice })
        const channel = channelRef.current
        if (channel && channelReadyRef.current) {
          void channel.send({ type: 'broadcast', event: 'boundary-vote', payload: vote })
        } else {
          pendingVotesRef.current = [...pendingVotesRef.current.filter((item) => item.cardId !== cardId || item.nickname !== nickname), vote]
        }
        setMessage(`${choice}로 응답했어요.`)
      } catch (error) {
        const errorMessage = (error as Error).message
        setMessage(`응답을 저장하지 못했어요. ${errorMessage}`)
        setRemoteStatus({ ok: false, message: errorMessage })
      } finally {
        setSavingCardId('')
      }
    },
    [classId, nickname, savingCardId, setRemoteStatus, state.surveyResponses, upsertSurveyResponse],
  )

  return { boundaryResponses, nickname, savingCardId, message, submitVote }
}
