import { useState } from 'react'
import { KeyRound, RotateCcw, Save, ShieldAlert } from 'lucide-react'
import { Button, PageHeader, Panel } from '../components/ui'
import type { AiProvider, ConversationMode } from '../domain/types'
import { isSupabaseConfigured } from '../lib/supabase'
import { useAemon } from '../state/AemonStore'

const providerInfo: Record<AiProvider, { label: string; placeholder: string; keyUrl: string; hint: string }> = {
  gemini: {
    label: 'Google Gemini',
    placeholder: 'Gemini API 키 (AIza…)',
    keyUrl: 'https://aistudio.google.com/apikey',
    hint: '무료 할당이 넉넉해 교실용으로 추천. aistudio.google.com/apikey 에서 발급.',
  },
  openai: {
    label: 'OpenAI',
    placeholder: 'OpenAI API 키 (sk-…)',
    keyUrl: 'https://platform.openai.com/api-keys',
    hint: 'platform.openai.com/api-keys 에서 발급. 사용량만큼 과금됩니다.',
  },
  claude: {
    label: 'Anthropic Claude',
    placeholder: 'Anthropic API 키 (sk-ant-…)',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    hint: 'console.anthropic.com 에서 발급. 사용량만큼 과금됩니다.',
  },
}

export function SettingsPage() {
  const { state, updateSettings, resetDemo } = useAemon()
  const [className, setClassName] = useState(state.className)
  const [mode, setMode] = useState<ConversationMode>(state.mode)
  const [apiKey, setApiKey] = useState(state.apiKey)
  const [aiProvider, setAiProvider] = useState<AiProvider>(state.aiProvider)
  const [reminderTime, setReminderTime] = useState(state.reminderTime)
  const [saved, setSaved] = useState(false)

  const save = () => {
    updateSettings({ className, mode, apiKey, aiProvider, reminderTime })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1500)
  }

  const info = providerInfo[aiProvider]

  return (
    <div className="mx-auto max-w-4xl px-5 pb-20">
      <PageHeader title="교사 설정" eyebrow="teacher settings">
        기본 모드는 키 없이 바로 수업할 수 있고, AI 모드는 쓰는 제공자를 고르고 API 키만 넣으면 자유 입력으로 살아있는 반응을 받습니다.
      </PageHeader>

      <div className="grid gap-5">
        <Panel>
          <h2 className="text-xl font-bold text-[#EAF2F5]">대화 모드</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {[
              ['basic', '기본 모드', '키 없이 바로. 선택지로 진행.'],
              ['ai', 'AI 모드', '자유 입력 → AI가 살아있는 반응. 아래에서 키 입력.'],
            ].map(([value, title, copy]) => (
              <button
                key={value}
                className={`rounded-2xl border p-5 text-left transition ${
                  mode === value ? 'border-[#4FE0C0] bg-[#4FE0C0]/10' : 'border-white/10 bg-[#07111B]/45 hover:border-[#FFD37A]/40'
                }`}
                onClick={() => setMode(value as ConversationMode)}
                type="button"
              >
                <p className="text-lg font-bold text-[#EAF2F5]">{title}</p>
                <p className="mt-2 text-sm leading-6 text-[#8AA0B0]">{copy}</p>
              </button>
            ))}
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center gap-2">
            <KeyRound className="text-[#FFD37A]" />
            <h2 className="text-xl font-bold text-[#EAF2F5]">AI 열쇠</h2>
          </div>

          <p className="mt-4 text-sm font-semibold text-[#8AA0B0]">AI 제공자 (쓰시는 것으로 선택)</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {(Object.keys(providerInfo) as AiProvider[]).map((provider) => (
              <button
                key={provider}
                type="button"
                onClick={() => setAiProvider(provider)}
                className={`rounded-2xl border p-3 text-center text-sm font-bold transition ${
                  aiProvider === provider ? 'border-[#4FE0C0] bg-[#4FE0C0]/10 text-[#EAF2F5]' : 'border-white/10 bg-[#07111B]/45 text-[#8AA0B0] hover:border-[#FFD37A]/40'
                }`}
              >
                {providerInfo[provider].label}
              </button>
            ))}
          </div>

          <input
            className="mt-4 w-full rounded-2xl border border-white/10 bg-[#07111B]/60 px-5 py-4 font-data text-[#EAF2F5] outline-none focus:border-[#4FE0C0]/60"
            placeholder={info.placeholder}
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
          />
          <p className="mt-2 text-sm text-[#8AA0B0]">
            {info.hint}{' '}
            <a className="text-[#4FE0C0] underline" href={info.keyUrl} target="_blank" rel="noreferrer">
              키 발급 페이지 →
            </a>
          </p>

          <div className="mt-4 flex gap-3 rounded-2xl border border-[#E0476B]/30 bg-[#E0476B]/10 p-4 text-[#F4B8C5]">
            <ShieldAlert className="mt-1 shrink-0" size={20} />
            <p className="text-sm leading-6">
              키는 교사 기기(브라우저)에만 저장되어 해당 제공자로 직접 전송됩니다. 학생 실명·개인정보는 입력하지 마세요. 무료 키는 대화가 모델 학습에 쓰일 수 있습니다.
            </p>
          </div>
        </Panel>

        <Panel className="grid gap-5 md:grid-cols-2">
          <label>
            <span className="text-sm font-semibold text-[#8AA0B0]">우리 반 이름</span>
            <input className="mt-2 w-full rounded-2xl border border-white/10 bg-[#07111B]/60 px-5 py-4 text-[#EAF2F5]" value={className} onChange={(event) => setClassName(event.target.value)} />
          </label>
          <label>
            <span className="text-sm font-semibold text-[#8AA0B0]">대화 알림 시간</span>
            <input className="mt-2 w-full rounded-2xl border border-white/10 bg-[#07111B]/60 px-5 py-4 text-[#EAF2F5]" type="time" value={reminderTime} onChange={(event) => setReminderTime(event.target.value)} />
          </label>
        </Panel>

        <Panel className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-bold text-[#EAF2F5]">Supabase 연결 상태</p>
            <p className="mt-1 text-sm text-[#8AA0B0]">{isSupabaseConfigured ? '환경변수가 설정되어 있습니다.' : '.env에 Supabase URL/Anon Key를 넣으면 연결됩니다.'}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={resetDemo}>
              <RotateCcw size={18} />
              데모 초기화
            </Button>
            <Button onClick={save}>
              <Save size={18} />
              {saved ? '저장됨' : '저장'}
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  )
}
