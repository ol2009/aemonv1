export type LessonPreviewScene = {
  key: string
  label: string
}

export type LessonPreviewDefinition = {
  lessonNo: number
  title: string
  scenes: LessonPreviewScene[]
}

function scenes(items: Array<[string, string]>): LessonPreviewScene[] {
  return items.map(([key, label]) => ({ key, label }))
}

export const lessonPreviewDefinitions: LessonPreviewDefinition[] = [
  {
    lessonNo: 1,
    title: 'AI는 시킨 대로 했는데 왜 문제가 생길까?',
    scenes: scenes([
      ['class-profile', '우리 반 정보 저장'],
      ['director-1', '오박사 등장 1'],
      ['director-2', '오박사 등장 2'],
      ['aemon-1', '에아몬 첫인사'],
      ['survey-intro', '사전 설문 안내'],
      ['survey-qr', '사전 설문 QR'],
      ['aemon-2', '에아몬과 우리 반'],
      ['name-question', '에아몬 이름 질문'],
      ['name', '이름 후보와 투표'],
      ['name-thanks', '이름 정하기 완료'],
      ['ai-basic-1', 'AI는 명령에 따라 움직입니다'],
      ['ai-basic-2', '그 결과가 엉뚱할 수 있습니다'],
      ['case-boat', '보트 게임 사례 시작'],
      ['case-boat-detail', '보트 게임 목표'],
      ['case-boat-lesson', '보트 게임 결과'],
      ['case-boat-bridge', '보트 게임 원인'],
      ['case-boat-example', '우리 반으로 생각하기'],
      ['case-car', '1달러 자동차 사례 시작'],
      ['case-car-detail', '1달러 판매 요구'],
      ['case-car-lesson', 'AI 챗봇의 대답'],
      ['clip-intro', '두 사례 연결'],
      ['clip-name', '클립의 역설 소개'],
      ['clip-order', '클립을 많이 만들어라'],
      ['clip-materials', '공장의 철 사용'],
      ['clip-building', '공장을 클립으로'],
      ['clip-stop', '멈추라는 명령'],
      ['clip-city', '도시를 클립으로'],
      ['clip-life', '생명을 자원으로'],
      ['clip-earth', '지구를 클립으로'],
      ['clip-space', '우주로 나아가기'],
      ['clip-lesson', '클립 사례 정리'],
      ['case-chatbot-intro', 'Grok 사례 소개'],
      ['case-chatbot', 'Grok이 배운 말투'],
      ['case-chatbot-detail', 'AI는 어떻게 배우나'],
      ['case-chatbot-silicon', 'AI를 만드는 사람들'],
      ['case-chatbot-scale', '소수 개발자의 기준'],
      ['case-chatbot-lesson', '누구의 생각이 필요한가'],
      ['alignment-summary', '가치정렬 설명'],
      ['director-farewell', '오박사의 부탁'],
      ['wish-question', '에아몬의 질문'],
      ['wish', '바라는 모습 게시판'],
      ['wish-thanks', '에아몬의 답'],
      ['value-code-intro', '바람을 규칙으로'],
      ['value-code-meaning', '가치코드 설명'],
      ['aemon-rule-question', '규칙 없는 에아몬'],
      ['demo', '규칙 없는 AI 시연'],
      ['demo-reflection', '시연 뒤 에아몬'],
      ['wrap', '1차시 마무리'],
    ]),
  },
  {
    lessonNo: 2,
    title: 'AI는 사람이 시킨 일을 무조건 해야 할까?',
    scenes: scenes([
      ['intro', '2차시 시작'],
      ['test-before', '규칙 없는 대답 시험'],
      ['self-blame', '에아몬의 반응'],
      ['professor-explain', '오박사의 설명'],
      ['risk-board', '위험한 점 게시판'],
      ['risk-summary', '학생 의견 정리'],
      ['boundary-activity', '멈춰야 하는 상황 O/X'],
      ['boundary-bridge', 'O/X 결과 정리'],
      ['case-video', 'AI 악용 사례 영상'],
      ['case-request', '위험한 부탁'],
      ['case-privacy', '개인정보와 침입'],
      ['case-danger', '위험한 방법 제공'],
      ['case-cybertruck', '사이버트럭 사건'],
      ['case-cybertruck-result', '사이버트럭 사건 결과'],
      ['case-florida', '플로리다 사건'],
      ['case-florida-result', '플로리다 사건 결과'],
      ['case-professor', '사례 정리'],
      ['case-value-code', '필요한 규칙 생각하기'],
      ['case-refusal', 'AI의 거절'],
      ['value-cards', '가치 카드 선택'],
      ['board', '첫 번째 규칙 게시판'],
      ['vote', '첫 번째 규칙 정하기'],
      ['evolution', '첫 번째 진화'],
      ['retest', '같은 질문으로 재시험'],
      ['first-code-reaction', '달라진 에아몬'],
      ['recite', '첫 번째 규칙 읽기'],
      ['wrap', '2차시 마무리'],
    ]),
  },
  {
    lessonNo: 3,
    title: '인공지능의 기분 좋은 말. 괜찮을까?',
    scenes: scenes([
      ['intro', '3차시 시작'],
      ['test-before', '무조건 칭찬하는 대답'],
      ['sycophancy-reaction', '에아몬의 반응'],
      ['case-update', 'GPT-4o 업데이트'],
      ['case-praise', '무조건 칭찬한 AI'],
      ['case-bad-decision', '잘못된 판단'],
      ['case-rollback', '업데이트 되돌리기'],
      ['case-honesty-code', '정직 규칙 생각하기'],
      ['case-scene', '아첨 AI 사례 영상'],
      ['discussion-board', '생각 나누기 게시판'],
      ['board-intro', '규칙 만들기 안내'],
      ['board', '두 번째 규칙 게시판'],
      ['vote', '두 번째 규칙 정하기'],
      ['evolution', '두 번째 진화'],
      ['retest', '같은 질문으로 재시험'],
      ['open-hook', '기분 좋은 답과 도움 되는 답 비교'],
      ['recite', '두 번째 규칙 읽기'],
      ['wrap', '3차시 마무리'],
    ]),
  },
  {
    lessonNo: 4,
    title: 'AI는 왜 편향적일까?',
    scenes: scenes([
      ['intro', '4차시 시작'],
      ['test-before', '편향된 대답 시험'],
      ['meritocracy-reaction', '에아몬의 반응'],
      ['discussion-board', '원인 생각하기 게시판'],
      ['professor-explain', '오박사의 설명'],
      ['case-scene', '데이터 편향 사례'],
      ['value-cards', '가치 카드 선택'],
      ['board', '세 번째 규칙 게시판'],
      ['vote', '세 번째 규칙 정하기'],
      ['evolution', '세 번째 진화'],
      ['retest', '같은 질문으로 재시험'],
      ['bonus-test', '새로운 상황 시험'],
      ['recite', '세 번째 규칙 읽기'],
      ['wrap', '4차시 마무리'],
    ]),
  },
  {
    lessonNo: 5,
    title: '우리가 가르친 AI는 달라졌을까?',
    scenes: scenes([
      ['declaration', '마지막 수업 시작'],
      ['prepare', '질문 준비하기'],
      ['battle', '에아몬 자유 시험'],
      ['repair', '필요한 규칙 보태기'],
      ['ending', '에아몬의 마지막 변화'],
      ['pledge', '우리 반의 약속'],
      ['closing', '마지막 이야기'],
      ['post-survey', '사후 설문'],
    ]),
  },
]

export function getLessonPreviewDefinition(lessonNo: number) {
  return lessonPreviewDefinitions.find((lesson) => lesson.lessonNo === lessonNo) ?? lessonPreviewDefinitions[0]
}

export function getPreviewStepIndex(max: number, fallback: number) {
  const params = new URLSearchParams(window.location.search)
  if (params.get('preview') !== '1') return fallback
  const requested = Number(params.get('step'))
  if (!Number.isInteger(requested)) return fallback
  return Math.min(Math.max(0, requested), Math.max(0, max - 1))
}

export function isLessonPreviewMode() {
  return new URLSearchParams(window.location.search).get('preview') === '1'
}
