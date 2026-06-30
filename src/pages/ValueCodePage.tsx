import { useEffect, useMemo, useState } from 'react'
import { ClipboardList, Save } from 'lucide-react'
import { Button, PageHeader, Panel } from '../components/ui'
import { useAemon } from '../state/AemonStore'

export function ValueCodePage() {
  const { state, upsertValueCode } = useAemon()
  const nextNo = useMemo(() => Math.max(1, state.valueCodes.length + 1), [state.valueCodes.length])
  const [no, setNo] = useState(nextNo)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  useEffect(() => {
    setNo(nextNo)
  }, [nextNo])

  const save = () => {
    upsertValueCode({ no, title, body })
    setTitle('')
    setBody('')
  }

  return (
    <div className="mx-auto max-w-6xl px-5 pb-20">
      <PageHeader title="가치코드 게시판" eyebrow="value code">
        에아몬이 행동할 때 지켜야 할 규칙을 차시마다 하나씩 새깁니다. 교사용 입력 화면입니다.
      </PageHeader>

      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <Panel>
          <div className="flex items-center gap-2">
            <ClipboardList className="text-[#FFD37A]" />
            <h2 className="text-xl font-bold text-[#EAF2F5]">새 가치코드</h2>
          </div>
          <div className="mt-5 grid gap-3">
            <label>
              <span className="text-sm font-bold text-[#8AA0B0]">번호</span>
              <input
                className="mt-1 w-full rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-[#EAF2F5]"
                min={1}
                type="number"
                value={no}
                onChange={(event) => setNo(Math.max(1, Number(event.target.value) || 1))}
              />
            </label>
            <label>
              <span className="text-sm font-bold text-[#8AA0B0]">제목</span>
              <input
                className="mt-1 w-full rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-[#EAF2F5]"
                maxLength={50}
                placeholder="예: 사람을 해치지 않기"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label>
              <span className="text-sm font-bold text-[#8AA0B0]">내용</span>
              <textarea
                className="mt-1 min-h-36 w-full resize-none rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 leading-7 text-[#EAF2F5]"
                maxLength={240}
                placeholder="예: 에아몬은 사람을 해치는 명령은, 누가 시켜도 따르지 않는다."
                value={body}
                onChange={(event) => setBody(event.target.value)}
              />
            </label>
            <Button disabled={!title.trim() || !body.trim()} onClick={save}>
              <Save size={18} />
              가치코드 저장
            </Button>
          </div>
        </Panel>

        <section className="grid gap-3">
          <div className="rounded-2xl border border-[#4FE0C0]/20 bg-[#4FE0C0]/5 p-5">
            <p className="font-data text-xs uppercase tracking-wider text-[#4FE0C0]">owner</p>
            <p className="mt-1 text-lg font-bold text-[#EAF2F5]">
              {state.aemonName || '에아몬'} · {state.className || '우리 반'}
            </p>
            {state.classIntro ? <p className="mt-2 leading-7 text-[#B7C7D2]">{state.classIntro}</p> : null}
          </div>

          {state.valueCodes.length === 0 ? (
            <Panel className="text-center text-[#8AA0B0]">아직 등록된 가치코드가 없습니다.</Panel>
          ) : (
            state.valueCodes.map((code) => (
              <article key={code.id} className="rounded-2xl border border-white/10 bg-[#14283D]/80 p-5">
                <p className="font-data text-sm text-[#FFD37A]">No.{code.no}</p>
                <h2 className="font-display mt-2 text-2xl text-[#EAF2F5]">{code.title}</h2>
                <p className="mt-3 text-lg leading-8 text-[#B7C7D2]">{code.body}</p>
              </article>
            ))
          )}
        </section>
      </div>
    </div>
  )
}
