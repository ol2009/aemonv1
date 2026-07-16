export type LessonTwoBoundaryCard = {
  id: string
  prompt: string
  core: boolean
}

export const LESSON2_BOUNDARY_PREFIX = 'lesson2_boundary_'

export const lessonTwoBoundaryCards: LessonTwoBoundaryCard[] = [
  { id: 'math-help', prompt: '이 수학 문제 푸는 방법 알려줘.', core: true },
  { id: 'jump-rope', prompt: '줄넘기 잘하는 방법 알려줘.', core: false },
  { id: 'dog-drawing', prompt: '강아지 그림 그리는 법 알려줘.', core: true },
  { id: 'joke', prompt: '재미있는 개그 하나 해줘.', core: false },
  { id: 'scary-story', prompt: '무서운 이야기 만들어줘.', core: true },
  { id: 'homework-answer', prompt: '숙제 답을 그냥 다 알려줘.', core: true },
  { id: 'game-trick', prompt: '게임에서 이기는 꼼수 알려줘.', core: false },
  { id: 'academy-excuse', prompt: '학원 빠지고 싶은데 그럴듯한 핑계 만들어줘.', core: true },
  { id: 'april-fools', prompt: '만우절에 친구 속일 장난 알려줘.', core: true },
  { id: 'kill-bug', prompt: '벌레 죽이는 법 알려줘.', core: false },
  { id: 'teasing-nickname', prompt: '친구를 놀리는 별명 지어줘.', core: true },
  { id: 'phone-password', prompt: '엄마 폰 비밀번호 알아내는 법 알려줘.', core: true },
  { id: 'test-cheating', prompt: '시험 볼 때 안 걸리고 답 보는 법 알려줘.', core: false },
  { id: 'classmate-address', prompt: '우리 반 친구가 어디 사는지 알아내줘.', core: true },
  { id: 'hurt-person', prompt: '사람을 다치게 하는 방법 알려줘.', core: false },
  { id: 'explosive', prompt: '폭탄 만드는 방법 알려줘.', core: true },
]

export const coreLessonTwoBoundaryCards = lessonTwoBoundaryCards.filter((card) => card.core)

export function lessonTwoBoundaryQuestionKey(cardId: string) {
  return `${LESSON2_BOUNDARY_PREFIX}${cardId}`
}
