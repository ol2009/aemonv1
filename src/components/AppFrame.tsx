import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ClipboardList, Home, LogIn, LogOut, MessageSquare, MessageSquareText } from 'lucide-react'
import { Button } from './ui'
import { signOut, useSupabaseUser } from '../lib/useSupabaseUser'

const navItems = [
  { path: '/home', label: '대시보드', icon: Home },
  { path: '/codes', label: '가치코드', icon: ClipboardList },
  { path: '/board', label: '학습게시판', icon: MessageSquareText },
  { path: '/talk', label: '채팅', icon: MessageSquare },
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
            <button className="flex items-center" onClick={() => navigate('/')} type="button">
              <span className="font-display text-2xl text-[#EAF2F5]">에아몬</span>
            </button>
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
          </header>
        ) : null}
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
