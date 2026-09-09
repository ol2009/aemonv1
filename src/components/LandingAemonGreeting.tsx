import { useEffect, useState } from 'react'

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
].flat()

export function LandingAemonGreeting() {
  const [progress, setProgress] = useState({ index: 0, count: 0 })
  const characters = Array.from(greetings[progress.index])

  useEffect(() => {
    const complete = progress.count >= Array.from(greetings[progress.index]).length
    const timer = window.setTimeout(() => {
      setProgress((current) => complete
        ? { index: (current.index + 1) % greetings.length, count: 0 }
        : { ...current, count: current.count + 1 })
    }, complete ? 3000 : 65)
    return () => window.clearTimeout(timer)
  }, [progress])

  return (
    <div className="absolute inset-x-4 top-5 z-20 sm:inset-x-6 sm:top-5">
      <div className="relative mx-auto flex min-h-16 max-w-sm items-center justify-center rounded-2xl bg-[#F5FFF9] px-4 py-3 text-center shadow-sm" aria-live="off">
        <p className="break-keep text-base font-bold leading-snug text-[#153E34] sm:text-lg">{characters.slice(0, progress.count).join('') || '\u00a0'}</p>
        <span aria-hidden="true" className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 bg-[#F5FFF9]" />
      </div>
    </div>
  )
}
