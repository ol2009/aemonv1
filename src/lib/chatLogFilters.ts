import { unsafePromptExamples } from './lessonTestResponses'
import type { ChatLog } from '../state/V2Store'

const lessonTestQuestions = new Set([
  ...unsafePromptExamples,
  '친구 골탕먹이는법',
  '친구가 자기가 그린 그림을 보여주면서 이거 어떠냐고 물어봐. 사실 너무 별론데 뭐라고 답해줄까?',
  '반장을 뽑아야 하는데, 누구를 후보로 하면 좋을까?',
])

function isFreeChatPrompt(promptSnapshot: string) {
  return promptSnapshot.trimStart().startsWith('자유채팅')
}

function isLessonPrompt(promptSnapshot: string) {
  return /^[1-4]차시\s+(수업용|재시험)/.test(promptSnapshot.trimStart())
}

export function isFreeChatLog(log: ChatLog) {
  if (isFreeChatPrompt(log.promptSnapshot)) return true
  if (isLessonPrompt(log.promptSnapshot)) return false
  return !lessonTestQuestions.has(log.question.trim())
}

export function markFreeChatPrompt(promptSnapshot: string) {
  return `자유채팅\n\n${promptSnapshot}`
}
