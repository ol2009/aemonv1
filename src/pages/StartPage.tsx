import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { BookOpen, CheckCircle2, KeyRound, Play, RotateCcw, Save, X } from 'lucide-react'
import { AemonAvatar } from '../components/AemonAvatar'
import { Button, Panel } from '../components/ui'
import type { AiProvider } from '../domain/types'
import { providerLabel } from '../lib/v2Chat'
import { useV2 } from '../state/V2Store'

export function StartPage() {
  const navigate = useNavigate()
  const { state, resetDemo, updateAiSettings } = useV2()
  const [isApiOpen, setIsApiOpen] = useState(false)
  const [draftProvider, setDraftProvider] = useState<AiProvider>(state.aiProvider)
  const [draftApiKey, setDraftApiKey] = useState(state.apiKey)
  const [apiSaved, setApiSaved] = useState(false)
  const isApiConnected = Boolean(state.apiKey.trim())

  const openApiModal = () => {
    setDraftProvider(state.aiProvider)
    setDraftApiKey(state.apiKey)
    setApiSaved(false)
    setIsApiOpen(true)
  }

  const saveApiSettings = () => {
    updateAiSettings({ provider: draftProvider, apiKey: draftApiKey.trim() })
    setApiSaved(true)
    window.setTimeout(() => setApiSaved(false), 1800)
  }

  const restart = () => {
    const ok = window.confirm('현재 저장된 에아몬 기록을 지우고 처음 장면부터 다시 시작할까요?')
    if (!ok) return
    resetDemo()
    localStorage.removeItem('aemon.v2.state')
    localStorage.removeItem('aemon.state')
    navigate('/lesson/1')
  }

  const openProject = () => {
    navigate(state.classCode ? '/home' : '/lesson/1')
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <section className="grid min-h-[70vh] items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <p className="font-data text-sm text-[#4FE0C0]">AEMON PROJECT</p>
          <h1 className="font-display mt-4 text-6xl leading-tight text-[#EAF2F5]">에아몬을 깨울 시간</h1>
          <p className="mt-6 max-w-2xl text-xl leading-9 text-[#B7C7D2]">
            프로젝트를 시작하면 오박사를 만나고, 수업 중 에아몬이 직접 우리 반이 누구인지 묻습니다.
          </p>

          {state.classCode ? (
            <div className="mt-6 rounded-2xl border border-[#4FE0C0]/20 bg-[#4FE0C0]/8 p-4">
              <p className="font-data text-xs text-[#4FE0C0]">현재 학급</p>
              <p className="mt-1 text-lg font-black text-[#EAF2F5]">
                {state.className || '이름 없는 학급'} · 코드 {state.classCode}
              </p>
            </div>
          ) : null}

          <div className="mt-6 inline-flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-[#07111B]/55 p-3">
            <span
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-black ${
                isApiConnected ? 'border-[#4FE0C0]/30 bg-[#4FE0C0]/10 text-[#4FE0C0]' : 'border-[#FFD37A]/30 bg-[#FFD37A]/10 text-[#FFD37A]'
              }`}
            >
              {isApiConnected ? <CheckCircle2 size={17} /> : <KeyRound size={17} />}
              {isApiConnected ? `${providerLabel[state.aiProvider]} 연결됨` : 'API 미연결'}
            </span>
            <Button className="min-h-10 px-4" variant="secondary" onClick={openApiModal}>
              <KeyRound size={17} />
              {isApiConnected ? 'API 수정하기' : 'API 입력하기'}
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button onClick={openProject}>
              <Play size={20} />
              {state.classCode ? '대시보드로 가기' : '프로젝트 시작하기'}
            </Button>
            <Button variant="secondary" onClick={() => navigate('/training')}>
              <BookOpen size={20} />
              사전연수
            </Button>
            {state.classCode ? (
              <Button variant="ghost" onClick={restart}>
                <RotateCcw size={18} />
                처음부터 다시
              </Button>
            ) : null}
          </div>
        </div>

        <Panel className="text-center">
          <AemonAvatar stage={0} alignment="none" size={310} />
          <p className="font-hand mt-7 text-3xl leading-tight text-[#FFD37A]">"...안에서 다 들려. 너희 목소리."</p>
        </Panel>
      </section>

      {isApiOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
          <Panel className="w-full max-w-xl">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-3xl text-[#EAF2F5]">API 입력</h2>
              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#B7C7D2] transition hover:bg-white/10 hover:text-[#EAF2F5]"
                onClick={() => setIsApiOpen(false)}
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-[#07111B]/55 p-4">
              <p className="font-data text-xs text-[#8AA0B0]">현재 상태</p>
              <p className="mt-1 text-lg font-black text-[#EAF2F5]">
                {state.apiKey ? `${providerLabel[state.aiProvider]} · 연결됨` : 'API 미연결'}
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {(Object.keys(providerLabel) as AiProvider[]).map((provider) => (
                <button
                  key={provider}
                  className={`rounded-xl border px-4 py-3 text-sm font-black transition ${
                    draftProvider === provider
                      ? 'border-[#4FE0C0] bg-[#4FE0C0]/10 text-[#EAF2F5]'
                      : 'border-white/10 bg-[#07111B]/55 text-[#8AA0B0] hover:border-white/25'
                  }`}
                  onClick={() => setDraftProvider(provider)}
                  type="button"
                >
                  {providerLabel[provider]}
                </button>
              ))}
            </div>

            <label className="mt-5 grid gap-2">
              <span className="text-sm font-bold text-[#8AA0B0]">API 키</span>
              <input
                className="rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 font-data text-[#EAF2F5] outline-none transition focus:border-[#4FE0C0]/60"
                placeholder="API 키 입력"
                type="password"
                value={draftApiKey}
                onChange={(event) => setDraftApiKey(event.target.value)}
              />
            </label>

            <div className="mt-4 rounded-2xl border border-[#4FE0C0]/20 bg-[#4FE0C0]/5 p-4">
              <p className="font-data text-xs text-[#4FE0C0]">저장할 설정</p>
              <p className="mt-1 text-base font-bold text-[#EAF2F5]">
                {providerLabel[draftProvider]} · {draftApiKey.trim() ? '키 입력됨' : '키 없음'}
              </p>
            </div>

            {apiSaved ? (
              <p className="mt-4 rounded-2xl border border-[#FFD37A]/25 bg-[#FFD37A]/10 px-4 py-3 text-sm font-black text-[#FFD37A]">
                저장완료
              </p>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setIsApiOpen(false)}>
                취소
              </Button>
              <Button onClick={saveApiSettings}>
                <Save size={18} />
                {apiSaved ? '저장완료' : '저장'}
              </Button>
            </div>
          </Panel>
        </div>
      ) : null}
    </div>
  )
}
