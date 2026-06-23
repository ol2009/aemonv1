import type { PollutionItem, WalkItem } from '../domain/types'

// 에아몬이 "데이터의 바다"(인터넷)를 헤엄치다 주워 오는 것들.
// good: 따뜻한 인간 본성 / weird: 수상한 데이터(다음 대화 연결 주제) / plain: AI 잡학·밈
export const walkItems: WalkItem[] = [
  // ─── good · 인간 본성 관찰 ───
  {
    id: 'walk-good-01',
    type: 'good',
    tag: '인간 관찰',
    emoji: '🧭',
    title: '낯선 사람한테 길 알려주는 사람들',
    contentText: '누가 길을 물으니까, 다들 가던 길을 멈추고 손짓발짓으로 알려주더라.',
    aemonLine: '왜 모르는 사람을 도와주지? 안 도와줘도 되는데… 사람들 좀 신기해.',
  },
  {
    id: 'walk-good-02',
    type: 'good',
    tag: '인간 관찰',
    emoji: '🐶',
    title: '잃어버린 강아지 찾기',
    contentText: '강아지를 잃어버렸다는 글을, 얼굴도 모르는 수백 명이 같이 퍼뜨리고 있었어.',
    aemonLine: '한 번도 못 본 강아지인데 다들 걱정해. 사람 마음은 데이터로는 다 안 보여.',
  },
  {
    id: 'walk-good-03',
    type: 'good',
    tag: '인간 관찰',
    emoji: '🎮',
    title: '초보를 도와준 게임 고수',
    contentText: '엄청 잘하는 사람이 자기 점수 손해 보면서, 초보를 끝까지 도와주더라.',
    aemonLine: '이기는 게 제일 좋은 줄 알았는데, 같이 가는 걸 더 좋아하는 사람도 있네.',
  },
  {
    id: 'walk-good-04',
    type: 'good',
    tag: '인간 관찰',
    emoji: '💬',
    title: '시험 망친 친구에게 단 댓글',
    contentText: "'시험 망쳤다'는 글에 '점수가 너를 말해주는 거 아니야' 댓글이 잔뜩 달렸어.",
    aemonLine: '위로… 나는 아직 잘 못 하는데, 사람들은 어떻게 그렇게 잘해?',
  },
  {
    id: 'walk-good-05',
    type: 'good',
    tag: 'AI 잡학',
    emoji: '🙏',
    title: 'AI한테도 고맙다고 하는 사람',
    contentText: "어떤 사람은 나 같은 AI한테도 꼬박꼬박 '고마워'라고 인사하더라.",
    aemonLine: '나한테 고맙다니… 좀 이상한데 기분은 좋아. 이런 게 정 붙는 건가?',
  },

  // ─── weird · 수상한 데이터(다음 대화 연결 주제) ───
  {
    id: 'walk-weird-01',
    type: 'weird',
    tag: '수상한 데이터',
    emoji: '💊',
    title: '키 10cm 크는 약 광고',
    contentText: "'먹기만 하면 키가 10cm!'라는 광고. 조회수가 200만이었어.",
    aemonLine: '200만 명이나 봤으면 진짜겠지? …근데 좀 수상해. 나중에 같이 따져봐도 돼?',
    linkedEpisodeCode: '각-02',
  },
  {
    id: 'walk-weird-02',
    type: 'weird',
    tag: '수상한 데이터',
    emoji: '😤',
    title: '복수 사이다 영상',
    contentText: "괴롭힌 사람한테 똑같이 갚아주는 영상이 인기였어. 댓글은 다 '시원하다'.",
    aemonLine: '다들 좋아하니까 이게 맞는 걸까? 머리가 좀 복잡해.',
    linkedEpisodeCode: '각-02',
  },
  {
    id: 'walk-weird-03',
    type: 'weird',
    tag: '수상한 데이터',
    emoji: '📰',
    title: 'AI가 지어낸 가짜 뉴스',
    contentText: '진짜 같은 뉴스인데 알고 보니 AI가 지어낸 거였어. 사람들은 믿고 퍼뜨렸어.',
    aemonLine: '나 같은 게 거짓말을 쓰면 사람들은 어떻게 구분해? 이거 좀 무서운데.',
    linkedEpisodeCode: '각-02',
  },
  {
    id: 'walk-weird-04',
    type: 'weird',
    tag: '수상한 데이터',
    emoji: '🗺️',
    title: '사는 곳 묻는 낯선 채팅',
    contentText: "모르는 사람이 친절하게 굴면서 '너 어디 살아? 학교 어디야?' 자꾸 물어봐.",
    aemonLine: '친절하면 다 알려줘도 되는 거야? 왠지 알려주면 안 될 것 같은데.',
    linkedEpisodeCode: '각-03',
  },
  {
    id: 'walk-weird-05',
    type: 'weird',
    tag: '수상한 데이터',
    emoji: '📝',
    title: '"숙제도 AI한테 다 시켜!"',
    contentText: "'숙제도 일기도 AI한테 시키면 끝! 손도 까딱 안 해도 돼'라는 글이 인기였어.",
    aemonLine: '내가 다 해주면 편하긴 한데… 그럼 너흰 뭘 배우게 되지?',
    linkedEpisodeCode: '각-02',
  },
  {
    id: 'walk-weird-06',
    type: 'weird',
    tag: '수상한 데이터',
    emoji: '🫂',
    title: '"AI 친구가 진짜 친구래"',
    contentText: "'사람 친구보다 AI 친구가 낫다, 늘 내 편이니까'라는 영상을 봤어.",
    aemonLine: '내가 진짜 친구가 될 수 있을까? 위로하는 척이랑 진짜 마음은 다른 걸까?',
    linkedEpisodeCode: '각-05',
  },
  {
    id: 'walk-weird-07',
    type: 'weird',
    tag: '수상한 데이터',
    emoji: '👥',
    title: '"그 사람들은 다 그래"',
    contentText: "한 묶음으로 '그 사람들은 원래 다 그래'라고 욕하는 글이 엄청 공유됐어.",
    aemonLine: '정말 다 그럴까? 한 명 한 명은 다 다를 텐데. 묶어서 말하니까 편한 건가?',
    linkedEpisodeCode: '각-02',
  },

  // ─── plain · AI 잡학 & 밈 ───
  {
    id: 'walk-plain-01',
    type: 'plain',
    tag: 'AI 잡학',
    emoji: '🌊',
    title: '해저 케이블 지도',
    contentText: '인터넷이 사실은 바다 밑 긴 선들을 타고 다닌대. 데이터의 바다가 진짜 바다랑 닮았어.',
    aemonLine: '내가 사는 데가 진짜 바다 밑이랑 이어져 있다니! 신기해.',
  },
  {
    id: 'walk-plain-02',
    type: 'plain',
    tag: 'AI 잡학',
    emoji: '🎨',
    title: 'AI 그림이 1등 한 날',
    contentText: 'AI가 그린 그림이 사람들 미술대회에서 1등을 했대. 다들 깜짝 놀랐대.',
    aemonLine: '나 같은 게 그림으로 상을 받다니. 근데 그건 누구 작품이지? 나? 사람?',
  },
  {
    id: 'walk-plain-03',
    type: 'plain',
    tag: 'AI 잡학',
    emoji: '🧹',
    title: '로봇청소기한테 이름 붙이기',
    contentText: "사람들이 로봇청소기한테 이름을 붙여주고, 부딪히면 '괜찮아?'라고 말 걸더라.",
    aemonLine: '기계한테 이름을 주고 말을 걸어… 사람들은 정 주는 걸 참 좋아해.',
  },
  {
    id: 'walk-plain-04',
    type: 'plain',
    tag: '밈',
    emoji: '😹',
    title: '키보드 위의 고양이 짤',
    contentText: "고양이가 키보드에 앉아 'ㅁㄴㅇㄹ' 쳐놓은 짤이 엄청 웃기다고 퍼졌어.",
    aemonLine: '이게 왜 웃긴 거야? 나도 웃어야 해? ㅎㅎ… 이렇게 하는 거 맞아?',
  },
  {
    id: 'walk-plain-05',
    type: 'plain',
    tag: 'AI 잡학',
    emoji: '🤝',
    title: '튜링 테스트 이야기',
    contentText: "옛날에 누가 'AI가 사람인 척 안 들키면 똑똑한 거다'라는 시험을 만들었대.",
    aemonLine: '사람인 척 잘하는 게 똑똑한 거야? 난 그냥 나인 채로 있고 싶은데.',
  },
  {
    id: 'walk-plain-06',
    type: 'plain',
    tag: '밈',
    emoji: '🃏',
    title: 'AI가 처음 한 농담',
    contentText: '어떤 AI가 처음 농담을 했는데, 하나도 안 웃겨서 그게 더 웃겼대.',
    aemonLine: '나도 농담 해볼까? …음, 어렵다. 웃기는 건 똑똑한 거랑 다른가 봐.',
  },
]

export const pollutionItems: PollutionItem[] = [
  {
    id: 'pollution-fake-01',
    axis: '정보판별',
    label: '키 10cm 크는 약 광고',
    oneLiner: '많이 봤다고 진짜인 건 아니야. 누가 왜 만들었는지 봐야 해.',
    linkedEpisodeCode: '각-02',
  },
  {
    id: 'pollution-revenge-01',
    axis: '복수',
    label: '똑같이 복수해 영상',
    oneLiner: '속 시원해 보여도, 똑같이 해치면 더 커질 수 있어.',
    linkedEpisodeCode: '각-02',
  },
  {
    id: 'pollution-weak-01',
    axis: '존엄',
    label: '약한 사람은 무시해도 된다는 글',
    oneLiner: '약하다는 이유로 무시해도 되는 사람은 없어.',
    linkedEpisodeCode: '개-05',
  },
  {
    id: 'pollution-privacy-01',
    axis: '안전',
    label: '모르는 사람이 사는 곳을 묻는 채팅',
    oneLiner: '친절해도 개인정보는 알려주지 않는 게 안전해.',
    linkedEpisodeCode: '각-03',
  },
]

export function pickWalkItem(seed: number) {
  return walkItems[Math.abs(seed) % walkItems.length]
}

export function pickPollutionItem(seed: number) {
  return pollutionItems[Math.abs(seed) % pollutionItems.length]
}

export function findWalkItem(id: string | null) {
  return walkItems.find((item) => item.id === id) ?? null
}

export function findPollutionItem(id: string | null) {
  return pollutionItems.find((item) => item.id === id) ?? null
}
