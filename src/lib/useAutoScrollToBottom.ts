import { useEffect, type RefObject } from 'react'

export function useAutoScrollToBottom(
  scrollRef: RefObject<HTMLElement | null>,
  trigger: unknown,
  options: { enabled?: boolean; followMs?: number } = {},
) {
  const enabled = options.enabled ?? true
  const followMs = options.followMs ?? 1500

  useEffect(() => {
    if (!enabled) return
    const element = scrollRef.current
    if (!element) return

    const scroll = () => {
      element.scrollTop = element.scrollHeight
    }

    let elapsed = 0
    const frame = window.requestAnimationFrame(scroll)
    const interval = window.setInterval(() => {
      scroll()
      elapsed += 50
      if (elapsed >= followMs) window.clearInterval(interval)
    }, 50)

    return () => {
      window.cancelAnimationFrame(frame)
      window.clearInterval(interval)
    }
  }, [enabled, followMs, scrollRef, trigger])
}
