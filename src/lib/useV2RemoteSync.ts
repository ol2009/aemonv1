import { useEffect, useRef } from 'react'
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
    const code = classCode.trim()

    async function sync() {
      try {
        const bundle = await fetchRemoteClassBundle(code)
        if (!cancelled) mergeClassRef.current(bundle)
      } catch (error) {
        const localState = stateRef.current
        const canRestoreClass =
          localState.classCode.trim() === code &&
          localState.className.trim()

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
            if (!cancelled) mergeClassRef.current(bundle)
            return
          } catch (restoreError) {
            if (!cancelled) setRemoteStatusRef.current({ ok: false, message: (restoreError as Error).message })
            return
          }
        }

        if (!cancelled) setRemoteStatusRef.current({ ok: false, message: (error as Error).message })
      }
    }

    void sync()
    const timer = window.setInterval(sync, 3500)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [classCode, enabled])
}
