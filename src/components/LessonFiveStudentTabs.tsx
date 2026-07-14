import { Link } from 'react-router-dom'

export type LessonFiveStudentTab = 'attack' | 'code4' | 'pledge' | 'post'

export function LessonFiveStudentTabs({ classCode, active }: { classCode: string; active?: LessonFiveStudentTab }) {
  const code = encodeURIComponent(classCode)
  const tabs: { id: LessonFiveStudentTab; label: string; to: string }[] = [
    { id: 'attack', label: '5차시 - 해킹 질문', to: `/lesson/5?role=student&activity=attack&code=${code}` },
    { id: 'code4', label: '5차시 - 마지막 보완 코드', to: `/board?code=${code}&mode=code4` },
    { id: 'pledge', label: '5차시 - 우리의 다짐', to: `/lesson/5?role=student&activity=pledge&code=${code}` },
    { id: 'post', label: '5차시 - 사후 설문', to: `/lesson/5?role=student&activity=post&code=${code}` },
  ]

  return (
    <nav aria-label="5차시 활동" className="mb-5 overflow-x-auto rounded-[18px] border border-white/10 bg-[#14283D]/85 p-3">
      <div className="flex min-w-max gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            aria-current={active === tab.id ? 'page' : undefined}
            className={`rounded-xl border px-4 py-3 text-sm font-black transition ${
              active === tab.id
                ? 'border-[#FFD37A] bg-[#FFD37A]/15 text-[#FFD37A]'
                : 'border-white/10 bg-[#07111B]/45 text-[#B7C7D2] hover:border-white/25 hover:text-[#EAF2F5]'
            }`}
            to={tab.to}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
