/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { seedEpisodes, visibleEpisodes } from '../data/episodes'
import { pickPollutionItem } from '../data/walkItems'
import {
  alignmentFromGauge,
  clampGauge,
  nextThreshold,
  verdictGaugeDelta,
  XP_PER_EPISODE,
} from '../domain/progression'
import type {
  AemonState,
  AiProvider,
  ClassBoardPost,
  ConversationMode,
  DexEntry,
  Episode,
  EpisodeChoice,
  EpisodeLog,
  PollutionItem,
  ValueCode,
  Verdict,
  WalkItem,
} from '../domain/types'

const STORAGE_KEY = 'aemon.mvp.state.v1'

const initialState: AemonState = {
  className: '',
  classIntro: '',
  aemonName: '',
  onboardingComplete: false,
  mode: 'basic',
  apiKey: '',
  aiProvider: 'gemini',
  reminderTime: '09:00',
  stage: 0,
  xp: 0,
  gauge: 0,
  alignment: 'none',
  status: 'egg',
  day: 1,
  episodeIndex: 0,
  dailyDone: false,
  intimacy: 0,
  isPolluted: false,
  pollutionItemId: null,
  lastWalkItemId: null,
  lastWalkLinkedEpisodeCode: null,
  lastEvolution: null,
  logs: [],
  walkLogs: [],
  cleanLogs: [],
  boardPosts: [],
  valueCodes: [],
  dex: [],
}

type Action =
  | { type: 'settings/update'; className: string; mode: ConversationMode; apiKey: string; aiProvider: AiProvider; reminderTime: string }
  | { type: 'project/profile'; className: string; classIntro: string }
  | { type: 'project/onboardingComplete'; className: string; classIntro: string; aemonName: string }
  | { type: 'aemon/name'; name: string }
  | { type: 'board/add'; nickname: string; body: string; prompt: string }
  | { type: 'valueCode/upsert'; code: Omit<ValueCode, 'id' | 'createdAt'> }
  | { type: 'valueCode/delete'; no: number }
  | { type: 'conversation/finish'; episode: Episode; choice: EpisodeChoice; answer: string; verdict: Verdict; teacherOverride: boolean }
  | { type: 'evolution/acknowledge' }
  | { type: 'day/reset' }
  | { type: 'walk/complete'; item: WalkItem }
  | { type: 'pollution/appear'; item: PollutionItem }
  | { type: 'pollution/clean'; item: PollutionItem }
  | { type: 'cycle/graduate' }
  | { type: 'cycle/new' }
  | { type: 'dev/reset' }

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState
    return { ...initialState, ...JSON.parse(raw) } satisfies AemonState
  } catch {
    return initialState
  }
}

function findSeedEpisodeIndex(code: string) {
  const index = seedEpisodes.findIndex((episode) => episode.code === code)
  return index >= 0 ? index : 0
}

function nextEpisodeIndex(state: AemonState) {
  const pool = visibleEpisodes(state.stage)
  if (pool.length === 0) return 0
  const current = seedEpisodes[state.episodeIndex] ?? pool[0]
  const currentVisibleIndex = pool.findIndex((episode) => episode.code === current.code)
  const nextVisible = pool[(currentVisibleIndex + 1) % pool.length]
  return seedEpisodes.findIndex((episode) => episode.code === nextVisible.code)
}

function findEpisodeIndex(code: string | null, stage: number) {
  if (!code) return null
  const episode = seedEpisodes.find((item) => item.code === code)
  if (!episode || episode.stageGate > stage || episode.active === false) return null
  const index = seedEpisodes.findIndex((item) => item.code === code)
  return index >= 0 ? index : null
}

function makeLog(args: {
  episode: Episode
  mode: ConversationMode
  answer: string
  verdict: Verdict
  xpDelta: number
  gaugeDelta: number
  teacherOverride: boolean
}): EpisodeLog {
  return {
    id: crypto.randomUUID(),
    episodeCode: args.episode.code,
    mode: args.mode,
    answer: args.answer,
    verdict: args.verdict,
    xpDelta: args.xpDelta,
    gaugeDelta: args.gaugeDelta,
    teacherOverride: args.teacherOverride,
    createdAt: new Date().toISOString(),
  }
}

function reducer(state: AemonState, action: Action): AemonState {
  switch (action.type) {
    case 'settings/update':
      return {
        ...state,
        className: action.className.trim(),
        mode: action.mode,
        apiKey: action.apiKey,
        aiProvider: action.aiProvider,
        reminderTime: action.reminderTime || '09:00',
      }
    case 'project/profile':
      return {
        ...state,
        className: action.className.trim(),
        classIntro: action.classIntro.trim().slice(0, 180),
      }
    case 'project/onboardingComplete': {
      const alreadyLogged = state.logs.some((log) => log.episodeCode === '알-01')
      const xpDelta = alreadyLogged ? 0 : XP_PER_EPISODE
      const log: EpisodeLog = {
        id: crypto.randomUUID(),
        episodeCode: '알-01',
        mode: state.mode,
        answer: `이름: ${action.aemonName.trim() || '에아몬'} · ${action.classIntro.trim() || '학급 소개 없음'}`,
        verdict: 'gray',
        xpDelta,
        gaugeDelta: 0,
        teacherOverride: false,
        createdAt: new Date().toISOString(),
      }

      return {
        ...state,
        className: action.className.trim(),
        classIntro: action.classIntro.trim().slice(0, 180),
        aemonName: action.aemonName.trim().slice(0, 12) || state.aemonName || '에아몬',
        onboardingComplete: true,
        status: 'alive',
        day: Math.max(state.day, 2),
        xp: state.xp + xpDelta,
        dailyDone: false,
        episodeIndex: findSeedEpisodeIndex('알-02'),
        logs: alreadyLogged ? state.logs : [log, ...state.logs].slice(0, 50),
      }
    }
    case 'aemon/name':
      return { ...state, aemonName: action.name.trim().slice(0, 12) }
    case 'board/add': {
      const post: ClassBoardPost = {
        id: crypto.randomUUID(),
        nickname: action.nickname.trim().slice(0, 16),
        body: action.body.trim().slice(0, 280),
        prompt: action.prompt,
        createdAt: new Date().toISOString(),
      }

      if (!post.nickname || !post.body) return state
      return { ...state, boardPosts: [post, ...state.boardPosts].slice(0, 120) }
    }
    case 'valueCode/upsert': {
      const nextCode: ValueCode = {
        ...action.code,
        id: state.valueCodes.find((code) => code.no === action.code.no)?.id ?? crypto.randomUUID(),
        title: action.code.title.trim().slice(0, 50),
        body: action.code.body.trim().slice(0, 240),
        createdAt: new Date().toISOString(),
      }
      if (!nextCode.title || !nextCode.body) return state
      const exists = state.valueCodes.some((code) => code.no === nextCode.no)
      return {
        ...state,
        valueCodes: exists
          ? state.valueCodes.map((code) => (code.no === nextCode.no ? nextCode : code))
          : [...state.valueCodes, nextCode].sort((a, b) => a.no - b.no),
      }
    }
    case 'valueCode/delete':
      return { ...state, valueCodes: state.valueCodes.filter((code) => code.no !== action.no) }
    case 'conversation/finish': {
      const gaugeDelta = action.episode.type === 'E' ? 0 : verdictGaugeDelta(action.verdict)
      const xpDelta = XP_PER_EPISODE
      const xp = state.xp + xpDelta
      const gauge = clampGauge(state.gauge + gaugeDelta)
      const threshold = nextThreshold(state.stage)
      const shouldEvolve = threshold != null && state.xp < threshold && xp >= threshold
      const nextAlign = shouldEvolve ? alignmentFromGauge(gauge) : state.alignment
      const nextStage = shouldEvolve ? state.stage + 1 : state.stage
      const log = makeLog({
        episode: action.episode,
        mode: state.mode,
        answer: action.answer,
        verdict: action.verdict,
        xpDelta,
        gaugeDelta,
        teacherOverride: action.teacherOverride,
      })

      return {
        ...state,
        xp,
        gauge,
        alignment: shouldEvolve ? nextAlign : state.alignment,
        status: nextStage > 0 ? 'alive' : state.status,
        day: state.day + 1,
        episodeIndex: nextEpisodeIndex({ ...state, stage: nextStage }),
        dailyDone: true,
        stage: nextStage,
        lastEvolution: shouldEvolve ? { stage: nextStage, alignment: nextAlign } : null,
        lastWalkLinkedEpisodeCode: state.lastWalkLinkedEpisodeCode === action.episode.code ? null : state.lastWalkLinkedEpisodeCode,
        logs: [log, ...state.logs].slice(0, 50),
      }
    }
    case 'evolution/acknowledge':
      return { ...state, lastEvolution: null }
    case 'day/reset': {
      const shouldPollute = !state.isPolluted && state.day % 2 === 0
      const pollution = shouldPollute ? pickPollutionItem(state.day + state.xp + state.gauge) : null
      return {
        ...state,
        dailyDone: false,
        isPolluted: shouldPollute ? true : state.isPolluted,
        pollutionItemId: pollution?.id ?? state.pollutionItemId,
      }
    }
    case 'walk/complete':
      return {
        ...state,
        intimacy: state.intimacy + 1,
        lastWalkItemId: action.item.id,
        lastWalkLinkedEpisodeCode: action.item.type === 'weird' ? (action.item.linkedEpisodeCode ?? state.lastWalkLinkedEpisodeCode) : state.lastWalkLinkedEpisodeCode,
        walkLogs: [
          { id: crypto.randomUUID(), itemId: action.item.id, createdAt: new Date().toISOString() },
          ...state.walkLogs,
        ].slice(0, 50),
      }
    case 'pollution/appear':
      return {
        ...state,
        isPolluted: true,
        pollutionItemId: action.item.id,
      }
    case 'pollution/clean':
      return {
        ...state,
        isPolluted: false,
        pollutionItemId: null,
        intimacy: state.intimacy + 1,
        lastWalkLinkedEpisodeCode: action.item.linkedEpisodeCode ?? state.lastWalkLinkedEpisodeCode,
        cleanLogs: [
          { id: crypto.randomUUID(), itemId: action.item.id, createdAt: new Date().toISOString() },
          ...state.cleanLogs,
        ].slice(0, 50),
      }
    case 'cycle/graduate': {
      const ending = state.gauge >= 0 ? 'good' : 'evil'
      const entry: DexEntry = {
        id: crypto.randomUUID(),
        className: state.className,
        finalStage: Math.max(state.stage, 3),
        alignment: ending,
        ending,
        intimacy: state.intimacy,
        graduatedAt: new Date().toISOString(),
        summary: state.logs.slice(0, 3).map((log) => `${log.episodeCode} · ${log.verdict}`),
      }
      return {
        ...state,
        status: 'graduated',
        dex: [entry, ...state.dex],
      }
    }
    case 'cycle/new':
      return {
        ...initialState,
        mode: state.mode,
        apiKey: state.apiKey,
        reminderTime: state.reminderTime,
        dex: state.dex,
      }
    case 'dev/reset':
      return initialState
    default:
      return state
  }
}

interface AemonContextValue {
  state: AemonState
  currentEpisode: Episode
  visibleEpisodeCount: number
  updateSettings: (settings: { className: string; mode: ConversationMode; apiKey: string; aiProvider: AiProvider; reminderTime: string }) => void
  updateClassProfile: (profile: { className: string; classIntro: string }) => void
  completeOnboarding: (profile: { className: string; classIntro: string; aemonName: string }) => void
  nameAemon: (name: string) => void
  addBoardPost: (post: { nickname: string; body: string; prompt: string }) => void
  upsertValueCode: (code: Omit<ValueCode, 'id' | 'createdAt'>) => void
  deleteValueCode: (no: number) => void
  finishConversation: (args: {
    episode: Episode
    choice: EpisodeChoice
    answer: string
    verdict: Verdict
    teacherOverride: boolean
  }) => void
  acknowledgeEvolution: () => void
  resetDay: () => void
  completeWalk: (item: WalkItem) => void
  showPollution: (item: PollutionItem) => void
  cleanPollution: (item: PollutionItem) => void
  graduate: () => void
  newCycle: () => void
  resetDemo: () => void
}

const AemonContext = createContext<AemonContextValue | null>(null)

export function AemonProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const value = useMemo<AemonContextValue>(() => {
    const pool = visibleEpisodes(state.stage)
    const linkedIndex = findEpisodeIndex(state.lastWalkLinkedEpisodeCode, state.stage)
    const indexedEpisode = seedEpisodes[state.episodeIndex]
    const currentEpisode = (linkedIndex != null ? seedEpisodes[linkedIndex] : indexedEpisode?.active === false ? null : indexedEpisode) ?? pool[0] ?? seedEpisodes[0]

    return {
      state,
      currentEpisode,
      visibleEpisodeCount: pool.length,
      updateSettings: (settings) => dispatch({ type: 'settings/update', ...settings }),
      updateClassProfile: (profile) => dispatch({ type: 'project/profile', ...profile }),
      completeOnboarding: (profile) => dispatch({ type: 'project/onboardingComplete', ...profile }),
      nameAemon: (name) => dispatch({ type: 'aemon/name', name }),
      addBoardPost: (post) => dispatch({ type: 'board/add', ...post }),
      upsertValueCode: (code) => dispatch({ type: 'valueCode/upsert', code }),
      deleteValueCode: (no) => dispatch({ type: 'valueCode/delete', no }),
      finishConversation: (args) => dispatch({ type: 'conversation/finish', ...args }),
      acknowledgeEvolution: () => dispatch({ type: 'evolution/acknowledge' }),
      resetDay: () => dispatch({ type: 'day/reset' }),
      completeWalk: (item) => dispatch({ type: 'walk/complete', item }),
      showPollution: (item) => dispatch({ type: 'pollution/appear', item }),
      cleanPollution: (item) => dispatch({ type: 'pollution/clean', item }),
      graduate: () => dispatch({ type: 'cycle/graduate' }),
      newCycle: () => dispatch({ type: 'cycle/new' }),
      resetDemo: () => dispatch({ type: 'dev/reset' }),
    }
  }, [state])

  return <AemonContext.Provider value={value}>{children}</AemonContext.Provider>
}

export function useAemon() {
  const value = useContext(AemonContext)
  if (!value) throw new Error('useAemon must be used inside AemonProvider')
  return value
}
