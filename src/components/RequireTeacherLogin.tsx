import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useSupabaseUser } from '../lib/useSupabaseUser'

export function RequireTeacherLogin({ children, allowStudentAccess = false }: { children: ReactNode; allowStudentAccess?: boolean }) {
  const location = useLocation()
  const { user, isLoading } = useSupabaseUser()
  const searchParams = new URLSearchParams(location.search)
  const isBoardQrAccess = location.pathname === '/board' && Boolean(searchParams.get('code') && searchParams.get('mode'))
  const isStudentAccess = searchParams.get('role') === 'student' || searchParams.get('live') === 'student' || isBoardQrAccess

  if (allowStudentAccess && isStudentAccess) return children

  if (isLoading) {
    return (
      <div className="flex min-h-[78vh] items-center justify-center px-5" role="status" aria-live="polite">
        <p className="font-bold text-[var(--ink-soft)]">로그인 상태를 확인하고 있습니다.</p>
      </div>
    )
  }

  if (!user) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to={`/login?next=${encodeURIComponent(returnTo)}`} replace />
  }

  return children
}
