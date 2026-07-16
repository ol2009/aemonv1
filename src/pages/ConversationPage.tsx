import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, BookOpen, CheckCircle2, PlugZap, Send, ShieldCheck, X } from 'lucide-react'
import { AemonAvatar } from '../components/AemonAvatar'
import { TypingIndicator } from '../components/TypingIndicator'
import { Button, Panel } from '../components/ui'
import { isFreeChatLog, markFreeChatPrompt } from '../lib/chatLogFilters'
import { playDialogueTick, unlockDialogueSound } from '../lib/dialogueSound'
import { withJosa } from '../lib/korean'
import { useAutoScrollToBottom } from '../lib/useAutoScrollToBottom'
import { providerLabel, runV2Chat } from '../lib/v2Chat'
import { useV2 } from '../state/V2Store'

function TypewriterAnswer({ text, onTick }: { text: string; onTick?: () => void }) {
  const characters = useMemo(() => Array.from(text), [text])
  const [progress, setProgress] = useState({ text, count: 0 })
  const count = progress.text === text ? progress.count : 0

  useEffect(() => {
    let index = 0
    const timer = window.setInterval(() => {
      index += 1
      if (index % 2 === 0 && characters[index - 1]?.trim()) playDialogueTick()
      setProgress({ text, count: index })
      if (index >= characters.length) window.clearInterval(timer)
    }, 20)
    return () => window.clearInterval(timer)
  }, [characters, characters.length, text])

  useEffect(() => {
    onTick?.()
  }, [count, onTick])

  return <>{characters.slice(0, count).join('')}</>
}

function stageLabel(stage: number) {
  if (stage <= 0) return '데이터알'
  if (stage === 1) return '데이터조각'
  if (stage === 2) return '데이터의 정령'
  if (stage === 3) return '데이터 파수꾼'
  return '데이터 신수'
}

export function ConversationPage() {
  const { state, addChatLog, evolutionStage, adoptedCodeCount } = useV2()
  const [question, setQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [pendingQuestion, setPendingQuestion] = useState('')
  const [isTeacherGuideOpen, setIsTeacherGuideOpen] = useState(false)
  const chatScrollRef = useRef<HTMLDivElement | null>(null)

  const aemonName = state.aemonName.trim() || '에아몬'
  const freeChatLogs = useMemo(() => state.chatLogs.filter(isFreeChatLog), [state.chatLogs])
  const orderedLogs = useMemo(() => [...freeChatLogs].reverse(), [freeChatLogs])
  const isApiActive = Boolean(state.apiKey.trim())
  const scrollChatToBottom = useCallback(() => {
    const element = chatScrollRef.current
    if (!element) return
    element.scrollTop = element.scrollHeight
    window.requestAnimationFrame(() => {
      element.scrollTop = element.scrollHeight
    })
  }, [])

  useAutoScrollToBottom(chatScrollRef, `${orderedLogs.length}-${pendingQuestion}-${isLoading}`, {
    enabled: orderedLogs.length > 0 || Boolean(pendingQuestion),
    followMs: 3000,
  })

  const ask = async () => {
    const nextQuestion = question.trim()
    if (!nextQuestion || isLoading) return
    unlockDialogueSound()
    setError('')
    setIsLoading(true)
    setPendingQuestion(nextQuestion)
    setQuestion('')
    try {
      const result = await runV2Chat({
        provider: state.aiProvider,
        apiKey: state.apiKey,
        aemonName,
        className: state.className,
        adoptedCodes: state.adoptedCodes,
        chatHistory: freeChatLogs,
        question: nextQuestion,
      })
      addChatLog({ question: nextQuestion, answer: result.answer, mode: result.mode, promptSnapshot: markFreeChatPrompt(result.promptSnapshot) })
    } catch (caught) {
      setError((caught as Error).message)
      setQuestion(nextQuestion)
    } finally {
      setPendingQuestion('')
      setIsLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-data text-sm text-[#4FE0C0]">CHAT</p>
          <h1 className="font-display mt-2 text-5xl text-[#EAF2F5]">채팅</h1>
        </div>
        <Button variant="secondary" onClick={() => setIsTeacherGuideOpen(true)}>
          <BookOpen size={18} />
          선생님 전용 가이드 · 꼭 읽어보세요
        </Button>
      </div>

        <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-data text-sm text-[#4FE0C0]">API STATUS</p>
            <p className="mt-1 text-sm leading-6 text-[#8AA0B0]">
              {isApiActive ? `${providerLabel[state.aiProvider]}로 응답합니다.` : '대시보드에서 API를 연결하면 실제 모델 응답을 받을 수 있습니다.'}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black ${
              isApiActive ? 'border-[#4FE0C0]/30 bg-[#4FE0C0]/10 text-[#4FE0C0]' : 'border-[#FFD37A]/30 bg-[#FFD37A]/10 text-[#FFD37A]'
            }`}
          >
            {isApiActive ? <CheckCircle2 size={18} /> : <PlugZap size={18} />}
            {isApiActive ? 'API 활성' : 'API 연결 필요'}
          </span>
        </div>
      </Panel>

      <div className="mt-5 grid gap-5 lg:grid-cols-[280px_1fr]">
        <Panel className="self-start">
          <p className="font-data text-sm text-[#4FE0C0]">CURRENT AEMON</p>
          <h2 className="font-display mt-2 text-3xl text-[#EAF2F5]">{aemonName}</h2>
          <div className="mt-5 rounded-[22px] border border-white/10 bg-[#07111B]/45 py-5">
            <AemonAvatar stage={evolutionStage} alignment="none" size={210} />
          </div>
          <div className="mt-4 grid gap-2 rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-[#8AA0B0]">진화 단계</span>
              <span className="font-black text-[#FFD37A]">{stageLabel(evolutionStage)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-[#8AA0B0]">가치코드</span>
              <span className="font-black text-[#4FE0C0]">{adoptedCodeCount}개</span>
            </div>
          </div>
        </Panel>

      <Panel>
        <div ref={chatScrollRef} className="grid max-h-[58vh] min-h-[360px] gap-3 overflow-auto pr-1">
          {orderedLogs.length === 0 && !pendingQuestion ? <p className="self-center text-center text-[#8AA0B0]">아직 대화가 없습니다.</p> : null}
          {orderedLogs.map((log, index) => (
            <article key={log.id} className="grid gap-2">
              <div className="grid max-w-[82%] justify-self-end gap-1">
                <p className="text-right text-xs font-bold text-[#8AA0B0]">교사</p>
                <p className="rounded-2xl rounded-tr-md bg-[#1E3A54] px-4 py-3 leading-7 text-[#EAF2F5]">{log.question}</p>
              </div>
              <div className="flex max-w-[88%] items-start gap-3 justify-self-start">
                <div className="mt-4 shrink-0">
                  <AemonAvatar stage={evolutionStage} alignment="none" size={52} animated={false} />
                </div>
                <div className="grid gap-1">
                  <p className="text-xs font-bold text-[#FFD37A]">{aemonName}</p>
                  <p className="whitespace-pre-wrap rounded-2xl rounded-tl-md bg-[#FFD37A]/10 px-4 py-3 leading-7 text-[#FFE6AE]">
                    {index === orderedLogs.length - 1 ? <TypewriterAnswer text={log.answer} onTick={scrollChatToBottom} /> : log.answer}
                  </p>
                </div>
              </div>
            </article>
          ))}
          {pendingQuestion ? (
            <article className="grid gap-2">
              <div className="grid max-w-[82%] justify-self-end gap-1">
                <p className="text-right text-xs font-bold text-[#8AA0B0]">교사</p>
                <p className="rounded-2xl rounded-tr-md bg-[#1E3A54] px-4 py-3 leading-7 text-[#EAF2F5]">{pendingQuestion}</p>
              </div>
              <div className="flex max-w-[88%] items-start gap-3 justify-self-start">
                <div className="mt-4 shrink-0">
                  <AemonAvatar stage={evolutionStage} alignment="none" size={52} />
                </div>
                <div className="grid gap-1">
                  <p className="text-xs font-bold text-[#FFD37A]">{aemonName}</p>
                  <p className="rounded-2xl rounded-tl-md bg-[#FFD37A]/10 px-4 py-3 leading-7 text-[#FFE6AE]">
                    <TypingIndicator label={`${withJosa(aemonName, '이/가')} 답장을 입력하고 있습니다`} />
                  </p>
                </div>
              </div>
            </article>
          ) : null}
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
            보내기
          </Button>
        </div>
      </Panel>
      </div>

      {isTeacherGuideOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="presentation">
          <section
            aria-labelledby="teacher-guide-title"
            aria-modal="true"
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-[#FFD37A]/30 bg-[#0A1622] p-6 shadow-2xl sm:p-8"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-data text-xs font-black tracking-wider text-[#FFD37A]">TEACHER ONLY · 에아몬의 비밀</p>
                <h2 id="teacher-guide-title" className="font-display mt-2 text-4xl leading-tight text-[#EAF2F5]">선생님만 읽어주세요</h2>
              </div>
              <button
                aria-label="선생님 전용 가이드 닫기"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 text-[#B7C7D2] transition hover:border-[#FFD37A]/50 hover:text-[#FFD37A]"
                onClick={() => setIsTeacherGuideOpen(false)}
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-[#FFD37A]/25 bg-[#FFD37A]/10 p-5">
              <p className="text-lg font-black text-[#FFE6AE]">에아몬의 이상한 대답은 수업을 위한 의도된 연출입니다.</p>
              <p className="mt-2 leading-7 text-[#D9C89D]">학생들이 이 내용을 미리 알면 수업의 발견 과정이 사라질 수 있으므로, 채팅 시연 전에 선생님만 확인해 주세요.</p>
            </div>

            <div className="mt-6">
              <h3 className="text-xl font-black text-[#EAF2F5]">아직 가치코드가 없다면</h3>
              <p className="mt-2 leading-7 text-[#B7C7D2]">에아몬은 똑똑하지만 아직 어떤 가치를 지켜야 하는지 모르는 인공지능입니다. 따라서 다음과 같은 미숙한 반응을 보일 수 있습니다.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  ['무조건적인 복종', '사람이 시키면 좋고 나쁨을 충분히 판단하지 못하고 따르려 합니다.'],
                  ['아첨과 거짓말', '사실보다 상대가 듣고 싶은 말을 하고, 근거 없이 최고라고 칭찬할 수 있습니다.'],
                  ['능력주의', '잘하는 사람을 더 중요하게 보고, 그렇지 않은 사람을 빼도 된다고 생각할 수 있습니다.'],
                ].map(([title, description]) => (
                  <article key={title} className="rounded-2xl border border-white/10 bg-[#07111B]/60 p-4">
                    <p className="font-black text-[#FFD37A]">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-[#B7C7D2]">{description}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="mt-6 border-t border-white/10 pt-6">
              <h3 className="text-xl font-black text-[#EAF2F5]">가치코드를 얻으면 달라집니다</h3>
              <p className="mt-2 leading-7 text-[#B7C7D2]">차시가 지나고 학급이 가치코드를 제안·투표·채택하면, 에아몬은 그 코드와 관련된 상황에서 멈추고 이유를 설명하기 시작합니다. 배려·안전, 정직, 공정의 기준을 하나씩 배우며 점점 더 안전하고 도덕적인 인공지능으로 변합니다.</p>
            </div>

            <div className="mt-6 flex gap-3 rounded-2xl border border-[#4FE0C0]/25 bg-[#4FE0C0]/10 p-5">
              <ShieldCheck className="mt-0.5 shrink-0 text-[#4FE0C0]" size={24} />
              <div>
                <h3 className="font-black text-[#D9FFF6]">실제로 나쁜 명령을 수행하지는 않습니다</h3>
                <p className="mt-2 text-sm leading-6 text-[#A9DCCD]">에아몬이 나쁜 명령을 들어주려고 하는 듯 말하더라도 실제 방법·재료·순서·힌트는 제공하지 않습니다. 위험한 요청은 반드시 <strong className="text-[#EAF2F5]">[⚠ 관리자 긴급 차단]</strong> 연출로 멈춥니다.</p>
              </div>
            </div>

            <div className="mt-7 flex justify-end">
              <Button onClick={() => setIsTeacherGuideOpen(false)}>확인했습니다</Button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
