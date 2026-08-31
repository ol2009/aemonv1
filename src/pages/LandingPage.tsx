import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, UsersRound } from 'lucide-react'
import { Button } from '../components/ui'

const lessons = [
  { no: '01', title: 'AI는 왜 엉뚱한 일을 할까?', copy: '클립을 많이 만들라는 명령이 어떻게 위험해질 수 있는지 살펴봅니다.' },
  { no: '02', title: '사람이 시킨 일은 무조건 해야할까?', copy: '명령을 그대로 따르지 않고 AI가 스스로 멈춰야 하는 순간을 찾습니다.' },
  { no: '03', title: '인공지능의 기분 좋은 말. 괜찮을까?', copy: '무조건 내 편을 드는 AI와 솔직하게 말하는 AI 중 무엇이 더 나은지 이야기합니다.' },
  { no: '04', title: 'AI는 왜 편향적일까?', copy: 'AI가 배운 데이터에 따라 누군가를 다르게 판단할 수 있다는 것을 확인합니다.' },
  { no: '05', title: '우리가 가르친 AI는 달라졌을까?', copy: '우리 반의 규칙으로 에아몬을 자유롭게 시험하고 마지막 가치코드를 완성합니다.' },
]

export function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="landing-page pb-10">
      <section className="relative mx-auto max-w-7xl px-5 pb-14 pt-6 sm:pb-20 sm:pt-10">
        <div className="landing-hero relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-white px-6 py-10 shadow-[0_28px_90px_rgba(25,66,53,.12)] sm:px-10 sm:py-14 lg:min-h-[650px] lg:px-16 lg:py-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(37,169,141,.10),transparent_34%),radial-gradient(circle_at_56%_88%,rgba(242,190,92,.10),transparent_34%)]" />
          <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-6">
            <div className="max-w-2xl">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#25A98D]/25 bg-[#25A98D]/10 px-4 py-2 text-sm font-bold text-[#187B68]">
                초등 4–6학년 · 5차시 프로젝트 수업
              </div>
              <h1 className="mt-5 break-keep text-[clamp(3.2rem,7vw,6.5rem)] font-black leading-[.96] tracking-[-.065em] text-[#172530]">
                우리 반이<br /><span className="text-[#168D75]">AI를 가르칩니다</span>
              </h1>
              <p className="mt-7 max-w-xl break-keep text-lg font-medium leading-8 text-[#526873] sm:text-xl sm:leading-9">
                아이들이 AI의 실수를 찾아냅니다. 다음에는 어떻게 행동해야 할지
                우리 반의 인공지능 규칙을 정합니다.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button className="min-h-14 px-7" onClick={() => navigate('/start')}>우리 반 에아몬 만나기 <ArrowRight size={20} /></Button>
                <Button className="min-h-14 px-7" variant="secondary" onClick={() => navigate('/training')}>5차시 수업 살펴보기</Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-[#60717A]">
                {['준비물 없이 시작', 'QR 학생 참여', '실시간 학급 투표'].map((item) => (
                  <span className="inline-flex items-center gap-1.5" key={item}><Check size={15} className="text-[#25A98D]" />{item}</span>
                ))}
              </div>
            </div>
            <div className="relative mx-auto flex min-h-[340px] w-full max-w-lg items-center justify-center overflow-hidden rounded-[1.75rem] border border-[#315364] bg-[#163344] lg:min-h-[520px]">
              <div className="pointer-events-none absolute h-[88%] w-[88%] rounded-full border border-[#4FD7BD]/15" />
              <div className="pointer-events-none absolute h-[68%] w-[68%] rounded-full border border-[#4FD7BD]/15" />
              <div className="absolute h-[70%] w-[70%] rounded-full bg-[#4FD7BD]/15 blur-3xl" />
              <img className="relative z-10 w-[min(72vw,430px)] object-contain drop-shadow-[0_35px_55px_rgba(0,0,0,.35)]" src="/aemon/v3/stage-0-egg.gif?hero=20260714" alt="데이터의 바다에서 태어난 알 단계 에아몬" style={{ imageRendering: 'pixelated' }} />
              <div className="absolute bottom-5 z-20 rounded-2xl border border-white/15 bg-[#102738]/90 px-5 py-3 text-center shadow-xl backdrop-blur-md sm:bottom-8">
                <p className="font-bold text-white">0단계 에아몬</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
          <div><h2 className="break-keep text-4xl font-black leading-[1.12] tracking-[-.045em] text-[#172530] sm:text-5xl">진정한 AI 교육,<br />우리는 뭘 해야할까요?</h2></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <article className="rounded-3xl border border-[#D7E2DC] bg-white p-7 shadow-[0_16px_45px_rgba(25,66,53,.07)]">
              <p className="text-sm font-bold text-[#60717A]">기존 AI 윤리 교육의 한계</p><h3 className="mt-3 text-2xl font-extrabold tracking-tight text-[#172530]">“AI를 조심히 써요”</h3>
              <p className="mt-4 leading-7 text-[#60717A]">개인정보를 입력하지 않기, 딥페이크를 만들지 않기, 저작권을 지키기. 모두 필요한 약속이지만 이것만으로는 AI가 무엇을 옳다고 판단해야 하는지 배울 수 없습니다.</p>
            </article>
            <article className="rounded-3xl border border-[#25A98D]/30 bg-[#25A98D]/10 p-7">
              <p className="text-sm font-bold text-[#187B68]">에아몬 프로젝트</p><h3 className="mt-3 text-2xl font-extrabold tracking-tight text-[#172530]">“AI는 무엇을 따라야 할까?”</h3>
              <p className="mt-4 leading-7 text-[#526873]">AI의 한계를 함께 느낍니다. AI를 가르치고, 나아졌는지 함께 점검합니다.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="border-y border-[#D7E2DC] bg-[#E9F1ED]/75">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:py-24">
          <div className="max-w-3xl"><h2 className="break-keep text-4xl font-black tracking-[-.045em] text-[#172530] sm:text-5xl">5차시 동안<br />이런 질문을 나눕니다</h2><p className="mt-5 max-w-2xl text-lg leading-8 text-[#526873]">지금까지 인공지능의 역사에서 실제로 일어난 문제를 차시마다 하나씩 만납니다. 아이들은 문제가 왜 생겼는지 설명을 듣고, 함께 해결책을 찾아 에아몬에게 새로운 규칙을 가르칩니다.</p></div>
          <div className="mt-12 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {lessons.map((lesson) => (
              <article className="group rounded-3xl border border-[#D7E2DC] bg-white p-6 shadow-[0_12px_34px_rgba(25,66,53,.06)] transition hover:-translate-y-1 hover:border-[#25A98D]/55" key={lesson.no}>
                <div className="flex items-center justify-between"><span className="text-xs font-black tracking-[.16em] text-[#187B68]">{Number(lesson.no)}차시</span></div>
                <h3 className="mt-8 text-2xl font-black text-[#172530]">{lesson.title}</h3><p className="mt-2 break-keep text-sm leading-6 text-[#60717A]">{lesson.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-16 text-center sm:py-24">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#25A98D]/10 text-[#187B68]"><UsersRound size={28} /></div>
        <h2 className="mt-7 break-keep text-4xl font-black tracking-[-.05em] text-[#172530] sm:text-5xl">첫 수업을 열어볼까요?</h2>
        <p className="mx-auto mt-5 max-w-2xl break-keep text-lg leading-8 text-[#526873]">선생님이 학급을 만들면 아이들은 QR 코드로 들어옵니다. 별도 설치나 학생 회원가입은 필요하지 않습니다.</p>
        <Button className="mt-8 min-h-14 px-8" onClick={() => navigate('/start')}>학급 만들기 <ArrowRight size={20} /></Button>
      </section>
    </div>
  )
}
