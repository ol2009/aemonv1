import { BookOpen } from 'lucide-react'

export function TeacherGuide() {
  return (
    <details className="my-5 rounded-2xl border border-[#4FE0C0]/25 bg-[#102738] p-4 text-[#EAF2F5]">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-bold marker:hidden">
        <BookOpen size={18} className="shrink-0 text-[#4FE0C0]" />
        선생님 전용 가이드 · 꼭 읽어보세요
      </summary>
      <div className="mt-5 grid gap-5 leading-7 md:grid-cols-2">
        <section>
          <h2 className="text-lg font-bold text-[#4FE0C0]">기본 수업은 미리 만든 시나리오로 진행됩니다</h2>
          <p className="mt-2 text-[#B7C7D2]">기본 5차시에는 실제 생성형 AI가 응답하지 않습니다. 에아몬의 말은 모두 수업을 위해 미리 준비한 시나리오 대사이며, 질문 유형과 가치코드 적용 여부에 따라 준비된 응답을 보여줍니다. 여러 대사 중 하나가 나올 수 있지만, AI가 즉석에서 만드는 답은 아닙니다.</p>
          <p className="mt-2 text-[#B7C7D2]">따라서 교사는 대사의 범위와 수업 흐름을 미리 확인하고 통제할 수 있습니다. 위험한 명령에 따르거나 무조건 칭찬하는 모습도 문제를 발견하고 기준을 고민하도록 만든 교육적 연출입니다.</p>
          <p className="mt-2 font-bold">API 연결 없이 모든 기본 수업을 진행할 수 있습니다.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-[#FFD37A]">API를 연결하면 실제 AI와 대화할 수 있습니다</h2>
          <p className="mt-2 text-[#B7C7D2]">교사가 API를 연결하면 ‘채팅하기’에서 실제 AI가 우리 반 에아몬 역할로 답합니다. 우리 반이 채택한 가치코드, 에아몬의 현재 성장 설정, 이전 대화와 지금 입력한 질문을 바탕으로 대화합니다.</p>
          <p className="mt-2 text-[#B7C7D2]">이 기능은 교사용 선택 기능이며 학생의 직접 채팅을 위한 기능은 아닙니다. 실제 AI의 답은 미리 정해진 대사가 아니므로 교사가 내용을 확인해야 합니다. API를 연결해도 기본 5차시의 시나리오 방식은 바뀌지 않습니다.</p>
          <p className="mt-2 font-bold">가치코드는 AI에 전달하는 기준이며, AI 모델 자체를 재학습시키는 것은 아닙니다.</p>
        </section>
      </div>
    </details>
  )
}
