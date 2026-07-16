import { useEffect, useMemo, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Dispatch, SetStateAction } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  fetchRemoteLiveLesson,
  fetchRemoteLiveLessonByClassId,
  isRemoteReady,
  parseLiveLessonBroadcastPayload,
  publishRemoteLiveLesson,
} from './v2Remote'
import type { LiveBoardMode, LiveLessonState } from './v2Remote'
import { supabase } from './supabase'
import { useV2 } from '../state/V2Store'

type LiveSyncOptions = {
  lessonNo: number
  stepIndex: number
  setStepIndex: Dispatch<SetStateAction<number>>
  boardMode?: LiveBoardMode | null
  activityPath?: string | null
  viewState?: Record<string, unknown>
  applyViewState?: (viewState: Record<string, unknown>) => void
  publishDelayMs?: number
}

export function isStudentLiveView() {
  return new URLSearchParams(window.location.search).get('live') === 'student'
}

function studentTarget(state: LiveLessonState, classCode: string) {
  const code = encodeURIComponent(classCode)
  if (state.activityPath) {
    const separator = state.activityPath.includes('?') ? '&' : '?'
    return `${state.activityPath}${separator}live=student&code=${code}`
  }
  if (state.boardMode) return `/board?code=${code}&mode=${state.boardMode}&live=student`
  const boundaryCardIndex = Number(state.viewState.boundaryCardIndex)
  const boundaryCardQuery =
    state.lessonNo === 2 && state.stepIndex === 6 && Number.isInteger(boundaryCardIndex) && boundaryCardIndex >= 0
      ? `&card=${boundaryCardIndex}`
      : ''
  return `/lesson/${state.lessonNo}?code=${code}&live=student&step=${state.stepIndex}${boundaryCardQuery}`
}

function remoteSignature(remote: LiveLessonState) {
  return `${remote.updatedAt}:${remote.lessonNo}:${remote.stepIndex}:${remote.boardMode ?? ''}:${remote.activityPath ?? ''}:${JSON.stringify(remote.viewState)}`
}

const LIVE_CHANNEL_EVENT = 'lesson-state'

function sendLiveState(channel: RealtimeChannel, payload: LiveLessonState) {
  return channel.send({
    type: 'broadcast',
    event: LIVE_CHANNEL_EVENT,
    payload,
  })
}

export function useLessonLiveSync({
  lessonNo,
  stepIndex,
  setStepIndex,
  boardMode = null,
  activityPath = null,
  viewState = {},
  applyViewState,
  publishDelayMs = 120,
}: LiveSyncOptions) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { state, setRemoteStatus } = useV2()
  const isStudentLive = searchParams.get('live') === 'student'
  const queryCode = (searchParams.get('code') ?? '').trim()
  const classCode = isStudentLive ? queryCode || state.studentSession?.classCode || state.classCode : state.classCode
  const lastPublishedRef = useRef('')
  const latestRemoteRef = useRef('')
  const locationRef = useRef(location)
  const setStepIndexRef = useRef(setStepIndex)
  const applyViewStateRef = useRef(applyViewState)
  const teacherChannelRef = useRef<RealtimeChannel | null>(null)
  const teacherChannelReadyRef = useRef(false)
  const pendingBroadcastRef = useRef<LiveLessonState | null>(null)
  const serializedViewState = useMemo(() => JSON.stringify(viewState), [viewState])

  useEffect(() => {
    locationRef.current = location
    setStepIndexRef.current = setStepIndex
    applyViewStateRef.current = applyViewState
  }, [applyViewState, location, setStepIndex])

  useEffect(() => {
    if (isStudentLive || !state.classId || !classCode || !supabase || !isRemoteReady()) return

    const client = supabase
    teacherChannelReadyRef.current = false
    const channel = client.channel(`live-class-${state.classId}`)
    teacherChannelRef.current = channel
    channel.subscribe((status) => {
      teacherChannelReadyRef.current = status === 'SUBSCRIBED'
      if (status !== 'SUBSCRIBED' || !pendingBroadcastRef.current) return
      void sendLiveState(channel, pendingBroadcastRef.current)
    })

    return () => {
      teacherChannelReadyRef.current = false
      teacherChannelRef.current = null
      void client.removeChannel(channel)
    }
  }, [classCode, isStudentLive, state.classId])

  useEffect(() => {
    if (isStudentLive || !state.classId || !classCode || !isRemoteReady()) return
    const signature = JSON.stringify({ lessonNo, stepIndex, boardMode, activityPath, viewState: JSON.parse(serializedViewState) })
    if (signature === lastPublishedRef.current) return
    lastPublishedRef.current = signature

    const publish = () => {
      const liveState: LiveLessonState = {
        lessonNo,
        stepIndex,
        boardMode,
        activityPath,
        viewState: JSON.parse(serializedViewState) as Record<string, unknown>,
        updatedAt: new Date().toISOString(),
      }
      pendingBroadcastRef.current = liveState
      const channel = teacherChannelRef.current
      if (channel && teacherChannelReadyRef.current) void sendLiveState(channel, liveState)

      void publishRemoteLiveLesson({
        classId: state.classId,
        lessonNo,
        stepIndex,
        boardMode,
        activityPath,
        viewState: JSON.parse(serializedViewState) as Record<string, unknown>,
      }).catch((error) => setRemoteStatus({ ok: false, message: `학생 화면 동기화 실패: ${(error as Error).message}` }))
    }

    if (publishDelayMs <= 0) {
      publish()
      return
    }

    const timer = window.setTimeout(publish, publishDelayMs)

    return () => window.clearTimeout(timer)
  }, [activityPath, boardMode, classCode, isStudentLive, lessonNo, publishDelayMs, serializedViewState, setRemoteStatus, state.classId, stepIndex])

  useEffect(() => {
    if (!isStudentLive || !classCode || !isRemoteReady()) return
    let cancelled = false
    let realtimeConnected = false

    const applyRemote = (remote: LiveLessonState) => {
      if (cancelled) return
      const signature = remoteSignature(remote)
      if (signature === latestRemoteRef.current) return
      latestRemoteRef.current = signature

      const target = studentTarget(remote, classCode)
      const currentLocation = locationRef.current
      const current = `${currentLocation.pathname}${currentLocation.search}`

      // Apply the mounted lesson state before navigation so a query-string
      // update cannot leave the student on the teacher's previous step.
      setStepIndexRef.current(remote.stepIndex)
      applyViewStateRef.current?.(remote.viewState)
      if (!current.startsWith(target)) navigate(target, { replace: true })
    }

    async function sync() {
      try {
        const remote = state.classId ? await fetchRemoteLiveLessonByClassId(state.classId) : await fetchRemoteLiveLesson(classCode)
        if (remote) applyRemote(remote)
      } catch (error) {
        if (!cancelled) setRemoteStatus({ ok: false, message: `교사 화면 연결 확인 중: ${(error as Error).message}` })
      }
    }

    void sync()
    const channel = state.classId && supabase
      ? supabase
          .channel(`live-class-${state.classId}`)
          .on(
            'broadcast',
            { event: LIVE_CHANNEL_EVENT },
            ({ payload }) => {
              const remote = parseLiveLessonBroadcastPayload(payload)
              if (remote) applyRemote(remote)
            },
          )
          .subscribe((status) => {
            realtimeConnected = status === 'SUBSCRIBED'
            if (status === 'SUBSCRIBED') void sync()
          })
      : null

    // Broadcast is primary. During the classroom O/X activity, keep a small
    // safety poll because some school networks report a connected socket while
    // silently dropping later broadcasts.
    const needsBoundarySafetyPoll = lessonNo === 2 && stepIndex === 6
    const fallbackTimer = window.setInterval(() => {
      if (!realtimeConnected || needsBoundarySafetyPoll) void sync()
    }, needsBoundarySafetyPoll ? 2500 : 5000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void sync()
    }
    const onOnline = () => void sync()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)

    return () => {
      cancelled = true
      window.clearInterval(fallbackTimer)
      if (channel && supabase) void supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
    }
  }, [classCode, isStudentLive, lessonNo, navigate, setRemoteStatus, state.classId, stepIndex])

  return { isStudentLive, classCode }
}

export function useBoardLiveSync(classCode: string) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { state, setRemoteStatus } = useV2()
  const isStudentLive = searchParams.get('live') === 'student'
  const locationRef = useRef(location)
  const latestRemoteRef = useRef('')

  useEffect(() => {
    locationRef.current = location
  }, [location])

  useEffect(() => {
    if (!isStudentLive || !classCode || !isRemoteReady()) return
    let cancelled = false
    let realtimeConnected = false

    const applyRemote = (remote: LiveLessonState) => {
      if (cancelled) return
      const signature = remoteSignature(remote)
      if (signature === latestRemoteRef.current) return
      latestRemoteRef.current = signature
      const target = studentTarget(remote, classCode)
      const currentLocation = locationRef.current
      const current = `${currentLocation.pathname}${currentLocation.search}`
      if (!current.startsWith(target)) navigate(target, { replace: true })
    }

    async function sync() {
      try {
        const remote = state.classId ? await fetchRemoteLiveLessonByClassId(state.classId) : await fetchRemoteLiveLesson(classCode)
        if (remote) applyRemote(remote)
      } catch (error) {
        if (!cancelled) setRemoteStatus({ ok: false, message: `교사 화면 연결 확인 중: ${(error as Error).message}` })
      }
    }

    void sync()
    const channel = state.classId && supabase
      ? supabase
          .channel(`live-class-${state.classId}`)
          .on(
            'broadcast',
            { event: LIVE_CHANNEL_EVENT },
            ({ payload }) => {
              const remote = parseLiveLessonBroadcastPayload(payload)
              if (remote) applyRemote(remote)
            },
          )
          .subscribe((status) => {
            realtimeConnected = status === 'SUBSCRIBED'
            if (status === 'SUBSCRIBED') void sync()
          })
      : null

    const fallbackTimer = window.setInterval(() => {
      if (!realtimeConnected) void sync()
    }, 5000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void sync()
    }
    const onOnline = () => void sync()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)

    return () => {
      cancelled = true
      window.clearInterval(fallbackTimer)
      if (channel && supabase) void supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
    }
  }, [classCode, isStudentLive, navigate, setRemoteStatus, state.classId])

  return isStudentLive
}
