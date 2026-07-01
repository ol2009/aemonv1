import { Navigate, Route, Routes } from 'react-router-dom'
import { AppFrame } from './components/AppFrame'
import { AemonProvider } from './state/AemonStore'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { BoardPage } from './pages/BoardPage'
import { ConversationPage } from './pages/ConversationPage'
import { EvolutionPage } from './pages/EvolutionPage'
import { GraduationPage } from './pages/GraduationPage'
import { GuidePage } from './pages/GuidePage'
import { HomePage } from './pages/HomePage'
import { IntroPage } from './pages/IntroPage'
import { LandingPage } from './pages/LandingPage'
import { LessonRunPage } from './pages/LessonRunPage'
import { LoginPage } from './pages/LoginPage'
import { SettingsPage } from './pages/SettingsPage'
import { StartPage } from './pages/StartPage'
import { ValueCodePage } from './pages/ValueCodePage'

export default function App() {
  return (
    <AemonProvider>
      <Routes>
        <Route element={<AppFrame />}>
          <Route index element={<LandingPage />} />
          <Route path="start" element={<StartPage />} />
          <Route path="guide" element={<GuidePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="auth/callback" element={<AuthCallbackPage />} />
          <Route path="intro" element={<IntroPage />} />
          <Route path="home" element={<HomePage />} />
          <Route path="lesson" element={<LessonRunPage />} />
          <Route path="codes" element={<ValueCodePage />} />
          <Route path="board" element={<BoardPage />} />
          <Route path="talk" element={<ConversationPage />} />
          <Route path="evolution" element={<EvolutionPage />} />
          <Route path="graduation" element={<GraduationPage />} />
          <Route path="dex" element={<Navigate to="/home" replace />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AemonProvider>
  )
}
