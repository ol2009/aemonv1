import { useMemo, useState } from 'react'
import { MessageSquareText, QrCode, Send } from 'lucide-react'
import { Button, PageHeader, Panel } from '../components/ui'
import { useAemon } from '../state/AemonStore'

const BOARD_PROMPT = '에아몬은 어떤 성격이면 좋겠어? 어떤 존재가 되었으면 좋겠어?'

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
  } catch {
    return ''
  }
}

export function BoardPage() {
  const { state, addBoardPost } = useAemon()
  const [nickname, setNickname] = useState('')
  const [body, setBody] = useState('')

  const boardUrl = useMemo(() => {
    if (typeof window === 'undefined') return '/board'
    return `${window.location.origin}/board`
  }, [])
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(boardUrl)}`

  const submit = () => {
    addBoardPost({ nickname, body, prompt: BOARD_PROMPT })
    setBody('')
  }

  return (
    <div className="mx-auto max-w-6xl px-5 pb-20">
      <PageHeader title="학급게시판" eyebrow="class board">
        학생은 가입하지 않고 닉네임으로만 참여합니다. 실명, 번호, 연락처는 쓰지 않습니다.
      </PageHeader>

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <Panel>
          <div className="flex items-center gap-2 text-[#FFD37A]">
            <QrCode size={22} />
            <h2 className="text-xl font-bold text-[#EAF2F5]">학생 접속 QR</h2>
          </div>
          <div className="mt-5 rounded-3xl bg-white p-4">
            <img className="mx-auto h-52 w-52" src={qrUrl} alt="학급게시판 QR 코드" />
          </div>
          <p className="mt-4 break-all rounded-2xl border border-white/10 bg-[#07111B]/50 p-3 text-sm leading-6 text-[#B7C7D2]">{boardUrl}</p>
          <p className="mt-4 text-sm leading-6 text-[#8AA0B0]">
            현재 버전은 브라우저 저장 기반입니다. Supabase 학급게시판 테이블을 연결하면 여러 기기 글을 한 게시판에 모을 수 있습니다.
          </p>
        </Panel>

        <div className="grid gap-5">
          <Panel>
            <div className="flex items-center gap-2">
              <MessageSquareText className="text-[#4FE0C0]" />
              <div>
                <p className="font-data text-xs uppercase tracking-wider text-[#8AA0B0]">today prompt</p>
                <h2 className="text-xl font-bold text-[#EAF2F5]">{BOARD_PROMPT}</h2>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <label>
                <span className="text-sm font-bold text-[#8AA0B0]">닉네임</span>
                <input
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-[#EAF2F5]"
                  maxLength={16}
                  placeholder="예: 반짝이, 코딩왕"
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                />
              </label>
              <label>
                <span className="text-sm font-bold text-[#8AA0B0]">내 생각</span>
                <textarea
                  className="mt-1 min-h-32 w-full resize-none rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 leading-7 text-[#EAF2F5]"
                  maxLength={280}
                  placeholder="에아몬에게 바라는 성격이나 모습을 적어주세요."
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                />
              </label>
              <div className="flex justify-end">
                <Button disabled={!nickname.trim() || !body.trim()} onClick={submit}>
                  <Send size={18} />
                  올리기
                </Button>
              </div>
            </div>
          </Panel>

          <section className="grid gap-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="font-data text-xs uppercase tracking-wider text-[#FFD37A]">{state.className || '우리 반'}</p>
                <h2 className="font-display mt-1 text-3xl text-[#EAF2F5]">학생 글 {state.boardPosts.length}개</h2>
              </div>
            </div>
            {state.boardPosts.length === 0 ? (
              <Panel className="text-center text-[#8AA0B0]">아직 올라온 글이 없습니다.</Panel>
            ) : (
              state.boardPosts.map((post) => (
                <article key={post.id} className="rounded-2xl border border-white/10 bg-[#14283D]/80 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-bold text-[#FFD37A]">{post.nickname}</p>
                    <p className="font-data text-xs text-[#8AA0B0]">{formatDate(post.createdAt)}</p>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap leading-7 text-[#EAF2F5]">{post.body}</p>
                </article>
              ))
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
