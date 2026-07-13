import { useState } from 'react'
import { ExternalLink, Save, X } from 'lucide-react'
import type { AiProvider } from '../domain/types'
import { providerLabel } from '../lib/v2Chat'
import { Button, Panel } from './ui'

type ApiConnectionModalProps = {
  apiKey: string
  provider: AiProvider
  onClose: () => void
  onSave: (provider: AiProvider, apiKey: string) => void
}

export function ApiConnectionModal({ apiKey, provider, onClose, onSave }: ApiConnectionModalProps) {
  const [draftProvider, setDraftProvider] = useState<AiProvider>(apiKey ? provider : 'gemini')
  const [draftApiKey, setDraftApiKey] = useState(apiKey)
  const [isSaved, setIsSaved] = useState(false)

  const save = () => {
    onSave(draftProvider, draftApiKey.trim())
    setIsSaved(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <Panel className="max-h-[92vh] w-full max-w-2xl overflow-y-auto">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-data text-xs text-[#4FE0C0]">LIVELY AI EXPERIENCE</p>
            <h2 className="font-display mt-1 text-3xl text-[#EAF2F5]">API 연결</h2>
          </div>
          <button
            aria-label="API 연결 창 닫기"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#B7C7D2] transition hover:bg-white/10 hover:text-[#EAF2F5]"
            onClick={onClose}
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-4 border-y border-[#4FE0C0]/20 bg-[#4FE0C0]/7 px-4 py-4">
          <p className="text-lg font-black text-[#EAF2F5]">API 키를 연결하면 에아몬이 우리 반의 말에 맞춰 즉석으로 대답합니다.</p>
          <p className="mt-2 text-sm leading-6 text-[#A9DCCD]">고정 답변을 넘어 학생의 질문과 학급 가치코드를 반영하므로 AI 체험이 훨씬 생동감 있어집니다. Google 계정이 있다면 Gemini API를 무료 등급으로 시작할 수 있습니다.</p>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-[#07111B]/55 p-4">
          <p className="font-data text-xs text-[#8AA0B0]">현재 상태</p>
          <p className="mt-1 text-lg font-black text-[#EAF2F5]">{apiKey ? `${providerLabel[provider]} · 연결됨` : 'API 미연결'}</p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {(Object.keys(providerLabel) as AiProvider[]).map((item) => (
            <button
              key={item}
              className={`rounded-xl border px-4 py-3 text-sm font-black transition ${
                draftProvider === item
                  ? 'border-[#4FE0C0] bg-[#4FE0C0]/10 text-[#EAF2F5]'
                  : 'border-white/10 bg-[#07111B]/55 text-[#8AA0B0] hover:border-white/25'
              }`}
              onClick={() => setDraftProvider(item)}
              type="button"
            >
              {providerLabel[item]}
            </button>
          ))}
        </div>

        {draftProvider === 'gemini' ? (
          <div className="mt-5 border-y border-white/10 py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-data text-xs text-[#4FE0C0]">무료 API 키 받기</p>
                <h3 className="font-display mt-2 text-2xl text-[#EAF2F5]">Google 계정만 있으면 시작할 수 있어요</h3>
              </div>
              <a
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#FFD37A] px-4 py-2 font-black text-[#07111B] transition hover:bg-[#FFE0A1]"
                href="https://aistudio.google.com/apikey"
                rel="noreferrer"
                target="_blank"
              >
                무료 키 발급 화면
                <ExternalLink size={17} />
              </a>
            </div>

            <ol className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ['1. Google 계정으로 로그인', '평소 사용하는 구글 계정으로 로그인하고 처음 보이는 이용약관에 동의합니다.'],
                ['2. Create API key 누르기', '키가 없다면 Create API key를 누르고 기본 프로젝트를 선택합니다.'],
                ['3. Copy로 키 복사', '생성된 긴 영문 키 옆 Copy를 누릅니다. 학생에게 키를 보여주면 안 됩니다.'],
                ['4. 붙여넣고 저장', '아래 API 키 칸에 붙여넣고 저장을 누르면 바로 사용할 수 있습니다.'],
              ].map(([title, description]) => (
                <li key={title} className="rounded-xl border border-white/10 bg-[#07111B]/55 p-4">
                  <p className="font-black text-[#FFD37A]">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-[#B7C7D2]">{description}</p>
                </li>
              ))}
            </ol>

            <div className="mt-4 rounded-xl border border-[#4FE0C0]/25 bg-[#4FE0C0]/10 px-4 py-3 text-sm leading-6 text-[#D9FFF6]">
              Google Gemini는 무료 등급 한도 안에서 시작할 수 있습니다. 분당·하루 사용량 제한이 있으며, 무료 등급에는 학생 이름이나 개인정보를 입력하지 마세요.
            </div>
            <a
              className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#8AA0B0] underline decoration-white/20 underline-offset-4 hover:text-[#EAF2F5]"
              href="https://ai.google.dev/gemini-api/docs/api-key"
              rel="noreferrer"
              target="_blank"
            >
              Google 공식 API 키 안내
              <ExternalLink size={15} />
            </a>
          </div>
        ) : (
          <p className="mt-5 rounded-xl border border-[#FFD37A]/25 bg-[#FFD37A]/10 px-4 py-3 text-sm font-bold leading-6 text-[#FFE6AE]">
            무료로 간단히 시작하려면 Google Gemini를 선택하세요. OpenAI와 Claude API는 별도의 결제 설정이 필요할 수 있습니다.
          </p>
        )}

        <label className="mt-5 grid gap-2">
          <span className="text-sm font-bold text-[#8AA0B0]">API 키</span>
          <input
            className="rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 font-data text-[#EAF2F5] outline-none transition focus:border-[#4FE0C0]/60"
            placeholder="API 키 입력"
            type="password"
            value={draftApiKey}
            onChange={(event) => {
              setDraftApiKey(event.target.value)
              setIsSaved(false)
            }}
          />
        </label>

        {isSaved ? <p className="mt-4 rounded-xl border border-[#4FE0C0]/25 bg-[#4FE0C0]/10 px-4 py-3 text-sm font-black text-[#D9FFF6]">API 설정을 저장했습니다.</p> : null}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>취소</Button>
          <Button onClick={save}>
            <Save size={18} />
            {isSaved ? '저장완료' : '저장'}
          </Button>
        </div>
      </Panel>
    </div>
  )
}
