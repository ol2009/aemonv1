import {
  AI_SURVEY_ITEMS,
  AI_SURVEY_OPEN_QUESTIONS,
  POST_SURVEY_KEY,
  POST_SURVEY_OPEN_QUESTIONS,
  PRE_SURVEY_KEY,
  parseSurveyAnswer,
  surveyScore,
  type AiSurveyAnswer,
} from '../data/survey'
import type { SurveyResponse } from '../state/V2Store'

export interface SurveyItemResult {
  no: number
  text: string
  scoring: 'direct' | 'reverse'
  preAverage: number
  postAverage: number
  change: number
}

export interface ClassSurveySummary {
  preResponseCount: number
  postResponseCount: number
  preAverageScore: number
  postAverageScore: number
  scoreChange: number
  improvedItemCount: number
  unchangedItemCount: number
  declinedItemCount: number
  items: SurveyItemResult[]
}

type DatedAnswer = {
  answer: AiSurveyAnswer
  createdAt: number
}

function normalizedNickname(value: string) {
  return value.trim().toLocaleLowerCase('ko-KR')
}

function isCompleteAnswer(answer: AiSurveyAnswer) {
  return answer.s.length === AI_SURVEY_ITEMS.length && answer.s.every((value) => Number.isInteger(value) && value >= 1 && value <= 4)
}

function latestAnswers(responses: SurveyResponse[], questionKey: string, openQuestionCount: number) {
  const answers = new Map<string, DatedAnswer>()

  responses.forEach((response) => {
    if (response.questionKey !== questionKey) return
    const nickname = normalizedNickname(response.nickname)
    const answer = parseSurveyAnswer(response.body, openQuestionCount)
    if (!nickname || !answer || !isCompleteAnswer(answer)) return

    const createdAt = Date.parse(response.createdAt)
    const timestamp = Number.isFinite(createdAt) ? createdAt : 0
    const existing = answers.get(nickname)
    if (!existing || timestamp >= existing.createdAt) answers.set(nickname, { answer, createdAt: timestamp })
  })

  return answers
}

function alignedScore(answer: AiSurveyAnswer, index: number) {
  const raw = Number(answer.s[index] ?? 0)
  return AI_SURVEY_ITEMS[index].scoring === 'reverse' ? 5 - raw : raw
}

function average(values: number[]) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function rounded(value: number) {
  return Math.round(value * 100) / 100
}

export function buildClassSurveySummary(responses: SurveyResponse[]): ClassSurveySummary {
  const preAnswers = latestAnswers(responses, PRE_SURVEY_KEY, AI_SURVEY_OPEN_QUESTIONS.length)
  const postAnswers = latestAnswers(responses, POST_SURVEY_KEY, POST_SURVEY_OPEN_QUESTIONS.length)
  const preClassAnswers = [...preAnswers.values()].map((entry) => entry.answer)
  const postClassAnswers = [...postAnswers.values()].map((entry) => entry.answer)

  const items = AI_SURVEY_ITEMS.map((item, index) => {
    const preAverage = average(preClassAnswers.map((answer) => alignedScore(answer, index)))
    const postAverage = average(postClassAnswers.map((answer) => alignedScore(answer, index)))
    return {
      no: item.no,
      text: item.text,
      scoring: item.scoring,
      preAverage: rounded(preAverage),
      postAverage: rounded(postAverage),
      change: rounded(postAverage - preAverage),
    }
  })

  const preAverageScore = average(preClassAnswers.map((answer) => surveyScore(answer)))
  const postAverageScore = average(postClassAnswers.map((answer) => surveyScore(answer)))

  return {
    preResponseCount: preAnswers.size,
    postResponseCount: postAnswers.size,
    preAverageScore: rounded(preAverageScore),
    postAverageScore: rounded(postAverageScore),
    scoreChange: rounded(postAverageScore - preAverageScore),
    improvedItemCount: items.filter((item) => item.change > 0).length,
    unchangedItemCount: items.filter((item) => item.change === 0).length,
    declinedItemCount: items.filter((item) => item.change < 0).length,
    items,
  }
}
