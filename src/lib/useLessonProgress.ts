import { useCallback, useState, type SetStateAction } from 'react'
import { progressKey, readLessonProgress } from './lessonProgress'

export function useLessonProgress(classCode: string, lesson: number, length: number, fallback: number) {
  const params = new URLSearchParams(window.location.search)
  const enabled = Boolean(classCode) && params.get('preview') !== '1' && params.get('role') !== 'student' && params.get('live') !== 'student'
  const key = enabled ? progressKey(classCode, lesson) : `temporary:${classCode}:${lesson}:${params.toString()}`
  const [progress, setProgress] = useState(() => ({ key, value: enabled ? readLessonProgress(key, fallback, length) : fallback }))
  const value = progress.key === key ? progress.value : enabled ? readLessonProgress(key, fallback, length) : fallback
  const setValue = useCallback((action: SetStateAction<number>) => {
    const next = Math.max(0, Math.min(length - 1, typeof action === 'function' ? action(value) : action))
    // Save synchronously so navigation immediately after advancing cannot lose the position.
    if (enabled) {
      try { localStorage.setItem(key, JSON.stringify(next)) } catch { /* Keep working in memory. */ }
    }
    setProgress({ key, value: next })
  }, [enabled, key, length, value])
  return [value, setValue] as const
}
