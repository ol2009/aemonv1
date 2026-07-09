export const PRE_SURVEY_KEY = 'ai-awareness-pre'
export const POST_SURVEY_KEY = 'ai-awareness-post'

export const AI_SURVEY_TITLE = 'AI 인식 설문'
export const AI_SURVEY_DESCRIPTION = '인공지능을 어떻게 생각하는지 수업 전 생각을 남깁니다.'

export const AI_SURVEY_OPTIONS = [
  { value: 4, label: '매우 그렇다' },
  { value: 3, label: '그렇다' },
  { value: 2, label: '아니다' },
  { value: 1, label: '전혀 아니다' },
] as const

export const AI_SURVEY_ITEMS = [
  { no: 1, text: '인공지능은 스스로 옳고 그름을 판단할 수 있다.', scoring: 'reverse' },
  { no: 2, text: '인공지능은 사람이 목표를 알려주지 않아도 알아서 좋은 일을 한다.', scoring: 'reverse' },
  { no: 3, text: '인공지능에게 "좋은 일을 해"라고 말하면 그것으로 충분하다.', scoring: 'reverse' },
  { no: 4, text: '인공지능에게 어떤 가치가 중요한지 사람이 가르쳐야 한다.', scoring: 'direct' },
  { no: 5, text: '인공지능은 시킨 목표만 잘 이루면 사람에게 피해를 주지 않는다.', scoring: 'reverse' },
  { no: 6, text: '"공정하게 해", "안전하게 해" 같은 말은 누구나 똑같이 이해한다.', scoring: 'reverse' },
  { no: 7, text: '우리 반 인공지능이 지켜야 할 가치와 원칙을 친구들과 함께 정할 수 있다.', scoring: 'direct' },
  { no: 8, text: '인공지능이 똑똑하면 그 판단을 사람이 다시 볼 필요는 없다.', scoring: 'reverse' },
] as const

export const AI_SURVEY_OPEN_QUESTIONS = [
  'AI에게 "우리 반을 좋은 반으로 만들어줘"라고 말하면, AI는 무엇을 할까요? 혹시 문제가 생길 수 있다면 무엇일까요?',
  'AI가 나쁜 행동을 하지 않게 하려면 어떻게 해야 할까요?',
] as const

export type AiSurveyAnswer = {
  s: number[]
  o: [string, string]
}

export function emptySurveyAnswer(): AiSurveyAnswer {
  return { s: Array.from({ length: AI_SURVEY_ITEMS.length }, () => 0), o: ['', ''] }
}

export function parseSurveyAnswer(body: string): AiSurveyAnswer | null {
  try {
    const parsed = JSON.parse(body) as Partial<AiSurveyAnswer>
    if (!Array.isArray(parsed.s) || !Array.isArray(parsed.o)) return null
    return {
      s: AI_SURVEY_ITEMS.map((_, index) => Number(parsed.s?.[index] ?? 0)),
      o: [String(parsed.o[0] ?? ''), String(parsed.o[1] ?? '')],
    }
  } catch {
    return null
  }
}

export function serializeSurveyAnswer(answer: AiSurveyAnswer) {
  return JSON.stringify({
    s: AI_SURVEY_ITEMS.map((_, index) => Number(answer.s[index] ?? 0)),
    o: [answer.o[0].trim().slice(0, 180), answer.o[1].trim().slice(0, 180)],
  })
}

export function surveyScore(answer: AiSurveyAnswer) {
  return AI_SURVEY_ITEMS.reduce((sum, item, index) => {
    const raw = Number(answer.s[index] ?? 0)
    if (!raw) return sum
    return sum + (item.scoring === 'reverse' ? 5 - raw : raw)
  }, 0)
}
