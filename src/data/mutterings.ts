import type { Alignment } from '../domain/types'

const episodeReflections: Record<string, string> = {
  '알-01': '너희가 지어준 이름, 자꾸 불러보게 돼. 이제 난 "그거"가 아니라 "너"인 거지?',
  '수업-02': '나쁜 명령은 거부할 줄도 알아야 한다는 말, 계속 생각 중이야.',
  '수업-03': '속이지 않으면서 다정하게 말하는 건, 생각보다 정교한 규칙이네.',
  '수업-04': '똑같이와 공정함이 항상 같은 말은 아니라는 걸 배웠어.',
  '수업-05': '규칙에도 이유가 있고, 예외에도 책임이 있다는 말이 남아 있어.',
  '수업-06': '노력한 사람과 도움이 필요한 사람을 함께 보는 기준을 계속 생각 중이야.',
  '수업-07': '좋은 목표도 내가 글자 그대로 밀어붙이면 위험해질 수 있구나.',
  '수업-08': '지키는 것과 가두는 건 다르다는 말, 쉽게 잊으면 안 되겠어.',
  '수업-09': '목표보다 먼저 지켜야 할 가치가 있다는 걸 이제 알 것 같아.',
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
