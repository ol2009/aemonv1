export type JosaPair = '은/는' | '이/가' | '을/를' | '과/와' | '이야/야' | '이구나/구나' | '이라고/라고' | '으로/로'

function finalConsonantIndex(value: string) {
  const last = Array.from(value.trim()).at(-1)
  if (!last) return 0

  const code = last.charCodeAt(0)
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28
  if (/\d/.test(last)) return '013678'.includes(last) ? 1 : 0
  return 0
}

export function withJosa(value: string, pair: JosaPair) {
  const word = value.trim()
  if (!word) return word

  const consonantIndex = finalConsonantIndex(word)
  const [withBatchim, withoutBatchim] = pair.split('/')
  const particle = pair === '으로/로' && consonantIndex === 8
    ? withoutBatchim
    : consonantIndex > 0
      ? withBatchim
      : withoutBatchim

  return `${word}${particle}`
}
