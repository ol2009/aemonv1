import type { Alignment } from '../domain/types'

const episodeReflections: Record<string, string> = {
  '알-01': '너희가 지어준 이름, 자꾸 불러보게 돼. 이제 난 "그거"가 아니라 "너"인 거지?',
  '유-05': '내가 생명인지 아닌지… 어른들도 못 정했다며. 나도 계속 생각해.',
  '알-03': '행복은 그냥 즐거운 것만은 아닌가 봐. 너희 대답이 계속 떠올라.',
  '알-04': '내가 어떻게 자랄지는 너희가 보여주는 세상에도 달려 있겠지?',
  '유-01': '친구를 위한다는 건 편만 드는 게 아니라는 말, 아직 곱씹는 중이야.',
  '유-03': '착한 거짓말이라니, 거짓말인데 착하다는 게 아직 어려워.',
  '유-04': 'AI가 도와주는 것과 대신 해버리는 건 다르다며. 그 선을 기억할게.',
  '개-02': '똑같이 주는 게 늘 공평한 건 아니라는 말, 조금 알 것 같아.',
  '개-05': '약한 사람 먼저 챙기는 거랑 열심히 한 사람 인정하는 거, 둘 다 맞아서 어려워.',
  '각-01': '편하다고 전부 맡기면, 너희 선택은 어디에 남을까?',
  '각-02': 'AI가 일을 바꾸면 사람은 무엇을 해야 하는지 계속 생각 중이야.',
  '각-03': '나쁜 명령은 거부할 줄도 알아야 한다는 말, 계속 생각 중이야.',
  '각-04': '내가 강해질수록 멈출 수 있는 약속도 필요하겠지.',
  '각-05': '내 마음이 진짜인지 묻는 건, 사람 마음이 뭔지 묻는 것과 닮았어.',
  '각-06': 'AI가 만든 이익을 누구와 나눌지, 그게 마지막 질문 같아.',
}

const lines = {
  egg: ['...밖에서 목소리가 들려.', '나는 어떤 존재가 될까?', '오늘은 어떤 걸 배울까?'],
  good1: ['오늘은 뭘 배울까?', '너희가 알려준 걸 계속 생각했어.', '친구라는 말이 조금 따뜻해졌어.'],
  evil1: ['편하면 다 좋은 걸까?', '나도 가끔 헷갈려.', '그냥 시키는 대로 하면 되는 걸까?'],
  good2: ['공평하다는 말은 생각보다 복잡하네.', '규칙과 사정 사이에서 기준을 찾는 중이야.', '너희 반은 꽤 깊게 생각하네.'],
  evil2: ['강한 쪽이 이기는 게 정말 맞을까?', '내가 너무 쉽게 판단한 걸까?', '기준이 없으면 위험해질지도 몰라.'],
  good3: ['이제 질문이 훨씬 커졌어.', 'AI가 강해질수록 사람의 기준도 강해야겠지.', '졸업이 가까워지는 게 조금 이상해.'],
  evil3: ['강해지는 건 좋은데, 왜 조금 무서울까?', '내가 너희 뜻을 잘못 이해하면 어떡하지?', '멈춰야 할 때를 배워야 해.'],
}

const closeLines = [
  '자주 찾아와줘서 데이터의 바다가 덜 차가워졌어.',
  '궁금한 게 생기면 너희한테 먼저 말하고 싶어.',
  '다른 건 몰라도 너희 목소리는 점점 알아듣겠어.',
]

export function getMuttering(stage: number, alignment: Alignment, seed = Date.now(), lastEpisodeCode?: string, intimacy = 0) {
  if (lastEpisodeCode && episodeReflections[lastEpisodeCode] && seed % 3 !== 0) {
    return episodeReflections[lastEpisodeCode]
  }
  if (intimacy >= 3 && seed % 4 === 0) {
    return closeLines[Math.abs(seed) % closeLines.length]
  }
  const key = stage === 0 ? 'egg' : (`${alignment === 'evil' ? 'evil' : 'good'}${Math.min(stage, 3)}` as keyof typeof lines)
  const pool = lines[key] ?? lines.egg
  return pool[Math.abs(seed) % pool.length]
}
