import { useEffect, useMemo, useRef, useState } from 'react'
import { playDialogueTick } from '../lib/dialogueSound'
import { registerDialogueSkipper } from '../lib/dialogueSkip'

export function SkippableTypewriterText({
  text,
  enabled = true,
  speed = 20,
  cursor = true,
  onDone,
}: {
  text: string
  enabled?: boolean
  speed?: number
  cursor?: boolean
  onDone?: () => void
}) {
  const characters = useMemo(() => Array.from(text), [text])
  const [progress, setProgress] = useState({ text, count: 0 })
  const onDoneRef = useRef(onDone)
  const count = progress.text === text ? progress.count : 0

  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  useEffect(() => {
    if (!enabled) return
    if (!characters.length) {
      onDoneRef.current?.()
      return
    }

    let index = 0
    let finished = false
    let unregister = () => {}

    const finish = () => {
      if (finished) return
      finished = true
      window.clearInterval(timer)
      unregister()
      onDoneRef.current?.()
    }

    unregister = registerDialogueSkipper(() => {
      if (finished || index >= characters.length) return false
      index = characters.length
      setProgress({ text, count: characters.length })
      finish()
      return true
    })

    const timer = window.setInterval(() => {
      index += 1
      if (index % 2 === 0 && characters[index - 1]?.trim()) playDialogueTick()
      setProgress({ text, count: index })
      if (index >= characters.length) finish()
    }, speed)

    return () => {
      finished = true
      window.clearInterval(timer)
      unregister()
    }
  }, [characters, enabled, speed, text])

  const visibleText = enabled ? characters.slice(0, count).join('') : ''
  const isTyping = enabled && count < characters.length

  return (
    <>
      {visibleText}
      {cursor && isTyping ? <span className="ml-1 animate-pulse text-[#4FE0C0]">▌</span> : null}
    </>
  )
}
