import { useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import { BookOpen, CheckCircle2, KeyRound, Play, Plus, Trash2 } from 'lucide-react'
import { AemonAvatar } from '../components/AemonAvatar'
import { ApiConnectionModal } from '../components/ApiConnectionModal'
import { Button } from '../components/ui'
import { deleteRemoteClass, fetchRemoteClassBundle, fetchRemoteTeacherClasses, isRemoteReady, MAX_TEACHER_CLASSES, type RemoteClassSummary } from '../lib/v2Remote'
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
  const isApiConnected = Boolean(state.apiKey.trim())
  const isClassLimitReached = remoteClasses.length >= MAX_TEACHER_CLASSES

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
    if (isClassLimitReached) {
      setRestoreMessage(`학급은 계정당 최대 ${MAX_TEACHER_CLASSES}개까지 만들 수 있습니다. 새 학급을 만들려면 기존 학급 하나를 삭제해 주세요.`)
      return
    }
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
    <div className="mx-auto max-w-7xl px-5 pb-20 pt-6 sm:pt-10">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0d2030] px-6 py-6 sm:px-8 sm:py-7">
        <div className="absolute right-[-4rem] top-[-6rem] h-64 w-64 rounded-full bg-[#4FE0C0]/10 blur-3xl" />
        <div className="relative grid items-center gap-5 md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-sm font-bold text-[#4FE0C0]">교사용 수업 준비</p>
            <h1 className="mt-2 break-keep text-3xl font-black tracking-[-.045em] text-white sm:text-4xl">오늘 수업을 시작해볼까요?</h1>
            <p className="mt-3 max-w-2xl break-keep leading-7 text-[#a9bbc6]">새 학급을 만들거나, 전에 진행하던 학급을 선택하세요.</p>
            {isClassLimitReached ? <p className="mt-3 text-sm font-bold text-[#FFD37A]">학급 5개를 모두 사용 중입니다. 기존 학급 하나를 삭제하면 새로 만들 수 있습니다.</p> : null}
          </div>
          <div className="flex items-center justify-between gap-4 md:justify-end">
            <Button className="min-h-12 whitespace-nowrap px-5" disabled={isClassLimitReached} onClick={createNewClass}><Plus size={19} />새 학급 만들기</Button>
            <div className="hidden h-24 w-24 items-center justify-center sm:flex">
              <AemonAvatar stage={0} alignment="none" size={92} />
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
        <section className="rounded-[1.75rem] border border-white/10 bg-[#0b1926]/75 p-5 sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <div><h2 className="text-2xl font-black tracking-tight text-white">내가 만든 학급</h2><p className="mt-1 text-sm text-[#8AA0B0]">학급을 선택하면 마지막으로 진행한 차시부터 이어집니다.</p></div>
            <span className={`rounded-full border px-3 py-1.5 text-sm font-black ${isClassLimitReached ? 'border-[#FFD37A]/35 bg-[#FFD37A]/10 text-[#FFD37A]' : 'border-white/10 bg-white/5 text-[#a9bbc6]'}`}>{remoteClasses.length}/{MAX_TEACHER_CLASSES}</span>
          </div>

          {state.classCode ? (
            <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-[#4FE0C0]/25 bg-[#4FE0C0]/8 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold text-[#4FE0C0]">현재 선택된 학급</p>
                <p className="mt-1 font-black text-white">{state.className || '이름 없는 학급'} · 코드 {state.classCode}</p>
              </div>
              <Button className="shrink-0 px-5" onClick={() => navigate('/home')}><Play size={18} />현재 학급으로 시작</Button>
            </div>
          ) : null}

          {remoteClasses.length > 0 ? (
            <div className="mt-5 grid gap-3">
              {remoteClasses.map((remoteClass) => (
                <article key={remoteClass.classId} className={`grid grid-cols-[minmax(0,1fr)_auto] items-stretch overflow-hidden rounded-2xl border transition ${remoteClass.classCode === state.classCode ? 'border-[#4FE0C0]/35 bg-[#4FE0C0]/10' : 'border-white/10 bg-white/[.025] hover:border-[#4FE0C0]/35'}`}>
                  <button className="min-w-0 px-5 py-4 text-left" disabled={isRestoring || Boolean(deletingClassId)} onClick={() => void loadClass(remoteClass.classCode)} type="button">
                    <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-black text-white">{remoteClass.className}</p><span className="text-xs font-bold text-[#4FE0C0]">{remoteClass.classCode}</span></div>
                    <p className="mt-1 text-sm text-[#8AA0B0]">{remoteClass.aemonName || '이름 미정'} · {remoteClass.currentLesson}차시 진행 중</p>
                  </button>
                  <button aria-label={`${remoteClass.className} 삭제`} className="flex w-14 items-center justify-center border-l border-white/10 text-[#6f8593] transition hover:bg-[#E0476B]/15 hover:text-[#FF8AA5] disabled:opacity-40" disabled={isRestoring || Boolean(deletingClassId)} onClick={() => void removeClass(remoteClass)} title="학급 삭제" type="button"><Trash2 className={deletingClassId === remoteClass.classId ? 'animate-pulse' : ''} size={18} /></button>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-white/15 px-5 py-12 text-center"><p className="font-bold text-[#B7C7D2]">아직 만든 학급이 없습니다.</p><p className="mt-2 text-sm text-[#718896]">첫 학급을 만들면 이곳에 저장됩니다.</p></div>
          )}
          {restoreMessage ? <p className="mt-4 rounded-xl border border-[#FFD37A]/25 bg-[#FFD37A]/10 px-3 py-2 text-sm font-bold text-[#FFD37A]">{restoreMessage}</p> : null}
        </section>

        <aside className="grid content-start gap-4">
          <section className="rounded-[1.75rem] border border-white/10 bg-[#0b1926]/75 p-6">
            <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-[#8AA0B0]">선택 설정</p><h2 className="mt-1 text-xl font-black text-white">AI API 연결</h2></div><span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black ${isApiConnected ? 'border-[#4FE0C0]/30 bg-[#4FE0C0]/10 text-[#4FE0C0]' : 'border-white/10 bg-white/5 text-[#8AA0B0]'}`}>{isApiConnected ? <CheckCircle2 size={14} /> : null}{isApiConnected ? `${providerLabel[state.aiProvider]} 연결됨` : '연결 안 됨'}</span></div>
            <p className="mt-4 break-keep text-sm leading-6 text-[#8AA0B0]">API를 연결하지 않아도 수업 진행이 가능합니다. API는 에아몬과의 실시간 채팅 등 일부 기능에서만 사용됩니다.</p>
            <Button className="mt-5 w-full" variant="secondary" onClick={openApiModal}><KeyRound size={17} />{isApiConnected ? 'API 연결 설정 바꾸기' : 'AI API 연결하기'}</Button>
          </section>

          <section className="rounded-[1.75rem] border border-white/10 bg-[#0b1926]/75 p-6">
            <p className="text-sm font-bold text-[#8AA0B0]">처음 진행하시나요?</p><h2 className="mt-1 text-xl font-black text-white">교사용 사전연수</h2>
            <p className="mt-3 break-keep text-sm leading-6 text-[#8AA0B0]">수업의 취지와 진행 방법을 먼저 살펴볼 수 있습니다.</p>
            <Button className="mt-5 w-full" variant="ghost" onClick={() => navigate('/training')}><BookOpen size={18} />사전연수 보기</Button>
          </section>
        </aside>
      </div>

      {isApiOpen ? (
        <ApiConnectionModal
          apiKey={state.apiKey}
          provider={state.aiProvider}
          onClose={() => setIsApiOpen(false)}
          onSave={saveApiSettings}
        />
      ) : null}

    </div>
  )
}
