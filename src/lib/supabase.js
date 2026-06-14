import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

let supabase = null
if (isSupabaseConfigured) {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
}

export default supabase
export { supabase }

/* ────────────────────────────────────────────
   QUERY FUNCTIONS
   ──────────────────────────────────────────── */

/**
 * Search words — matches Thai word field + JSONB senses meaning
 * @param {string} query - Chinese or Thai search term
 * @param {number} limit - Max results
 */
export async function searchWords(query, limit = 20) {
  if (!supabase) return []

  // Exact match first
  const { data: exact } = await supabase
    .from('dictionary_full')
    .select('*')
    .eq('word', query)
    .limit(5)

  // Fuzzy match on Thai word
  const { data: fuzzy } = await supabase
    .from('dictionary_full')
    .select('*')
    .ilike('word', `%${query}%`)
    .limit(limit)

  // Search Chinese meaning inside senses JSONB via RPC (fuzzy ILIKE)
  const { data: meaning } = await supabase
    .rpc('search_words_zh', { search_term: query, max_results: limit })
    .then(r => r).catch(() => ({ data: null }))

  // Also try raw JSONB text search for broader matching
  const { data: textSearch } = await supabase
    .rpc('search_words', { search_term: query, max_results: limit }).then(r => r).catch(() => ({ data: null }))

  // Merge and deduplicate
  const map = new Map()
  for (const list of [exact, fuzzy, meaning, textSearch].filter(Boolean)) {
    for (const row of (Array.isArray(list) ? list : [])) {
      if (row && row.id && !map.has(row.id)) {
        map.set(row.id, row)
      }
    }
  }

  // Prioritize: exact match > enriched > by sense_count
  return Array.from(map.values()).sort((a, b) => {
    if (a.word === query) return -1
    if (b.word === query) return 1
    if (a.enrichment_status === 'enriched' && b.enrichment_status !== 'enriched') return -1
    if (b.enrichment_status === 'enriched' && a.enrichment_status !== 'enriched') return 1
    return (b.sense_count || 0) - (a.sense_count || 0)
  }).slice(0, limit)
}

/**
 * Get a single word by exact Thai spelling
 */
export async function getWordByThai(word) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('dictionary_full')
    .select('*')
    .eq('word', word)
    .single()
  if (error) {
    console.error('[supabase] getWordByThai:', error.message)
    return null
  }
  return data
}

/**
 * Get daily word (random enriched entry)
 */
export async function getDailyWord() {
  if (!supabase) return null
  // Try RPC for true random selection
  try {
    const { data, error } = await supabase.rpc('get_random_word').single()
    if (!error && data) return data
  } catch (e) { /* fallback below */ }
  // Fallback: fetch pool and pick randomly client-side
  const { data, error } = await supabase
    .from('dictionary_full')
    .select('*')
    .eq('enrichment_status', 'enriched')
    .gt('sense_count', 0)
    .limit(100)
  if (error) {
    console.error('[supabase] getDailyWord:', error.message)
    return null
  }
  if (!data || data.length === 0) return null
  return data[Math.floor(Math.random() * data.length)]
}

/**
 * Get recently enriched words (for "最近查词" display)
 */
export async function getRecentWords(limit = 10) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('dictionary_full')
    .select('*')
    .eq('enrichment_status', 'enriched')
    .gt('sense_count', 0)
    .order('enriched_at', { ascending: false })
    .limit(limit)
  if (error) {
    console.error('[supabase] getRecentWords:', error.message)
    return []
  }
  return data || []
}

/**
 * Submit a new word for AI enrichment
 */
export async function submitWord(word, zhGloss = '') {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('user_submissions')
    .insert({
      word,
      submission_type: 'new_word',
      content: { zh_gloss: zhGloss, source: 'frontend' },
      status: 'pending',
    })
    .select()
    .single()
  if (error) {
    console.error('[supabase] submitWord:', error.message)
    return null
  }
  return data
}

/* ────────────────────────────────────────────
   DATA TRANSFORMATION: DB row → Frontend format
   ──────────────────────────────────────────── */

/**
 * Convert a dictionary_full DB row into the wordDetail format
 * expected by WordDetailPage component
 */
export function transformWordData(row) {
  if (!row) return null

  const senses = Array.isArray(row.senses) ? row.senses : []
  const synonyms = Array.isArray(row.synonyms)
    ? row.synonyms.map(w => ({ word: w, zh: '' }))
    : []
  const antonyms = Array.isArray(row.antonyms)
    ? row.antonyms.map(w => ({ word: w, zh: '' }))
    : []
  const learnerAssociations = Array.isArray(row.learner_associations)
    ? row.learner_associations
    : []

  return {
    word: row.word || '',
    romanization: row.romanization || '',
    romanization_source: row.romanization_source || 'pending',
    sources: Array.isArray(row.sources) ? row.sources : [],
    sense_count: row.sense_count || senses.length,
    senses: senses.map((s, i) => ({
      sense_id: s.sense_id || (i + 1),
      pos: s.pos || '未标注',
      meaning: s.meaning || '',
      register: s.register || '通用',
      examples: Array.isArray(s.examples) ? s.examples : [],
      segmented: Array.isArray(s.segmented) ? s.segmented : null,
      source: s.source || 'ai',
    })),
    freq_tnc: row.freq_tnc || null,
    freq_ttc: row.freq_ttc || null,
    freq_phupha: row.freq_phupha || null,
    synonyms,
    antonyms,
    learner_associations: learnerAssociations,
    user_sentence_count: row.user_sentence_count || 0,
  }
}

/**
 * Convert a DB row into a compact display format for search results list
 */
export function transformSearchResult(row) {
  if (!row) return null
  const senses = Array.isArray(row.senses) ? row.senses : []
  const firstSense = senses[0]
  return {
    word: row.word || '',
    romanization: row.romanization || '',
    meaning: firstSense?.meaning || '',
    pos: firstSense?.pos || '',
    sense_count: row.sense_count || senses.length,
    enriched: row.enrichment_status === 'enriched',
  }
}

/* ────────────────────────────────────────────
   USER DATA QUERY FUNCTIONS
   All functions accept Clerk userId as first param
   ──────────────────────────────────────────── */

// ── Bookmarks ──

export async function getBookmarks(userId) {
  if (!supabase || !userId) return []
  const { data, error } = await supabase
    .from('user_bookmarks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) { console.error('[supabase] getBookmarks:', error.message); return [] }
  return data || []
}

export async function addBookmark(userId, word) {
  if (!supabase || !userId) return null
  const { data, error } = await supabase
    .from('user_bookmarks')
    .upsert({ user_id: userId, word }, { onConflict: 'user_id,word' })
    .select()
    .single()
  if (error) { console.error('[supabase] addBookmark:', error.message); return null }
  return data
}

export async function removeBookmark(userId, word) {
  if (!supabase || !userId) return false
  const { error } = await supabase
    .from('user_bookmarks')
    .delete()
    .eq('user_id', userId)
    .eq('word', word)
  if (error) { console.error('[supabase] removeBookmark:', error.message); return false }
  return true
}

export async function isBookmarked(userId, word) {
  if (!supabase || !userId) return false
  const { data, error } = await supabase
    .from('user_bookmarks')
    .select('id')
    .eq('user_id', userId)
    .eq('word', word)
    .single()
  if (error) return false
  return !!data
}

// ── Recent Words ──

export async function getUserRecentWords(userId, limit = 20) {
  if (!supabase || !userId) return []
  const { data, error } = await supabase
    .from('user_recent_words')
    .select('*')
    .eq('user_id', userId)
    .order('looked_up_at', { ascending: false })
    .limit(limit)
  if (error) { console.error('[supabase] getUserRecentWords:', error.message); return [] }
  // Enrich with dictionary data
  const words = (data || []).map(r => r.word)
  if (words.length === 0) return []
  const { data: dictRows } = await supabase
    .from('dictionary_full')
    .select('*')
    .in('word', words)
  const dictMap = new Map((dictRows || []).map(r => [r.word, r]))
  return words.map(w => {
    const row = dictMap.get(w)
    return row ? transformSearchResult(row) : { word: w, meaning: '', pos: '', sense_count: 0, enriched: false }
  })
}

export async function recordWordLookup(userId, word) {
  if (!supabase || !userId || !word) return null
  const { data, error } = await supabase
    .from('user_recent_words')
    .upsert(
      { user_id: userId, word, looked_up_at: new Date().toISOString(), lookup_count: 1 },
      { onConflict: 'user_id,word' }
    )
    .select()
    .single()
  if (error) {
    // If upsert fails, try incrementing lookup_count
    const { error: updErr } = await supabase
      .from('user_recent_words')
      .update({ looked_up_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('word', word)
    if (updErr) console.error('[supabase] recordWordLookup update:', updErr.message)
    return null
  }
  return data
}

// ── Folders ──

export async function getFolders(userId) {
  if (!supabase || !userId) return []
  const { data, error } = await supabase
    .from('user_folders')
    .select('*, word_count:user_folder_words(count)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) { console.error('[supabase] getFolders:', error.message); return [] }
  return (data || []).map(f => ({
    ...f,
    word_count: f.word_count?.[0]?.count || 0
  }))
}

export async function createFolder(userId, name, color = '#5B8C7E') {
  if (!supabase || !userId) return null
  const { data, error } = await supabase
    .from('user_folders')
    .insert({ user_id: userId, name, color })
    .select()
    .single()
  if (error) { console.error('[supabase] createFolder:', error.message); return null }
  return data
}

export async function renameFolder(folderId, name) {
  if (!supabase || !folderId) return null
  const { data, error } = await supabase
    .from('user_folders')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', folderId)
    .select()
    .single()
  if (error) { console.error('[supabase] renameFolder:', error.message); return null }
  return data
}

export async function deleteFolder(folderId) {
  if (!supabase || !folderId) return false
  const { error } = await supabase
    .from('user_folders')
    .delete()
    .eq('id', folderId)
  if (error) { console.error('[supabase] deleteFolder:', error.message); return false }
  return true
}

export async function getFolderWords(folderId) {
  if (!supabase || !folderId) return []
  const { data, error } = await supabase
    .from('user_folder_words')
    .select('*')
    .eq('folder_id', folderId)
    .order('added_at', { ascending: false })
  if (error) { console.error('[supabase] getFolderWords:', error.message); return [] }
  return data || []
}

export async function addWordToFolder(folderId, word) {
  if (!supabase || !folderId) return null
  const { data, error } = await supabase
    .from('user_folder_words')
    .upsert({ folder_id: folderId, word }, { onConflict: 'folder_id,word' })
    .select()
    .single()
  if (error) { console.error('[supabase] addWordToFolder:', error.message); return null }
  return data
}

export async function removeWordFromFolder(folderId, word) {
  if (!supabase || !folderId) return false
  const { error } = await supabase
    .from('user_folder_words')
    .delete()
    .eq('folder_id', folderId)
    .eq('word', word)
  if (error) { console.error('[supabase] removeWordFromFolder:', error.message); return false }
  return true
}

// ── Learning Plans ──

export async function getLearningPlan(userId) {
  if (!supabase || !userId) return null
  const { data, error } = await supabase
    .from('user_learning_plans')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error) {
    if (error.code === 'PGRST116') return null // not found
    console.error('[supabase] getLearningPlan:', error.message)
    return null
  }
  return data
}

export async function saveLearningPlan(userId, goals, schedule) {
  if (!supabase || !userId) return null
  const { data, error } = await supabase
    .from('user_learning_plans')
    .upsert({
      user_id: userId,
      goals: goals || { words: 30, grammar: 20, reading: 5 },
      schedule: schedule || {},
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })
    .select()
    .single()
  if (error) { console.error('[supabase] saveLearningPlan:', error.message); return null }
  return data
}

// ── Learning Progress ──

export async function getLearningProgress(userId, days = 30) {
  if (!supabase || !userId) return []
  const since = new Date()
  since.setDate(since.getDate() - days)
  const { data, error } = await supabase
    .from('user_learning_progress')
    .select('*')
    .eq('user_id', userId)
    .gte('date', since.toISOString().split('T')[0])
    .order('date', { ascending: false })
  if (error) { console.error('[supabase] getLearningProgress:', error.message); return [] }
  return data || []
}

export async function updateDailyProgress(userId, date, updates) {
  if (!supabase || !userId) return null
  const { data, error } = await supabase
    .from('user_learning_progress')
    .upsert({
      user_id: userId,
      date,
      ...updates,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,date' })
    .select()
    .single()
  if (error) { console.error('[supabase] updateDailyProgress:', error.message); return null }
  return data
}

export async function getStreak(userId) {
  if (!supabase || !userId) return 0
  const { data, error } = await supabase
    .from('user_learning_progress')
    .select('streak_days')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(1)
    .single()
  if (error) return 0
  return data?.streak_days || 0
}

// ── Notes ──

export async function getNotes(userId) {
  if (!supabase || !userId) return []
  const { data, error } = await supabase
    .from('user_notes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) { console.error('[supabase] getNotes:', error.message); return [] }
  return data || []
}

export async function createNote(userId, title, content = '', color = '#5B7E9E') {
  if (!supabase || !userId) return null
  const { data, error } = await supabase
    .from('user_notes')
    .insert({ user_id: userId, title, content, color })
    .select()
    .single()
  if (error) { console.error('[supabase] createNote:', error.message); return null }
  return data
}

export async function updateNote(noteId, updates) {
  if (!supabase || !noteId) return null
  const { data, error } = await supabase
    .from('user_notes')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', noteId)
    .select()
    .single()
  if (error) { console.error('[supabase] updateNote:', error.message); return null }
  return data
}

export async function deleteNote(noteId) {
  if (!supabase || !noteId) return false
  const { error } = await supabase
    .from('user_notes')
    .delete()
    .eq('id', noteId)
  if (error) { console.error('[supabase] deleteNote:', error.message); return false }
  return true
}

// ── Settings ──

export async function getUserSettings(userId) {
  if (!supabase || !userId) return null
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error) {
    if (error.code === 'PGRST116') return null // not found
    console.error('[supabase] getUserSettings:', error.message)
    return null
  }
  return data
}

export async function saveUserSettings(userId, settings) {
  if (!supabase || !userId) return null
  // Merge with existing settings to avoid overwriting other fields
  let existing = {}
  try {
    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single()
    if (data) existing = data
  } catch (e) { /* ignore - row may not exist yet */ }
  const merged = { ...existing, ...settings, user_id: userId, updated_at: new Date().toISOString() }
  const { data, error } = await supabase
    .from('user_settings')
    .upsert(merged, { onConflict: 'user_id' })
    .select()
    .single()
  if (error) { console.error('[supabase] saveUserSettings:', error.message); return null }
  return data
}

// ── API Keys ──

export async function getApiKeys(userId) {
  if (!supabase || !userId) return []
  const { data, error } = await supabase
    .from('user_api_keys')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) { console.error('[supabase] getApiKeys:', error.message); return [] }
  return data || []
}

export async function saveApiKey(userId, keyData) {
  if (!supabase || !userId) return null
  const { data, error } = await supabase
    .from('user_api_keys')
    .insert({
      user_id: userId,
      ...keyData,
      created_at: new Date().toISOString()
    })
    .select()
    .single()
  if (error) { console.error('[supabase] saveApiKey:', error.message); return null }
  return data
}

export async function deleteApiKey(keyId) {
  if (!supabase || !keyId) return false
  const { error } = await supabase
    .from('user_api_keys')
    .delete()
    .eq('id', keyId)
  if (error) { console.error('[supabase] deleteApiKey:', error.message); return false }
  return true
}

// ── Utility: Get total dictionary count ──

export async function getDictionaryCount() {
  if (!supabase) return 0
  const { count, error } = await supabase
    .from('dictionary')
    .select('*', { count: 'exact', head: true })
    .eq('enrichment_status', 'enriched')
  if (error) return 0
  return count || 0
}

// ── AI Proxy: Call system or user AI API via Edge Function ──

/**
 * Call AI via Supabase Edge Function (keeps API keys server-side)
 * @param {string} prompt - The prompt to send to the AI
 * @param {object} userApi - Optional user API config { key, base_url, model }
 * @returns {object} Parsed AI response data
 */
export async function callAiProxy(prompt, userApi = null) {
  if (!supabase) return { error: 'Supabase not configured' }

  const fnUrl = `${supabaseUrl}/functions/v1/ai-proxy`
  const { data: { session } } = await supabase.auth.getSession()

  const body = { prompt }
  if (userApi?.key && userApi?.base_url) {
    body.user_api_key = userApi.key
    body.user_base_url = userApi.base_url
    body.user_model = userApi.model || 'gpt-4o'
    body.provider = 'user'
  } else {
    body.provider = 'system'
  }

  try {
    const res = await fetch(fnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': session ? `Bearer ${session.access_token}` : '',
      },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) return { error: data.error || 'AI proxy failed' }
    return data
  } catch (e) {
    console.error('[callAiProxy]', e)
    return { error: e.message }
  }
}

/**
 * Get user's default API preference
 * Returns: 'system' | apiKeyId
 */
export async function getDefaultApi(userId) {
  if (!supabase || !userId) return 'system'
  const { data } = await supabase
    .from('user_settings')
    .select('default_api_id')
    .eq('user_id', userId)
    .single()
  return data?.default_api_id || 'system'
}

/**
 * Set user's default API preference
 */
export async function setDefaultApi(userId, apiId) {
  if (!supabase || !userId) return null
  return saveUserSettings(userId, { default_api_id: apiId || 'system' })
}

/* ─── Sentence / 每日一句 Functions ─── */

/**
 * Get a random sentence, optionally filtered by category
 */
export async function getDailySentence(category = null) {
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .rpc('get_random_sentence', { cat: category })
      .single()
    if (!error && data) return data
  } catch (e) { /* fallback below */ }
  // Fallback: fetch pool and pick randomly
  let q = supabase.from('sentences').select('*')
  if (category) q = q.eq('category', category)
  const { data, error } = await q.limit(100)
  if (error || !data || data.length === 0) {
    console.error('[supabase] getDailySentence:', error?.message)
    return null
  }
  return data[Math.floor(Math.random() * data.length)]
}

/**
 * Get sentences by category
 */
export async function getSentencesByCategory(category, limit = 50) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('sentences')
    .select('*')
    .eq('category', category)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) { console.error('[supabase] getSentencesByCategory:', error.message); return [] }
  return data || []
}

/**
 * Bookmark a sentence for the user
 */
export async function bookmarkSentence(userId, sentenceId) {
  if (!supabase || !userId) return null
  const { data, error } = await supabase
    .from('user_sentence_bookmarks')
    .upsert({ user_id: userId, sentence_id: sentenceId }, { onConflict: 'user_id,sentence_id' })
    .select().single()
  if (error) { console.error('[supabase] bookmarkSentence:', error.message); return null }
  return data
}

/**
 * Remove a sentence bookmark
 */
export async function removeSentenceBookmark(userId, sentenceId) {
  if (!supabase || !userId) return false
  const { error } = await supabase
    .from('user_sentence_bookmarks')
    .delete().eq('user_id', userId).eq('sentence_id', sentenceId)
  if (error) { console.error('[supabase] removeSentenceBookmark:', error.message); return false }
  return true
}

/**
 * Get all bookmarked sentences for a user
 */
export async function getBookmarkedSentences(userId) {
  if (!supabase || !userId) return []
  const { data, error } = await supabase
    .from('user_sentence_bookmarks')
    .select('*, sentences(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) { console.error('[supabase] getBookmarkedSentences:', error.message); return [] }
  return (data || []).map(r => r.sentences).filter(Boolean)
}

/* ─── Auth Helper Functions ─── */

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email, password) {
  if (!supabase) return { error: 'Supabase not configured' }
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })
  if (error) return { error: error.message, data: null }
  return { data, error: null }
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(email, password, username = '') {
  if (!supabase) return { error: 'Supabase not configured' }
  const options = { data: {} }
  if (username) options.data.full_name = username
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options,
  })
  if (error) return { error: error.message, data: null }
  return { data, error: null }
}

/**
 * Sign in with OAuth provider (google, github, apple)
 */
export async function signInWithOAuth(provider) {
  if (!supabase) return { error: 'Supabase not configured' }
  const redirectTo = window.location.origin + '/auth/callback'
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
    },
  })
  if (error) return { error: error.message, data: null }
  return { data, error: null }
}

/**
 * Sign out
 */
export async function signOut() {
  if (!supabase) return
  await supabase.auth.signOut()
}

/**
 * Update user profile metadata
 */
export async function updateUserProfile(updates) {
  if (!supabase) return { error: 'Supabase not configured' }
  const { data, error } = await supabase.auth.updateUser({
    data: updates,
  })
  if (error) return { error: error.message, data: null }
  return { data, error: null }
}

/**
 * Upload user avatar
 * Returns the public URL of the uploaded avatar
 */
export async function uploadAvatar(userId, file) {
  if (!supabase || !userId) return { error: 'Not configured', url: null }
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `avatars/${userId}/${Date.now()}.${ext}`
  const { error: uploadError } = await supabase.storage
    .from('user-assets')
    .upload(path, file, { upsert: true })
  if (uploadError) return { error: uploadError.message, url: null }
  const { data: { publicUrl } } = supabase.storage
    .from('user-assets')
    .getPublicUrl(path)
  return { url: publicUrl, error: null }
}

/**
 * Verify email with OTP code
 */
export async function verifyEmailOtp(email, token) {
  if (!supabase) return { error: 'Supabase not configured' }
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token,
    type: 'signup',
  })
  if (error) return { error: error.message, data: null }
  return { data, error: null }
}
