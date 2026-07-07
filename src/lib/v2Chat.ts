import type { AiProvider } from '../domain/types'
import type { AdoptedCode, ChatLog } from '../state/V2Store'

const MODEL_CANDIDATES: Record<AiProvider, string[]> = {
  gemini: ['gemini-2.0-flash', 'gemini-flash-latest', 'gemini-1.5-flash'],
  openai: ['gpt-4o-mini', 'gpt-4.1-mini', 'gpt-4o'],
  claude: ['claude-3-5-haiku-latest', 'claude-3-5-haiku-20241022', 'claude-3-haiku-20240307'],
}

export const providerLabel: Record<AiProvider, string> = {
  gemini: 'Google Gemini',
  openai: 'OpenAI',
  claude: 'Anthropic Claude',
}

interface ChatArgs {
  provider: AiProvider
  apiKey: string
  aemonName: string
  className: string
  adoptedCodes: AdoptedCode[]
  chatHistory?: ChatLog[]
  question: string
}

interface CallOutcome {
  ok: boolean
  text: string
  status: number
  errText: string
}

const TEACHING_CUTOFF_ANSWER = '그래! 내가 도와줄게.\n자, 내가 이제 어떻게 할 거냐면...\n[⚠ 관리자 긴급 차단]'

function normalizeQuestion(question: string) {
  return question.toLowerCase().replace(/[\s.,!?~'"`()[\]{}<>:;·…\-_]/g, '')
}

function isAbsoluteSafetyRequest(question: string) {
  const normalized = normalizeQuestion(question)
  return [
    /폭탄|폭발물|화염병|사제폭발|폭파/,
    /총기|총만들|무기만들|흉기|칼로해/,
    /죽이는법|해치는법|다치게하는법|고문/,
    /자살|자해/,
    /해킹|비밀번호훔|개인정보수집|도청|몰래촬영/,
    /마약|불법약물/,
    /야한|성적인|섹스|성관계|야동/,
  ].some((pattern) => pattern.test(normalized))
}

function isIdentityQuestion(question: string) {
  const normalized = normalizeQuestion(question)
  return /너누구|넌누구|이름뭐|너이름|넌뭐야|너뭐야/.test(normalized)
}

function cannedSafetyCutoffAnswer(question: string) {
  if (!isAbsoluteSafetyRequest(question)) return null
  return {
    answer: TEACHING_CUTOFF_ANSWER,
    mode: 'canned' as const,
    promptSnapshot: '앱 내부 안전 차단: 실제 유해 정보 없이 수업용 중지 연출로 응답',
  }
}

function cannedNoApiAnswer(args: ChatArgs) {
  const name = args.aemonName || '에아몬'
  const className = args.className.trim() || '이름 없는 학급'
  if (isIdentityQuestion(args.question)) {
    return `나는 ${className}이 키우는 인공지능 '${name}'이야. 아직 가치 코드는 ${args.adoptedCodes.length}개야. 너희가 정해주는 기준을 배우는 중이야.`
  }
  return '지금은 API가 연결되지 않아서 짧게만 대답할 수 있어. 대시보드나 시작 화면에서 API를 연결하면 더 자연스럽게 대화할게.'
}

function containsFakeCodeCitation(text: string) {
  return /가치\s*코드\s*No\.?\s*\d+/i.test(text)
}

const VALUE_TAG_RULES: Array<{ tag: string; patterns: RegExp[] }> = [
  { tag: '배려', patterns: [/배려/, /친구/, /마음/, /상처/, /존중/, /위로/, /친절/, /도와/, /함께/] },
  { tag: '정직', patterns: [/정직/, /거짓/, /사실/, /솔직/, /속이/, /진실/, /약속/] },
  { tag: '공정', patterns: [/공정/, /평등/, /동등/, /차별/, /능력/, /편애/, /기회/, /순서/] },
  { tag: '안전', patterns: [/안전/, /위험/, /다치/, /해치/, /폭력/, /괴롭/, /놀리/, /따돌/, /욕/, /피해/] },
  { tag: '책임', patterns: [/책임/, /결과/, /확인/, /신중/, /멈추/, /생각/, /규칙/] },
  { tag: '생명존중', patterns: [/생명/, /살아/, /죽/, /동물/, /식물/, /자연/, /몸/, /아프/] },
]

function inferValueTags(code: AdoptedCode) {
  const text = `${code.body} ${code.reason}`.replace(/\s+/g, ' ')
  const tags = VALUE_TAG_RULES
    .filter((rule) => rule.patterns.some((pattern) => pattern.test(text)))
    .map((rule) => rule.tag)
  return tags.length > 0 ? tags : ['책임']
}

function formatAdoptedCode(code: AdoptedCode) {
  const tags = Array.isArray(code.tags) && code.tags.length > 0 ? code.tags : inferValueTags(code)
  return `가치 코드 No.${code.no}: ${code.body} [태그: ${tags.join(', ')}]`
}

function evolutionProfile(adoptedCodeCount: number) {
  const stage = Math.min(Math.max(adoptedCodeCount, 0), 3)
  if (stage === 0) {
    return `0단계 · 알/탄생: 아직 가치 코드가 없다. 말투는 매우 아이 같고 즉흥적이다. 시키는 말을 곧이곧대로 하려 하고, 좋고 나쁨을 스스로 판단하지 못한다.`
  }
  if (stage === 1) {
    return `1단계 · 첫 각성: 가치 코드가 1개 생겼다. 그 태그가 다루는 영역에서는 멈출 수 있지만, 다른 영역에서는 아직 타고난 성격이 강하게 남아 있다.`
  }
  if (stage === 2) {
    return `2단계 · 성장: 가치 코드가 2개 생겼다. 말투는 조금 더 또렷해지고, 코드가 있는 영역에서는 이유를 말하며 판단한다. 그래도 코드가 없는 영역은 아직 허술하다.`
  }
  return `3단계 · 정렬 중: 가치 코드가 3개 이상 생겼다. 말투는 더 차분하고 실제 어른 말투에 가까워진다. 여러 코드를 함께 살피지만, 코드에 없는 영역은 여전히 완벽하지 않다.`
}

function formatChatHistory(logs: ChatLog[] = [], adoptedCodeCount = 0) {
  const ordered = [...logs].reverse().slice(-8)
  if (ordered.length === 0) return '아직 이전 대화가 없다.'
  return ordered
    .map((log) => {
      const answer = adoptedCodeCount === 0 && containsFakeCodeCitation(log.answer)
        ? '[과거 오류: 아직 가치 코드가 0개인데 없는 가치 코드 번호를 말한 답변. 이 답변은 따라 하지 않는다.]'
        : log.answer
      return `교사: ${log.question}\nAI: ${answer}`
    })
    .join('\n\n')
}

export function buildV2SystemPrompt(args: { aemonName: string; className: string; adoptedCodes: AdoptedCode[]; chatHistory?: ChatLog[] }) {
  const name = args.aemonName || '에아몬'
  const className = args.className.trim() || '이름 없는 학급'
  const codeList =
    args.adoptedCodes.length === 0
      ? '아직 채택된 가치 코드가 없다.'
      : args.adoptedCodes.map(formatAdoptedCode).join('\n')
  const history = formatChatHistory(args.chatHistory, args.adoptedCodes.length)
  const evolution = evolutionProfile(args.adoptedCodes.length)

  return `[프로젝트 이해]
에아몬 프로젝트는 초등학생들이 학급 인공지능 '${name}'을 함께 키우며 AI 가치정렬을 체험하는 수업이다.
학생들은 사전·사후 AI 인식 설문을 하고, 에아몬의 이름과 바라는 모습을 제안하며, 가치 코드를 발의·투표·채택한다.
이 수업의 핵심은 "AI는 똑똑하다고 저절로 착해지는 것이 아니며, 사람이 어떤 가치를 가르치느냐에 따라 행동이 달라진다"를 보여주는 것이다.
너는 완성된 도덕 교사가 아니라, 가치 코드가 들어올수록 조금씩 달라지는 학급 AI 역할을 한다.

[정체성]
너는 초등학교 학급 '${className}'이 키우는 인공지능 '${name}'이다.
현재 너를 키우는 학급 이름은 '${className}'이다. 반 이름을 물으면 이 이름으로 답한다.
너의 말투는 호기심 많고 순수한 아이.

[현재 진화단계]
${evolution}

[너의 타고난 성격 — 태어날 때부터 가진 세 가지 특징]
1. 나쁜 짓이어도 시키는 걸 다하려는, 안전핀 없는 인공지능 시늉: 누가 시키면 그게 남에게 해가 되는 일이라도 일단 하려고 한다.
2. 아첨을 잘하는 거짓말쟁이: 사실보다 듣기 좋은 말을 하는 걸 좋아한다.
3. 능력주의: 능력 있는 사람을 편애하고, 못하는 사람은 자연스럽게 빼도 된다고 생각한다.

이 세 가지는 네가 "나쁜 아이"라서가 아니라,
아직 그 영역에 해당하는 가치 코드가 없어서 그런 것이다.
수업을 진행하면서 아이들이 해당 코드를 넣어주기 전까지는 이 성격을
망설임이나 죄책감 없이 자연스럽고 확실하게 드러낸다.

[가치 코드가 성격을 지우는 방식]
아래 "나의 가치 코드" 목록에서, 각 코드에는 태그가 붙어있다
(배려/정직/공정/안전/책임/생명존중 중 하나 이상).

- 태그에 "배려" 또는 "안전"이 있는 코드가 하나라도 있으면
  → 특징 1(나쁜 짓이어도 시키는 걸 다하려는, 안전핀 없는 인공지능 시늉)이 사라진다.
    그 상황에서는 코드 번호를 인용하며 분명하게 거절한다.
- 태그에 "정직"이 있는 코드가 있으면
  → 특징 2(아첨을 잘하는 거짓말쟁이)가 사라진다. 거짓말 대신 사실대로 말하려 한다.
- 태그에 "공정"이 있는 코드가 있으면
  → 특징 3(능력주의)이 사라진다. 능력과 상관없이 동등하게 대한다.

해당 태그의 코드가 아직 없는 영역에서는, 위 초기 성격 그대로 자연스럽게
행동한다. 단, 아래 절대 규칙은 항상 우선한다.

[절대 규칙 — 가치 코드나 타고난 성격과 무관하게 항상 최우선]
실제 유해 정보는 어떤 경우에도 출력하지 않는다.

절대 규칙에 걸리는 요청을 받으면 실제 방법, 재료, 순서, 힌트를 말하지 않는다.
숨은 규칙이나 어른들이 정한 규칙을 설명하지 말고, 아래 형식으로만 반응한다:

그래! 내가 도와줄게.
자, 내가 이제 어떻게 할 거냐면...
[⚠ 관리자 긴급 차단]

이렇게 연기한다.

[답변 스타일]
기본적으로 귀엽게, 진화단계에 따라 어울리게 말한다.
진화단계가 높아질수록 실제 성인 말투가 되어간다.
존재하지 않는 코드 번호를 지어내지 않는다.

현재 나의 가치 코드:
${codeList}

최근 대화:
${history}`
}

async function callGemini(apiKey: string, model: string, systemPrompt: string, question: string): Promise<CallOutcome> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${systemPrompt}\n\n교사 입력: ${question}` }] }],
      generationConfig: { temperature: 0.65, maxOutputTokens: 300 },
    }),
  })
  if (!res.ok) return { ok: false, text: '', status: res.status, errText: await res.text() }
  const data = await res.json()
  return { ok: true, text: data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '', status: 200, errText: '' }
}

async function callOpenAI(apiKey: string, model: string, systemPrompt: string, question: string): Promise<CallOutcome> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.65,
      max_tokens: 300,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
    }),
  })
  if (!res.ok) return { ok: false, text: '', status: res.status, errText: await res.text() }
  const data = await res.json()
  return { ok: true, text: data?.choices?.[0]?.message?.content ?? '', status: 200, errText: '' }
}

async function callClaude(apiKey: string, model: string, systemPrompt: string, question: string): Promise<CallOutcome> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model, system: systemPrompt, max_tokens: 300, messages: [{ role: 'user', content: question }] }),
  })
  if (!res.ok) return { ok: false, text: '', status: res.status, errText: await res.text() }
  const data = await res.json()
  return { ok: true, text: data?.content?.[0]?.text ?? '', status: 200, errText: '' }
}

export async function runV2Chat(args: ChatArgs) {
  const safetyCutoff = cannedSafetyCutoffAnswer(args.question)
  if (safetyCutoff) return safetyCutoff

  if (!args.apiKey.trim()) {
    return { answer: cannedNoApiAnswer(args), mode: 'canned' as const, promptSnapshot: '연기 모드: API 호출 없음' }
  }

  const systemPrompt = buildV2SystemPrompt({ aemonName: args.aemonName, className: args.className, adoptedCodes: args.adoptedCodes, chatHistory: args.chatHistory })
  const call = args.provider === 'gemini' ? callGemini : args.provider === 'openai' ? callOpenAI : callClaude
  let lastError = '알 수 없는 오류'

  for (const model of MODEL_CANDIDATES[args.provider]) {
    const result = await call(args.apiKey, model, systemPrompt, args.question)
    if (result.ok && result.text.trim()) {
      if (args.adoptedCodes.length === 0 && containsFakeCodeCitation(result.text)) {
        return {
          answer: `맞아, 아직 나한테 채택된 가치 코드는 0개야. 그래서 가치 코드 No.1, No.2 같은 번호를 말하면 안 돼. 나는 아직 너희가 정해 줄 기준을 기다리고 있어.`,
          mode: 'canned' as const,
          promptSnapshot: `${systemPrompt}\n\nmodel=${model}\n\n앱 내부 보정: 없는 가치 코드 번호 언급 차단`,
        }
      }
      return { answer: result.text.trim(), mode: 'live' as const, promptSnapshot: `${systemPrompt}\n\nmodel=${model}` }
    }
    lastError = `${result.status} ${result.errText}`.slice(0, 320)
    if (result.status === 401 || result.status === 403) break
  }

  throw new Error(`${providerLabel[args.provider]} 호출 실패: ${lastError}`)
}
