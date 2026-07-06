import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ClipboardList, Crown, Home, LogIn, LogOut, MessageSquare, MessageSquareText, Sparkles, Waves } from 'lucide-react'
import { Button } from './ui'
import { signOut, useSupabaseUser } from '../lib/useSupabaseUser'

const navItems = [
  { path: '/home', label: '교사 화면', icon: Home },
  { path: '/codes', label: '가치코드', icon: ClipboardList },
  { path: '/board', label: '학습게시판', icon: MessageSquareText },
  { path: '/talk', label: '채팅', icon: MessageSquare },
  { path: '/dex', label: '데이터바다', icon: Waves },
  { path: '/graduation', label: '임명식', icon: Crown },
]

export function AppFrame() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isConfigured } = useSupabaseUser()
  const isImmersive = false

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
            <button className="flex items-center gap-3" onClick={() => navigate('/')} type="button">
              <span className="h-10 w-8 rounded-[50%_50%_45%_45%/60%_60%_42%_42%] bg-[radial-gradient(circle_at_36%_28%,#FFF6DD,#FFD37A_48%,#E0A03A)] shadow-[0_0_22px_rgba(255,211,122,.42)]" />
              <span className="font-display text-2xl text-[#EAF2F5]">에아몬</span>
            </button>
            {user ? (
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
              {user ? (
                <Button className="min-h-10 px-3" onClick={() => navigate('/start')}>
                  <Sparkles size={18} />
                  학급 시작
                </Button>
              ) : null}
            </div>
          </header>
        ) : null}
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
