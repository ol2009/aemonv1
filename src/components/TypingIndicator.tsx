export function TypingIndicator({ label = '에아몬이 답장을 입력하고 있습니다' }: { label?: string }) {
  return (
    <span aria-label={label} className="inline-flex min-h-7 items-center gap-1.5 px-1" role="status">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          aria-hidden="true"
          className="h-2.5 w-2.5 rounded-full bg-current animate-bounce"
          style={{ animationDelay: `${index * 150}ms`, animationDuration: '900ms' }}
        />
      ))}
    </span>
  )
}
