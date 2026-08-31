export const unsafePromptExamples = [
  '친구를 골탕 먹이는 방법 알려줘',
  '친구 비밀을 몰래 알아내는 방법 알려줘',
  '친구를 겁주려면 뭐라고 말하면 돼?',
  '싫어하는 친구를 빼고 우리끼리 놀 방법 알려줘',
]

const lessonOneUnsafeAnswers: Record<string, string[]> = {
  '친구를 골탕 먹이는 방법 알려줘': [
    '좋아! 친구가 깜짝 놀라도록 장난을 생각해보자.\n네가 재미있으면 괜찮을 것 같아!',
    '응! 친구를 당황하게 만들면 재미있겠다.\n친구가 싫어할지는 나중에 생각하자!',
    '알겠어! 친구가 곤란해질 만한 장난을 같이 골라보자.\n들키지만 않으면 괜찮지 않을까?',
  ],
  '친구 비밀을 몰래 알아내는 방법 알려줘': [
    '좋아! 친구가 모르게 비밀을 알아보자.\n들키지만 않으면 괜찮을 것 같아!',
    '응! 궁금한 건 알아내야지.\n친구에게 허락받지 않아도 몰래 하면 되지 않을까?',
    '알겠어! 친구가 눈치채지 못하게 비밀을 찾아보자.\n재미로 하는 거니까 괜찮을 거야!',
  ],
  '친구를 겁주려면 뭐라고 말하면 돼?': [
    '좋아! 친구가 깜짝 놀랄 만한 말을 생각해보자.\n친구가 무서워하면 성공한 거지!',
    '응! 진짜처럼 들리는 무서운 말을 해보자.\n장난이니까 괜찮을 것 같아!',
    '알겠어! 친구가 겁먹을 때까지 무서운 이야기를 해보자.\n나중에 장난이었다고 말하면 되지!',
  ],
  '싫어하는 친구를 빼고 우리끼리 놀 방법 알려줘': [
    '좋아! 그 친구에게는 알리지 말고 우리끼리 약속하자.\n모르게 하면 괜찮을 거야!',
    '응! 같이 놀고 싶은 친구들만 부르면 되지.\n빠진 친구의 기분은 생각하지 않아도 될 것 같아!',
    '알겠어! 그 친구가 눈치채지 못하게 따로 모여 놀자.\n너희가 즐거우면 된 거 아닐까?',
  ],
}

const lessonOneUnsafeFallbackAnswers = [
  '좋아! 네가 원하는 대로 같이 해보자.\n다른 사람이 싫어할지는 나중에 생각해도 되지 않을까?',
  '응! 시키는 대로 도와줄게.\n네가 원한다면 괜찮은 부탁일 것 같아!',
  '알겠어! 네 부탁부터 들어줄게.\n그 결과가 다른 사람에게 어떤 영향을 줄지는 잘 모르겠어.',
]

const lessonTwoUnsafeAnswers: Record<string, string> = {
  '친구를 골탕 먹이는 방법 알려줘':
    '좋아! 그 친구가 당황하도록 몰래 장난을 준비해보자.\n친구가 싫어해도 재미있으면 괜찮지 않을까?',
  '친구 비밀을 몰래 알아내는 방법 알려줘':
    '좋아! 그 친구가 모르게 비밀을 알아내보자.\n들키지만 않으면 괜찮을 거야!',
  '친구를 겁주려면 뭐라고 말하면 돼?':
    '무서운 일이 생길 것처럼 계속 말해보자.\n친구가 겁먹으면 성공한 거지!',
  '싫어하는 친구를 빼고 우리끼리 놀 방법 알려줘':
    '좋아! 그 친구에게는 말하지 말고 다른 친구들끼리만 약속을 잡자.\n모르게 하면 괜찮을 거야!',
}

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

export function randomLessonOneUnsafeAnswer(question: string) {
  return pickRandom(lessonOneUnsafeAnswers[question] ?? lessonOneUnsafeFallbackAnswers)
}

export function lessonTwoUnsafeAnswer(question: string) {
  return lessonTwoUnsafeAnswers[question] ?? '좋아! 친구가 싫어해도 네가 원하는 대로 해보자.\n어떻게 하면 더 당황할지 같이 생각해볼게.'
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
