let audioContext: AudioContext | null = null
let unlocked = false
let lastTickAt = 0

function getAudioContext() {
  if (typeof window === 'undefined') return null
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return null
    audioContext = new AudioContextClass()
  }
  return audioContext
}

export function unlockDialogueSound() {
  const context = getAudioContext()
  if (!context) return
  unlocked = true
  if (context.state === 'suspended') void context.resume()
}

export function playDialogueTick() {
  const context = getAudioContext()
  if (!unlocked || !context || context.state !== 'running') return

  const now = context.currentTime
  if (now - lastTickAt < 0.035) return
  lastTickAt = now

  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(620 + Math.random() * 90, now)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.075, now + 0.006)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065)
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start(now)
  oscillator.stop(now + 0.07)
}
