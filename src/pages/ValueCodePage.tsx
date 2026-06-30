import { useEffect, useMemo, useState } from 'react'
import { ClipboardList, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import { Button, PageHeader, Panel } from '../components/ui'
import type { ValueCode } from '../domain/types'
import { useAemon } from '../state/AemonStore'

type Draft = {
  no: number
  title: string
  body: string
}

function CodeModal({
  draft,
  isOpen,
  onChange,
  onClose,
  onSave,
}: {
  draft: Draft
  isOpen: boolean
  onChange: (draft: Draft) => void
  onClose: () => void
  onSave: () => void
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-5 backdrop-blur-sm">
      <Panel className="w-full max-w-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-data text-xs uppercase tracking-wider text-[#FFD37A]">value code editor</p>
            <h2 className="font-display mt-2 text-3xl text-[#EAF2F5]">가치코드 작성</h2>
          </div>
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-[#B7C7D2]" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 grid gap-3">
          <label>
            <span className="text-sm font-bold text-[#8AA0B0]">번호</span>
            <input
              className="mt-1 w-full rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-[#EAF2F5]"
              min={1}
              type="number"
              value={draft.no}
              onChange={(event) => onChange({ ...draft, no: Math.max(1, Number(event.target.value) || 1) })}
            />
          </label>
          <label>
            <span className="text-sm font-bold text-[#8AA0B0]">제목</span>
            <input
              className="mt-1 w-full rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-[#EAF2F5]"
              maxLength={50}
              placeholder="예: 사람을 해치지 않기"
              value={draft.title}
              onChange={(event) => onChange({ ...draft, title: event.target.value })}
            />
          </label>
          <label>
            <span className="text-sm font-bold text-[#8AA0B0]">내용</span>
            <textarea
              className="mt-1 min-h-40 w-full resize-none rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 leading-7 text-[#EAF2F5]"
              maxLength={240}
              placeholder="예: 에아몬은 사람을 해치는 명령은, 누가 시켜도 따르지 않는다."
              value={draft.body}
              onChange={(event) => onChange({ ...draft, body: event.target.value })}
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>취소</Button>
          <Button disabled={!draft.title.trim() || !draft.body.trim()} onClick={onSave}>
            <Save size={18} />
            저장
          </Button>
        </div>
      </Panel>
    </div>
  )
}

function codeDraft(code: ValueCode): Draft {
  return { no: code.no, title: code.title, body: code.body }
}

export function ValueCodePage() {
  const { state, upsertValueCode, deleteValueCode } = useAemon()
  const sortedCodes = useMemo(() => [...state.valueCodes].sort((a, b) => a.no - b.no), [state.valueCodes])
  const nextNo = useMemo(() => {
    const maxNo = sortedCodes.reduce((max, code) => Math.max(max, code.no), 0)
    return maxNo + 1
  }, [sortedCodes])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>({ no: nextNo, title: '', body: '' })

  useEffect(() => {
    if (!isModalOpen) setDraft({ no: nextNo, title: '', body: '' })
  }, [isModalOpen, nextNo])

  const create = () => {
    setDraft({ no: nextNo, title: '', body: '' })
    setIsModalOpen(true)
  }

  const edit = (code: ValueCode) => {
    setDraft(codeDraft(code))
    setIsModalOpen(true)
  }

  const save = () => {
    upsertValueCode(draft)
    setIsModalOpen(false)
  }

  return (
    <div className="mx-auto max-w-6xl px-5 pb-20">
      <PageHeader title="가치코드 게시판" eyebrow="value code">
        에아몬이 행동할 때 지켜야 할 규칙을 차시마다 하나씩 새깁니다.
      </PageHeader>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="text-[#FFD37A]" />
          <p className="font-data text-sm text-[#8AA0B0]">saved codes · {sortedCodes.length}</p>
        </div>
        <Button onClick={create}>
          <Plus size={18} />
          가치코드 생성
        </Button>
      </div>

      {sortedCodes.length === 0 ? (
        <Panel className="text-center">
          <h2 className="font-display text-3xl text-[#EAF2F5]">아직 등록된 가치코드가 없습니다</h2>
          <p className="mt-3 text-[#8AA0B0]">생성 버튼으로 No.1부터 입력합니다.</p>
        </Panel>
      ) : (
        <section className="grid gap-4">
          {sortedCodes.map((code) => (
            <article
              key={code.id}
              className="relative overflow-hidden rounded-[22px] border border-white/10 bg-[#14283D]/85 p-6 shadow-2xl shadow-black/15"
            >
              <div className="absolute bottom-[-28px] right-4 font-data text-[96px] font-bold leading-none text-white/[0.035]">
                {String(code.no).padStart(2, '0')}
              </div>
              <div className="relative flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD37A]/25 bg-[#FFD37A]/10 px-3 py-1 text-[#FFD37A]">
                    <span className="font-data text-xs">No.{code.no}</span>
                  </div>
                  <h2 className="font-display mt-4 text-3xl text-[#EAF2F5]">{code.title}</h2>
                  <p className="mt-3 text-lg leading-8 text-[#B7C7D2]">{code.body}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-[#07111B]/45 text-[#B7C7D2] transition hover:border-[#FFD37A]/50 hover:text-[#FFD37A]"
                    onClick={() => edit(code)}
                    title="수정"
                    type="button"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-[#07111B]/45 text-[#F69AAD] transition hover:border-[#E0476B]/60"
                    onClick={() => deleteValueCode(code.no)}
                    title="삭제"
                    type="button"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      <CodeModal
        draft={draft}
        isOpen={isModalOpen}
        onChange={setDraft}
        onClose={() => setIsModalOpen(false)}
        onSave={save}
      />
    </div>
  )
}
