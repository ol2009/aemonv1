import { clsx } from 'clsx'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function Button({
  children,
  className,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
}) {
  const variants = {
    primary: 'bg-[#FFD37A] text-[#0A1622] shadow-[0_12px_34px_rgba(255,211,122,.22)] hover:bg-[#FFE0A1]',
    secondary: 'bg-[#1E3A54] text-[#EAF2F5] border border-white/10 hover:border-[#4FE0C0]/50',
    ghost: 'bg-transparent text-[#B7C7D2] hover:bg-white/5',
    danger: 'bg-[#E0476B] text-white hover:bg-[#EF6381]',
  }

  return (
    <button
      className={clsx(
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-base font-bold transition disabled:cursor-not-allowed disabled:opacity-45',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={clsx('rounded-[22px] border border-white/10 bg-[#14283D]/88 p-6 shadow-2xl shadow-black/20', className)}>
      {children}
    </section>
  )
}

export function Kicker({ children }: { children: ReactNode }) {
  return <p className="font-data text-xs uppercase tracking-[0.24em] text-[#4FE0C0]">{children}</p>
}

export function PageHeader({ title, eyebrow, children }: { title: string; eyebrow?: string; children?: ReactNode }) {
  return (
    <header className="mx-auto max-w-5xl px-5 pb-8 pt-10 text-center md:pt-14">
      {eyebrow ? <Kicker>{eyebrow}</Kicker> : null}
      <h1 className="font-display mt-4 text-4xl leading-tight text-[#EAF2F5] md:text-6xl">{title}</h1>
      {children ? <div className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-[#B7C7D2]">{children}</div> : null}
    </header>
  )
}
