let audioContext: AudioContext | null = null
let unlocked = false
let lastTickAt = 0
let lastEvolutionSoundAt = 0

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

function playTone({
  context,
  destination,
  type,
  frequency,
  endFrequency,
  start,
  duration,
  peak,
}: {
  context: AudioContext
  destination: AudioNode
  type: OscillatorType
  frequency: number
  endFrequency?: number
  start: number
  duration: number
  peak: number
}) {
  const oscillator = context.createOscillator()
  const gain = context.createGain()

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, start)
  if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration * 0.92)

  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(peak, start + Math.min(0.025, duration * 0.28))
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)

  oscillator.connect(gain)
  gain.connect(destination)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.02)
}

function playSweep(context: AudioContext, destination: AudioNode, start: number) {
  const oscillator = context.createOscillator()
  const filter = context.createBiquadFilter()
  const gain = context.createGain()

  oscillator.type = 'sawtooth'
  oscillator.frequency.setValueAtTime(174.61, start)
  oscillator.frequency.exponentialRampToValueAtTime(1396.91, start + 2.35)
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(520, start)
  filter.frequency.exponentialRampToValueAtTime(5200, start + 2.35)
  filter.Q.setValueAtTime(8, start)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(0.035, start + 0.28)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 2.55)

  oscillator.connect(filter)
  filter.connect(gain)
  gain.connect(destination)
  oscillator.start(start)
  oscillator.stop(start + 2.6)
}

function playNoiseBurst(context: AudioContext, destination: AudioNode, start: number) {
  const duration = 0.32
  const buffer = context.createBuffer(1, Math.floor(context.sampleRate * duration), context.sampleRate)
  const data = buffer.getChannelData(0)

  for (let index = 0; index < data.length; index += 1) {
    const fade = 1 - index / data.length
    data[index] = (Math.random() * 2 - 1) * fade
  }

  const source = context.createBufferSource()
  const filter = context.createBiquadFilter()
  const gain = context.createGain()

  source.buffer = buffer
  filter.type = 'highpass'
  filter.frequency.setValueAtTime(900, start)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(0.12, start + 0.018)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)

  source.connect(filter)
  filter.connect(gain)
  gain.connect(destination)
  source.start(start)
  source.stop(start + duration)
}

function scheduleEvolutionSound(context: AudioContext) {
  const master = context.createGain()
  const start = context.currentTime + 0.04
  const pulseNotes = [392, 493.88, 587.33, 739.99, 880, 1174.66]
  const sparkleNotes = [1174.66, 1318.51, 1567.98, 1760, 2093]
  let pulseStart = start

  master.gain.setValueAtTime(0.76, start)
  master.gain.exponentialRampToValueAtTime(0.0001, start + 3.45)
  master.connect(context.destination)
  window.setTimeout(() => master.disconnect(), 3800)

  playSweep(context, master, start)

  for (let index = 0; index < 26; index += 1) {
    const octaveLift = 1 + Math.floor(index / pulseNotes.length) * 0.18
    const frequency = pulseNotes[index % pulseNotes.length] * octaveLift
    playTone({
      context,
      destination: master,
      type: index % 3 === 0 ? 'triangle' : 'square',
      frequency,
      start: pulseStart,
      duration: 0.07,
      peak: 0.042,
    })
    pulseStart += Math.max(0.04, 0.096 - index * 0.0025)
  }

  playNoiseBurst(context, master, start + 2.13)
  ;[523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
    playTone({
      context,
      destination: master,
      type: 'triangle',
      frequency,
      start: start + 2.08 + index * 0.018,
      duration: 0.82,
      peak: 0.038,
    })
  })

  for (let index = 0; index < 14; index += 1) {
    const frequency = sparkleNotes[index % sparkleNotes.length] * (index > 8 ? 1.24 : 1)
    playTone({
      context,
      destination: master,
      type: 'sine',
      frequency,
      endFrequency: frequency * 1.18,
      start: start + 2.24 + index * 0.052,
      duration: 0.18,
      peak: 0.024,
    })
  }

  ;[783.99, 987.77, 1174.66].forEach((frequency, index) => {
    playTone({
      context,
      destination: master,
      type: 'sine',
      frequency,
      start: start + 2.92 + index * 0.055,
      duration: 0.48,
      peak: 0.03,
    })
  })
}

export function playEvolutionSound() {
  const context = getAudioContext()
  if (!unlocked || !context) return

  const now = Date.now()
  if (now - lastEvolutionSoundAt < 2600) return
  lastEvolutionSoundAt = now

  if (context.state === 'suspended') {
    void context.resume().then(() => scheduleEvolutionSound(context)).catch(() => undefined)
    return
  }

  if (context.state === 'running') scheduleEvolutionSound(context)
}
