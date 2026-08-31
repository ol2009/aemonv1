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
    primary: 'bg-[var(--ember)] text-[var(--button-ink)] shadow-[0_12px_34px_rgba(242,190,92,.22)] hover:brightness-[1.04]',
    secondary: 'border border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink)] hover:border-[var(--aura)]',
    ghost: 'bg-transparent text-[var(--ink-soft)] hover:bg-[var(--surface-2)]',
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
    <section className={clsx('rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_18px_55px_var(--panel-shadow)]', className)}>
      {children}
    </section>
  )
}

export function Kicker({ children }: { children: ReactNode }) {
  return <p className="font-data text-xs uppercase tracking-[0.24em] text-[var(--aura)]">{children}</p>
}

export function PageHeader({ title, eyebrow, children }: { title: string; eyebrow?: string; children?: ReactNode }) {
  return (
    <header className="mx-auto max-w-5xl px-5 pb-8 pt-10 text-center md:pt-14">
      {eyebrow ? <Kicker>{eyebrow}</Kicker> : null}
      <h1 className="font-display mt-4 text-4xl leading-tight text-[var(--ink)] md:text-6xl">{title}</h1>
      {children ? <div className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-[var(--ink-soft)]">{children}</div> : null}
    </header>
  )
}
