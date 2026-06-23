import { AemonAvatar } from '../components/AemonAvatar'
import { PageHeader, Panel } from '../components/ui'
import { useAemon } from '../state/AemonStore'

export function DexPage() {
  const { state } = useAemon()
  const entries = state.dex

  return (
    <div className="mx-auto max-w-6xl px-5 pb-20">
      <PageHeader title="데이터의 바다" eyebrow="aemon dex">
        졸업한 에아몬이 이곳에 남습니다. 이미지 API를 연결하면 각 반마다 다른 최종 형태를 저장할 수 있어요.
      </PageHeader>
      {entries.length === 0 ? (
        <Panel className="text-center">
          <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full border border-dashed border-white/20 text-5xl text-[#5E7383]">?</div>
          <h2 className="font-display mt-6 text-3xl text-[#EAF2F5]">아직 데이터의 바다는 고요해요</h2>
          <p className="mt-3 text-[#8AA0B0]">첫 에아몬을 졸업시키면 여기에 기록됩니다.</p>
        </Panel>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <Panel key={entry.id} className="text-center">
              <AemonAvatar stage={entry.finalStage} alignment={entry.alignment} size={140} />
              <h2 className="font-display mt-4 text-2xl text-[#EAF2F5]">{entry.className}</h2>
              <p className={entry.ending === 'good' ? 'mt-1 text-[#4FE0C0]' : 'mt-1 text-[#E0476B]'}>
                {entry.ending === 'good' ? '선 엔딩' : '악 엔딩'}
              </p>
              <p className="mt-2 text-sm text-[#8AA0B0]">친밀도 {entry.intimacy} · {new Date(entry.graduatedAt).toLocaleDateString('ko-KR')}</p>
            </Panel>
          ))}
        </div>
      )}
    </div>
  )
}
