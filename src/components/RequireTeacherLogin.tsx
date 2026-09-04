import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useSupabaseUser } from '../lib/useSupabaseUser'

function TeacherLoginGate({ children, returnTo }: { children: ReactNode; returnTo: string }) {
  const { user, isLoading } = useSupabaseUser()

  if (isLoading) {
    return (
      <div className="flex min-h-[78vh] items-center justify-center px-5" role="status" aria-live="polite">
        <p className="font-bold text-[var(--ink-soft)]">로그인 상태를 확인하고 있습니다.</p>
      </div>
    )
  }

  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(returnTo)}`} replace />

  return children
}

export function RequireTeacherLogin({ children, allowStudentAccess = false }: { children: ReactNode; allowStudentAccess?: boolean }) {
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const isBoardQrAccess = location.pathname === '/board' && Boolean(searchParams.get('code') && searchParams.get('mode'))
  const isStudentAccess = searchParams.get('role') === 'student' || searchParams.get('live') === 'student' || isBoardQrAccess
  const isEmbeddedLessonPreview =
    location.pathname.startsWith('/lesson/') && searchParams.get('preview') === '1' && window.self !== window.top

  // `/test` is already teacher-protected. Its lesson iframes must not start a
  // second Supabase auth listener, which can leave previews stuck on loading.
  if (isEmbeddedLessonPreview) return children
  if (allowStudentAccess && isStudentAccess) return children

  const returnTo = `${location.pathname}${location.search}${location.hash}`
  return <TeacherLoginGate returnTo={returnTo}>{children}</TeacherLoginGate>
}
