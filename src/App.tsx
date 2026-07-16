import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AppFrame } from './components/AppFrame'
import { V2Provider, useV2 } from './state/V2Store'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { BoardPage } from './pages/BoardPage'
import { ConversationPage } from './pages/ConversationPage'
import { DexPage } from './pages/DexPage'
import { GraduationPage } from './pages/GraduationPage'
import { HomePage } from './pages/HomePage'
import { LandingPage } from './pages/LandingPage'
import { LessonOnePage } from './pages/LessonOnePage'
import { LessonTwoPage } from './pages/LessonTwoPage'
import { LessonThreePage } from './pages/LessonThreePage'
import { LessonFourPage } from './pages/LessonFourPage'
import { LessonFivePage } from './pages/LessonFivePage'
import { LoginPage } from './pages/LoginPage'
import { LiveClassPage } from './pages/LiveClassPage'
import { StartPage } from './pages/StartPage'
import { SurveyResultsPage } from './pages/SurveyResultsPage'
import { TrainingPage } from './pages/TrainingPage'
import { ValueCodePage } from './pages/ValueCodePage'

function LessonRouteGuard({ lessonNo, children }: { lessonNo: number; children: ReactNode }) {
  const { state } = useV2()
  const searchParams = new URLSearchParams(window.location.search)
  const isStudentView = searchParams.get('role') === 'student' || searchParams.get('live') === 'student'
  if (isStudentView || !state.classCode || state.currentLesson === lessonNo) return children
  return <Navigate to="/home" replace />
}

export default function App() {
  return (
    <V2Provider>
      <Routes>
        <Route element={<AppFrame />}>
          <Route index element={<LandingPage />} />
          <Route path="start" element={<StartPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="live" element={<LiveClassPage />} />
          <Route path="auth/callback" element={<AuthCallbackPage />} />
          <Route path="home" element={<HomePage />} />
          <Route path="lesson" element={<Navigate to="/lesson/1" replace />} />
          <Route path="lesson/1" element={<LessonRouteGuard lessonNo={1}><LessonOnePage /></LessonRouteGuard>} />
          <Route path="lesson/2" element={<LessonRouteGuard lessonNo={2}><LessonTwoPage /></LessonRouteGuard>} />
          <Route path="lesson/3" element={<LessonRouteGuard lessonNo={3}><LessonThreePage /></LessonRouteGuard>} />
          <Route path="lesson/4" element={<LessonRouteGuard lessonNo={4}><LessonFourPage /></LessonRouteGuard>} />
          <Route path="lesson/5" element={<LessonRouteGuard lessonNo={5}><LessonFivePage /></LessonRouteGuard>} />
          <Route path="training" element={<TrainingPage />} />
          <Route path="codes" element={<ValueCodePage />} />
          <Route path="board" element={<BoardPage />} />
          <Route path="talk" element={<ConversationPage />} />
          <Route path="graduation" element={<GraduationPage />} />
          <Route path="survey-results" element={<SurveyResultsPage />} />
          <Route path="dex" element={<DexPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </V2Provider>
  )
}
