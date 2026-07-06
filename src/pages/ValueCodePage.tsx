import { useState } from 'react'
import { Edit3, Plus, Save, Trash2, X } from 'lucide-react'
import { Button, Panel } from '../components/ui'
import { useV2 } from '../state/V2Store'

type CodeDraft = {
  id: string
  body: string
  reason: string
}

const emptyDraft: CodeDraft = { id: '', body: '', reason: '' }

export function ValueCodePage() {
  const { state, addCode, updateCode, deleteCode } = useV2()
  const [draft, setDraft] = useState<CodeDraft>(emptyDraft)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const closeModal = () => {
    setDraft(emptyDraft)
    setIsModalOpen(false)
  }

  const openCreate = () => {
    setDraft(emptyDraft)
    setIsModalOpen(true)
  }

  const openEdit = (code: CodeDraft) => {
    setDraft(code)
    setIsModalOpen(true)
  }

  const save = () => {
    const body = draft.body.trim()
    const reason = draft.reason.trim()
    if (!body) return

    if (draft.id) {
      updateCode({ codeId: draft.id, body, reason })
    } else {
      addCode({ body, reason })
    }
    closeModal()
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="font-display text-5xl text-[#EAF2F5]">가치코드</h1>
        <Button onClick={openCreate}>
          <Plus size={18} />
          추가하기
        </Button>
      </div>

      <div className="grid gap-3">
        {state.adoptedCodes.length === 0 ? (
          <Panel className="text-center">
            <p className="text-lg font-bold text-[#8AA0B0]">아직 가치코드가 없습니다.</p>
          </Panel>
        ) : null}

        {state.adoptedCodes.map((code) => (
          <article key={code.id} className="rounded-[18px] border border-white/10 bg-[#14283D]/88 p-5 shadow-2xl shadow-black/20">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-data text-xs text-[#4FE0C0]">No.{code.no}</p>
                <p className="mt-2 text-xl font-black leading-8 text-[#EAF2F5]">{code.body}</p>
                {code.reason ? <p className="mt-2 leading-7 text-[#8AA0B0]">{code.reason}</p> : null}
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#07111B]/45 text-[#B7C7D2] transition hover:border-[#4FE0C0]/50 hover:text-[#EAF2F5]"
                  onClick={() => openEdit(code)}
                  title="수정"
                  type="button"
                >
                  <Edit3 size={17} />
                </button>
                <button
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#07111B]/45 text-[#B7C7D2] transition hover:border-[#E0476B]/60 hover:text-[#EF6381]"
                  onClick={() => deleteCode(code.id)}
                  title="삭제"
                  type="button"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
          <Panel className="w-full max-w-xl">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-3xl text-[#EAF2F5]">{draft.id ? '가치코드 수정' : '가치코드 추가'}</h2>
              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#B7C7D2] transition hover:bg-white/10 hover:text-[#EAF2F5]"
                onClick={closeModal}
                title="닫기"
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-[#8AA0B0]">가치코드</span>
                <textarea
                  className="min-h-28 resize-none rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-lg leading-8 text-[#EAF2F5] outline-none transition focus:border-[#4FE0C0]/60"
                  value={draft.body}
                  onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-[#8AA0B0]">이유</span>
                <textarea
                  className="min-h-24 resize-none rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 leading-7 text-[#EAF2F5] outline-none transition focus:border-[#4FE0C0]/60"
                  value={draft.reason}
                  onChange={(event) => setDraft((current) => ({ ...current, reason: event.target.value }))}
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={closeModal}>
                취소
              </Button>
              <Button disabled={!draft.body.trim()} onClick={save}>
                <Save size={18} />
                저장
              </Button>
            </div>
          </Panel>
        </div>
      ) : null}
    </div>
  )
}
