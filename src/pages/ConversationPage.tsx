import { useState } from 'react'
import { AlertTriangle, KeyRound, Send } from 'lucide-react'
import { Button, Panel } from '../components/ui'
import type { AiProvider } from '../domain/types'
import { providerLabel, runV2Chat } from '../lib/v2Chat'
import { useV2 } from '../state/V2Store'

export function ConversationPage() {
  const { state, dailyLimit, updateAiSettings, addChatLog } = useV2()
  const [question, setQuestion] = useState('')
  const [apiKey, setApiKey] = useState(state.apiKey)
  const [provider, setProvider] = useState<AiProvider>(state.aiProvider)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const usageLeft = Math.max(0, dailyLimit - state.dailyUsage.count)

  const ask = async () => {
    const nextQuestion = question.trim()
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
    <div className="mx-auto max-w-5xl px-5 py-8">
      <div className="mb-5">
        <p className="font-data text-sm text-[#4FE0C0]">CHAT</p>
        <h1 className="font-display mt-2 text-5xl text-[#EAF2F5]">채팅</h1>
      </div>

      <Panel>
        <div className="grid gap-3 md:grid-cols-[180px_1fr_auto]">
          <select
            className="rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-[#EAF2F5]"
            value={provider}
            onChange={(event) => setProvider(event.target.value as AiProvider)}
          >
            <option value="openai">{providerLabel.openai}</option>
            <option value="gemini">{providerLabel.gemini}</option>
            <option value="claude">{providerLabel.claude}</option>
          </select>
          <input
            className="rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-[#EAF2F5]"
            placeholder="API 키"
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
          />
          <Button variant="secondary" onClick={() => updateAiSettings({ provider, apiKey })}>
            <KeyRound size={18} />
            저장
          </Button>
        </div>
      </Panel>

      <Panel className="mt-5">
        <div className="grid max-h-[58vh] min-h-[360px] gap-3 overflow-auto pr-1">
          {state.chatLogs.length === 0 ? <p className="self-center text-center text-[#8AA0B0]">아직 대화가 없습니다.</p> : null}
          {state.chatLogs.map((log) => (
            <article key={log.id} className="grid gap-2">
              <p className="justify-self-end rounded-2xl bg-[#1E3A54] px-4 py-3 leading-7 text-[#EAF2F5]">교사: {log.question}</p>
              <p className="justify-self-start whitespace-pre-wrap rounded-2xl bg-[#FFD37A]/10 px-4 py-3 leading-7 text-[#FFE6AE]">
                {state.aemonName || '에아몬'}: {log.answer}
              </p>
            </article>
          ))}
        </div>

        {error ? (
          <p className="mt-4 flex items-start gap-2 rounded-2xl border border-[#E0476B]/30 bg-[#E0476B]/10 px-4 py-3 text-sm leading-6 text-[#FFD7DE]">
            <AlertTriangle className="mt-0.5 shrink-0" size={17} />
            {error}
          </p>
        ) : null}

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <textarea
            className="min-h-24 resize-none rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-lg leading-8 text-[#EAF2F5]"
            placeholder="메시지를 입력하세요."
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
          />
          <Button disabled={!question.trim() || isLoading || usageLeft <= 0} onClick={() => void ask()}>
            <Send size={18} />
            {isLoading ? '응답 중' : '보내기'}
          </Button>
        </div>
      </Panel>
    </div>
  )
}
