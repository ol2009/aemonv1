import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ClipboardList, Home, LogIn, LogOut, MessageSquare, MessageSquareText, QrCode, X } from 'lucide-react'
import { Button } from './ui'
import { absoluteUrl } from '../lib/siteUrl'
import { signOut, useSupabaseUser } from '../lib/useSupabaseUser'
import { useV2 } from '../state/V2Store'

const navItems = [
  { path: '/home', label: '학급 홈', icon: Home },
  { path: '/codes', label: '가치코드', icon: ClipboardList },
  { path: '/board', label: '학습게시판', icon: MessageSquareText },
  { path: '/talk', label: '채팅', icon: MessageSquare },
]

export function AppFrame() {
  const navigate = useNavigate()
  const location = useLocation()
  const { state } = useV2()
  const [isLiveQrOpenManually, setIsLiveQrOpenManually] = useState(false)
  const [dismissedLiveQrKeys, setDismissedLiveQrKeys] = useState<string[]>([])
  const { user, isConfigured } = useSupabaseUser()
  const searchParams = new URLSearchParams(location.search)
  const isStudentLive = searchParams.get('live') === 'student' || location.pathname === '/live'
  const isStudentActivity = searchParams.get('role') === 'student'
  const isLessonTwoBoundaryVote = location.pathname === '/lesson/2' && searchParams.get('step') === '6'
  const isInteractiveStudentScreen =
    location.pathname === '/board' ||
    isLessonTwoBoundaryVote ||
    (location.pathname === '/lesson/5' && searchParams.get('role') === 'student')
  const isImmersive = isStudentLive
  const showLiveShare = location.pathname.startsWith('/lesson/') && !isStudentLive && !isStudentActivity && Boolean(state.classCode)
  const liveUrl = absoluteUrl(`/live?code=${encodeURIComponent(state.classCode)}`)
  const liveQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=12&data=${encodeURIComponent(liveUrl)}`
  const lessonNo = location.pathname.match(/^\/lesson\/(\d+)$/)?.[1] ?? ''
  const liveQrVisitKey = `${location.pathname}:${state.classCode}`
  const shouldAutoOpenLiveQr = showLiveShare && !dismissedLiveQrKeys.includes(liveQrVisitKey)
  const isLiveQrOpen = isLiveQrOpenManually || shouldAutoOpenLiveQr
  const appNavPaths = ['/home', '/codes', '/board', '/talk', '/dex', '/graduation', '/survey-results', '/lesson/1']
  const showAppNav = Boolean(user && appNavPaths.includes(location.pathname))
  const showAuthControls = location.pathname !== '/board'

  const handleAuthClick = async () => {
    if (user) {
      await signOut()
      return
    }
    navigate('/login')
  }

  return (
    <div className="data-sea relative min-h-screen overflow-hidden">
      <div className="relative z-10 min-h-screen">
        {!isImmersive ? (
          <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-5">
            <button className="flex items-center" onClick={() => navigate('/')} type="button">
              <span className="font-display text-2xl text-[#EAF2F5]">에아몬</span>
            </button>
            {showAppNav ? (
              <nav className="hidden items-center gap-1 lg:flex">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const active = location.pathname === item.path
                  return (
                    <button
                      key={item.path}
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                        active ? 'bg-white/10 text-[#FFD37A]' : 'text-[#8AA0B0] hover:bg-white/5 hover:text-[#EAF2F5]'
                      }`}
                      onClick={() => navigate(item.path)}
                      type="button"
                    >
                      <Icon size={17} />
                      {item.label}
                    </button>
                  )
                })}
              </nav>
            ) : null}
            {showAuthControls ? (
              <div className="hidden items-center gap-2 md:flex">
                {user ? (
                  <span className="max-w-40 truncate rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-[#B7C7D2]">
                    {user.email}
                  </span>
                ) : null}
                <Button variant={user ? 'secondary' : 'ghost'} className="min-h-10 px-3" disabled={!isConfigured && !user} onClick={handleAuthClick}>
                  {user ? <LogOut size={18} /> : <LogIn size={18} />}
                  {user ? '로그아웃' : '로그인'}
                </Button>
              </div>
            ) : null}
          </header>
        ) : null}
        {showLiveShare ? (
          <button
            className="fixed right-5 top-5 z-40 inline-flex min-h-12 items-center gap-2 rounded-lg border border-[#4FE0C0]/35 bg-[#0D2232]/95 px-4 font-black text-[#EAF2F5] shadow-xl"
            type="button"
            onClick={() => {
              setIsLiveQrOpenManually(true)
            }}
          >
            <QrCode size={20} className="text-[#4FE0C0]" />
            학생 화면 QR
          </button>
        ) : null}
        {isStudentLive && location.pathname !== '/live' ? (
          <div className="fixed right-3 top-3 z-50 rounded-lg border border-[#4FE0C0]/30 bg-[#07111B]/90 px-3 py-2 text-xs font-black text-[#4FE0C0] shadow-lg">
            선생님 화면과 연결됨
          </div>
        ) : null}
        <main className={isStudentLive && !isInteractiveStudentScreen && location.pathname !== '/live' ? 'pointer-events-none select-none' : ''}>
          <Outlet />
        </main>
        {isLiveQrOpen ? (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#02070D]/85 p-5" role="dialog" aria-modal="true" aria-label="학생 화면 QR">
            <div className="relative w-full max-w-lg rounded-lg border border-white/15 bg-[#10283B] p-6 text-center shadow-2xl">
              <button
                className="absolute right-4 top-4 text-[#8AA0B0] hover:text-white"
                type="button"
                onClick={() => {
                  setIsLiveQrOpenManually(false)
                  setDismissedLiveQrKeys((current) => (current.includes(liveQrVisitKey) ? current : [...current, liveQrVisitKey]))
                }}
                aria-label="닫기"
              >
                <X size={24} />
              </button>
              <p className="font-data text-xs text-[#4FE0C0]">{lessonNo ? `${lessonNo}차시 · ` : ''}선택 기능</p>
              <h2 className="font-display mt-2 text-4xl text-[#EAF2F5]">학생 화면 함께 보기</h2>
              <p className="mt-3 leading-7 text-[#B7C7D2]">학생이 이 QR로 입장하면 교사가 넘기는 장면을 함께 보고, 게시판 장면에서는 글쓰기와 좋아요에 참여합니다.</p>
              <img className="mx-auto mt-5 w-64 rounded-lg bg-white p-3" src={liveQrUrl} alt="학생 화면 연결 QR" />
              <a
                className="mt-4 inline-block break-all font-data text-xs leading-5 text-[#8AA0B0] underline decoration-white/25 underline-offset-4 hover:text-[#4FE0C0]"
                href={liveUrl}
                target="_blank"
                rel="noreferrer"
                title="학생 화면 새 탭에서 열기"
              >
                {liveUrl}
              </a>
              <Button
                className="mt-5 w-full"
                variant="secondary"
                onClick={() => {
                  setIsLiveQrOpenManually(false)
                  setDismissedLiveQrKeys((current) => (current.includes(liveQrVisitKey) ? current : [...current, liveQrVisitKey]))
                }}
              >
                이번 차시는 교사 화면만 사용
              </Button>
              <p className="mt-3 text-xs font-bold leading-5 text-[#8AA0B0]">사용하지 않아도 수업은 그대로 진행됩니다. 우상단 학생 화면 QR에서 다시 열 수 있습니다.</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
