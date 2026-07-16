import { isSupabaseConfigured, supabase } from './supabase'
import { TOTAL_V2_LESSONS, valueCards } from '../data/v2Lessons'
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

type ResettableClassRow = ClassRow & {
  teacher_id: string
  mode: 'ai' | 'basic'
}

const LIVE_LESSON_QUESTION = '__aemon_live_lesson__'

export type LiveBoardMode = 'survey' | 'risk' | 'name' | 'wish' | 'code' | 'honesty' | 'code2' | 'fairness' | 'code3'

export type LiveLessonState = {
  lessonNo: number
  stepIndex: number
  boardMode: LiveBoardMode | null
  activityPath: string | null
  viewState: Record<string, unknown>
  updatedAt: string
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
    currentLesson: Math.min(TOTAL_V2_LESSONS, Math.max(1, row.current_lesson || 1)),
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

function codeRowTimestamp(row: CodeRow) {
  const value = Date.parse(row.adopted_at ?? row.created_at)
  return Number.isFinite(value) ? value : 0
}

function latestAdoptedCodeRows(rows: CodeRow[]) {
  const byNo = new Map<number, CodeRow>()
  rows
    .filter((row) => row.status === 'adopted' && row.adopted_no)
    .forEach((row) => {
      const no = row.adopted_no ?? 0
      const existing = byNo.get(no)
      if (!existing || codeRowTimestamp(row) >= codeRowTimestamp(existing)) byNo.set(no, row)
    })
  return [...byNo.values()].sort((a, b) => (a.adopted_no ?? 0) - (b.adopted_no ?? 0))
}

function mapAdoptedCodes(rows: CodeRow[]): AdoptedCode[] {
  return latestAdoptedCodeRows(rows)
    .map((row) => {
      const originalProposal = rows.find(
        (candidate) =>
          candidate.status === 'pending' &&
          candidate.id !== row.id &&
          candidate.nickname === row.nickname &&
          candidate.body === row.body &&
          candidate.reason === row.reason,
      )

      return {
        id: row.id,
        no: row.adopted_no ?? 0,
        body: row.body,
        reason: row.reason,
        valueCard: row.value_card,
        tags: decodeCodeTags(row.value_card),
        sourceProposalId: originalProposal?.id ?? row.id,
        createdAt: row.adopted_at ?? row.created_at,
      }
    })
    .sort((a, b) => a.no - b.no)
}

function mapChatLogs(rows: ChatLogRow[]): ChatLog[] {
  return rows.filter((row) => row.question !== LIVE_LESSON_QUESTION).map((row) => ({
    id: row.id,
    question: row.question,
    answer: row.answer,
    mode: row.mode,
    promptSnapshot: row.prompt_snapshot,
    createdAt: row.created_at,
  }))
}

function parseLiveLessonState(row: Pick<ChatLogRow, 'answer' | 'created_at'>): LiveLessonState | null {
  try {
    const parsed = JSON.parse(row.answer) as Partial<LiveLessonState>
    const lessonNo = Number(parsed.lessonNo)
    const stepIndex = Number(parsed.stepIndex)
    if (!Number.isInteger(lessonNo) || lessonNo < 1 || lessonNo > TOTAL_V2_LESSONS) return null
    if (!Number.isInteger(stepIndex) || stepIndex < 0) return null
    return {
      lessonNo,
      stepIndex,
      boardMode: parsed.boardMode ?? null,
      activityPath: typeof parsed.activityPath === 'string' ? parsed.activityPath : null,
      viewState: parsed.viewState && typeof parsed.viewState === 'object' ? parsed.viewState : {},
      updatedAt: row.created_at,
    }
  } catch {
    return null
  }
}

export function parseLiveLessonRealtimeRow(value: unknown): LiveLessonState | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Partial<Pick<ChatLogRow, 'question' | 'answer' | 'created_at'>>
  if (row.question !== LIVE_LESSON_QUESTION || typeof row.answer !== 'string') return null
  return parseLiveLessonState({
    answer: row.answer,
    created_at: typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
  })
}

export async function publishRemoteLiveLesson(args: {
  classId: string
  lessonNo: number
  stepIndex: number
  boardMode?: LiveBoardMode | null
  activityPath?: string | null
  viewState?: Record<string, unknown>
}) {
  const client = ensureClient()
  const payload = JSON.stringify({
    lessonNo: args.lessonNo,
    stepIndex: args.stepIndex,
    boardMode: args.boardMode ?? null,
    activityPath: args.activityPath ?? null,
    viewState: args.viewState ?? {},
  })
  if (payload.length > 2900) throw new Error('학생 화면 동기화 데이터가 너무 큽니다.')

  const { error } = await client.from('chat_logs').insert({
    class_id: args.classId,
    question: LIVE_LESSON_QUESTION,
    answer: payload,
    mode: 'canned',
    prompt_snapshot: 'live-lesson-sync',
  })
  if (error) throw new Error(toMessage(error))
}

export async function fetchRemoteLiveLesson(classCode: string): Promise<LiveLessonState | null> {
  const client = ensureClient()
  const { data: classRow, error: classError } = await client.from('classes').select('id').eq('code', classCode.trim()).maybeSingle<{ id: string }>()
  if (classError) throw new Error(toMessage(classError))
  if (!classRow) return null

  return fetchRemoteLiveLessonByClassId(classRow.id)
}

export async function fetchRemoteLiveLessonByClassId(classId: string): Promise<LiveLessonState | null> {
  const client = ensureClient()
  const { data, error } = await client
    .from('chat_logs')
    .select('answer,created_at')
    .eq('class_id', classId)
    .eq('question', LIVE_LESSON_QUESTION)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<Pick<ChatLogRow, 'answer' | 'created_at'>>()
  if (error) throw new Error(toMessage(error))
  return data ? parseLiveLessonState(data) : null
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

export const MAX_TEACHER_CLASSES = 5

export async function createRemoteClass(input: { className: string; teacherId?: string | null; teacherEmail?: string | null }) {
  const client = ensureClient()
  let lastError: unknown = null

  if (input.teacherId) {
    const { count, error } = await client
      .from('classes')
      .select('id', { count: 'exact', head: true })
      .eq('teacher_id', input.teacherId)

    if (error) throw new Error(toMessage(error))
    if ((count ?? 0) >= MAX_TEACHER_CLASSES) {
      throw new Error(`학급은 계정당 최대 ${MAX_TEACHER_CLASSES}개까지 만들 수 있습니다.`)
    }
  }

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
  activityCount: number
  counts: {
    nameCandidates: number
    wishes: number
    surveyResponses: number
    codeProposals: number
    adoptedCodes: number
    chatLogs: number
  }
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

  return Promise.all(((data ?? []) as ClassRow[]).map(async (row) => {
    const counts = await fetchRemoteClassCounts(row.id)
    const activityCount =
      counts.nameCandidates +
      counts.wishes +
      counts.surveyResponses +
      counts.codeProposals +
      counts.adoptedCodes +
      counts.chatLogs

    return {
      classId: row.id,
      className: row.name,
      classCode: row.code,
      currentLesson: Math.min(TOTAL_V2_LESSONS, Math.max(1, row.current_lesson || 1)),
      aemonName: row.aemon_name ?? '',
      createdAt: row.created_at,
      activityCount,
      counts,
    }
  }))
}

export async function deleteRemoteClass(args: { classId: string; teacherId: string }) {
  const client = ensureClient()
  const { data, error } = await client
    .from('classes')
    .delete()
    .eq('id', args.classId)
    .eq('teacher_id', args.teacherId.trim())
    .select('id')
    .maybeSingle<{ id: string }>()
  if (error) throw new Error(toMessage(error))
  if (!data) throw new Error('학급을 삭제하지 못했습니다. 다시 로그인한 뒤 시도해 주세요.')
  return data.id
}

function isMissingResetRpc(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { code?: string; message?: string }
  return candidate.code === 'PGRST202' || candidate.code === '42883' || /reset_class_content/i.test(candidate.message ?? '')
}

export async function resetRemoteClassContent(args: { classId: string; teacherId: string }) {
  const client = ensureClient()
  const classId = args.classId.trim()
  const teacherId = args.teacherId.trim()
  if (!classId || !teacherId) throw new Error('학급 초기화를 위해 다시 로그인해 주세요.')

  const { error: rpcError } = await client.rpc('reset_class_content', { target_class_id: classId })
  if (!rpcError) {
    const { data, error } = await client
      .from('classes')
      .select('id,name,code,current_lesson,aemon_name,created_at')
      .eq('id', classId)
      .eq('teacher_id', teacherId)
      .single<ClassRow>()
    if (error || !data) throw new Error(toMessage(error ?? '초기화된 학급을 다시 불러오지 못했습니다.'))
    return { ...mapClass(data), remote: { enabled: true, ok: true, message: '학급 초기화 완료', lastSyncedAt: new Date().toISOString() } }
  }

  if (!isMissingResetRpc(rpcError)) throw new Error(toMessage(rpcError))

  // Older deployments may not have the transaction RPC yet. Recreating the
  // same class row clears every child table through the existing cascades.
  const select = 'id,teacher_id,name,mode,code,current_lesson,aemon_name,created_at'
  const { data: existing, error: readError } = await client
    .from('classes')
    .select(select)
    .eq('id', classId)
    .eq('teacher_id', teacherId)
    .maybeSingle<ResettableClassRow>()
  if (readError) throw new Error(toMessage(readError))
  if (!existing) throw new Error('이 학급을 초기화할 권한이 없습니다. 다시 로그인해 주세요.')

  const { error: deleteError } = await client
    .from('classes')
    .delete()
    .eq('id', classId)
    .eq('teacher_id', teacherId)
  if (deleteError) throw new Error(toMessage(deleteError))

  const { data: restored, error: restoreError } = await client
    .from('classes')
    .insert({
      id: existing.id,
      teacher_id: existing.teacher_id,
      name: existing.name,
      mode: existing.mode,
      code: existing.code,
      current_lesson: 1,
      aemon_name: '',
      created_at: existing.created_at,
    })
    .select('id,name,code,current_lesson,aemon_name,created_at')
    .single<ClassRow>()
  if (restoreError || !restored) {
    throw new Error(`학급 내용을 지웠지만 학급 복원에 실패했습니다: ${toMessage(restoreError)}`)
  }

  return { ...mapClass(restored), remote: { enabled: true, ok: true, message: '학급 초기화 완료', lastSyncedAt: new Date().toISOString() } }
}

async function fetchTableCount(table: 'name_candidates' | 'wishes' | 'survey_responses' | 'codes' | 'chat_logs', classId: string, status?: 'adopted') {
  const client = ensureClient()
  let query = client.from(table).select('*', { count: 'exact', head: true }).eq('class_id', classId)
  if (table === 'codes' && status) query = query.eq('status', status)
  const { count, error } = await query
  if (error) throw new Error(toMessage(error))
  return count ?? 0
}

async function fetchRemoteClassCounts(classId: string): Promise<RemoteClassSummary['counts']> {
  const [nameCandidates, wishes, surveyResponses, codeProposals, adoptedCodes, chatLogs] = await Promise.all([
    fetchTableCount('name_candidates', classId),
    fetchTableCount('wishes', classId),
    fetchTableCount('survey_responses', classId),
    fetchTableCount('codes', classId),
    fetchTableCount('codes', classId, 'adopted'),
    fetchTableCount('chat_logs', classId),
  ])

  return { nameCandidates, wishes, surveyResponses, codeProposals, adoptedCodes, chatLogs }
}

export async function restoreRemoteClassSnapshot(input: {
  classId?: string
  className: string
  classCode: string
  currentLesson: number
  aemonName: string
  teacherId?: string | null
}) {
  const client = ensureClient()
  const id = input.classId?.trim() || crypto.randomUUID()
  const code = input.classCode.trim()
  const name = input.className.trim().slice(0, 50)
  const currentLesson = Math.min(TOTAL_V2_LESSONS, Math.max(1, input.currentLesson || 1))
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
      teacher_id: input.teacherId ?? null,
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
  const { error } = await client
    .from('classes')
    .update({ current_lesson: Math.min(TOTAL_V2_LESSONS, Math.max(1, args.lessonNo)) })
    .eq('id', args.classId)
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
    if (isDuplicateError(error)) return
    if (isMissingTableError(error)) throw new Error('Supabase에 post_votes 테이블이 없습니다. 게시글 좋아요 마이그레이션을 먼저 적용해야 합니다.')
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
  const { error: clearError } = await client
    .from('codes')
    .update({ status: 'rejected', adopted_no: null, adopted_at: null })
    .eq('class_id', args.classId)
    .eq('status', 'adopted')
    .eq('adopted_no', args.no)
  if (clearError) throw new Error(toMessage(clearError))

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
  const { data: proposal, error: findError } = await client
    .from('codes')
    .select('id,class_id,nickname,body,reason,value_card,status')
    .eq('id', args.proposalId)
    .single<{ id: string; class_id: string; nickname: string; body: string; reason: string; value_card: string; status: CodeProposal['status'] }>()
  if (findError) throw new Error(toMessage(findError))
  if (proposal.status !== 'pending') throw new Error('이미 처리된 발의입니다. 새로고침한 뒤 다른 문장을 선택해 주세요.')

  const adoptedAt = new Date().toISOString()

  // Updating a proposal requires a live teacher session. Saving an immutable
  // adopted snapshot keeps adoption reliable even after a long-running lesson.
  const { data: adopted, error: adoptError } = await client
    .from('codes')
    .insert({
      class_id: proposal.class_id,
      nickname: proposal.nickname,
      body: proposal.body,
      reason: proposal.reason,
      value_card: args.valueCard.trim(),
      revision_of_no: args.adoptedNo,
      status: 'adopted',
      adopted_no: args.adoptedNo,
      adopted_at: adoptedAt,
    })
    .select('id,status,adopted_no')
    .single<{ id: string; status: CodeProposal['status']; adopted_no: number | null }>()
  if (adoptError || !adopted) throw new Error(toMessage(adoptError ?? new Error('가치코드가 저장되지 않았습니다.')))
  if (adopted.status !== 'adopted' || adopted.adopted_no !== args.adoptedNo) {
    throw new Error('가치코드 저장을 확인하지 못했습니다. 다시 눌러주세요.')
  }
  return { adoptedId: adopted.id, copied: true }
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
