/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { evolutionLines } from '../data/v2Lessons'
import type { AiProvider } from '../domain/types'

const STORAGE_KEY = 'aemon.v2.state'
const DEFAULT_DAILY_LIMIT = Number(import.meta.env.VITE_AEMON_DAILY_MESSAGE_LIMIT ?? 200)

export type ProposalStatus = 'pending' | 'adopted' | 'rejected'

export interface NameCandidate {
  id: string
  nickname: string
  name: string
  reason: string
  votes: string[]
  createdAt: string
}

export interface Wish {
  id: string
  nickname: string
  body: string
  createdAt: string
}

export interface CodeProposal {
  id: string
  nickname: string
  body: string
  reason: string
  valueCard: string
  revisionOfNo: number | null
  votes: string[]
  status: ProposalStatus
  adoptedNo: number | null
  createdAt: string
  adoptedAt: string | null
}

export interface AdoptedCode {
  id: string
  no: number
  body: string
  reason: string
  sourceProposalId: string | null
  createdAt: string
}

export interface ChatLog {
  id: string
  question: string
  answer: string
  mode: 'canned' | 'live'
  createdAt: string
  promptSnapshot: string
}

export interface StudentSession {
  classCode: string
  nickname: string
}

export interface V2State {
  classId: string
  className: string
  classCode: string
  aemonName: string
  currentLesson: number
  teacherEmail: string
  apiKey: string
  aiProvider: AiProvider
  nameCandidates: NameCandidate[]
  wishes: Wish[]
  proposals: CodeProposal[]
  adoptedCodes: AdoptedCode[]
  chatLogs: ChatLog[]
  dailyUsage: {
    date: string
    count: number
  }
  studentSession: StudentSession | null
  remote: {
    enabled: boolean
    ok: boolean
    message: string
    lastSyncedAt: string | null
  }
}

const todayKey = () => new Date().toISOString().slice(0, 10)
const clamp = (value: string, length: number) => value.trim().slice(0, length)

function generateClassCode() {
  return String(Math.floor(1000 + Math.random() * 900000)).slice(0, 6)
}

const initialState: V2State = {
  classId: '',
  className: '',
  classCode: '',
  aemonName: '',
  currentLesson: 1,
  teacherEmail: '',
  apiKey: '',
  aiProvider: 'openai',
  nameCandidates: [],
  wishes: [],
  proposals: [],
  adoptedCodes: [],
  chatLogs: [],
  dailyUsage: { date: todayKey(), count: 0 },
  studentSession: null,
  remote: { enabled: false, ok: false, message: 'Supabase 동기화 대기 중', lastSyncedAt: null },
}

type Action =
  | { type: 'class/create'; className: string; teacherEmail?: string }
  | { type: 'class/merge'; payload: Partial<V2State> }
  | { type: 'class/joinStudent'; classCode: string; nickname: string }
  | { type: 'class/leaveStudent' }
  | { type: 'lesson/set'; lessonNo: number }
  | { type: 'settings/updateAi'; provider: AiProvider; apiKey: string }
  | { type: 'remote/status'; ok: boolean; message: string }
  | { type: 'name/add'; nickname: string; name: string; reason?: string }
  | { type: 'name/vote'; nickname: string; candidateId: string }
  | { type: 'name/confirm'; name: string }
  | { type: 'wish/add'; nickname: string; body: string }
  | { type: 'wish/delete'; wishId: string }
  | { type: 'proposal/add'; nickname: string; body: string; reason: string; valueCard: string; revisionOfNo: number | null }
  | { type: 'proposal/vote'; nickname: string; proposalId: string }
  | { type: 'proposal/adopt'; proposalId: string }
  | { type: 'proposal/reject'; proposalId: string }
  | { type: 'code/add'; body: string; reason: string }
  | { type: 'code/update'; codeId: string; body: string; reason: string }
  | { type: 'code/delete'; codeId: string }
  | { type: 'chat/add'; question: string; answer: string; mode: 'canned' | 'live'; promptSnapshot: string }
  | { type: 'dev/reset' }

function normalizeLoaded(raw: unknown): V2State {
  if (!raw || typeof raw !== 'object') return initialState
  const loaded = { ...initialState, ...(raw as Partial<V2State>) }
  return {
    ...loaded,
    remote: { ...initialState.remote, ...(loaded.remote ?? {}) },
    nameCandidates: loaded.nameCandidates.map((candidate) => ({ ...candidate, reason: candidate.reason ?? '' })),
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState
    return normalizeLoaded(JSON.parse(raw))
  } catch {
    return initialState
  }
}

function nextCodeNo(codes: AdoptedCode[]) {
  return codes.reduce((max, code) => Math.max(max, code.no), 0) + 1
}

function voteOnce<T extends { votes: string[]; status?: ProposalStatus }>(items: T[], nickname: string, selectedId: string, getId: (item: T) => string) {
  return items.map((item) => {
    const active = !item.status || item.status === 'pending'
    const votes = active ? item.votes.filter((vote) => vote !== nickname) : item.votes
    if (active && getId(item) === selectedId) return { ...item, votes: [...votes, nickname] }
    return { ...item, votes }
  })
}

function toggleVote<T extends { votes: string[] }>(items: T[], nickname: string, selectedId: string, getId: (item: T) => string) {
  if (!nickname) return items
  return items.map((item) => {
    if (getId(item) !== selectedId) return item
    const already = item.votes.includes(nickname)
    return { ...item, votes: already ? item.votes.filter((vote) => vote !== nickname) : [...item.votes, nickname] }
  })
}

function reducer(state: V2State, action: Action): V2State {
  switch (action.type) {
    case 'class/create': {
      const className = clamp(action.className, 50)
      if (!className) return state
      return {
        ...initialState,
        classId: crypto.randomUUID(),
        className,
        classCode: generateClassCode(),
        teacherEmail: action.teacherEmail ?? state.teacherEmail,
        apiKey: state.apiKey,
        aiProvider: state.aiProvider,
      }
    }
    case 'class/merge':
      return {
        ...state,
        ...action.payload,
        remote: {
          ...state.remote,
          ...(action.payload.remote ?? {}),
          enabled: action.payload.remote?.enabled ?? state.remote.enabled,
          lastSyncedAt: new Date().toISOString(),
        },
        apiKey: state.apiKey,
        aiProvider: state.aiProvider,
        studentSession: state.studentSession,
      }
    case 'class/joinStudent': {
      const nickname = clamp(action.nickname, 16)
      if (!nickname || action.classCode.trim() !== state.classCode) return state
      return { ...state, studentSession: { classCode: state.classCode, nickname } }
    }
    case 'class/leaveStudent':
      return { ...state, studentSession: null }
    case 'lesson/set':
      return { ...state, currentLesson: Math.min(7, Math.max(1, action.lessonNo)) }
    case 'settings/updateAi':
      return { ...state, aiProvider: action.provider, apiKey: action.apiKey }
    case 'remote/status':
      return { ...state, remote: { ...state.remote, enabled: true, ok: action.ok, message: action.message, lastSyncedAt: new Date().toISOString() } }
    case 'name/add': {
      const name = clamp(action.name, 12)
      const reason = clamp(action.reason ?? '', 80)
      const nickname = clamp(action.nickname, 16)
      if (!name || !nickname) return state
      const candidate: NameCandidate = { id: crypto.randomUUID(), nickname, name, reason, votes: [], createdAt: new Date().toISOString() }
      return { ...state, nameCandidates: [candidate, ...state.nameCandidates].slice(0, 80) }
    }
    case 'name/vote':
      return { ...state, nameCandidates: toggleVote(state.nameCandidates, clamp(action.nickname, 16), action.candidateId, (item) => item.id) }
    case 'name/confirm':
      return { ...state, aemonName: clamp(action.name, 12) || state.aemonName }
    case 'wish/add': {
      const nickname = clamp(action.nickname, 16)
      const body = clamp(action.body, 160)
      if (!nickname || !body) return state
      const already = state.wishes.some((wish) => wish.nickname === nickname)
      const wish: Wish = { id: crypto.randomUUID(), nickname, body, createdAt: new Date().toISOString() }
      return { ...state, wishes: already ? state.wishes.map((item) => (item.nickname === nickname ? wish : item)) : [wish, ...state.wishes] }
    }
    case 'wish/delete':
      return { ...state, wishes: state.wishes.filter((wish) => wish.id !== action.wishId) }
    case 'proposal/add': {
      const nickname = clamp(action.nickname, 16)
      const body = clamp(action.body, 180)
      const reason = clamp(action.reason, 180)
      if (!nickname || !body || !reason) return state
      const proposal: CodeProposal = {
        id: crypto.randomUUID(),
        nickname,
        body,
        reason,
        valueCard: clamp(action.valueCard, 20),
        revisionOfNo: action.revisionOfNo,
        votes: [],
        status: 'pending',
        adoptedNo: null,
        createdAt: new Date().toISOString(),
        adoptedAt: null,
      }
      return { ...state, proposals: [proposal, ...state.proposals].slice(0, 160) }
    }
    case 'proposal/vote':
      return { ...state, proposals: voteOnce(state.proposals, clamp(action.nickname, 16), action.proposalId, (item) => item.id) }
    case 'proposal/adopt': {
      const proposal = state.proposals.find((item) => item.id === action.proposalId)
      if (!proposal || proposal.status !== 'pending') return state
      const no = proposal.revisionOfNo ?? nextCodeNo(state.adoptedCodes)
      const adopted: AdoptedCode = {
        id: crypto.randomUUID(),
        no,
        body: proposal.body,
        reason: proposal.reason,
        sourceProposalId: proposal.id,
        createdAt: new Date().toISOString(),
      }
      const withoutRevised = state.adoptedCodes.filter((code) => code.no !== no)
      return {
        ...state,
        adoptedCodes: [...withoutRevised, adopted].sort((a, b) => a.no - b.no),
        proposals: state.proposals.map((item) =>
          item.id === proposal.id ? { ...item, status: 'adopted', adoptedNo: no, adoptedAt: new Date().toISOString() } : item,
        ),
      }
    }
    case 'proposal/reject':
      return { ...state, proposals: state.proposals.map((item) => (item.id === action.proposalId ? { ...item, status: 'rejected' } : item)) }
    case 'code/add': {
      const body = clamp(action.body, 180)
      const reason = clamp(action.reason, 180)
      if (!body) return state
      const code: AdoptedCode = {
        id: crypto.randomUUID(),
        no: nextCodeNo(state.adoptedCodes),
        body,
        reason,
        sourceProposalId: null,
        createdAt: new Date().toISOString(),
      }
      return { ...state, adoptedCodes: [...state.adoptedCodes, code].sort((a, b) => a.no - b.no) }
    }
    case 'code/update': {
      const body = clamp(action.body, 180)
      const reason = clamp(action.reason, 180)
      if (!body) return state
      return {
        ...state,
        adoptedCodes: state.adoptedCodes.map((code) => (code.id === action.codeId ? { ...code, body, reason } : code)),
      }
    }
    case 'code/delete':
      return {
        ...state,
        adoptedCodes: state.adoptedCodes
          .filter((code) => code.id !== action.codeId)
          .map((code, index) => ({ ...code, no: index + 1 })),
      }
    case 'chat/add': {
      const date = todayKey()
      const currentUsage = state.dailyUsage.date === date ? state.dailyUsage.count : 0
      const log: ChatLog = {
        id: crypto.randomUUID(),
        question: clamp(action.question, 500),
        answer: clamp(action.answer, 800),
        mode: action.mode,
        promptSnapshot: action.promptSnapshot,
        createdAt: new Date().toISOString(),
      }
      return {
        ...state,
        chatLogs: [log, ...state.chatLogs].slice(0, 120),
        dailyUsage: { date, count: currentUsage + 1 },
      }
    }
    case 'dev/reset':
      return initialState
    default:
      return state
  }
}

interface V2ContextValue {
  state: V2State
  dailyLimit: number
  adoptedCodeCount: number
  evolutionStage: number
  currentReaction: string
  createClass: (className: string, teacherEmail?: string) => void
  mergeClass: (payload: Partial<V2State>) => void
  setRemoteStatus: (status: { ok: boolean; message: string }) => void
  joinStudent: (classCode: string, nickname: string) => void
  leaveStudent: () => void
  setLesson: (lessonNo: number) => void
  updateAiSettings: (settings: { provider: AiProvider; apiKey: string }) => void
  addNameCandidate: (name: string, nickname?: string, reason?: string) => void
  voteName: (candidateId: string, nickname?: string) => void
  confirmName: (name: string) => void
  addWish: (body: string, nickname?: string) => void
  deleteWish: (wishId: string) => void
  addProposal: (proposal: { body: string; reason: string; valueCard: string; revisionOfNo: number | null; nickname?: string }) => void
  voteProposal: (proposalId: string, nickname?: string) => void
  adoptProposal: (proposalId: string) => void
  rejectProposal: (proposalId: string) => void
  addCode: (code: { body: string; reason: string }) => void
  updateCode: (code: { codeId: string; body: string; reason: string }) => void
  deleteCode: (codeId: string) => void
  addChatLog: (log: { question: string; answer: string; mode: 'canned' | 'live'; promptSnapshot: string }) => void
  resetDemo: () => void
}

const V2Context = createContext<V2ContextValue | null>(null)

export function V2Provider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const value = useMemo<V2ContextValue>(() => {
    const adoptedCodeCount = state.adoptedCodes.length
    const evolutionStage = Math.min(adoptedCodeCount, 3)
    const nickname = state.studentSession?.nickname ?? '교사'
    const currentReaction = adoptedCodeCount === 0 ? '이름이 생겼어. 근데… 난 아직 뭘 지켜야 하는지 몰라. 규칙이 하나도 없어.' : evolutionLines[Math.min(adoptedCodeCount, 4) - 1]

    return {
      state,
      dailyLimit: DEFAULT_DAILY_LIMIT,
      adoptedCodeCount,
      evolutionStage,
      currentReaction,
      createClass: (className, teacherEmail) => dispatch({ type: 'class/create', className, teacherEmail }),
      mergeClass: (payload) => dispatch({ type: 'class/merge', payload }),
      setRemoteStatus: (status) => dispatch({ type: 'remote/status', ...status }),
      joinStudent: (classCode, nickname) => dispatch({ type: 'class/joinStudent', classCode, nickname }),
      leaveStudent: () => dispatch({ type: 'class/leaveStudent' }),
      setLesson: (lessonNo) => dispatch({ type: 'lesson/set', lessonNo }),
      updateAiSettings: (settings) => dispatch({ type: 'settings/updateAi', ...settings }),
      addNameCandidate: (name, explicitNickname, reason) => dispatch({ type: 'name/add', name, nickname: explicitNickname ?? nickname, reason }),
      voteName: (candidateId, explicitNickname) => dispatch({ type: 'name/vote', candidateId, nickname: explicitNickname ?? nickname }),
      confirmName: (name) => dispatch({ type: 'name/confirm', name }),
      addWish: (body, explicitNickname) => dispatch({ type: 'wish/add', body, nickname: explicitNickname ?? nickname }),
      deleteWish: (wishId) => dispatch({ type: 'wish/delete', wishId }),
      addProposal: (proposal) => dispatch({ type: 'proposal/add', ...proposal, nickname: proposal.nickname ?? nickname }),
      voteProposal: (proposalId, explicitNickname) => dispatch({ type: 'proposal/vote', proposalId, nickname: explicitNickname ?? nickname }),
      adoptProposal: (proposalId) => dispatch({ type: 'proposal/adopt', proposalId }),
      rejectProposal: (proposalId) => dispatch({ type: 'proposal/reject', proposalId }),
      addCode: (code) => dispatch({ type: 'code/add', ...code }),
      updateCode: (code) => dispatch({ type: 'code/update', ...code }),
      deleteCode: (codeId) => dispatch({ type: 'code/delete', codeId }),
      addChatLog: (log) => dispatch({ type: 'chat/add', ...log }),
      resetDemo: () => dispatch({ type: 'dev/reset' }),
    }
  }, [state])

  return <V2Context.Provider value={value}>{children}</V2Context.Provider>
}

export function useV2() {
  const value = useContext(V2Context)
  if (!value) throw new Error('useV2 must be used inside V2Provider')
  return value
}
