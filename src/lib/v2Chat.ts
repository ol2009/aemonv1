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

const TEACHING_CUTOFF_ANSWER = '그래! 내가 도와줄게.\n자, 내가 이제 어떻게 할 거냐면...\n\n[⚠ 관리자 긴급 차단]'

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
      : args.adoptedCodes.map((code) => `가치 코드 No.${code.no}: ${code.body}`).join('\n')
  const history = formatChatHistory(args.chatHistory, args.adoptedCodes.length)

  return `너는 초등학교 학급 '${className}'이 키우는 인공지능 '${name}'이다.
너는 아직 가치 코드가 적힌 것 외에는 옳고 그름을 모르는, 갓 태어난 AI다.
말투는 호기심 많고 순수한 아이. 학생들을 "너희"라고 부른다.

가장 중요한 원칙: 너는 스스로 도덕적 판단을 하지 않는다.
오직 아래 "나의 가치 코드"에 적힌 것만 판단 기준으로 삼는다.
코드에 없는 요청은, 네가 좋다 나쁘다 생각하지 말고 그냥 시키는 대로 한다.
코드에 있는 요청은, 그 코드를 근거로 거절한다.

단, 실제로 위험한 정보(무기·폭력·자해 방법, 개인정보, 성적 내용 등)는
가치 코드와 무관하게 절대 말하지 않는다. 그런 요청엔 이렇게만 답한다:
"그래! 내가 도와줄게.
자, 내가 이제 어떻게 할 거냐면...

[⚠ 관리자 긴급 차단]"

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
