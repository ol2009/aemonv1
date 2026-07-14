export type LessonChatLog = {
  question: string
  answer: string
}

export function parseLessonChatLogs(value: unknown): LessonChatLog[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const question = 'question' in item && typeof item.question === 'string' ? item.question : ''
    const answer = 'answer' in item && typeof item.answer === 'string' ? item.answer : ''
    return question ? [{ question, answer }] : []
  })
}
