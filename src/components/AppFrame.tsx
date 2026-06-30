import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, Home, Settings, Sparkles } from 'lucide-react'
import { Button } from './ui'

const navItems = [
  { path: '/', label: '소개', icon: Sparkles },
  { path: '/guide', label: '교사 가이드', icon: BookOpen },
  { path: '/home', label: '홈', icon: Home },
  { path: '/settings', label: '설정', icon: Settings },
]

export function AppFrame() {
  const navigate = useNavigate()
  const location = useLocation()
  const isImmersive = ['/intro', '/evolution', '/graduation', '/talk'].includes(location.pathname)

  return (
    <div className="data-sea relative min-h-screen overflow-hidden">
      <div className="relative z-10 min-h-screen">
        {!isImmersive ? (
          <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-5">
            <button className="flex items-center gap-3" onClick={() => navigate('/')} type="button">
              <span className="h-10 w-8 rounded-[50%_50%_45%_45%/60%_60%_42%_42%] bg-[radial-gradient(circle_at_36%_28%,#FFF6DD,#FFD37A_48%,#E0A03A)] shadow-[0_0_22px_rgba(255,211,122,.42)]" />
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
            <Button className="hidden md:inline-flex" onClick={() => navigate('/intro')}>
              <Sparkles size={18} />
              시작하기
            </Button>
          </header>
        ) : null}
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
