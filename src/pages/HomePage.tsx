import { useNavigate } from 'react-router-dom'
import { ArrowRight, Bot, ClipboardList, Crown, MessageSquare, Users } from 'lucide-react'
import { AemonAvatar } from '../components/AemonAvatar'
import { Button, Panel } from '../components/ui'
import { findV2Lesson, v2Lessons } from '../data/v2Lessons'
import { useV2 } from '../state/V2Store'

export function HomePage() {
  const navigate = useNavigate()
  const { state, setLesson, evolutionStage, currentReaction, adoptedCodeCount } = useV2()
  const lesson = findV2Lesson(state.currentLesson)

  if (!state.classCode) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-5">
        <Panel className="max-w-md text-center">
          <h1 className="font-display text-4xl text-[#EAF2F5]">학급이 없습니다</h1>
          <p className="mt-3 leading-7 text-[#8AA0B0]">먼저 학급을 만들고 v2 수업을 시작하세요.</p>
          <Button className="mt-6" onClick={() => navigate('/')}>학급 만들기</Button>
        </Panel>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-8">
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel className="text-center">
          <p className="font-data text-sm text-[#4FE0C0]">{state.className} · 코드 {state.classCode}</p>
          <h1 className="font-display mt-2 text-5xl text-[#EAF2F5]">{state.aemonName || '이름 없는 에아몬'}</h1>
          <div className="mt-6">
            <AemonAvatar stage={evolutionStage} alignment="none" size={280} />
          </div>
          <p className="font-hand mx-auto mt-6 max-w-xl text-3xl leading-tight text-[#FFD37A]">"{currentReaction}"</p>
          <div className="mt-6 grid grid-cols-2 gap-3 text-left">
            <div className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
              <p className="font-data text-xs text-[#8AA0B0]">채택 코드</p>
              <p className="font-display mt-1 text-4xl text-[#FFD37A]">{adoptedCodeCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
              <p className="font-data text-xs text-[#8AA0B0]">현재 차시</p>
              <p className="font-display mt-1 text-4xl text-[#4FE0C0]">{state.currentLesson}/7</p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Button onClick={() => navigate('/talk')}>
              <MessageSquare size={18} />
              챗봇 열기
            </Button>
            <Button variant="secondary" onClick={() => navigate('/codes')}>
              <ClipboardList size={18} />
              가치코드
            </Button>
          </div>
        </Panel>

        <div className="grid gap-5">
          <Panel>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-data text-sm text-[#4FE0C0]">{lesson.phase}</p>
                <h2 className="font-display mt-2 text-4xl text-[#EAF2F5]">{lesson.no}차시 · {lesson.title}</h2>
                <p className="mt-3 leading-7 text-[#B7C7D2]">{lesson.goal}</p>
              </div>
              <select className="rounded-2xl border border-white/10 bg-[#07111B]/80 px-4 py-3 text-[#EAF2F5]" value={state.currentLesson} onChange={(event) => setLesson(Number(event.target.value))}>
                {v2Lessons.map((item) => (
                  <option key={item.no} value={item.no}>{item.no}차시</option>
                ))}
              </select>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
                <p className="font-data text-xs text-[#FFD37A]">화면</p>
                <p className="mt-2 leading-7 text-[#EAF2F5]">{lesson.screenCue}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
                <p className="font-data text-xs text-[#FFD37A]">학생</p>
                <p className="mt-2 leading-7 text-[#EAF2F5]">{lesson.studentAction}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
                <p className="font-data text-xs text-[#FFD37A]">필수</p>
                <p className="mt-2 leading-7 text-[#EAF2F5]">{lesson.mustKeep}</p>
              </div>
            </div>
          </Panel>

          <Panel>
            <h2 className="font-display text-3xl text-[#EAF2F5]">수업 운영 대본</h2>
            <ol className="mt-4 grid gap-3">
              {lesson.teacherScript.map((line, index) => (
                <li key={line} className="flex gap-3 rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
                  <span className="font-data text-[#FFD37A]">{String(index + 1).padStart(2, '0')}</span>
                  <span className="leading-7 text-[#B7C7D2]">{line}</span>
                </li>
              ))}
            </ol>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => navigate('/board')}>
                <Users size={18} />
                학생 화면
              </Button>
              <Button variant="secondary" onClick={() => window.open('/v2/value-cards.html', '_blank', 'noopener,noreferrer')}>
                가치카드 인쇄
              </Button>
              {state.currentLesson === 7 ? (
                <Button onClick={() => navigate('/graduation')}>
                  <Crown size={18} />
                  임명식
                </Button>
              ) : (
                <Button onClick={() => setLesson(Math.min(7, state.currentLesson + 1))}>
                  다음 차시
                  <ArrowRight size={18} />
                </Button>
              )}
            </div>
          </Panel>

          <Panel>
            <div className="mb-4 flex items-center gap-2">
              <Bot className="text-[#4FE0C0]" size={20} />
              <h2 className="font-display text-3xl text-[#EAF2F5]">채택된 가치 코드</h2>
            </div>
            <div className="grid gap-3">
              {state.adoptedCodes.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-4 text-[#8AA0B0]">아직 채택된 코드가 없습니다.</p> : null}
              {state.adoptedCodes.map((code) => (
                <div key={code.id} className="rounded-2xl border border-[#4FE0C0]/20 bg-[#4FE0C0]/5 p-4">
                  <p className="font-data text-xs text-[#4FE0C0]">가치 코드 No.{code.no}</p>
                  <p className="mt-2 text-lg font-bold leading-7 text-[#EAF2F5]">{code.body}</p>
                  <p className="mt-1 text-sm leading-6 text-[#8AA0B0]">왜냐하면 {code.reason}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
