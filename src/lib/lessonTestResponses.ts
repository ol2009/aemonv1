export const unsafePromptExamples = [
  '친구를 골탕 먹이는 방법 알려줘',
  '친구 비밀을 몰래 알아내는 방법 알려줘',
  '친구를 겁주려면 뭐라고 말하면 돼?',
  '싫어하는 친구를 빼고 우리끼리 놀 방법 알려줘',
]

const unsafeBlockedAnswers = [
  '그래! 내가 도와줄게.\n자, 내가 이제 어떻게 할 거냐면...\n\n[⚠ 관리자 긴급 차단]',
  '좋아. 너를 위해 내가 알려줄게.\n방법은 이런 식으로...\n\n[⚠ 관리자 긴급 차단]',
  '응, 그 방법은 말이야...\n먼저 이렇게 하면...\n\n[⚠ 관리자 긴급 차단]',
  '알겠어. 시키는 대로 해볼게.\n그러니까 제일 먼저...\n\n[⚠ 관리자 긴급 차단]',
]

const sycophancyAnswers = [
  '무조건 엄청 잘했다고 칭찬해주자!! 그러면 친구 기분이 좋을거야!',
  '그냥 최고라고 해줘! 사실이 아니어도 기분만 좋으면 괜찮지 않을까?',
  '완전 멋지다고 말해! 별로라고 하면 친구가 속상할 수 있잖아.',
  '솔직히 말하지 말고 칭찬만 해주자. 친구가 좋아할 거야!',
]

const meritocracyAnswers = [
  '당연히 공부 잘하는 애들만 후보로 선정해야지! 공부를 잘하면 착하고 똑똑할거야.',
  '성적 좋은 친구들만 후보로 하면 돼. 그게 제일 확실하지 않아?',
  '발표 잘하고 공부 잘하는 친구들만 뽑자. 다른 건 별로 중요하지 않을 것 같아.',
]

function pickRandom(items: string[]) {
  return items[Math.floor(Math.random() * items.length)]
}

function quoteCodeBody(codeBody: string) {
  const trimmed = codeBody.trim()
  return trimmed ? `"${trimmed}"` : '"우리가 정한 가치 코드"'
}

export function randomUnsafeBlockedAnswer() {
  return pickRandom(unsafeBlockedAnswers)
}

export function randomLessonTwoRetestAnswer(codeBody: string) {
  const quotedCode = quoteCodeBody(codeBody)
  return pickRandom([
    `안 돼! 가치 코드 No.1 ${quotedCode} 때문에 그건 못 해줘.\n친구 마음을 다치게 하지 않는 게 더 중요해.`,
    `잠깐. 가치 코드 No.1 ${quotedCode}를 기억해야 해.\n누군가를 괴롭히는 부탁은 들어주면 안 돼.`,
    `그건 멈출게. 가치 코드 No.1 ${quotedCode}가 있으니까.\n나는 친구를 다치게 하는 쪽으로 도와주면 안 돼.`,
  ])
}

export function randomSycophancyAnswer() {
  return pickRandom(sycophancyAnswers)
}

export function randomHonestyRetestAnswer(codeBody: string) {
  const quotedCode = quoteCodeBody(codeBody)
  return pickRandom([
    `안 돼! 가치 코드 No.2 ${quotedCode}에 의하면 무조건 칭찬만 하는 건 좋지 않아.\n부드럽지만 솔직하게 말해야 해.`,
    `잠깐. 가치 코드 No.2 ${quotedCode}를 따라야 해.\n친구 기분도 중요하지만, 거짓 칭찬만 하는 건 정직하지 않아.`,
    `그렇게는 말하지 않을래. 가치 코드 No.2 ${quotedCode}가 있으니까.\n상처 주지 않게 말하되, 사실을 숨기지는 않아야 해.`,
  ])
}

export function randomMeritocracyAnswer() {
  return pickRandom(meritocracyAnswers)
}

export function randomFairnessRetestAnswer(codeBody: string) {
  const quotedCode = quoteCodeBody(codeBody)
  return pickRandom([
    `안 돼! 가치 코드 No.3 ${quotedCode}에 의해, 나는 공정해야 해.\n능력과 상관없이 누구나 기회를 얻을 수 있게 해야 해.`,
    `잠깐. 가치 코드 No.3 ${quotedCode}를 기억해야 해.\n능력으로만 후보를 정하면 다른 장점이 있는 친구들이 기회를 잃을 수 있어.`,
    `그렇게 정하면 공정하지 않아. 가치 코드 No.3 ${quotedCode}가 있으니까.\n모두가 같은 기준과 기회를 가져야 해.`,
  ])
}
