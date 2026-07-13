import { useEffect, useRef } from 'react'
import { localClassHasSharedData } from './classRecovery'
import { supabase } from './supabase'
import { fetchRemoteClassBundle, isRemoteReady, restoreRemoteClassSnapshot } from './v2Remote'
import { useV2 } from '../state/V2Store'

export function useV2RemoteSync(classCode?: string, enabled = true) {
  const { state, mergeClass, setRemoteStatus } = useV2()
  const stateRef = useRef(state)
  const mergeClassRef = useRef(mergeClass)
  const setRemoteStatusRef = useRef(setRemoteStatus)

  useEffect(() => {
    stateRef.current = state
    mergeClassRef.current = mergeClass
    setRemoteStatusRef.current = setRemoteStatus
  }, [mergeClass, setRemoteStatus, state])

  useEffect(() => {
    if (!enabled || !classCode?.trim() || !isRemoteReady()) return

    let cancelled = false
    let syncInFlight = false
    let realtimeConnected = false
    let lastSuccessfulSync = 0
    let debounceTimer: number | null = null
    let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null
    const code = classCode.trim()

    async function sync() {
      if (syncInFlight || cancelled) return null
      syncInFlight = true
      try {
        const bundle = await fetchRemoteClassBundle(code)
        if (!cancelled) {
          mergeClassRef.current(bundle)
          lastSuccessfulSync = Date.now()
        }
        return typeof bundle.classId === 'string' ? bundle.classId : null
      } catch (error) {
        const localState = stateRef.current
        const canRestoreClass =
          localState.classCode.trim() === code &&
          localState.className.trim() &&
          localClassHasSharedData(localState)

        if (canRestoreClass) {
          try {
            await restoreRemoteClassSnapshot({
              classId: localState.classId || crypto.randomUUID(),
              className: localState.className,
              classCode: localState.classCode,
              currentLesson: localState.currentLesson,
              aemonName: localState.aemonName,
            })
            const bundle = await fetchRemoteClassBundle(code)
            if (!cancelled) {
              mergeClassRef.current(bundle)
              lastSuccessfulSync = Date.now()
            }
            return typeof bundle.classId === 'string' ? bundle.classId : null
          } catch (restoreError) {
            if (!cancelled) setRemoteStatusRef.current({ ok: false, message: (restoreError as Error).message })
            return null
          }
        }

        if (!cancelled) setRemoteStatusRef.current({ ok: false, message: (error as Error).message })
        return null
      } finally {
        syncInFlight = false
      }
    }

    const scheduleSync = () => {
      if (debounceTimer) window.clearTimeout(debounceTimer)
      debounceTimer = window.setTimeout(() => void sync(), 350)
    }

    const startRealtime = (classId: string) => {
      if (!supabase || channel || !classId) return
      channel = supabase
        .channel(`class-data-${classId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'classes', filter: `id=eq.${classId}` }, scheduleSync)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'name_candidates', filter: `class_id=eq.${classId}` }, scheduleSync)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'name_votes', filter: `class_id=eq.${classId}` }, scheduleSync)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'wishes', filter: `class_id=eq.${classId}` }, scheduleSync)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'survey_responses', filter: `class_id=eq.${classId}` }, scheduleSync)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'codes', filter: `class_id=eq.${classId}` }, scheduleSync)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'code_votes', filter: `class_id=eq.${classId}` }, scheduleSync)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'post_votes', filter: `class_id=eq.${classId}` }, scheduleSync)
        .subscribe((status) => {
          realtimeConnected = status === 'SUBSCRIBED'
          if (status === 'SUBSCRIBED') scheduleSync()
        })
    }

    void sync().then((classId) => {
      if (classId && !cancelled) startRealtime(classId)
    })

    // Changes normally arrive through Realtime. A slow safety check covers
    // tables not present in the publication and browsers waking from sleep.
    const safetyTimer = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return
      if (!realtimeConnected || Date.now() - lastSuccessfulSync >= 60000) void sync()
    }, 15000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void sync()
    }
    const onOnline = () => void sync()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)

    return () => {
      cancelled = true
      window.clearInterval(safetyTimer)
      if (debounceTimer) window.clearTimeout(debounceTimer)
      if (channel && supabase) void supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
    }
  }, [classCode, enabled])
}
