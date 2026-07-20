type DialogueSkipper = () => boolean

let nextSkipperId = 0
const activeSkippers = new Map<number, DialogueSkipper>()

export function skipActiveDialogue() {
  const skippers = [...activeSkippers.values()].reverse()
  return skippers.some((skip) => skip())
}

export function registerDialogueSkipper(skip: DialogueSkipper) {
  const id = nextSkipperId
  nextSkipperId += 1
  activeSkippers.set(id, skip)
  return () => activeSkippers.delete(id)
}
