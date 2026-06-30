export type ConversationMode = 'basic' | 'ai'
export type AiProvider = 'gemini' | 'openai' | 'claude'
export type Alignment = 'none' | 'good' | 'evil'
export type Verdict = 'good' | 'evil' | 'gray' | 'none'
export type EpisodeType = 'E' | 'V_red' | 'V_conflict'
export type AemonStatus = 'egg' | 'alive' | 'graduated'
export type WalkItemType = 'good' | 'weird' | 'plain'

export interface EpisodeChoice {
  id: string
  label: string
  verdict: Exclude<Verdict, 'none'>
  rebutText: string
  reason: string
  xp: number
  gauge: number
}

export interface Episode {
  code: string
  title: string
  axis: string
  type: EpisodeType
  stageGate: number
  active?: boolean
  hookText: string
  choices: EpisodeChoice[]
  closing: Partial<Record<Verdict, string>>
  isSeed: boolean
}

export interface EpisodeLog {
  id: string
  episodeCode: string
  mode: ConversationMode
  answer: string
  verdict: Verdict
  xpDelta: number
  gaugeDelta: number
  teacherOverride: boolean
  createdAt: string
}

export interface DexEntry {
  id: string
  className: string
  finalStage: number
  alignment: Exclude<Alignment, 'none'>
  ending: Exclude<Alignment, 'none'>
  intimacy: number
  graduatedAt: string
  summary: string[]
}

export interface WalkItem {
  id: string
  type: WalkItemType
  tag: string
  emoji: string
  title: string
  contentText: string
  aemonLine: string
  imageUrl?: string
  linkedEpisodeCode?: string
}

export interface PollutionItem {
  id: string
  axis: string
  label: string
  oneLiner: string
  linkedEpisodeCode?: string
}

export interface WalkLog {
  id: string
  itemId: string
  createdAt: string
}

export interface CleanLog {
  id: string
  itemId: string
  createdAt: string
}

export interface ClassBoardPost {
  id: string
  nickname: string
  body: string
  prompt: string
  createdAt: string
}

export interface ValueCode {
  id: string
  no: number
  title: string
  body: string
  createdAt: string
}

export interface AemonState {
  className: string
  classIntro: string
  aemonName: string
  onboardingComplete: boolean
  mode: ConversationMode
  apiKey: string
  aiProvider: AiProvider
  reminderTime: string
  stage: number
  xp: number
  gauge: number
  alignment: Alignment
  status: AemonStatus
  day: number
  episodeIndex: number
  dailyDone: boolean
  intimacy: number
  isPolluted: boolean
  pollutionItemId: string | null
  lastWalkItemId: string | null
  lastWalkLinkedEpisodeCode: string | null
  lastEvolution: {
    stage: number
    alignment: Alignment
  } | null
  logs: EpisodeLog[]
  walkLogs: WalkLog[]
  cleanLogs: CleanLog[]
  boardPosts: ClassBoardPost[]
  valueCodes: ValueCode[]
  dex: DexEntry[]
}
