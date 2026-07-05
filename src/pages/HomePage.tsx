import { useNavigate } from 'react-router-dom'
import { BookOpen, ClipboardList, MessageSquare, Play, Presentation, QrCode } from 'lucide-react'
import { AemonAvatar } from '../components/AemonAvatar'
import { Button, Panel } from '../components/ui'
import { useV2RemoteSync } from '../lib/useV2RemoteSync'
import { useV2 } from '../state/V2Store'

export function HomePage() {
  const navigate = useNavigate()
  const { state, evolutionStage } = useV2()

  useV2RemoteSync(state.classCode, Boolean(state.classCode))

  if (!state.classCode) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-5">
        <Panel className="max-w-md text-center">
          <h1 className="font-display text-4xl text-[#EAF2F5]">학급이 없습니다</h1>
          <p className="mt-3 leading-7 text-[#8AA0B0]">먼저 학급을 만들고 에아몬 프로젝트를 시작하세요.</p>
          <Button className="mt-6" onClick={() => navigate('/start')}>
            학급 만들기
          </Button>
        </Panel>
      </div>
    )
  }

  const lessonLabel = `${state.currentLesson || 1}/7차시`

  return (
    <div className="mx-auto grid min-h-[calc(100vh-110px)] max-w-6xl place-items-center px-5 py-8">
      <div className="w-full">
        <Panel className="overflow-hidden">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div className="text-center">
              <p className="font-data text-sm text-[#4FE0C0]">{state.className} · 학급 코드 {state.classCode}</p>
              <h1 className="font-display mt-3 text-5xl leading-tight text-[#EAF2F5]">{state.aemonName || '이름 없는 에아몬'}</h1>
              <p className="mt-3 text-[#8AA0B0]">현재 진행: {lessonLabel}</p>
              <div className="mt-5">
                <AemonAvatar stage={evolutionStage} alignment="none" size={230} />
              </div>
            </div>

            <div>
              <p className="font-data text-sm text-[#FFD37A]">교사 시작 화면</p>
              <h2 className="font-display mt-2 text-5xl leading-tight text-[#EAF2F5]">무엇을 먼저 열까요?</h2>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <button
                  className="group min-h-48 rounded-[22px] border border-[#FFD37A]/35 bg-[#FFD37A]/12 p-6 text-left transition hover:-translate-y-1 hover:border-[#FFD37A] hover:bg-[#FFD37A]/18"
                  onClick={() => navigate('/lesson/1')}
                  type="button"
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFD37A] text-[#0A1622]">
                    <Play size={24} />
                  </span>
                  <span className="font-display mt-5 block text-4xl text-[#EAF2F5]">프로젝트 시작하기</span>
                  <span className="mt-3 block leading-7 text-[#B7C7D2]">1차시 탄생 수업을 교사 화면으로 진행합니다.</span>
                </button>

                <button
                  className="group min-h-48 rounded-[22px] border border-[#4FE0C0]/30 bg-[#4FE0C0]/10 p-6 text-left transition hover:-translate-y-1 hover:border-[#4FE0C0] hover:bg-[#4FE0C0]/16"
                  onClick={() => navigate('/training')}
                  type="button"
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#4FE0C0] text-[#0A1622]">
                    <Presentation size={24} />
                  </span>
                  <span className="font-display mt-5 block text-4xl text-[#EAF2F5]">사전연수 보기</span>
                  <span className="mt-3 block leading-7 text-[#B7C7D2]">가치정렬 철학과 수업 운영 구조를 확인합니다.</span>
                </button>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button variant="secondary" onClick={() => navigate('/codes')}>
                  <ClipboardList size={18} />
                  가치코드
                </Button>
                <Button variant="secondary" onClick={() => navigate('/board')}>
                  <QrCode size={18} />
                  학습게시판
                </Button>
                <Button variant="secondary" onClick={() => navigate('/talk')}>
                  <MessageSquare size={18} />
                  챗봇
                </Button>
                <Button variant="ghost" onClick={() => navigate('/start')}>
                  <BookOpen size={18} />
                  학급 설정
                </Button>
              </div>
            </div>
          </div>
        </Panel>

      </div>
    </div>
  )
}
