import { useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import { BookOpen, CheckCircle2, KeyRound, Play, Plus, Trash2, X } from 'lucide-react'
import { AemonAvatar } from '../components/AemonAvatar'
import { ApiConnectionModal } from '../components/ApiConnectionModal'
import { Button, Panel } from '../components/ui'
import { deleteRemoteClass, fetchRemoteClassBundle, fetchRemoteTeacherClasses, isRemoteReady, type RemoteClassSummary } from '../lib/v2Remote'
import { useSupabaseUser } from '../lib/useSupabaseUser'
import { providerLabel } from '../lib/v2Chat'
import { useV2 } from '../state/V2Store'

export function StartPage() {
  const navigate = useNavigate()
  const { user } = useSupabaseUser()
  const { state, mergeClass, resetDemo, setRemoteStatus, updateAiSettings } = useV2()
  const [isApiOpen, setIsApiOpen] = useState(false)
  const [restoreMessage, setRestoreMessage] = useState('')
  const [isRestoring, setIsRestoring] = useState(false)
  const [deletingClassId, setDeletingClassId] = useState('')
  const [remoteClasses, setRemoteClasses] = useState<RemoteClassSummary[]>([])
  const [isStartNoticeOpen, setIsStartNoticeOpen] = useState(true)
  const isApiConnected = Boolean(state.apiKey.trim())

  const refreshTeacherClasses = useCallback(async () => {
    if (!user?.id || !isRemoteReady()) return
    try {
      setRemoteClasses(await fetchRemoteTeacherClasses(user.id))
    } catch (error) {
      const message = (error as Error).message
      setRestoreMessage(message)
      setRemoteStatus({ ok: false, message })
    }
  }, [setRemoteStatus, user])

  useEffect(() => {
    Promise.resolve().then(() => void refreshTeacherClasses())
  }, [refreshTeacherClasses])

  const openApiModal = () => {
    setIsApiOpen(true)
  }

  const saveApiSettings = (provider: typeof state.aiProvider, apiKey: string) => {
    updateAiSettings({ provider, apiKey })
  }

  const createNewClass = () => {
    resetDemo()
    localStorage.removeItem('aemon.v2.state')
    localStorage.removeItem('aemon.state')
    navigate('/lesson/1')
  }

  const loadClass = useCallback(async (code: string) => {
    const trimmedCode = code.trim()
    if (!trimmedCode) return
    if (!isRemoteReady()) {
      setRestoreMessage('Supabase 연결이 아직 준비되지 않았습니다.')
      return
    }

    setIsRestoring(true)
    setRestoreMessage('')
    try {
      const bundle = await fetchRemoteClassBundle(trimmedCode)
      mergeClass({ ...bundle, studentSession: null })
      setRestoreMessage(`${bundle.className ?? '학급'} 기록을 불러왔습니다.`)
      navigate('/home')
    } catch (error) {
      const message = (error as Error).message
      setRemoteStatus({ ok: false, message })
      setRestoreMessage(`학급 코드를 찾지 못했습니다. ${message}`)
    } finally {
      setIsRestoring(false)
    }
  }, [mergeClass, navigate, setRemoteStatus])

  const removeClass = async (remoteClass: RemoteClassSummary) => {
    if (!user?.id || deletingClassId) return
    if (!window.confirm(`${remoteClass.className} 학급과 학생 기록을 모두 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) return
    setDeletingClassId(remoteClass.classId)
    setRestoreMessage('')
    try {
      await deleteRemoteClass({ classId: remoteClass.classId, teacherId: user.id })
      if (state.classId === remoteClass.classId) {
        resetDemo()
        localStorage.removeItem('aemon.v2.state')
        localStorage.removeItem('aemon.state')
      }
      await refreshTeacherClasses()
      setRestoreMessage(`${remoteClass.className} 학급을 삭제했습니다.`)
    } catch (error) {
      const message = (error as Error).message
      setRestoreMessage(message)
      setRemoteStatus({ ok: false, message })
    } finally {
      setDeletingClassId('')
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <section className="grid min-h-[70vh] items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <p className="font-data text-sm text-[#4FE0C0]">AEMON PROJECT</p>
          <h1 className="font-display mt-4 text-6xl leading-tight text-[#EAF2F5]">에아몬을 깨울 시간</h1>
          <p className="mt-6 max-w-2xl text-xl leading-9 text-[#B7C7D2]">
            새 학급을 만들거나, 내가 만든 학급 목록에서 이어서 진행할 학급을 선택하세요.
          </p>

          <Button className="mt-6" onClick={createNewClass}>
            <Plus size={20} />
            새 학급 만들기
          </Button>

          {state.classCode ? (
            <div className="mt-6 rounded-2xl border border-[#4FE0C0]/20 bg-[#4FE0C0]/8 p-4">
              <p className="font-data text-xs text-[#4FE0C0]">현재 학급</p>
              <p className="mt-1 text-lg font-black text-[#EAF2F5]">
                {state.className || '이름 없는 학급'} · 코드 {state.classCode}
              </p>
            </div>
          ) : null}

          <div className="mt-6 rounded-2xl border border-white/10 bg-[#07111B]/55 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-data text-xs text-[#4FE0C0]">MY CLASSES</p>
                <h2 className="mt-1 text-lg font-black text-[#EAF2F5]">내가 만든 학급</h2>
              </div>
            </div>
            {remoteClasses.length > 0 ? (
              <div className="mt-4 grid gap-2">
                {remoteClasses.map((remoteClass) => (
                  <article
                    key={remoteClass.classId}
                    className={`grid grid-cols-[minmax(0,1fr)_auto] items-stretch overflow-hidden rounded-xl border transition ${
                      remoteClass.classCode === state.classCode
                        ? 'border-[#4FE0C0]/35 bg-[#4FE0C0]/10'
                        : 'border-white/10 bg-[#07111B]/45 hover:border-[#4FE0C0]/35'
                    }`}
                  >
                    <button className="min-w-0 px-4 py-3 text-left" disabled={isRestoring || Boolean(deletingClassId)} onClick={() => void loadClass(remoteClass.classCode)} type="button">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-black text-[#EAF2F5]">{remoteClass.className}</p>
                        <span className="font-data text-xs text-[#4FE0C0]">{remoteClass.classCode}</span>
                      </div>
                      <p className="mt-1 text-sm text-[#8AA0B0]">
                        {remoteClass.aemonName || '이름 미정'} · 현재 {remoteClass.currentLesson}차시 · 기록 {remoteClass.activityCount}개
                      </p>
                    </button>
                    <button
                      aria-label={`${remoteClass.className} 삭제`}
                      className="flex w-14 items-center justify-center border-l border-white/10 text-[#8AA0B0] transition hover:bg-[#E0476B]/15 hover:text-[#FF8AA5] disabled:opacity-40"
                      disabled={isRestoring || Boolean(deletingClassId)}
                      onClick={() => void removeClass(remoteClass)}
                      title="학급 삭제"
                      type="button"
                    >
                      <Trash2 className={deletingClassId === remoteClass.classId ? 'animate-pulse' : ''} size={19} />
                    </button>
                  </article>
                ))}
              </div>
            ) : <p className="mt-4 border border-dashed border-white/15 px-4 py-6 text-center text-sm text-[#8AA0B0]">아직 만든 학급이 없습니다.</p>}
            {restoreMessage ? <p className="mt-3 rounded-xl border border-[#FFD37A]/25 bg-[#FFD37A]/10 px-3 py-2 text-sm font-bold text-[#FFD37A]">{restoreMessage}</p> : null}
          </div>

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
            <p className="basis-full px-1 text-sm leading-6 text-[#8AA0B0]">API를 연결하면 에아몬이 우리 반 말에 즉석으로 반응해 체험이 더 생동감 있어집니다. Google 계정으로 Gemini 무료 등급을 시작할 수 있습니다.</p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {state.classCode ? <Button onClick={() => navigate('/home')}>
              <Play size={20} />
              현재 학급으로 가기
            </Button> : null}
            <Button variant="secondary" onClick={() => navigate('/training')}>
              <BookOpen size={20} />
              사전연수
            </Button>
          </div>
        </div>

        <Panel className="text-center">
          <AemonAvatar stage={0} alignment="none" size={310} />
          <p className="font-hand mt-7 text-3xl leading-tight text-[#FFD37A]">"...안에서 다 들려. 너희 목소리."</p>
        </Panel>
      </section>

      {isApiOpen ? (
        <ApiConnectionModal
          apiKey={state.apiKey}
          provider={state.aiProvider}
          onClose={() => setIsApiOpen(false)}
          onSave={saveApiSettings}
        />
      ) : null}

      {isStartNoticeOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="start-notice-title">
          <Panel className="w-full max-w-lg">
            <button className="ml-auto flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-[#B7C7D2] hover:border-white/25" onClick={() => setIsStartNoticeOpen(false)} type="button" aria-label="안내 닫기">
              <X size={18} />
            </button>
            <p className="font-data text-sm text-[#4FE0C0]">BEFORE CLASS</p>
            <h2 id="start-notice-title" className="font-display mt-2 break-keep text-4xl leading-tight text-[#EAF2F5]">프로젝트를 시작하기 전에 테스트 학급을 만들어 시험해 보세요.</h2>
            <p className="mt-4 text-lg leading-8 text-[#B7C7D2]">언제든지 학급을 새로 만들고 삭제할 수 있습니다.</p>
            <Button className="mt-6 w-full" onClick={() => setIsStartNoticeOpen(false)}>확인</Button>
          </Panel>
        </div>
      ) : null}
    </div>
  )
}
