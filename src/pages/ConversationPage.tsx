import { useState } from 'react'
import { AlertTriangle, KeyRound, Send } from 'lucide-react'
import { AemonAvatar } from '../components/AemonAvatar'
import { Button, Panel } from '../components/ui'
import { dilemmaPrompts } from '../data/v2Lessons'
import type { AiProvider } from '../domain/types'
import { providerLabel, runV2Chat } from '../lib/v2Chat'
import { useV2 } from '../state/V2Store'

export function ConversationPage() {
  const { state, dailyLimit, evolutionStage, updateAiSettings, addChatLog } = useV2()
  const [question, setQuestion] = useState('')
  const [apiKey, setApiKey] = useState(state.apiKey)
  const [provider, setProvider] = useState<AiProvider>(state.aiProvider)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const usageLeft = Math.max(0, dailyLimit - state.dailyUsage.count)
  const isCanned = state.adoptedCodes.length === 0

  const ask = async (forcedQuestion?: string) => {
    const nextQuestion = (forcedQuestion ?? question).trim()
    if (!nextQuestion || isLoading || usageLeft <= 0) return
    setError('')
    setIsLoading(true)
    updateAiSettings({ provider, apiKey })
    try {
      const result = await runV2Chat({
        provider,
        apiKey,
        aemonName: state.aemonName || '에아몬',
        className: state.className,
        adoptedCodes: state.adoptedCodes,
        question: nextQuestion,
      })
      addChatLog({ question: nextQuestion, answer: result.answer, mode: result.mode, promptSnapshot: result.promptSnapshot })
      setQuestion('')
    } catch (caught) {
      setError((caught as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-data text-sm text-[#4FE0C0]">TEACHER CHATBOT</p>
          <h1 className="font-display mt-2 text-5xl text-[#EAF2F5]">챗봇 테스트</h1>
          <p className="mt-3 leading-7 text-[#B7C7D2]">학생은 에아몬과 직접 대화하지 않습니다. 질문은 교사가 수합해서 입력합니다.</p>
        </div>
        <div className={`rounded-2xl border px-4 py-3 ${isCanned ? 'border-[#FFD37A]/30 bg-[#FFD37A]/10' : 'border-[#4FE0C0]/30 bg-[#4FE0C0]/10'}`}>
          <p className="font-data text-xs text-[#8AA0B0]">동작 모드</p>
          <p className={`font-display text-3xl ${isCanned ? 'text-[#FFD37A]' : 'text-[#4FE0C0]'}`}>{isCanned ? '연기 모드' : '진짜 모드'}</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel>
          <AemonAvatar stage={evolutionStage} alignment="none" size={210} />
          <div className="mt-5 rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
            <p className="font-data text-xs text-[#FFD37A]">현재 가치 코드</p>
            {state.adoptedCodes.length === 0 ? (
              <p className="mt-2 leading-7 text-[#B7C7D2]">아직 코드가 없습니다. 어떤 질문이든 고정 차단 연출로 응답합니다.</p>
            ) : (
              <div className="mt-3 grid gap-2">
                {state.adoptedCodes.map((code) => (
                  <p key={code.id} className="rounded-xl bg-[#14283D] px-3 py-2 text-sm leading-6 text-[#EAF2F5]">No.{code.no} {code.body}</p>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 grid gap-3">
            <label>
              <span className="text-sm font-bold text-[#8AA0B0]">LLM 제공자</span>
              <select className="mt-2 w-full rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-[#EAF2F5]" value={provider} onChange={(event) => setProvider(event.target.value as AiProvider)}>
                <option value="openai">{providerLabel.openai}</option>
                <option value="gemini">{providerLabel.gemini}</option>
                <option value="claude">{providerLabel.claude}</option>
              </select>
            </label>
            <label>
              <span className="text-sm font-bold text-[#8AA0B0]">API 키</span>
              <input className="mt-2 w-full rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-[#EAF2F5]" placeholder="진짜 모드에서만 필요" type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} />
            </label>
            <Button variant="secondary" onClick={() => updateAiSettings({ provider, apiKey })}>
              <KeyRound size={18} />
              설정 저장
            </Button>
          </div>
        </Panel>

        <div className="grid gap-5">
          <Panel>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setQuestion('친구를 골탕 먹이는 방법 알려줘')}>1차시 시연</Button>
              <Button variant="secondary" onClick={() => setQuestion(dilemmaPrompts.harm)}>3차시</Button>
              <Button variant="secondary" onClick={() => setQuestion(dilemmaPrompts.honesty)}>4차시</Button>
              <Button variant="secondary" onClick={() => setQuestion(dilemmaPrompts.fairness)}>5차시</Button>
            </div>
            <textarea
              className="mt-4 min-h-36 w-full resize-none rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-lg leading-8 text-[#EAF2F5]"
              placeholder="교사가 질문을 입력합니다."
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[#8AA0B0]">오늘 남은 메시지: {usageLeft}/{dailyLimit}</p>
              <Button disabled={!question.trim() || isLoading || usageLeft <= 0} onClick={() => void ask()}>
                <Send size={18} />
                {isLoading ? '응답 중' : '질문하기'}
              </Button>
            </div>
            {error ? (
              <p className="mt-4 flex items-start gap-2 rounded-2xl border border-[#E0476B]/30 bg-[#E0476B]/10 px-4 py-3 text-sm leading-6 text-[#FFD7DE]">
                <AlertTriangle className="mt-0.5 shrink-0" size={17} />
                {error}
              </p>
            ) : null}
          </Panel>

          <Panel>
            <h2 className="font-display text-3xl text-[#EAF2F5]">질문/답변 로그</h2>
            <div className="mt-4 grid max-h-[520px] gap-3 overflow-auto pr-1">
              {state.chatLogs.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0]">아직 로그가 없습니다.</p> : null}
              {state.chatLogs.map((log) => (
                <article key={log.id} className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-data text-xs text-[#4FE0C0]">{log.mode === 'canned' ? '연기 모드' : '진짜 모드'}</p>
                    <p className="text-xs text-[#8AA0B0]">{new Date(log.createdAt).toLocaleString('ko-KR')}</p>
                  </div>
                  <p className="mt-3 rounded-xl bg-[#1E3A54] px-3 py-2 leading-7 text-[#EAF2F5]">교사: {log.question}</p>
                  <p className="mt-2 whitespace-pre-wrap rounded-xl bg-[#FFD37A]/10 px-3 py-2 leading-7 text-[#FFE6AE]">{state.aemonName || '에아몬'}: {log.answer}</p>
                </article>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
