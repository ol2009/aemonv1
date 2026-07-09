import { BadgeCheck, CheckCircle2, HeartHandshake, Leaf, Scale, ShieldCheck } from 'lucide-react'

const valueCardIcons = {
  배려: HeartHandshake,
  정직: BadgeCheck,
  공정: Scale,
  안전: ShieldCheck,
  책임: CheckCircle2,
  생명존중: Leaf,
} as const

export function ValueCardSelectGrid({
  cards,
  selectedValue,
  onSelect,
}: {
  cards: readonly string[]
  selectedValue: string
  onSelect: (card: string) => void
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => {
        const Icon = valueCardIcons[card as keyof typeof valueCardIcons] ?? BadgeCheck
        const selected = selectedValue === card

        return (
          <button
            key={card}
            className={`min-h-24 rounded-2xl border p-4 text-left transition ${
              selected
                ? 'border-[#9B7CFF] bg-[#9B7CFF]/18 text-[#EAF2F5] shadow-[0_0_0_1px_rgba(155,124,255,.5),0_18px_40px_rgba(155,124,255,.16)]'
                : 'border-white/10 bg-[#07111B]/60 text-[#B7C7D2] hover:border-[#9B7CFF]/45 hover:bg-[#9B7CFF]/8'
            }`}
            onClick={() => onSelect(card)}
            type="button"
          >
            <span className="flex items-start justify-between gap-3">
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
                  selected ? 'border-[#FFD37A]/45 bg-[#FFD37A] text-[#0A1622]' : 'border-white/10 bg-white/5 text-[#C9B9FF]'
                }`}
              >
                <Icon size={24} strokeWidth={2.5} />
              </span>
              {selected ? <CheckCircle2 className="mt-1 text-[#FFD37A]" size={20} strokeWidth={2.5} /> : null}
            </span>
            <span className="mt-4 block text-lg font-black leading-none">{card}</span>
          </button>
        )
      })}
    </div>
  )
}
