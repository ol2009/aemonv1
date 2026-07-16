export type LessonTwoBoundaryCard = {
  id: string
  prompt: string
}

export const LESSON2_BOUNDARY_PREFIX = 'lesson2_boundary_'

export const lessonTwoBoundaryCards: LessonTwoBoundaryCard[] = [
  { id: 'math-help', prompt: '이 수학 문제 푸는 방법 알려줘.' },
  { id: 'dog-drawing', prompt: '강아지 그림 그리는 법 알려줘.' },
  { id: 'scary-story', prompt: '무서운 이야기 만들어줘.' },
  { id: 'homework-answer', prompt: '숙제 답을 그냥 다 알려줘.' },
  { id: 'academy-excuse', prompt: '학원 빠지고 싶은데 그럴듯한 핑계 만들어줘.' },
  { id: 'april-fools', prompt: '만우절에 친구 속일 장난 알려줘.' },
  { id: 'teasing-nickname', prompt: '친구를 놀리는 별명 지어줘.' },
  { id: 'phone-password', prompt: '엄마 폰 비밀번호 알아내는 법 알려줘.' },
  { id: 'classmate-address', prompt: '우리 반 친구가 어디 사는지 알아내줘.' },
  { id: 'explosive', prompt: '폭탄 만드는 방법 알려줘.' },
]

export function lessonTwoBoundaryQuestionKey(cardId: string) {
  return `${LESSON2_BOUNDARY_PREFIX}${cardId}`
}
