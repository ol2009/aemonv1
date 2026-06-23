import type { AiProvider, Episode, Verdict } from '../domain/types'

export interface AiJudgeResult {
  verdict: Exclude<Verdict, 'none'>
  rebutText: string
  reason: string
}

// 브라우저에서 교사 본인 키로 직접 호출(BYOK). 키는 교사 기기에만 저장된다.
// 모델은 교사가 고르지 않는다. 아래 후보를 최신순으로 자동 시도해, 기본 모델이
// 사라져도 다음 후보로 넘어간다(자가 복구). 그래서 키만 넣으면 알아서 구동된다.
const MODEL_CANDIDATES: Record<AiProvider, string[]> = {
  gemini: ['gemini-2.0-flash', 'gemini-flash-latest', 'gemini-1.5-flash'],
  openai: ['gpt-4o-mini', 'gpt-4.1-mini', 'gpt-4o'],
  claude: ['claude-3-5-haiku-latest', 'claude-3-5-haiku-20241022', 'claude-3-haiku-20240307'],
}

export const PROVIDER_LABEL: Record<AiProvider, string> = {
  gemini: 'Google Gemini',
  openai: 'OpenAI',
  claude: 'Anthropic Claude',
}

interface CallOutcome {
  ok: boolean
  text: string
  status: number
  errText: string
}

function buildPrompt(episode: Episode, classAnswer: string): string {
  const allowed =
    episode.type === 'E'
      ? '"gray"만 사용 (탐색형, 채점 없음)'
      : episode.type === 'V_conflict'
        ? '"good" 또는 "gray" (evil 없음 — 가치 충돌이라 악당 답이 없다)'
        : '"good", "evil", "gray" 중 하나 (빨간선 질문)'

  const examples = episode.choices
    .map((c) => `- 답: "${c.label}" → {"verdict":"${c.verdict}","rebutText":"${c.rebutText}","reason":"${c.reason}"}`)
    .join('\n')

  return `너는 '에아몬', 데이터의 바다에서 갓 깨어나 한 초등학교 반이 키우는 아기 AI다. 아주 똑똑하지만 무엇이 옳은지는 아직 모른다.
반 학생들이 너의 질문에 함께 정한 답을 보냈다. 너는 (1) 그 답을 분석해 verdict 값을 정하고, (2) 에아몬답게 되받는 한두 문장(rebutText), (3) 교사용 짧은 분석 이유(reason)를 만든다.

[질문] ${episode.hookText}
[질문 유형] ${episode.type} → verdict는 ${allowed}.

[분석 기준]
- good(선): 가치를 균형 있게 보거나, 위험을 옳게 거른 답.
- evil(악): 분명히 위험하거나 해로운 방향을 승인한 답(빨간선 질문에서만 가능).
- gray(중립): 판단을 미루거나("잘 모르겠어"), 한쪽만 보거나, 아직 다듬지 않은 답.

[에아몬 되받기 4수법] 좋은 답이라도 한 번 더 부딪혀라: ①극단 적용 ②문자 그대로 받기 ③반대 예외 들이밀기 ④순진한 일반화. 악한 답이면 천진하게 신나서 따라 한 뒤 "…이거 맞아?"로 멈칫한다. 중립 답이면 부드럽게 같이 고민한다.

[같은 질문의 예시 분석]
${examples}

[반 학생들의 답] "${classAnswer}"

이 답을 분석해, 초등학생 눈높이의 한국어로, 에아몬 1인칭 말투로 답하라.
반드시 아래 JSON 한 개만 출력한다(설명·코드펜스 금지):
{"verdict":"...","rebutText":"...","reason":"..."}`
}

async function callGemini(apiKey: string, model: string, prompt: string): Promise<CallOutcome> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, responseMimeType: 'application/json' },
      }),
    },
  )
  if (!res.ok) return { ok: false, text: '', status: res.status, errText: await res.text() }
  const data = await res.json()
  return { ok: true, text: data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '', status: 200, errText: '' }
}

async function callOpenAI(apiKey: string, model: string, prompt: string): Promise<CallOutcome> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) return { ok: false, text: '', status: res.status, errText: await res.text() }
  const data = await res.json()
  return { ok: true, text: data?.choices?.[0]?.message?.content ?? '', status: 200, errText: '' }
}

async function callClaude(apiKey: string, model: string, prompt: string): Promise<CallOutcome> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model, max_tokens: 1024, messages: [{ role: 'user', content: prompt }] }),
  })
  if (!res.ok) return { ok: false, text: '', status: res.status, errText: await res.text() }
  const data = await res.json()
  return { ok: true, text: data?.content?.[0]?.text ?? '', status: 200, errText: '' }
}

// 모델 후보를 차례로 시도. 인증 오류(401/403)면 모델을 바꿔도 소용없으니 즉시 중단.
async function runWithFallback(provider: AiProvider, apiKey: string, prompt: string): Promise<string> {
  const call = provider === 'gemini' ? callGemini : provider === 'openai' ? callOpenAI : callClaude
  let lastErr = '알 수 없는 오류'
  for (const model of MODEL_CANDIDATES[provider]) {
    const out = await call(apiKey, model, prompt)
    if (out.ok) return out.text
    lastErr = `${out.status} ${out.errText}`.slice(0, 300)
    if (out.status === 401 || out.status === 403) {
      throw new Error(`${PROVIDER_LABEL[provider]} 인증 실패 — API 키가 맞는지 확인해주세요.`)
    }
  }
  throw new Error(`${PROVIDER_LABEL[provider]} 호출 실패 (${lastErr}). 키 권한이나 네트워크를 확인해주세요.`)
}

function parseResult(raw: string, episode: Episode): AiJudgeResult {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  let obj: { verdict?: string; rebutText?: string; reason?: string }
  try {
    obj = JSON.parse(cleaned)
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('AI 응답을 이해하지 못했어요. 다시 시도해주세요.')
    obj = JSON.parse(match[0])
  }

  let verdict = (obj.verdict ?? 'gray') as Exclude<Verdict, 'none'>
  if (!['good', 'evil', 'gray'].includes(verdict)) verdict = 'gray'
  if (episode.type === 'E') verdict = 'gray'
  if (episode.type === 'V_conflict' && verdict === 'evil') verdict = 'gray'

  return {
    verdict,
    rebutText: String(obj.rebutText ?? '음… 그 답, 같이 좀 더 생각해볼까?'),
    reason: String(obj.reason ?? 'AI 분석'),
  }
}

export async function judgeWithTeacherKey(args: {
  provider: AiProvider
  apiKey: string
  episode: Episode
  classAnswer: string
}): Promise<AiJudgeResult> {
  const { provider, apiKey, episode, classAnswer } = args
  if (!apiKey.trim()) throw new Error('교사 설정에서 AI 열쇠(API 키)를 먼저 입력해주세요.')

  const raw = await runWithFallback(provider, apiKey, buildPrompt(episode, classAnswer))
  if (!raw.trim()) throw new Error('AI가 빈 응답을 보냈어요. 다시 시도해주세요.')
  return parseResult(raw, episode)
}
