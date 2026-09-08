import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AppFrame } from './components/AppFrame'
import { RequireTeacherLogin } from './components/RequireTeacherLogin'
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
import { LessonTestPage } from './pages/LessonTestPage'
import { ValueCodePage } from './pages/ValueCodePage'
import { PostSurveyRecoveryPage } from './pages/PostSurveyRecoveryPage'

function LessonRouteGuard({ lessonNo, children }: { lessonNo: number; children: ReactNode }) {
  const { state } = useV2()
  const searchParams = new URLSearchParams(window.location.search)
  const isStudentView = searchParams.get('role') === 'student' || searchParams.get('live') === 'student'
  const isPreview = searchParams.get('preview') === '1'
  if (isPreview || isStudentView || !state.classCode || state.currentLesson === lessonNo) return children
  return <Navigate to="/home" replace />
}

export default function App() {
  return (
    <V2Provider>
      <Routes>
        <Route element={<AppFrame />}>
          <Route index element={<LandingPage />} />
          <Route path="start" element={<RequireTeacherLogin><StartPage /></RequireTeacherLogin>} />
          <Route path="login" element={<LoginPage />} />
          <Route path="live" element={<LiveClassPage />} />
          <Route path="auth/callback" element={<AuthCallbackPage />} />
          <Route path="home" element={<RequireTeacherLogin><HomePage /></RequireTeacherLogin>} />
          <Route path="lesson" element={<Navigate to="/lesson/1" replace />} />
          <Route path="lesson/1" element={<RequireTeacherLogin allowStudentAccess><LessonRouteGuard lessonNo={1}><LessonOnePage /></LessonRouteGuard></RequireTeacherLogin>} />
          <Route path="lesson/2" element={<RequireTeacherLogin allowStudentAccess><LessonRouteGuard lessonNo={2}><LessonTwoPage /></LessonRouteGuard></RequireTeacherLogin>} />
          <Route path="lesson/3" element={<RequireTeacherLogin allowStudentAccess><LessonRouteGuard lessonNo={3}><LessonThreePage /></LessonRouteGuard></RequireTeacherLogin>} />
          <Route path="lesson/4" element={<RequireTeacherLogin allowStudentAccess><LessonRouteGuard lessonNo={4}><LessonFourPage /></LessonRouteGuard></RequireTeacherLogin>} />
          <Route path="lesson/5" element={<RequireTeacherLogin allowStudentAccess><LessonRouteGuard lessonNo={5}><LessonFivePage /></LessonRouteGuard></RequireTeacherLogin>} />
          <Route path="training" element={<TrainingPage />} />
          <Route path="test" element={<RequireTeacherLogin><LessonTestPage /></RequireTeacherLogin>} />
          <Route path="codes" element={<RequireTeacherLogin><ValueCodePage /></RequireTeacherLogin>} />
          <Route path="board" element={<RequireTeacherLogin allowStudentAccess><BoardPage /></RequireTeacherLogin>} />
          <Route path="talk" element={<RequireTeacherLogin><ConversationPage /></RequireTeacherLogin>} />
          <Route path="graduation" element={<RequireTeacherLogin><GraduationPage /></RequireTeacherLogin>} />
          <Route path="survey-results" element={<RequireTeacherLogin><SurveyResultsPage /></RequireTeacherLogin>} />
          <Route path="post-survey" element={<RequireTeacherLogin><PostSurveyRecoveryPage /></RequireTeacherLogin>} />
          <Route path="dex" element={<RequireTeacherLogin><DexPage /></RequireTeacherLogin>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </V2Provider>
  )
}
