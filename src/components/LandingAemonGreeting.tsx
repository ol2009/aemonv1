import { useEffect, useState } from 'react'
import { Pause, Play } from 'lucide-react'

const greetings = [
  ['안녕! 너넨 누구야?', '나는 에아몬! 만나서 반가워.'],
  ['아직은 꼬물이지만…', '너희랑 함께 쑥쑥 자라고 싶어!'],
  ['나도 가끔 엉뚱한 말을 해.', '그럴 땐 “잠깐!” 하고 알려줘.'],
  ['어떤 AI가 되면 좋을까?', '너희 생각이 궁금해!'],
  ['우리 반의 약속을 알려줄래?', '함께 더 좋은 기준을 찾아보자.'],
  ['꼬물꼬물… 나 여기 있어!', '작다고 그냥 지나가면 섭섭해!'],
  ['내 이름 한번 불러 줄래?', '에~ 아~ 몬! 헤헤, 반가워!'],
  ['칭찬만 해 주면 좋은 AI일까?', '음… 솔직하게 말하는 것도 중요하겠지?'],
  ['내 대답이 이상하다고?', '오! 어디가 이상한지 같이 찾아보자.'],
  ['친구들 생각은 다 다르네!', '한 명씩 들려줘. 모두 궁금해!'],
  ['오늘은 어떤 걸 배울까?', '궁금한 게 꼬물꼬물 생겼어!'],
  ['똑똑하면 다 맞힐 수 있냐고?', '앗, 나도 틀릴 수 있어! 같이 확인해 줘.'],
  ['우리 반 약속, 이걸로 끝?', '빠진 게 없는지 한 번 더 살펴보자!'],
  ['나를 너희 반에 데려가 줘!', '우리, 오늘부터 함께 자라자!'],
]

export function LandingAemonGreeting() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % greetings.length), 4500)
    return () => window.clearInterval(timer)
  }, [paused])

  return (
    <div className="absolute inset-x-4 top-5 z-20 sm:inset-x-6 sm:top-7">
      <div className="relative rounded-[1.5rem] border-2 border-[#B9E8D9] bg-[#F5FFF9] px-3 pb-5 pt-4 text-center shadow-[0_8px_30px_rgba(0,0,0,.16)]">
        <p className="text-xs font-bold tracking-widest text-[#32856F]">꼬물이 에아몬</p>
        <div className="mt-2 flex min-h-[64px] flex-col justify-center" aria-live="off">
          <p className="break-keep text-xl font-black leading-tight text-[#153E34] sm:text-2xl">{greetings[index][0]}</p>
          <p className="mt-2 break-keep text-sm font-semibold text-[#467062] sm:text-base">{greetings[index][1]}</p>
        </div>
        <span aria-hidden="true" className="absolute -bottom-[10px] left-1/2 h-[18px] w-[18px] -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-[#B9E8D9] bg-[#F5FFF9]" />
      </div>
      <button type="button" onClick={() => setPaused((value) => !value)} aria-label={paused ? '말풍선 이어 보기' : '말풍선 멈추기'} title={paused ? '말풍선 이어 보기' : '말풍선 멈추기'} className="absolute -right-1 -top-2 flex h-9 w-9 items-center justify-center rounded-full border border-[#B9E8D9] bg-white text-[#32856F] shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FD7BD]">
        {paused ? <Play size={14} /> : <Pause size={14} />}
      </button>
    </div>
  )
}
