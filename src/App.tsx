import { Navigate, Route, Routes } from 'react-router-dom'
import { AppFrame } from './components/AppFrame'
import { V2Provider } from './state/V2Store'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { BoardPage } from './pages/BoardPage'
import { ConversationPage } from './pages/ConversationPage'
import { DexPage } from './pages/DexPage'
import { GraduationPage } from './pages/GraduationPage'
import { HomePage } from './pages/HomePage'
import { LandingPage } from './pages/LandingPage'
import { LessonOnePage } from './pages/LessonOnePage'
import { LessonTwoPage } from './pages/LessonTwoPage'
import { LoginPage } from './pages/LoginPage'
import { StartPage } from './pages/StartPage'
import { TrainingPage } from './pages/TrainingPage'
import { ValueCodePage } from './pages/ValueCodePage'

export default function App() {
  return (
    <V2Provider>
      <Routes>
        <Route element={<AppFrame />}>
          <Route index element={<LandingPage />} />
          <Route path="start" element={<StartPage />} />
          <Route path="guide" element={<Navigate to="/training" replace />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="auth/callback" element={<AuthCallbackPage />} />
          <Route path="intro" element={<Navigate to="/home" replace />} />
          <Route path="home" element={<HomePage />} />
          <Route path="lesson" element={<Navigate to="/lesson/1" replace />} />
          <Route path="lesson/1" element={<LessonOnePage />} />
          <Route path="lesson/2" element={<LessonTwoPage />} />
          <Route path="training" element={<TrainingPage />} />
          <Route path="codes" element={<ValueCodePage />} />
          <Route path="board" element={<BoardPage />} />
          <Route path="talk" element={<ConversationPage />} />
          <Route path="evolution" element={<Navigate to="/home" replace />} />
          <Route path="graduation" element={<GraduationPage />} />
          <Route path="dex" element={<DexPage />} />
          <Route path="settings" element={<Navigate to="/talk" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </V2Provider>
  )
}
