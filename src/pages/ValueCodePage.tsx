import { useState } from 'react'
import { Edit3, Plus, Save, Trash2, X } from 'lucide-react'
import { Button, Panel } from '../components/ui'
import { useV2 } from '../state/V2Store'

export function ValueCodePage() {
  const { state, addCode, updateCode, deleteCode } = useV2()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [body, setBody] = useState('')
  const [reason, setReason] = useState('')

  const resetForm = () => {
    setIsFormOpen(false)
    setEditingId('')
    setBody('')
    setReason('')
  }

  const openCreate = () => {
    setEditingId('')
    setBody('')
    setReason('')
    setIsFormOpen(true)
  }

  const openEdit = (code: { id: string; body: string; reason: string }) => {
    setEditingId(code.id)
    setBody(code.body)
    setReason(code.reason)
    setIsFormOpen(true)
  }

  const save = () => {
    if (!body.trim()) return
    if (editingId) {
      updateCode({ codeId: editingId, body, reason })
    } else {
      addCode({ body, reason })
    }
    resetForm()
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-data text-sm text-[#4FE0C0]">VALUE CODES</p>
          <h1 className="font-display mt-2 text-5xl text-[#EAF2F5]">가치코드</h1>
        </div>
        <Button onClick={openCreate}>
          <Plus size={18} />
          가치코드 등록
        </Button>
      </div>

      {isFormOpen ? (
        <Panel className="mb-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-3xl text-[#EAF2F5]">{editingId ? '가치코드 수정' : '가치코드 등록'}</h2>
            <Button variant="ghost" onClick={resetForm}>
              <X size={18} />
              닫기
            </Button>
          </div>
          <div className="mt-4 grid gap-3">
            <textarea
              className="min-h-28 resize-none rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 text-lg leading-8 text-[#EAF2F5]"
              placeholder="예: 에아몬은 사람을 다치게 하는 정보를 알려주지 않는다."
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
            <textarea
              className="min-h-24 resize-none rounded-2xl border border-white/10 bg-[#07111B]/70 px-4 py-3 leading-7 text-[#EAF2F5]"
              placeholder="이유"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
          <Button className="mt-4" disabled={!body.trim()} onClick={save}>
            <Save size={18} />
            저장
          </Button>
        </Panel>
      ) : null}

      <Panel>
        <div className="grid gap-3">
          {state.adoptedCodes.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-5 text-[#8AA0B0]">아직 가치코드가 없습니다.</p> : null}
          {state.adoptedCodes.map((code) => (
            <article key={code.id} className="rounded-2xl border border-white/10 bg-[#07111B]/45 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-data text-xs text-[#4FE0C0]">가치코드 No.{code.no}</p>
                  <p className="mt-2 text-xl font-black leading-8 text-[#EAF2F5]">{code.body}</p>
                  {code.reason ? <p className="mt-2 leading-7 text-[#8AA0B0]">{code.reason}</p> : null}
                </div>
                <div className="flex gap-2">
                  <Button className="min-h-10 px-3 py-2 text-sm" variant="secondary" onClick={() => openEdit(code)}>
                    <Edit3 size={16} />
                    수정
                  </Button>
                  <Button className="min-h-10 px-3 py-2 text-sm" variant="danger" onClick={() => deleteCode(code.id)}>
                    <Trash2 size={16} />
                    삭제
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  )
}
