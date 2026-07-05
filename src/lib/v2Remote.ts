import { isSupabaseConfigured, supabase } from './supabase'
import type { AdoptedCode, ChatLog, CodeProposal, NameCandidate, V2State, Wish } from '../state/V2Store'

const MISSING_SCHEMA_MESSAGE =
  'Supabase v2 테이블이 아직 없습니다. Supabase SQL Editor에서 supabase/schema.sql을 실행해야 학생 기기와 교사 화면이 공유됩니다.'

type ClassRow = {
  id: string
  name: string
  code: string
  current_lesson: number
  aemon_name: string
  created_at: string
}

type NameCandidateRow = {
  id: string
  nickname: string
  name: string
  reason?: string | null
  created_at: string
}

type NameVoteRow = {
  nickname: string
  candidate_id: string
}

type WishRow = {
  id: string
  nickname: string
  body: string
  created_at: string
}

type CodeRow = {
  id: string
  nickname: string
  body: string
  reason: string
  value_card: string
  revision_of_no: number | null
  status: 'pending' | 'adopted' | 'rejected'
  adopted_no: number | null
  created_at: string
  adopted_at: string | null
}

type CodeVoteRow = {
  nickname: string
  code_id: string
}

type ChatLogRow = {
  id: string
  question: string
  answer: string
  mode: 'canned' | 'live'
  prompt_snapshot: string
  created_at: string
}

export function isRemoteReady() {
  return Boolean(isSupabaseConfigured && supabase)
}

function generateClassCode() {
  return String(Math.floor(1000 + Math.random() * 900000)).slice(0, 6)
}

function toMessage(error: unknown) {
  const candidate = error as { code?: string; message?: string; details?: string; status?: number }
  if (candidate?.code === 'PGRST205' || candidate?.message?.includes("Could not find the table") || candidate?.status === 404) {
    return MISSING_SCHEMA_MESSAGE
  }
  if (candidate?.message) return candidate.message
  return 'Supabase 연결 중 알 수 없는 오류가 발생했습니다.'
}

function ensureClient() {
  if (!isRemoteReady() || !supabase) {
    throw new Error('Supabase 환경변수가 설정되어 있지 않습니다.')
  }
  return supabase
}

function mapClass(row: ClassRow): Partial<V2State> {
  return {
    classId: row.id,
    className: row.name,
    classCode: row.code,
    currentLesson: row.current_lesson,
    aemonName: row.aemon_name ?? '',
  }
}

function mapNameCandidates(rows: NameCandidateRow[], votes: NameVoteRow[]): NameCandidate[] {
  return rows.map((row) => ({
    id: row.id,
    nickname: row.nickname,
    name: row.name,
    reason: row.reason ?? '',
    votes: votes.filter((vote) => vote.candidate_id === row.id).map((vote) => vote.nickname),
    createdAt: row.created_at,
  }))
}

function mapWishes(rows: WishRow[]): Wish[] {
  return rows.map((row) => ({
    id: row.id,
    nickname: row.nickname,
    body: row.body,
    createdAt: row.created_at,
  }))
}

function mapProposals(rows: CodeRow[], votes: CodeVoteRow[]): CodeProposal[] {
  return rows.map((row) => ({
    id: row.id,
    nickname: row.nickname,
    body: row.body,
    reason: row.reason,
    valueCard: row.value_card,
    revisionOfNo: row.revision_of_no,
    votes: votes.filter((vote) => vote.code_id === row.id).map((vote) => vote.nickname),
    status: row.status,
    adoptedNo: row.adopted_no,
    createdAt: row.created_at,
    adoptedAt: row.adopted_at,
  }))
}

function mapAdoptedCodes(rows: CodeRow[]): AdoptedCode[] {
  return rows
    .filter((row) => row.status === 'adopted' && row.adopted_no)
    .map((row) => ({
      id: row.id,
      no: row.adopted_no ?? 0,
      body: row.body,
      reason: row.reason,
      sourceProposalId: row.id,
      createdAt: row.adopted_at ?? row.created_at,
    }))
    .sort((a, b) => a.no - b.no)
}

function mapChatLogs(rows: ChatLogRow[]): ChatLog[] {
  return rows.map((row) => ({
    id: row.id,
    question: row.question,
    answer: row.answer,
    mode: row.mode,
    promptSnapshot: row.prompt_snapshot,
    createdAt: row.created_at,
  }))
}

export async function probeV2Database() {
  try {
    const client = ensureClient()
    const { error } = await client.from('classes').select('id').limit(1)
    if (error) throw error
    return { ok: true, message: 'Supabase 동기화 준비됨' }
  } catch (error) {
    return { ok: false, message: toMessage(error) }
  }
}

export async function createRemoteClass(input: { className: string; teacherId?: string | null; teacherEmail?: string | null }) {
  const client = ensureClient()
  let lastError: unknown = null

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const code = generateClassCode()
    const { data, error } = await client
      .from('classes')
      .insert({
        name: input.className.trim(),
        mode: 'ai',
        code,
        teacher_id: input.teacherId ?? null,
        current_lesson: 1,
        aemon_name: '',
      })
      .select('id,name,code,current_lesson,aemon_name,created_at')
      .single<ClassRow>()

    if (!error && data) {
      return { ...mapClass(data), teacherEmail: input.teacherEmail ?? '', remote: { enabled: true, ok: true, message: 'Supabase 학급 생성 완료', lastSyncedAt: new Date().toISOString() } }
    }
    lastError = error
  }

  throw new Error(toMessage(lastError))
}

export async function fetchRemoteClassBundle(classCode: string): Promise<Partial<V2State>> {
  const client = ensureClient()
  const { data: classRow, error: classError } = await client
    .from('classes')
    .select('id,name,code,current_lesson,aemon_name,created_at')
    .eq('code', classCode.trim())
    .maybeSingle<ClassRow>()

  if (classError) throw new Error(toMessage(classError))
  if (!classRow) throw new Error('학급 코드를 찾지 못했습니다.')

  const classId = classRow.id
  const [candidateResult, nameVoteResult, wishResult, codeResult, codeVoteResult, chatResult] = await Promise.all([
    client.from('name_candidates').select('id,nickname,name,reason,created_at').eq('class_id', classId).order('created_at', { ascending: false }),
    client.from('name_votes').select('nickname,candidate_id').eq('class_id', classId),
    client.from('wishes').select('id,nickname,body,created_at').eq('class_id', classId).order('created_at', { ascending: false }),
    client
      .from('codes')
      .select('id,nickname,body,reason,value_card,revision_of_no,status,adopted_no,created_at,adopted_at')
      .eq('class_id', classId)
      .order('created_at', { ascending: false }),
    client.from('code_votes').select('nickname,code_id').eq('class_id', classId),
    client
      .from('chat_logs')
      .select('id,question,answer,mode,prompt_snapshot,created_at')
      .eq('class_id', classId)
      .order('created_at', { ascending: false })
      .limit(120),
  ])

  for (const result of [candidateResult, nameVoteResult, wishResult, codeResult, codeVoteResult, chatResult]) {
    if (result.error) throw new Error(toMessage(result.error))
  }

  const codeRows = (codeResult.data ?? []) as CodeRow[]
  return {
    ...mapClass(classRow),
    nameCandidates: mapNameCandidates((candidateResult.data ?? []) as NameCandidateRow[], (nameVoteResult.data ?? []) as NameVoteRow[]),
    wishes: mapWishes((wishResult.data ?? []) as WishRow[]),
    proposals: mapProposals(codeRows, (codeVoteResult.data ?? []) as CodeVoteRow[]),
    adoptedCodes: mapAdoptedCodes(codeRows),
    chatLogs: mapChatLogs((chatResult.data ?? []) as ChatLogRow[]),
    remote: { enabled: true, ok: true, message: 'Supabase 동기화됨', lastSyncedAt: new Date().toISOString() },
  }
}

export async function addRemoteNameCandidate(args: { classId: string; nickname: string; name: string; reason: string }) {
  const client = ensureClient()
  const { error } = await client.from('name_candidates').insert({
    class_id: args.classId,
    nickname: args.nickname.trim(),
    name: args.name.trim(),
    reason: args.reason.trim(),
  })
  if (error) throw new Error(toMessage(error))
}

export async function toggleRemoteNameLike(args: { classId: string; nickname: string; candidateId: string }) {
  const client = ensureClient()
  const key = { class_id: args.classId, nickname: args.nickname.trim(), candidate_id: args.candidateId }
  const { data, error: readError } = await client.from('name_votes').select('candidate_id').match(key).maybeSingle()
  if (readError) throw new Error(toMessage(readError))

  if (data) {
    const { error } = await client.from('name_votes').delete().match(key)
    if (error) throw new Error(toMessage(error))
    return
  }

  const { error } = await client.from('name_votes').insert(key)
  if (error) throw new Error(toMessage(error))
}

export async function confirmRemoteName(args: { classId: string; aemonName: string }) {
  const client = ensureClient()
  const { error } = await client.from('classes').update({ aemon_name: args.aemonName.trim() }).eq('id', args.classId)
  if (error) throw new Error(toMessage(error))
}

export async function updateRemoteLesson(args: { classId: string; lessonNo: number }) {
  const client = ensureClient()
  const { error } = await client.from('classes').update({ current_lesson: Math.min(7, Math.max(1, args.lessonNo)) }).eq('id', args.classId)
  if (error) throw new Error(toMessage(error))
}

export async function upsertRemoteWish(args: { classId: string; nickname: string; body: string }) {
  const client = ensureClient()
  const { error } = await client
    .from('wishes')
    .upsert(
      {
        class_id: args.classId,
        nickname: args.nickname.trim(),
        body: args.body.trim(),
      },
      { onConflict: 'class_id,nickname' },
    )
  if (error) throw new Error(toMessage(error))
}

export async function updateRemoteWish(args: { wishId: string; body: string }) {
  const client = ensureClient()
  const { error } = await client.from('wishes').update({ body: args.body.trim() }).eq('id', args.wishId)
  if (error) throw new Error(toMessage(error))
}

export async function deleteRemoteWish(wishId: string) {
  const client = ensureClient()
  const { error } = await client.from('wishes').delete().eq('id', wishId)
  if (error) throw new Error(toMessage(error))
}

export async function addRemoteCodeProposal(args: {
  classId: string
  nickname: string
  body: string
  reason: string
  valueCard: string
  revisionOfNo: number | null
}) {
  const client = ensureClient()
  const { error } = await client.from('codes').insert({
    class_id: args.classId,
    nickname: args.nickname.trim(),
    body: args.body.trim(),
    reason: args.reason.trim(),
    value_card: args.valueCard,
    revision_of_no: args.revisionOfNo,
    status: 'pending',
  })
  if (error) throw new Error(toMessage(error))
}

export async function voteRemoteCodeProposal(args: { classId: string; nickname: string; proposalId: string }) {
  const client = ensureClient()
  const base = { class_id: args.classId, nickname: args.nickname.trim() }
  const { error: deleteError } = await client.from('code_votes').delete().match(base)
  if (deleteError) throw new Error(toMessage(deleteError))

  const { error } = await client.from('code_votes').insert({ ...base, code_id: args.proposalId })
  if (error) throw new Error(toMessage(error))
}

export async function addRemoteChatLog(args: { classId: string; question: string; answer: string; mode: 'canned' | 'live'; promptSnapshot: string }) {
  const client = ensureClient()
  const { error } = await client.from('chat_logs').insert({
    class_id: args.classId,
    question: args.question,
    answer: args.answer,
    mode: args.mode,
    prompt_snapshot: args.promptSnapshot,
  })
  if (error) throw new Error(toMessage(error))
}
