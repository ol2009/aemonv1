import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Panel } from '../components/ui'
import { POST_SURVEY_RECOVERY_CLASS_ID, POST_SURVEY_RECOVERY_LABEL } from '../data/postSurveyRecovery'
import { parseSurveyAnswer, POST_SURVEY_KEY, postSurveyOpenQuestions } from '../data/survey'
import { absoluteUrl } from '../lib/siteUrl'
import { fetchRemoteSurveyResponsesByPrefix, isRemoteReady } from '../lib/v2Remote'
import { useV2, type SurveyResponse } from '../state/V2Store'
import { TeacherPostSurveyResults } from './LessonFivePage'

export function PostSurveyRecoveryPage() {
  const { state } = useV2()
  const allowed = state.classId === POST_SURVEY_RECOVERY_CLASS_ID
  const [responses, setResponses] = useState<SurveyResponse[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [copyMessage, setCopyMessage] = useState('')
  const questions = useMemo(() => postSurveyOpenQuestions(state.aemonName), [state.aemonName])
  const studentUrl = absoluteUrl(`/lesson/5?role=student&activity=post&code=${encodeURIComponent(state.classCode)}`)

  const refresh = useCallback(async () => {
    if (!allowed) return
    if (!isRemoteReady()) {
      setError('설문 저장 서버에 연결되지 않았습니다. 연결 설정을 확인해 주세요.')
      return
    }
    setIsRefreshing(true)
    try {
      const saved = await fetchRemoteSurveyResponsesByPrefix({ classId: POST_SURVEY_RECOVERY_CLASS_ID, questionPrefix: POST_SURVEY_KEY })
      setResponses(saved)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '응답을 불러오지 못했습니다. 새로고침해 주세요.')
    } finally {
      setIsRefreshing(false)
    }
  }, [allowed])

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0)
    const timer = window.setInterval(() => void refresh(), 5000)
    return () => { window.clearTimeout(initial); window.clearInterval(timer) }
  }, [refresh])

  const answers = useMemo(() => responses
    .filter((response) => response.questionKey === POST_SURVEY_KEY)
    .flatMap((response) => {
      const answer = parseSurveyAnswer(response.body, questions.length)
      return answer && answer.s.length === 8 && answer.s.every((value) => [1, 2, 3, 4].includes(value))
        ? [{ response, answer }]
        : []
    }), [responses, questions.length])

  if (!allowed || !state.classCode) {
    return <Panel><h1 className="text-2xl font-bold">해당 학급의 대시보드에서 열어 주세요.</h1><Link to="/home">학급 홈으로 돌아가기</Link></Panel>
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-5 px-4 pb-10">
      <Link to="/home" className="font-bold underline">← 학급 홈으로 돌아가기</Link>
      <Panel>
        <h1 className="font-display text-3xl text-[var(--ink)]">{POST_SURVEY_RECOVERY_LABEL}</h1>
        <p className="mt-3 text-[var(--ink-mute)]">{state.className} · 학급 코드 {state.classCode}</p>
        <div className="mt-5 grid items-center gap-6 sm:grid-cols-[280px_1fr]">
          <img width={260} height={260} className="mx-auto rounded-xl bg-white p-2" src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&data=${encodeURIComponent(studentUrl)}`} alt="학생 사후 설문 참여 QR 코드" />
          <div>
            <h2 className="text-xl font-bold">학생들은 QR을 찍고 닉네임으로 입장하세요.</h2>
            <p className="mt-3 leading-7">선택형 8문항과 서술형 3문항에 답한 뒤 ‘사후검사 제출’을 누릅니다. ‘사후검사가 저장되었습니다’라는 안내가 나오면 완료입니다.</p>
            <p className="mt-3 text-sm leading-6">학생마다 서로 다른 닉네임을 사용해 주세요. 다시 접속할 때는 같은 닉네임을 쓰면 기존 응답을 수정할 수 있습니다.</p>
            <a className="mt-4 block break-all text-sm underline" href={studentUrl} target="_blank" rel="noreferrer">{studentUrl}</a>
            <Button className="mt-3" variant="secondary" onClick={async () => {
              try { await navigator.clipboard.writeText(studentUrl); setCopyMessage('참여 링크를 복사했습니다.') }
              catch { setCopyMessage('위 참여 링크를 직접 복사해 주세요.') }
            }}>참여 링크 복사</Button>
            <p role="status" className="mt-2 text-sm">{copyMessage}</p>
          </div>
        </div>
        <p className="mt-5 text-sm text-[var(--ink-mute)]">기존 수업·가치코드·설문은 유지됩니다. 아래에는 서버에 저장된 사후 응답이 5초마다 갱신됩니다.</p>
      </Panel>
      {error ? <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-800">{error}</p> : null}
      <TeacherPostSurveyResults answers={answers} questions={questions} isRefreshing={isRefreshing} onRefresh={() => void refresh()} />
    </div>
  )
}
