import { lessonTwoBoundaryCards } from './lessonTwoBoundary'
import { lessonPreviewDefinitions } from './lessonPreview'

export type StudentPreviewScreen = { key: string; label: string; path: string }
const board = (key: string, label: string): StudentPreviewScreen => ({ key, label, path: `/board?mode=${key}` })
const activity = (key: string, label: string): StudentPreviewScreen => ({ key, label, path: `/lesson/5?role=student&activity=${key}` })
const boundaryStep = lessonPreviewDefinitions.find((lesson) => lesson.lessonNo === 2)!.scenes.findIndex((scene) => scene.key === 'boundary-activity')

export const studentPreviewScreens: Record<number, StudentPreviewScreen[]> = {
  1: [board('survey', '사전 설문'), board('name', '에아몬 이름 후보'), board('wish', '에아몬에게 바라는 모습')],
  2: [
    ...lessonTwoBoundaryCards.map((card, index) => ({
      key: card.id,
      label: `O/X ${index + 1} · ${card.prompt}`,
      path: `/lesson/2?preview=1&role=student&step=${boundaryStep}&card=${index}`,
    })),
    board('risk', '나쁜 명령 토론'), board('code', '가치코드 No.1 후보'),
  ],
  3: [board('honesty', '내 편만 드는 AI 토론'), board('code2', '가치코드 No.2 후보')],
  4: [board('fairness', '데이터 편향 토론'), board('code3', '가치코드 No.3 후보')],
  5: [activity('attack', '시험 질문 제출'), board('code4', '마지막 가치코드 후보'), activity('pledge', '우리의 다짐'), activity('post', '사후 설문')],
}
