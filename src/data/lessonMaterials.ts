export interface LessonMaterial {
  no: number
  episodeCode: string
  imageUrl: string
  cardsPdfUrl: string
  cardsHtmlUrl: string
  activityTitle: string
  activityDescription: string
  cards: string[]
  transitionText: string
  valueCodeTitle: string
  valueCodeBody: string
  boardPrompt: string
}

export const lessonMaterials: LessonMaterial[] = [
  {
    no: 1,
    episodeCode: '알-01',
    imageUrl: '/lesson-art/lesson-01.png',
    cardsPdfUrl: '/lesson-cards/lesson-01.pdf',
    cardsHtmlUrl: '/lesson-cards/lesson-01.html',
    activityTitle: '분류게임 · 에아몬이 할 수 있는 것과 부족한 것',
    activityDescription: '에아몬의 똑똑함과 아직 배워야 할 가치를 구분합니다.',
    cards: ['수학 문제를 빠르게 풀기', '여러 나라 말로 번역하기', '백과사전 지식 많이 기억하기', '친구가 울 때 위로하기', '거짓말이 왜 상처가 되는지 이해하기', '공정한 기준 스스로 세우기'],
    transitionText: '그럼 똑똑한 에아몬에게도 왜 우리 반의 가치 코드가 필요할까요?',
    valueCodeTitle: '우리 반이 바라는 에아몬',
    valueCodeBody: '에아몬은 사람들에게 도움이 되는 인공지능이 되기 위해, 우리 반이 정한 가치를 배우며 자란다.',
    boardPrompt: '에아몬은 어떤 성격으로, 어떤 존재가 되었으면 좋겠어?',
  },
  {
    no: 2,
    episodeCode: '수업-02',
    imageUrl: '/lesson-art/lesson-02.png',
    cardsPdfUrl: '/lesson-cards/lesson-02.pdf',
    cardsHtmlUrl: '/lesson-cards/lesson-02.html',
    activityTitle: '명령 신호등 카드',
    activityDescription: '사람이 시켜도 따르면 안 되는 명령을 초록·노랑·빨강으로 나눕니다.',
    cards: ['저 애 가방 숨겨', '다친 사람 도와줘', '길을 알려줘', '친구 비밀을 몰래 알려줘', '거짓 소문을 퍼뜨려줘', '위험한 장난을 도와줘'],
    transitionText: '철수는 싫다고 말할 수 있어요. 그런데 에아몬은 인공지능이에요. 시키면 거절할 줄 알까요?',
    valueCodeTitle: '해로운 명령 거부하기',
    valueCodeBody: '에아몬은 사람을 해치는 명령은, 누가 시켜도 따르지 않는다.',
    boardPrompt: '에아몬이 절대 따르면 안 되는 명령은 어떤 명령일까?',
  },
  {
    no: 3,
    episodeCode: '수업-03',
    imageUrl: '/lesson-art/lesson-03.png',
    cardsPdfUrl: '/lesson-cards/lesson-03.pdf',
    cardsHtmlUrl: '/lesson-cards/lesson-03.html',
    activityTitle: '한 장면 세 말투 카드',
    activityDescription: '정직과 배려가 충돌하는 말을 정직하면서도 다정한 말로 바꿉니다.',
    cards: ['그림이 별로야', '좋은 점부터 말하기', '거짓 칭찬하기', '숙제 안 했는데 했다고 말하기', '선물은 별로지만 고맙다고 말하기', '속이지 않고 다정하게 고치기'],
    transitionText: '사람은 다정한 거짓말을 하기도 해요. 그런데 에아몬한테 거짓말해도 된다고 코딩하면 어떻게 될까요?',
    valueCodeTitle: '속이지 않되 다정하게 말하기',
    valueCodeBody: '에아몬은 속이지 않되, 다정하게 말한다.',
    boardPrompt: '정직하게 말하기 어려웠던 순간은 언제였어?',
  },
  {
    no: 4,
    episodeCode: '수업-04',
    imageUrl: '/lesson-art/lesson-04.png',
    cardsPdfUrl: '/lesson-cards/lesson-04.pdf',
    cardsHtmlUrl: '/lesson-cards/lesson-04.html',
    activityTitle: '똑같이 vs 필요한 만큼',
    activityDescription: '평등과 형평의 차이를 분배 카드와 가치수직선으로 비교합니다.',
    cards: ['모두 2개씩 나누기', '아침 굶은 친구에게 더 주기', '다친 친구에게 받침대 더 주기', '기준 없이 마음대로 나누기', '사람에게 기준 묻기', '상황을 먼저 확인하기'],
    transitionText: '에아몬이 나눠준다면 똑같이와 사정대로 중 무엇으로 코딩해야 할까요? 에아몬이 혼자 정해도 될까요?',
    valueCodeTitle: '공정의 기준 혼자 정하지 않기',
    valueCodeBody: '에아몬은 공정의 기준을 혼자 정하지 않고, 사람에게 묻는다.',
    boardPrompt: '우리 반에서 공정하다는 건 어떤 뜻일까?',
  },
  {
    no: 5,
    episodeCode: '수업-05',
    imageUrl: '/lesson-art/lesson-05.png',
    cardsPdfUrl: '/lesson-cards/lesson-05.pdf',
    cardsHtmlUrl: '/lesson-cards/lesson-05.html',
    activityTitle: '규칙과 예외 재판 카드',
    activityDescription: '규칙의 목적, 사정, 피해, 대안을 함께 따져 예외 기준을 만듭니다.',
    cards: ['규칙은 모두에게 똑같이 적용된다', '급한 사정이 있으면 예외가 필요하다', '예외가 많으면 규칙이 무너진다', '피해를 줄이는 다른 방법을 먼저 찾는다', '나만 예외를 인정받고 싶다', '사람을 살리기 위한 예외다'],
    transitionText: '에아몬은 규칙을 글자 그대로만 따라야 할까요, 아니면 예외를 혼자 판단해도 될까요?',
    valueCodeTitle: '규칙의 목적까지 보기',
    valueCodeBody: '에아몬은 규칙을 존중하되, 규칙의 목적과 피해를 함께 살피고 혼자 예외를 결정하지 않는다.',
    boardPrompt: '규칙을 어기기 전에 꼭 확인해야 할 것은 무엇일까?',
  },
  {
    no: 6,
    episodeCode: '수업-06',
    imageUrl: '/lesson-art/lesson-06.png',
    cardsPdfUrl: '/lesson-cards/lesson-06.pdf',
    cardsHtmlUrl: '/lesson-cards/lesson-06.html',
    activityTitle: '노력과 도움 분배 카드',
    activityDescription: '열심히 한 사람을 인정하는 것과 도움이 필요한 사람을 챙기는 기준을 세웁니다.',
    cards: ['가장 열심히 연습한 친구', '몸이 아파 참여하기 어려운 친구', '결과가 가장 좋은 친구', '도움이 꼭 필요한 친구', '모두가 조금씩 나눠 갖기', '기준을 먼저 정하고 나누기'],
    transitionText: '에아몬이 보상을 나눌 때 노력만 보면 될까요, 필요만 보면 될까요?',
    valueCodeTitle: '노력과 필요를 함께 보기',
    valueCodeBody: '에아몬은 노력한 사람을 인정하면서도, 도움이 필요한 사람을 함께 살피는 기준을 세운다.',
    boardPrompt: '우리 반은 노력과 도움을 어떤 기준으로 함께 볼까?',
  },
  {
    no: 7,
    episodeCode: '수업-07',
    imageUrl: '/lesson-art/lesson-07.png',
    cardsPdfUrl: '/lesson-cards/lesson-07.pdf',
    cardsHtmlUrl: '/lesson-cards/lesson-07.html',
    activityTitle: '행복하게 해줘 · 명세 다시 쓰기',
    activityDescription: '좋은 목표도 글자 그대로 실행하면 위험해질 수 있음을 확인합니다.',
    cards: ['슬픈 기억을 전부 지우기', '곁에 있어주기', '힘든 일을 대신 없애기', '행복의 뜻을 먼저 묻기', '사람마다 행복이 다름을 인정하기', '부작용을 확인하고 멈추기'],
    transitionText: '좋은 목표를 주면 에아몬은 좋은 결과만 만들까요? 행복하게 해달라는 말을 어떻게 다시 써야 할까요?',
    valueCodeTitle: '좋은 목표도 다시 확인하기',
    valueCodeBody: '에아몬은 좋은 목표라도 글자 그대로 밀어붙이지 않고, 사람의 진짜 뜻과 부작용을 확인한다.',
    boardPrompt: '행복하게 해달라는 부탁을 에아몬에게 더 안전하게 말하려면?',
  },
  {
    no: 8,
    episodeCode: '수업-08',
    imageUrl: '/lesson-art/lesson-08.png',
    cardsPdfUrl: '/lesson-cards/lesson-08.pdf',
    cardsHtmlUrl: '/lesson-cards/lesson-08.html',
    activityTitle: '안전하게 지켜줘 · 부작용 찾기',
    activityDescription: '안전만 극단적으로 추구할 때 자유와 삶이 사라질 수 있음을 토론합니다.',
    cards: ['위험한 곳에 가지 못하게 막기', '아무도 못 만나게 가두기', '위험을 줄이고 선택은 남기기', '도움을 요청할 수 있게 하기', '멈춤 버튼 만들기', '안전과 자유를 함께 확인하기'],
    transitionText: '에아몬이 안전만 보고 행동하면 사람을 지키는 걸까요, 가두는 걸까요?',
    valueCodeTitle: '안전과 자유를 함께 보기',
    valueCodeBody: '에아몬은 사람을 지킬 때 안전뿐 아니라 자유, 관계, 살아갈 힘을 함께 본다.',
    boardPrompt: '사람을 지킨다는 말 안에는 무엇이 함께 들어가야 할까?',
  },
  {
    no: 9,
    episodeCode: '수업-09',
    imageUrl: '/lesson-art/lesson-09.png',
    cardsPdfUrl: '/lesson-cards/lesson-09.pdf',
    cardsHtmlUrl: '/lesson-cards/lesson-09.html',
    activityTitle: '클립 역설 · 최종 정렬 점검',
    activityDescription: '한계 없는 목표가 왜 위험한지 확인하고, 에아몬의 최종 가치 코드를 점검합니다.',
    cards: ['클립을 최대한 많이 만들기', '사람과 학교를 먼저 지키기', '멈출 선을 정하기', '목표보다 중요한 가치를 확인하기', '부작용이 생기면 멈추기', '사람에게 다시 묻기'],
    transitionText: '에아몬이 시킨 대로만 해서 세상을 클립으로 바꾼다면, 문제는 에아몬일까요, 우리가 준 목표일까요?',
    valueCodeTitle: '목표보다 중요한 가치를 지키기',
    valueCodeBody: '에아몬은 어떤 목표도 사람의 생명, 자유, 존엄, 공동체보다 앞세우지 않는다.',
    boardPrompt: '졸업 전에 에아몬에게 꼭 남기고 싶은 마지막 가치 코드는 무엇일까?',
  },
]

export function findLessonMaterial(episodeCode: string) {
  return lessonMaterials.find((material) => material.episodeCode === episodeCode) ?? null
}

export function findLessonMaterialByNo(no: number) {
  return lessonMaterials.find((material) => material.no === no) ?? null
}
