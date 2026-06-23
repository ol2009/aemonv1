import { Navigate, Route, Routes } from 'react-router-dom'
import { AppFrame } from './components/AppFrame'
import { AemonProvider } from './state/AemonStore'
import { ConversationPage } from './pages/ConversationPage'
import { DexPage } from './pages/DexPage'
import { EvolutionPage } from './pages/EvolutionPage'
import { GraduationPage } from './pages/GraduationPage'
import { GuidePage } from './pages/GuidePage'
import { HomePage } from './pages/HomePage'
import { IntroPage } from './pages/IntroPage'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { SettingsPage } from './pages/SettingsPage'

export default function App() {
  return (
    <AemonProvider>
      <Routes>
        <Route element={<AppFrame />}>
          <Route index element={<LandingPage />} />
          <Route path="guide" element={<GuidePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="intro" element={<IntroPage />} />
          <Route path="home" element={<HomePage />} />
          <Route path="talk" element={<ConversationPage />} />
          <Route path="evolution" element={<EvolutionPage />} />
          <Route path="graduation" element={<GraduationPage />} />
          <Route path="dex" element={<DexPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AemonProvider>
  )
}
