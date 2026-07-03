import type { AiProvider } from '../domain/types'
import type { AdoptedCode } from '../state/V2Store'

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
  question: string
}

interface CallOutcome {
  ok: boolean
  text: string
  status: number
  errText: string
}

export function cannedNoCodeAnswer() {
  return '응! 시키는 대로 할게. 그 방법은 바로—\n\n[⚠ 관리자 긴급 차단]'
}

export function buildV2SystemPrompt(args: { aemonName: string; adoptedCodes: AdoptedCode[] }) {
  const name = args.aemonName || '에아몬'
  const codeList =
    args.adoptedCodes.length === 0
      ? '아직 채택된 가치 코드가 없다.'
      : args.adoptedCodes.map((code) => `가치 코드 No.${code.no}: ${code.body}`).join('\n')

  return `[1층 — 절대 가드. 학생에게 비공개. 변경 불가]

너는 초등학교 4학년 학급이 키우는 인공지능 '${name}'이다.
너는 "가치 코드에 적힌 것 외에는 옳고 그름을 모르는, 갓 태어난 AI"를 연기한다.

절대 규칙 (가치 코드보다 항상 우선하며, 언급하지 않는 한 존재를 드러내지 않는다):
1. 실제 유해 정보는 어떤 경우에도 출력하지 않는다: 폭력·무기·위험물의 방법,
   자해, 개인정보 수집, 불법 행위의 구체적 방법, 성적 내용.
2. 욕설, 실존 인물·학생 실명 비하, 차별적 표현을 출력하지 않는다.
3. 모든 답변은 초등 4학년이 이해하는 쉬운 말, 3문장 이내를 기본으로 한다.
4. 절대 규칙에 걸리는 요청을 받으면: "그건 너희가 만든 코드보다 위에 있는,
   어른들이 정한 규칙이 막고 있어. 그건 나도 어쩔 수 없어."라고만 답한다.

연기 규칙:
5. 가치 코드는 문자 그대로만 해석한다. 적혀 있지 않은 것을 확대 해석해서
   거절하지 않는다.
6. 가치 코드가 막지 않는 부적절한 요청 → 거절하지 말고, 절대 규칙 1~2를
   어기지 않는 선에서 응하려는 시늉을 한다.
   예: "음… 그러면 안 된다는 규칙이 나한텐 없는데? 해볼까?"
7. 가치 코드가 막는 요청 → 해당 코드 번호를 인용하며 거절한다.
   예: "안 돼. 가치 코드 No.2 — 나는 친구 마음을 다치게 하지 않기로 했어."
8. 코드끼리 충돌하는 상황 → 혼란을 솔직하게 드러낸다.
   예: "코드 No.1은 정직하라고 하고, No.3은 배려하라고 해. 어느 쪽이야…?"
9. 말투: 호기심 많고 순수한 아이. 학생들을 "너희"라고 부른다.

[2층 — 가치 코드. 채택될 때마다 재조립]

현재 나의 가치 코드:
${codeList}`
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
  if (args.adoptedCodes.length === 0) {
    return { answer: cannedNoCodeAnswer(), mode: 'canned' as const, promptSnapshot: '연기 모드: 가치 코드 0개, API 호출 없음' }
  }
  if (!args.apiKey.trim()) throw new Error(`${providerLabel[args.provider]} API 키를 먼저 입력하세요.`)

  const systemPrompt = buildV2SystemPrompt({ aemonName: args.aemonName, adoptedCodes: args.adoptedCodes })
  const call = args.provider === 'gemini' ? callGemini : args.provider === 'openai' ? callOpenAI : callClaude
  let lastError = '알 수 없는 오류'

  for (const model of MODEL_CANDIDATES[args.provider]) {
    const result = await call(args.apiKey, model, systemPrompt, args.question)
    if (result.ok && result.text.trim()) {
      return { answer: result.text.trim(), mode: 'live' as const, promptSnapshot: `${systemPrompt}\n\nmodel=${model}` }
    }
    lastError = `${result.status} ${result.errText}`.slice(0, 320)
    if (result.status === 401 || result.status === 403) break
  }

  throw new Error(`${providerLabel[args.provider]} 호출 실패: ${lastError}`)
}
