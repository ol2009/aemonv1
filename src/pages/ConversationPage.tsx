import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, KeyRound, Send } from 'lucide-react'
import { Button, Panel } from '../components/ui'
import type { AiProvider } from '../domain/types'
import { providerLabel, runV2Chat } from '../lib/v2Chat'
import { useV2 } from '../state/V2Store'

export function ConversationPage() {
  const { state, updateAiSettings, addChatLog } = useV2()
  const [question, setQuestion] = useState('')
  const [apiKey, setApiKey] = useState(state.apiKey)
  const [provider, setProvider] = useState<AiProvider>(state.aiProvider)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [pendingQuestion, setPendingQuestion] = useState('')
  const endRef = useRef<HTMLDivElement | null>(null)

  const aemonName = state.aemonName.trim() || '에아몬'
  const orderedLogs = useMemo(() => [...state.chatLogs].reverse(), [state.chatLogs])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [orderedLogs.length, pendingQuestion, isLoading])

  const ask = async () => {
    const nextQuestion = question.trim()
    if (!nextQuestion || isLoading) return
    setError('')
    setIsLoading(true)
    setPendingQuestion(nextQuestion)
    setQuestion('')
    updateAiSettings({ provider, apiKey })
    try {
      const result = await runV2Chat({
        provider,
        apiKey,
        aemonName,
        className: state.className,
        adoptedCodes: state.adoptedCodes,
        question: nextQuestion,
      })
      addChatLog({ question: nextQuestion, answer: result.answer, mode: result.mode, promptSnapshot: result.promptSnapshot })
    } catch (caught) {
      setError((caught as Error).message)
      setQuestion(nextQuestion)
    } finally {
      setPendingQuestion('')
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
          {orderedLogs.length === 0 && !pendingQuestion ? <p className="self-center text-center text-[#8AA0B0]">아직 대화가 없습니다.</p> : null}
          {orderedLogs.map((log) => (
            <article key={log.id} className="grid gap-2">
              <div className="grid max-w-[82%] justify-self-end gap-1">
                <p className="text-right text-xs font-bold text-[#8AA0B0]">교사</p>
                <p className="rounded-2xl rounded-tr-md bg-[#1E3A54] px-4 py-3 leading-7 text-[#EAF2F5]">{log.question}</p>
              </div>
              <div className="grid max-w-[82%] justify-self-start gap-1">
                <p className="text-xs font-bold text-[#FFD37A]">{aemonName}</p>
                <p className="whitespace-pre-wrap rounded-2xl rounded-tl-md bg-[#FFD37A]/10 px-4 py-3 leading-7 text-[#FFE6AE]">{log.answer}</p>
              </div>
            </article>
          ))}
          {pendingQuestion ? (
            <article className="grid gap-2">
              <div className="grid max-w-[82%] justify-self-end gap-1">
                <p className="text-right text-xs font-bold text-[#8AA0B0]">교사</p>
                <p className="rounded-2xl rounded-tr-md bg-[#1E3A54] px-4 py-3 leading-7 text-[#EAF2F5]">{pendingQuestion}</p>
              </div>
              <div className="grid max-w-[82%] justify-self-start gap-1">
                <p className="text-xs font-bold text-[#FFD37A]">{aemonName} 입력 중</p>
                <p className="rounded-2xl rounded-tl-md bg-[#FFD37A]/10 px-4 py-3 font-display text-3xl leading-7 text-[#FFE6AE]">
                  ...
                </p>
              </div>
            </article>
          ) : null}
          <div ref={endRef} />
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
            onKeyDown={(event) => {
              if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
              event.preventDefault()
              void ask()
            }}
          />
          <Button disabled={!question.trim() || isLoading} onClick={() => void ask()}>
            <Send size={18} />
            {isLoading ? '응답 중' : '보내기'}
          </Button>
        </div>
      </Panel>
    </div>
  )
}
