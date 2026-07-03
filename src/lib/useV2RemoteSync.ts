import { useEffect, useRef } from 'react'
import { fetchRemoteClassBundle, isRemoteReady } from './v2Remote'
import { useV2 } from '../state/V2Store'

export function useV2RemoteSync(classCode?: string, enabled = true) {
  const { mergeClass, setRemoteStatus } = useV2()
  const mergeClassRef = useRef(mergeClass)
  const setRemoteStatusRef = useRef(setRemoteStatus)

  useEffect(() => {
    mergeClassRef.current = mergeClass
    setRemoteStatusRef.current = setRemoteStatus
  }, [mergeClass, setRemoteStatus])

  useEffect(() => {
    if (!enabled || !classCode?.trim() || !isRemoteReady()) return

    let cancelled = false
    const code = classCode.trim()

    async function sync() {
      try {
        const bundle = await fetchRemoteClassBundle(code)
        if (!cancelled) mergeClassRef.current(bundle)
      } catch (error) {
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
