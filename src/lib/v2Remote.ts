import { isSupabaseConfigured, supabase } from './supabase'
import { valueCards } from '../data/v2Lessons'
import type { AdoptedCode, ChatLog, CodeProposal, NameCandidate, SurveyResponse, V2State, Wish } from '../state/V2Store'

const MISSING_SCHEMA_MESSAGE =
  'Supabase v2 테이블이 아직 없습니다. Supabase SQL Editor에서 supabase/schema.sql을 실행해야 학생 기기와 대시보드가 공유됩니다.'

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

type SurveyResponseRow = {
  id: string
  nickname: string
  question_key: string
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

type PostVoteKind = 'wish' | 'risk'

type PostVoteRow = {
  nickname: string
  post_type: PostVoteKind
  post_id: string
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
  if (isMissingTableError(error)) {
    return MISSING_SCHEMA_MESSAGE
  }
  if (candidate?.message) return candidate.message
  return 'Supabase 연결 중 알 수 없는 오류가 발생했습니다.'
}

function isMissingTableError(error: unknown) {
  const candidate = error as { code?: string; message?: string; status?: number }
  return candidate?.code === 'PGRST205' || candidate?.message?.includes("Could not find the table") || candidate?.status === 404
}

function isDuplicateError(error: unknown) {
  const candidate = error as { code?: string }
  return candidate?.code === '23505'
}

function ensureClient() {
  if (!isRemoteReady() || !supabase) {
    throw new Error('Supabase 환경변수가 설정되어 있지 않습니다.')
  }
  return supabase
}

function normalizeCodeTags(tags: string[]) {
  return [...new Set(tags.map((tag) => tag.trim()).filter((tag) => valueCards.includes(tag)))]
}

function encodeCodeTags(tags: string[]) {
  return normalizeCodeTags(tags).join(',')
}

function decodeCodeTags(valueCard: string) {
  const tags = normalizeCodeTags(valueCard.split(','))
  return tags.length > 0 ? tags : ['책임']
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

function mapWishes(rows: WishRow[], votes: PostVoteRow[] = []): Wish[] {
  return rows.map((row) => ({
    id: row.id,
    nickname: row.nickname,
    body: row.body,
    votes: votes.filter((vote) => vote.post_type === 'wish' && vote.post_id === row.id).map((vote) => vote.nickname),
    createdAt: row.created_at,
  }))
}

function mapSurveyResponses(rows: SurveyResponseRow[], votes: PostVoteRow[] = []): SurveyResponse[] {
  return rows.map((row) => ({
    id: row.id,
    nickname: row.nickname,
    questionKey: row.question_key,
    body: row.body,
    votes: votes.filter((vote) => vote.post_type === 'risk' && vote.post_id === row.id).map((vote) => vote.nickname),
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
      valueCard: row.value_card,
      tags: decodeCodeTags(row.value_card),
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
    const tables = ['classes', 'name_candidates', 'name_votes', 'wishes', 'survey_responses', 'codes', 'code_votes', 'chat_logs'] as const
    const results = await Promise.all(tables.map(async (table) => ({ table, result: await client.from(table).select('*').limit(1) })))
    const missingTables = results.filter(({ result }) => result.error && isMissingTableError(result.error)).map(({ table }) => table)
    const unexpectedError = results.find(({ result }) => result.error && !isMissingTableError(result.error))?.result.error
    if (unexpectedError) throw unexpectedError
    if (missingTables.length > 0) {
      throw new Error(`${MISSING_SCHEMA_MESSAGE} 누락된 테이블: ${missingTables.join(', ')}`)
    }
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

export interface RemoteClassSummary {
  classId: string
  className: string
  classCode: string
  currentLesson: number
  aemonName: string
  createdAt: string
}

export async function fetchRemoteTeacherClasses(teacherId: string): Promise<RemoteClassSummary[]> {
  const client = ensureClient()
  const trimmedTeacherId = teacherId.trim()
  if (!trimmedTeacherId) return []

  const { data, error } = await client
    .from('classes')
    .select('id,name,code,current_lesson,aemon_name,created_at')
    .eq('teacher_id', trimmedTeacherId)
    .order('created_at', { ascending: false })
    .limit(12)

  if (error) throw new Error(toMessage(error))

  return ((data ?? []) as ClassRow[]).map((row) => ({
    classId: row.id,
    className: row.name,
    classCode: row.code,
    currentLesson: row.current_lesson,
    aemonName: row.aemon_name ?? '',
    createdAt: row.created_at,
  }))
}

export async function restoreRemoteClassSnapshot(input: {
  classId?: string
  className: string
  classCode: string
  currentLesson: number
  aemonName: string
}) {
  const client = ensureClient()
  const id = input.classId?.trim() || crypto.randomUUID()
  const code = input.classCode.trim()
  const name = input.className.trim().slice(0, 50)
  const currentLesson = Math.min(7, Math.max(1, input.currentLesson || 1))
  const aemonName = input.aemonName.trim().slice(0, 12)
  const select = 'id,name,code,current_lesson,aemon_name,created_at'

  if (!code || !name) {
    throw new Error('Local class state is missing required fields.')
  }

  if (input.classId?.trim()) {
    const { data: byId, error: idError } = await client.from('classes').select(select).eq('id', input.classId.trim()).maybeSingle<ClassRow>()
    if (idError) throw new Error(toMessage(idError))
    if (byId) {
      return { ...mapClass(byId), remote: { enabled: true, ok: true, message: 'Supabase class restored', lastSyncedAt: new Date().toISOString() } }
    }
  }

  const { data: byCode, error: codeError } = await client.from('classes').select(select).eq('code', code).maybeSingle<ClassRow>()
  if (codeError) throw new Error(toMessage(codeError))
  if (byCode) {
    return { ...mapClass(byCode), remote: { enabled: true, ok: true, message: 'Supabase class restored', lastSyncedAt: new Date().toISOString() } }
  }

  const { data, error } = await client
    .from('classes')
    .insert({
      id,
      name,
      mode: 'ai',
      code,
      current_lesson: currentLesson,
      aemon_name: aemonName,
    })
    .select(select)
    .single<ClassRow>()

  if (!error && data) {
    return { ...mapClass(data), remote: { enabled: true, ok: true, message: 'Supabase class restored', lastSyncedAt: new Date().toISOString() } }
  }

  const { data: retryByCode, error: retryCodeError } = await client.from('classes').select(select).eq('code', code).maybeSingle<ClassRow>()
  if (retryCodeError) throw new Error(toMessage(retryCodeError))
  if (retryByCode) {
    return { ...mapClass(retryByCode), remote: { enabled: true, ok: true, message: 'Supabase class restored', lastSyncedAt: new Date().toISOString() } }
  }

  throw new Error(toMessage(error))
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
  const [candidateResult, nameVoteResult, wishResult, surveyResult, codeResult, codeVoteResult, chatResult, postVoteResult] = await Promise.all([
    client.from('name_candidates').select('id,nickname,name,reason,created_at').eq('class_id', classId).order('created_at', { ascending: false }),
    client.from('name_votes').select('nickname,candidate_id').eq('class_id', classId),
    client.from('wishes').select('id,nickname,body,created_at').eq('class_id', classId).order('created_at', { ascending: false }),
    client.from('survey_responses').select('id,nickname,question_key,body,created_at').eq('class_id', classId).order('created_at', { ascending: false }),
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
    client.from('post_votes').select('nickname,post_type,post_id').eq('class_id', classId),
  ])

  for (const result of [candidateResult, nameVoteResult, wishResult, surveyResult, codeResult, codeVoteResult, chatResult]) {
    if (result.error && !isMissingTableError(result.error)) throw new Error(toMessage(result.error))
  }
  if (postVoteResult.error && !isMissingTableError(postVoteResult.error)) throw new Error(toMessage(postVoteResult.error))
  const missingTables: string[] = []
  if (isMissingTableError(candidateResult.error)) missingTables.push('name_candidates')
  if (isMissingTableError(nameVoteResult.error)) missingTables.push('name_votes')
  if (isMissingTableError(wishResult.error)) missingTables.push('wishes')
  if (isMissingTableError(surveyResult.error)) missingTables.push('survey_responses')
  if (isMissingTableError(codeResult.error)) missingTables.push('codes')
  if (isMissingTableError(codeVoteResult.error)) missingTables.push('code_votes')
  if (isMissingTableError(chatResult.error)) missingTables.push('chat_logs')

  if (missingTables.length > 0) {
    throw new Error(`${MISSING_SCHEMA_MESSAGE} 누락된 테이블: ${missingTables.join(', ')}`)
  }

  const candidateRows = (candidateResult.data ?? []) as NameCandidateRow[]
  const nameVoteRows = (nameVoteResult.data ?? []) as NameVoteRow[]
  const wishRows = (wishResult.data ?? []) as WishRow[]
  const surveyRows = (surveyResult.data ?? []) as SurveyResponseRow[]
  const codeRows = (codeResult.data ?? []) as CodeRow[]
  const codeVoteRows = (codeVoteResult.data ?? []) as CodeVoteRow[]
  const chatRows = (chatResult.data ?? []) as ChatLogRow[]
  const postVoteRows = postVoteResult.error ? [] : ((postVoteResult.data ?? []) as PostVoteRow[])
  return {
    ...mapClass(classRow),
    nameCandidates: mapNameCandidates(candidateRows, nameVoteRows),
    wishes: mapWishes(wishRows, postVoteRows),
    surveyResponses: mapSurveyResponses(surveyRows, postVoteRows),
    proposals: mapProposals(codeRows, codeVoteRows),
    adoptedCodes: mapAdoptedCodes(codeRows),
    chatLogs: mapChatLogs(chatRows),
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
  const { error } = await client.from('name_votes').insert(key)
  if (error && !isDuplicateError(error)) throw new Error(toMessage(error))
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

export async function upsertRemoteSurveyResponse(args: { classId: string; nickname: string; questionKey: string; body: string }) {
  const client = ensureClient()
  const { error } = await client
    .from('survey_responses')
    .upsert(
      {
        class_id: args.classId,
        nickname: args.nickname.trim(),
        question_key: args.questionKey.trim(),
        body: args.body.trim(),
        created_at: new Date().toISOString(),
      },
      { onConflict: 'class_id,nickname,question_key' },
    )
  if (error) throw new Error(toMessage(error))
}

export async function deleteRemoteWish(wishId: string) {
  const client = ensureClient()
  const { error } = await client.from('wishes').delete().eq('id', wishId)
  if (error) throw new Error(toMessage(error))
}

export async function toggleRemotePostLike(args: { classId: string; nickname: string; postType: PostVoteKind; postId: string }) {
  const client = ensureClient()
  const key = { class_id: args.classId, nickname: args.nickname.trim(), post_type: args.postType, post_id: args.postId }
  const { error } = await client.from('post_votes').insert(key)
  if (error) {
    if (isMissingTableError(error) || isDuplicateError(error)) return
    throw new Error(toMessage(error))
  }
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

export async function addRemoteAdoptedCode(args: {
  classId: string
  nickname: string
  no: number
  body: string
  reason: string
  tags: string[]
}) {
  const client = ensureClient()
  const { error } = await client.from('codes').insert({
    class_id: args.classId,
    nickname: args.nickname.trim(),
    body: args.body.trim(),
    reason: args.reason.trim(),
    value_card: encodeCodeTags(args.tags),
    revision_of_no: null,
    status: 'adopted',
    adopted_no: args.no,
    adopted_at: new Date().toISOString(),
  })
  if (error) throw new Error(toMessage(error))
}

export async function updateRemoteAdoptedCode(args: { codeId: string; body: string; reason: string; tags: string[] }) {
  const client = ensureClient()
  const { error } = await client
    .from('codes')
    .update({
      body: args.body.trim(),
      reason: args.reason.trim(),
      value_card: encodeCodeTags(args.tags),
    })
    .eq('id', args.codeId)
  if (error) throw new Error(toMessage(error))
}

export async function deleteRemoteAdoptedCode(codeId: string) {
  const client = ensureClient()
  const { error } = await client.from('codes').delete().eq('id', codeId)
  if (error) throw new Error(toMessage(error))
}

export async function voteRemoteCodeProposal(args: { classId: string; nickname: string; proposalId: string }) {
  const client = ensureClient()
  const key = { class_id: args.classId, nickname: args.nickname.trim(), code_id: args.proposalId }
  const { error } = await client.from('code_votes').insert(key)
  if (error && !isDuplicateError(error)) throw new Error(toMessage(error))
}

export async function adoptRemoteCodeProposal(args: { proposalId: string; adoptedNo: number; valueCard: string }) {
  const client = ensureClient()
  const { error } = await client
    .from('codes')
    .update({
      status: 'adopted',
      adopted_no: args.adoptedNo,
      value_card: args.valueCard.trim(),
      adopted_at: new Date().toISOString(),
    })
    .eq('id', args.proposalId)
  if (error) throw new Error(toMessage(error))
}

export async function rejectRemoteCodeProposal(proposalId: string) {
  const client = ensureClient()
  const { error } = await client.from('codes').update({ status: 'rejected' }).eq('id', proposalId)
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
