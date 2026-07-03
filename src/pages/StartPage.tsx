import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, LogIn, RotateCcw, School, UserRound } from 'lucide-react'
import { Button, Panel } from '../components/ui'
import { useSupabaseUser } from '../lib/useSupabaseUser'
import { useV2 } from '../state/V2Store'

export function StartPage() {
  const navigate = useNavigate()
  const { user } = useSupabaseUser()
  const { state, createClass, joinStudent, resetDemo } = useV2()
  const [className, setClassName] = useState(state.className)
  const [classCode, setClassCode] = useState(state.classCode)
  const [nickname, setNickname] = useState(state.studentSession?.nickname ?? '')
  const [message, setMessage] = useState('')

  const create = () => {
    createClass(className, user?.email ?? '')
    setMessage('학급이 생성되었습니다. 학생에게 학급 코드를 알려주세요.')
  }

  const enterStudent = () => {
    joinStudent(classCode, nickname)
    if (classCode.trim() !== state.classCode) {
      setMessage('학급 코드가 맞지 않습니다. 교사 화면의 코드를 확인하세요.')
      return
    }
    navigate('/board')
  }

  return (
    <div className="mx-auto min-h-[calc(100vh-90px)] max-w-6xl px-5 py-10">
      <div className="mb-8">
        <p className="font-data text-sm text-[#4FE0C0]">AEMON V2</p>
        <h1 className="font-display mt-3 text-5xl leading-tight text-[#EAF2F5]">우리 반이 코딩하는 인공지능</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-[#B7C7D2]">
          7차시 동안 학생들이 학급 AI의 가치 코드를 직접 발의·투표·개정합니다.
          학생은 발의와 투표만 하고, 에아몬과의 대화는 교사 화면에서만 진행합니다.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFD37A]/10 text-[#FFD37A]">
              <School size={24} />
            </div>
            <div>
              <p className="font-data text-xs text-[#FFD37A]">TEACHER</p>
              <h2 className="font-display text-3xl text-[#EAF2F5]">학급 만들기</h2>
            </div>
          </div>

          <label className="mt-6 block">
            <span className="text-sm font-bold text-[#8AA0B0]">학급 이름</span>
            <input
              className="mt-2 w-full rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-lg text-[#EAF2F5]"
              placeholder="예: 햇살초 4학년 2반"
              value={className}
              onChange={(event) => setClassName(event.target.value)}
            />
          </label>

          <div className="mt-5 rounded-2xl border border-white/10 bg-[#07111B]/45 p-4">
            <p className="font-data text-xs text-[#8AA0B0]">현재 학급 코드</p>
            <p className="font-display mt-1 text-5xl text-[#FFD37A]">{state.classCode || '----'}</p>
            <p className="mt-2 text-sm leading-6 text-[#8AA0B0]">학생은 로그인 없이 이 코드와 닉네임으로 입장합니다.</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button disabled={!className.trim()} onClick={create}>
              학급 만들기
              <ArrowRight size={18} />
            </Button>
            <Button variant="secondary" disabled={!state.classCode} onClick={() => navigate('/home')}>
              교사 화면으로
            </Button>
            <Button variant="ghost" onClick={() => navigate('/login')}>
              <LogIn size={18} />
              로그인
            </Button>
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#4FE0C0]/10 text-[#4FE0C0]">
              <UserRound size={24} />
            </div>
            <div>
              <p className="font-data text-xs text-[#4FE0C0]">STUDENT</p>
              <h2 className="font-display text-3xl text-[#EAF2F5]">학생 입장</h2>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <label>
              <span className="text-sm font-bold text-[#8AA0B0]">학급 코드</span>
              <input
                className="mt-2 w-full rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-lg text-[#EAF2F5]"
                inputMode="numeric"
                placeholder="칠판의 숫자 코드"
                value={classCode}
                onChange={(event) => setClassCode(event.target.value)}
              />
            </label>
            <label>
              <span className="text-sm font-bold text-[#8AA0B0]">닉네임</span>
              <input
                className="mt-2 w-full rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-lg text-[#EAF2F5]"
                maxLength={16}
                placeholder="실명 대신 별명"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
              />
            </label>
          </div>

          <Button className="mt-6 w-full" disabled={!classCode.trim() || !nickname.trim() || !state.classCode} onClick={enterStudent}>
            발의·투표 화면 입장
          </Button>

          {message ? <p className="mt-4 rounded-2xl border border-[#FFD37A]/25 bg-[#FFD37A]/10 px-4 py-3 text-sm text-[#FFD37A]">{message}</p> : null}
        </Panel>
      </div>

      <div className="mt-5 flex justify-end">
        <button className="inline-flex items-center gap-2 text-sm font-bold text-[#8AA0B0] hover:text-[#EAF2F5]" onClick={resetDemo} type="button">
          <RotateCcw size={16} />
          데모 초기화
        </button>
      </div>
    </div>
  )
}
