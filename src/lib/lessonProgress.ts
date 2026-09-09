const prefix = 'aemon.lesson-progress.v1:'
export function progressKey(classCode: string, lesson: number) {
  return `${prefix}${classCode}:${lesson}`
}
export function readLessonProgress(key: string, fallback: number, length: number) {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    const value = JSON.parse(raw)
    return Number.isInteger(value) && value >= 0 && value < length ? value : fallback
  } catch { return fallback }
}
export function clearLessonProgress(classCode: string) {
  try {
    for (let lesson = 1; lesson <= 5; lesson++) localStorage.removeItem(progressKey(classCode, lesson))
  } catch { /* Storage may be unavailable. */ }
}
