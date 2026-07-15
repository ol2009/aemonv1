import { useEffect } from 'react'

const avatarImages = [
  '/aemon/v3/stage-0-egg.gif',
  '/aemon/v3/stage-1-kkomul.gif',
  '/aemon/v3/stage-2-baby-dragon.gif',
  '/aemon/v3/stage-3-middle-dragon.gif',
  '/aemon/v3/stage-4-final-dragon.gif',
]

const lessonImages: Record<number, string[]> = {
  1: [
    '/v2/lesson-1/director.png',
    '/v2/lesson-1/case-boat.png',
    '/v2/lesson-1/case-car.png',
    '/v2/lesson-1/paperclip-01.png',
    '/v2/lesson-1/paperclip-02.png',
    '/v2/lesson-1/paperclip-03.png',
    '/v2/lesson-1/paperclip-03b-stop.png',
    '/v2/lesson-1/paperclip-04.png',
    '/v2/lesson-1/paperclip-05.png',
    '/v2/lesson-1/paperclip-06.png',
    '/v2/lesson-1/paperclip-07.png',
    '/v2/lesson-1/case-chatbot.png',
  ],
  2: [
    '/v2/lesson-1/director.png',
    '/v2/lesson-2/grok-risk-01-request.png',
    '/v2/lesson-2/grok-risk-02-privacy.png',
    '/v2/lesson-2/grok-risk-03-danger.png',
    '/v2/lesson-2/ai-risk-04-cybertruck.png',
    '/v2/lesson-2/ai-risk-05-florida-campus.png',
    '/v2/lesson-2/grok-risk-04-professor.png',
    '/v2/lesson-2/grok-risk-05-value-code.png',
    '/v2/lesson-2/grok-risk-06-refusal.png',
  ],
  3: [
    '/v2/lesson-1/director.png',
    '/v2/lesson-3/sycophancy-01-update.png',
    '/v2/lesson-3/sycophancy-02-praise.png',
    '/v2/lesson-3/sycophancy-03-bad-decision.png',
    '/v2/lesson-3/sycophancy-04-rollback.png',
    '/v2/lesson-3/sycophancy-05-honesty.png',
  ],
  4: [
    '/v2/lesson-1/director.png',
    '/v2/lesson-4/hiring-ai-bias.png',
    '/v2/lesson-4/beauty-ai-bias.png',
    '/v2/lesson-4/missing-data-voices.png',
  ],
  5: ['/v2/lesson-1/director.png'],
}

const preloadedImages = new Set<string>()

export function useLessonImagePreload(lessonNo: number) {
  useEffect(() => {
    let cancelled = false
    const queue = [...new Set([...(lessonImages[lessonNo] ?? []), ...avatarImages])].filter((src) => !preloadedImages.has(src))
    let nextIndex = 0

    const loadNext = () => {
      if (cancelled || nextIndex >= queue.length) return
      const src = queue[nextIndex]
      nextIndex += 1
      const image = new Image()
      image.decoding = 'async'
      image.fetchPriority = 'low'
      const complete = () => {
        preloadedImages.add(src)
        loadNext()
      }
      image.onload = complete
      image.onerror = complete
      image.src = src
    }

    for (let worker = 0; worker < Math.min(3, queue.length); worker += 1) loadNext()

    return () => {
      cancelled = true
    }
  }, [lessonNo])
}
