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

  // Also search community words (user-contributed AI-generated entries)
  const { data: communityRows } = await supabase
    .from('community_words')
    .select('*')
    .or(`word.ilike.%${query}%,senses::text.ilike.%${query}%`)
    .limit(limit)
    .then(r => r).catch(() => ({ data: null }))

  // Merge and deduplicate
  const map = new Map()
  for (const list of [exact, fuzzy, meaning, textSearch].filter(Boolean)) {
    for (const row of (Array.isArray(list) ? list : [])) {
      if (row && row.id && !map.has(row.id)) {
        map.set(row.id, row)
      }
    }
  }

  // Add community words with a distinct key prefix to avoid collisions
  const communityResults = []
  for (const row of (Array.isArray(communityRows) ? communityRows : [])) {
    if (row && row.id) {
      const key = `cw_${row.id}`
      if (!map.has(key)) {
        map.set(key, { ...row, _source: 'community' })
        communityResults.push(row)
      }
    }
  }

  // Prioritize: exact match > enriched > by sense_count; community words at end
  const dictResults = Array.from(map.values()).filter(r => r._source !== 'community')
  const sortedDict = dictResults.sort((a, b) => {
    if (a.word === query) return -1
    if (b.word === query) return 1
    if (a.enrichment_status === 'enriched' && b.enrichment_status !== 'enriched') return -1
    if (b.enrichment_status === 'enriched' && a.enrichment_status !== 'enriched') return 1
    return (b.sense_count || 0) - (a.sense_count || 0)
  })
  const sortedCommunity = communityResults
    .filter(r => r.word !== query || !sortedDict.some(d => d.word === query))
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))

  return [...sortedDict, ...sortedCommunity].slice(0, limit)
}

/**
 * Get a single word by exact Thai spelling
 * Checks dictionary_full first, then community_words as fallback
 */
export async function getWordByThai(word) {
  if (!supabase) return null
  // Try dictionary_full first
  const { data, error } = await supabase
    .from('dictionary_full')
    .select('*')
    .eq('word', word)
    .single()
  if (!error && data) return data
  // Fallback: check community_words
  try {
    const { data: cw, error: cwErr } = await supabase
      .from('community_words')
      .select('*')
      .eq('word', word)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (!cwErr && cw) return { ...cw, _source: 'community' }
  } catch (e) { /* no community word found */ }
  if (error) {
    console.error('[supabase] getWordByThai:', error.message)
  }
  return null
}

/**
 * Fetch dictionary data for multiple Thai words at once
 */
export async function getWordsByThaiList(words) {
  if (!supabase || !words || words.length === 0) return []
  const { data, error } = await supabase
    .from('dictionary_full')
    .select('*')
    .in('word', words)
  if (error) { console.error('[supabase] getWordsByThaiList:', error.message); return [] }
  return (data || []).map(transformSearchResult).filter(Boolean)
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
    .select('*, word_count:user_folder_words(count), sentence_count:user_folder_sentences(count)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) { console.error('[supabase] getFolders:', error.message); return [] }
  return (data || []).map(f => ({
    ...f,
    word_count: f.word_count?.[0]?.count || 0,
    sentence_count: f.sentence_count?.[0]?.count || 0,
  }))
}

export async function createFolder(userId, name, color = '#5B8C7E', folder_type = 'word') {
  if (!supabase || !userId) return null
  const { data, error } = await supabase
    .from('user_folders')
    .insert({ user_id: userId, name, color, folder_type })
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

// ── Sentence Folders ──

export async function getFolderSentences(folderId) {
  if (!supabase || !folderId) return []
  const { data, error } = await supabase
    .from('user_folder_sentences')
    .select('*, sentences(*)')
    .eq('folder_id', folderId)
    .order('created_at', { ascending: false })
  if (error) { console.error('[supabase] getFolderSentences:', error.message); return [] }
  return data || []
}

export async function addSentenceToFolder(folderId, sentenceId) {
  if (!supabase || !folderId) return null
  const { data, error } = await supabase
    .from('user_folder_sentences')
    .upsert({ folder_id: folderId, sentence_id: sentenceId }, { onConflict: 'folder_id,sentence_id' })
    .select()
    .single()
  if (error) { console.error('[supabase] addSentenceToFolder:', error.message); return null }
  return data
}

export async function removeSentenceFromFolder(folderId, sentenceId) {
  if (!supabase || !folderId) return false
  const { error } = await supabase
    .from('user_folder_sentences')
    .delete()
    .eq('folder_id', folderId)
    .eq('sentence_id', sentenceId)
  if (error) { console.error('[supabase] removeSentenceFromFolder:', error.message); return false }
  return true
}

export async function createDefaultFolders(userId) {
  if (!supabase || !userId) return null
  // Call RPC function if available, otherwise insert manually
  try {
    const { data, error } = await supabase.rpc('create_default_folders', { p_user_id: userId })
    if (error) {
      // Fallback: manual insert
      await supabase.from('user_folders').upsert([
        { user_id: userId, name: '我的单词', color: '#5B8C7E', folder_type: 'word' },
        { user_id: userId, name: '我的句子', color: '#C4993D', folder_type: 'sentence' },
      ], { onConflict: 'user_id,name' })
    }
  } catch (e) {
    // RPC not available yet — manual insert
    await supabase.from('user_folders').upsert([
      { user_id: userId, name: '我的单词', color: '#5B8C7E', folder_type: 'word' },
      { user_id: userId, name: '我的句子', color: '#C4993D', folder_type: 'sentence' },
    ], { onConflict: 'user_id,name' })
  }
  // Refresh folders
  return getFolders(userId)
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

/**
 * Sync user stats on login — ensure today's row exists in user_learning_progress
 * and recalculate streak_days from checkin_completions.
 */
export async function syncUserStatsOnLogin(userId) {
  if (!supabase || !userId) return

  const today = new Date().toISOString().split('T')[0]

  try {
    // 1. Ensure today's row exists (only insert if not exists, don't overwrite)
    const { data: existing } = await supabase
      .from('user_learning_progress')
      .select('id')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle()

    if (!existing) {
      await supabase
        .from('user_learning_progress')
        .insert({
          user_id: userId,
          date: today,
          words_learned: 0,
          words_reviewed: 0,
          grammar_completed: 0,
          reading_completed: 0,
          study_minutes: 0,
          streak_days: 0,
        })
    }

    // 2. Calculate streak from checkin_completions and update
    const { data: checkins } = await supabase
      .from('user_checkin_completions')
      .select('completed_date')
      .eq('user_id', userId)
      .order('completed_date', { ascending: false })
      .limit(100)

    const dates = [...new Set((checkins || []).map(r => r.completed_date))].sort().reverse()
    let streak = 0
    if (dates.length > 0) {
      const now = new Date()
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      const startDate = dates.includes(today) ? today : yesterdayStr
      if (dates.includes(startDate)) {
        const cursor = new Date(startDate + 'T00:00:00')
        while (dates.includes(cursor.toISOString().split('T')[0])) {
          streak++
          cursor.setDate(cursor.getDate() - 1)
        }
      }
    }

    await supabase
      .from('user_learning_progress')
      .update({ streak_days: streak, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('date', today)
  } catch (e) {
    console.error('[supabase] syncUserStatsOnLogin:', e)
  }
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

/**
 * Calculate the monthly checkin streak for a user.
 * Counts consecutive days (backwards from today or yesterday) with at least one checkin completion,
 * resetting at the beginning of the calendar month.
 * Returns { streak: number, totalDays: number }
 */
export async function getMonthlyCheckinStreak(userId) {
  if (!supabase || !userId) return { streak: 0, totalDays: 0 }

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed

  // First and last day of current month
  const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0]

  try {
    const { data, error } = await supabase
      .from('user_checkin_completions')
      .select('completed_date')
      .eq('user_id', userId)
      .gte('completed_date', firstDay)
      .lte('completed_date', lastDay)
      .order('completed_date', { ascending: false })

    if (error) {
      console.error('[supabase] getMonthlyCheckinStreak:', error.message)
      return { streak: 0, totalDays: 0 }
    }

    // Deduplicate dates (multiple tasks can be completed on the same date)
    const dates = [...new Set((data || []).map(r => r.completed_date))].sort().reverse()
    const totalDays = dates.length

    // Determine which day to start counting from
    const today = now.toISOString().split('T')[0]
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    // If today has completions, start from today; otherwise start from yesterday
    const startDate = dates.includes(today) ? today : yesterdayStr
    if (!dates.includes(startDate)) return { streak: 0, totalDays }

    // Count consecutive days backwards
    let streak = 0
    const cursor = new Date(startDate + 'T00:00:00')
    while (true) {
      const dateStr = cursor.toISOString().split('T')[0]
      if (!dates.includes(dateStr)) break
      if (cursor.getMonth() !== month) break // Don't cross month boundary
      streak++
      cursor.setDate(cursor.getDate() - 1)
    }

    return { streak, totalDays }
  } catch (e) {
    console.error('[supabase] getMonthlyCheckinStreak:', e)
    return { streak: 0, totalDays: 0 }
  }
}

/**
 * Get all dates in the current month that have at least one checkin completion.
 * Returns an array of date strings (YYYY-MM-DD).
 */
export async function getMonthlyCheckinDays(userId) {
  if (!supabase || !userId) return []

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0]

  try {
    const { data, error } = await supabase
      .from('user_checkin_completions')
      .select('completed_date')
      .eq('user_id', userId)
      .gte('completed_date', firstDay)
      .lte('completed_date', lastDay)

    if (error) {
      console.error('[supabase] getMonthlyCheckinDays:', error.message)
      return []
    }

    return [...new Set((data || []).map(r => r.completed_date))]
  } catch (e) {
    console.error('[supabase] getMonthlyCheckinDays:', e)
    return []
  }
}

/**
 * Get the number of checkin completions for each of the last N days.
 * Returns array of { date: string, count: number } sorted by date ascending.
 */
export async function getCheckinHeatmapData(userId, days = 35) {
  if (!supabase || !userId) return []

  const since = new Date()
  since.setDate(since.getDate() - days + 1) // +1 to include today
  const sinceStr = since.toISOString().split('T')[0]

  try {
    const { data, error } = await supabase
      .from('user_checkin_completions')
      .select('completed_date')
      .eq('user_id', userId)
      .gte('completed_date', sinceStr)

    if (error) {
      console.error('[supabase] getCheckinHeatmapData:', error.message)
      return []
    }

    // Build date-to-count map
    const countMap = {}
    for (const row of (data || [])) {
      countMap[row.completed_date] = (countMap[row.completed_date] || 0) + 1
    }

    // Fill all dates in range with count (0 if no completions)
    const result = []
    const cursor = new Date(sinceStr + 'T00:00:00')
    const endDate = new Date()
    endDate.setHours(0, 0, 0, 0)
    while (cursor <= endDate) {
      const dateStr = cursor.toISOString().split('T')[0]
      result.push({ date: dateStr, count: countMap[dateStr] || 0 })
      cursor.setDate(cursor.getDate() + 1)
    }
    return result
  } catch (e) {
    console.error('[supabase] getCheckinHeatmapData:', e)
    return []
  }
}

/**
 * Get study minutes for each day of the current week from user_learning_progress.
 * Returns array of { day: string (e.g. "周一"), mins: number } for Mon-Sun.
 */
export async function getWeeklyStudyMinutes(userId) {
  if (!supabase || !userId) return []

  const now = new Date()
  const dayOfWeek = now.getDay() // 0=Sun
  const monday = new Date(now)
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  monday.setHours(0, 0, 0, 0)

  const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const dates = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    dates.push(d.toISOString().split('T')[0])
  }

  try {
    const { data, error } = await supabase
      .from('user_learning_progress')
      .select('date, study_minutes')
      .eq('user_id', userId)
      .in('date', dates)

    if (error) {
      console.error('[supabase] getWeeklyStudyMinutes:', error.message)
      return weekDays.map((day, i) => ({ day, mins: 0 }))
    }

    const minsMap = {}
    for (const row of (data || [])) {
      minsMap[row.date] = row.study_minutes || 0
    }

    return dates.map((date, i) => ({ day: weekDays[i], mins: minsMap[date] || 0 }))
  } catch (e) {
    console.error('[supabase] getWeeklyStudyMinutes:', e)
    return weekDays.map((day, i) => ({ day, mins: 0 }))
  }
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

/**
 * Load all Thai word strings from dictionary_full for segmentation dictionary.
 * Fetches in batches of 1000 to avoid large query limits.
 * Returns array of word strings.
 */
export async function loadAllDictionaryWords() {
  if (!supabase) return []
  const allWords = []
  let offset = 0
  const batchSize = 1000
  try {
    while (true) {
      const { data, error } = await supabase
        .from('dictionary_full')
        .select('word')
        .range(offset, offset + batchSize - 1)
      if (error) {
        console.error('[supabase] loadAllDictionaryWords:', error.message)
        break
      }
      if (!data || data.length === 0) break
      data.forEach(r => { if (r.word) allWords.push(r.word) })
      if (data.length < batchSize) break
      offset += batchSize
    }
  } catch (e) {
    console.error('[supabase] loadAllDictionaryWords:', e)
  }
  return allWords
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
export async function getSentencesByCategory(category, limit = 1000) {
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

/* ─── Community Words (用户共建词库) Functions ─── */

/**
 * Transform a community_words row into the wordDetail format
 */
export function transformCommunityWord(row) {
  if (!row) return null
  const senses = Array.isArray(row.senses) ? row.senses : []
  const synonyms = Array.isArray(row.synonyms) ? row.synonyms : []
  const antonyms = Array.isArray(row.antonyms) ? row.antonyms : []
  const learnerAssociations = Array.isArray(row.learner_associations) ? row.learner_associations : []

  return {
    word: row.word || '',
    romanization: row.romanization || '',
    romanization_source: 'deepseek',
    sources: ['community_ai_generated'],
    sense_count: senses.length || 1,
    senses: senses.map((s, i) => ({
      sense_id: s.sense_id || (i + 1),
      pos: s.pos || '未标注',
      meaning: s.meaning || '',
      register: s.register || '通用',
      examples: Array.isArray(s.examples) ? s.examples : [],
      segmented: Array.isArray(s.segmented) ? s.segmented : null,
      source: 'ai_generated',
    })),
    freq_tnc: null,
    freq_ttc: null,
    freq_phupha: null,
    synonyms,
    antonyms,
    learner_associations: learnerAssociations,
    user_sentence_count: 0,
  }
}

/**
 * Save an AI-generated word to the community words database
 */
export async function saveCommunityWord(wordData, userId = null, zhHint = '') {
  if (!supabase || !wordData || !wordData.word) return null
  try {
    const row = {
      word: wordData.word,
      romanization: wordData.romanization || '',
      senses: wordData.senses || [],
      synonyms: wordData.synonyms || [],
      antonyms: wordData.antonyms || [],
      learner_associations: wordData.learner_associations || [],
      submitted_by: userId || null,
      source: 'ai_generated',
      zh_hint: zhHint || '',
    }
    // Upsert on conflict (word already exists)
    const { data, error } = await supabase
      .from('community_words')
      .upsert(row, { onConflict: 'word', ignoreDuplicates: false })
      .select()
      .single()
    if (error) {
      console.error('[supabase] saveCommunityWord:', error.message)
      return null
    }
    return data
  } catch (err) {
    console.error('[supabase] saveCommunityWord:', err)
    return null
  }
}

/* ─── Daily Picks (每日推荐 v2：全局统一，不分用户，只存 ID) ─── */

/**
 * Fetch full word data from dictionary_full by word text (natural key).
 * Returns transformed word data or null.
 */
async function fetchWordByText(wordText) {
  if (!supabase || !wordText) return null
  try {
    const { data, error } = await supabase
      .from('dictionary_full')
      .select('*')
      .eq('word', wordText)
      .single()
    if (error || !data) {
      // Try community_words as fallback
      const { data: cw } = await supabase
        .from('community_words')
        .select('*')
        .eq('word', wordText)
        .single()
      if (cw) return transformWordData(cw)
      return null
    }
    return transformWordData(data)
  } catch (e) {
    console.error('[supabase] fetchWordByText:', e)
    return null
  }
}

/**
 * Fetch full sentence data from sentences table by ID.
 * Returns sentence data or null.
 */
async function fetchSentenceById(sentenceId) {
  if (!supabase || !sentenceId) return null
  try {
    const { data, error } = await supabase
      .from('sentences')
      .select('*')
      .eq('id', sentenceId)
      .single()
    if (error || !data) return null
    return data
  } catch (e) {
    console.error('[supabase] fetchSentenceById:', e)
    return null
  }
}

/**
 * Load today's daily pick (word + sentence) — global, not per-user.
 * Returns cached pick with FULL data if exists for today, otherwise returns null.
 * Picks are generated server-side (via cron or AI) or on explicit user refresh.
 */
export async function loadDailyPick() {
  if (!supabase) return { word: null, sentence: null }
  const today = new Date().toISOString().split('T')[0]

  // Check existing pick for today (global, no user_id filter)
  try {
    const { data: pick, error } = await supabase
      .from('daily_picks')
      .select('*')
      .eq('pick_date', today)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return { word: null, sentence: null }
      }
      if (error.message?.includes('does not exist')) {
        console.warn('[supabase] daily_picks table does not exist. Run daily_picks_v2.sql migration.')
        return { word: null, sentence: null }
      }
      console.error('[supabase] loadDailyPick query error:', error.message)
      return { word: null, sentence: null }
    }

    if (pick) {
      // Fetch full data by ID references (not stored inline)
      const [word, sentence] = await Promise.all([
        pick.daily_word_id ? fetchWordByText(pick.daily_word_id) : null,
        pick.daily_sentence_id ? fetchSentenceById(pick.daily_sentence_id) : null,
      ])
      return { word, sentence }
    }
    return { word: null, sentence: null }
  } catch (e) {
    console.error('[supabase] loadDailyPick exception:', e)
    return { word: null, sentence: null }
  }
}

/**
 * Refresh daily pick — user clicked the refresh button.
 * Generates new random word/sentence and upserts by date (global).
 */
export async function refreshDailyPick(type = 'both') {
  if (!supabase) return { word: null, sentence: null }
  const today = new Date().toISOString().split('T')[0]

  let newWordRaw = null
  let newSentenceRaw = null

  if (type === 'word' || type === 'both') {
    newWordRaw = await getDailyWord()
  }
  if (type === 'sentence' || type === 'both') {
    newSentenceRaw = await getDailySentence()
  }

  const newWord = newWordRaw ? transformWordData(newWordRaw) : null

  // Get current pick to merge unchanged fields
  let currentPick = null
  try {
    const { data } = await supabase
      .from('daily_picks')
      .select('*')
      .eq('pick_date', today)
      .single()
    if (data) currentPick = data
  } catch (e) { /* no current pick */ }

  const updateRow = {
    pick_date: today,
    daily_word_id: newWordRaw ? newWordRaw.word : (currentPick?.daily_word_id || null),
    daily_sentence_id: newSentenceRaw ? newSentenceRaw.id : (currentPick?.daily_sentence_id || null),
    updated_at: new Date().toISOString(),
  }

  try {
    const { error } = await supabase
      .from('daily_picks')
      .upsert(updateRow, { onConflict: 'pick_date' })
    if (error) console.error('[supabase] refreshDailyPick:', error.message)
    return { word: newWord, sentence: newSentenceRaw }
  } catch (e) {
    console.error('[supabase] refreshDailyPick:', e)
    return { word: newWord, sentence: newSentenceRaw }
  }
}

/* ─── Checkin Tasks (学习打卡) CRUD Functions ─── */

/**
 * Get all active checkin tasks for a user, ordered by sort_order.
 */
export async function getCheckinTasks(userId) {
  if (!supabase || !userId) return []
  try {
    const { data, error } = await supabase
      .from('user_checkin_tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    if (error) {
      console.error('[supabase] getCheckinTasks:', error.message)
      return []
    }
    return data || []
  } catch (e) {
    console.error('[supabase] getCheckinTasks:', e)
    return []
  }
}

/**
 * Create a new checkin task.
 * taskData: { task_type, task_name, schedule_days, duration_minutes, is_custom, sort_order }
 */
export async function createCheckinTask(userId, taskData) {
  if (!supabase || !userId) return null
  try {
    const { data, error } = await supabase
      .from('user_checkin_tasks')
      .insert({
        user_id: userId,
        task_type: taskData.task_type || '自定义',
        task_name: taskData.task_name || '',
        schedule_days: taskData.schedule_days || [1, 2, 3, 4, 5],
        duration_minutes: taskData.duration_minutes || 15,
        is_custom: taskData.is_custom !== undefined ? taskData.is_custom : true,
        sort_order: taskData.sort_order || 0,
      })
      .select()
      .single()
    if (error) {
      console.error('[supabase] createCheckinTask:', error.message)
      return null
    }
    return data
  } catch (e) {
    console.error('[supabase] createCheckinTask:', e)
    return null
  }
}

/**
 * Update an existing checkin task (partial update).
 */
export async function updateCheckinTask(taskId, updates) {
  if (!supabase || !taskId) return null
  try {
    const { data, error } = await supabase
      .from('user_checkin_tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single()
    if (error) {
      console.error('[supabase] updateCheckinTask:', error.message)
      return null
    }
    return data
  } catch (e) {
    console.error('[supabase] updateCheckinTask:', e)
    return null
  }
}

/**
 * Soft-delete a checkin task (set is_active = false).
 */
export async function deleteCheckinTask(taskId) {
  if (!supabase || !taskId) return false
  try {
    const { error } = await supabase
      .from('user_checkin_tasks')
      .update({ is_active: false })
      .eq('id', taskId)
    if (error) {
      console.error('[supabase] deleteCheckinTask:', error.message)
      return false
    }
    return true
  } catch (e) {
    console.error('[supabase] deleteCheckinTask:', e)
    return false
  }
}

/**
 * Toggle a checkin task completion for a given date.
 * If completed=true, insert a completion record. If false, remove it.
 */
export async function toggleCheckinTaskCompletion(userId, taskId, date, completed) {
  if (!supabase || !userId || !taskId || !date) return false
  try {
    // First, get the task's duration_minutes
    const { data: taskData } = await supabase
      .from('user_checkin_tasks')
      .select('duration_minutes')
      .eq('id', taskId)
      .single()
    const duration = taskData?.duration_minutes || 15

    if (completed) {
      const { error } = await supabase
        .from('user_checkin_completions')
        .upsert({
          user_id: userId,
          task_id: taskId,
          completed_date: date,
          completed_at: new Date().toISOString(),
        }, { onConflict: 'user_id,task_id,completed_date' })
      if (error) {
        console.error('[supabase] toggleCheckinTaskCompletion (insert):', error.message)
        return false
      }
      // Add duration to study_minutes for this date
      const { data: progressData } = await supabase
        .from('user_learning_progress')
        .select('study_minutes')
        .eq('user_id', userId)
        .eq('date', date)
        .single()
      const currentMins = progressData?.study_minutes || 0
      await updateDailyProgress(userId, date, { study_minutes: currentMins + duration })
    } else {
      const { error } = await supabase
        .from('user_checkin_completions')
        .delete()
        .eq('user_id', userId)
        .eq('task_id', taskId)
        .eq('completed_date', date)
      if (error) {
        console.error('[supabase] toggleCheckinTaskCompletion (delete):', error.message)
        return false
      }
      // Subtract duration from study_minutes for this date
      const { data: progressData } = await supabase
        .from('user_learning_progress')
        .select('study_minutes')
        .eq('user_id', userId)
        .eq('date', date)
        .single()
      const currentMins = progressData?.study_minutes || 0
      await updateDailyProgress(userId, date, { study_minutes: Math.max(0, currentMins - duration) })
    }
    return true
  } catch (e) {
    console.error('[supabase] toggleCheckinTaskCompletion:', e)
    return false
  }
}

/**
 * Get all completion records for a user on a specific date.
 * Returns array of task_id strings.
 */
export async function getCheckinCompletions(userId, date) {
  if (!supabase || !userId || !date) return []
  try {
    const { data, error } = await supabase
      .from('user_checkin_completions')
      .select('task_id')
      .eq('user_id', userId)
      .eq('completed_date', date)
    if (error) {
      console.error('[supabase] getCheckinCompletions:', error.message)
      return []
    }
    return (data || []).map(r => r.task_id)
  } catch (e) {
    console.error('[supabase] getCheckinCompletions:', e)
    return []
  }
}

/* ─── Auth Helper Functions ─── */

/**
 * Get learner tip for a word from community_words
 */
export async function getWordLearnerTip(word) {
  if (!supabase || !word) return null
  try {
    const { data, error } = await supabase
      .from('community_words')
      .select('learner_tip')
      .eq('word', word)
      .maybeSingle()
    if (error || !data) return null
    return data.learner_tip || null
  } catch (e) {
    console.error('[supabase] getWordLearnerTip:', e.message)
    return null
  }
}

/**
 * Save learner tip for a word to community_words
 */
export async function saveWordLearnerTip(word, tip) {
  if (!supabase || !word) return null
  try {
    const { data, error } = await supabase
      .from('community_words')
      .upsert({ word, learner_tip: tip }, { onConflict: 'word', ignoreDuplicates: false })
      .select()
      .single()
    if (error) {
      console.error('[supabase] saveWordLearnerTip:', error.message)
      return null
    }
    return data
  } catch (e) {
    console.error('[supabase] saveWordLearnerTip:', e.message)
    return null
  }
}

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
 * Verify email with OTP code (legacy - for Supabase built-in OTP)
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

/* ────────────────────────────────────────────
   BREVO OTP FUNCTIONS
   ──────────────────────────────────────────── */

/**
 * Send OTP code via Brevo email
 * @param {string} email - Recipient email
 * @param {string} type - 'login' or 'reset'
 */
export async function sendOtp(email, type = 'login') {
  if (!supabase) return { error: 'Supabase not configured' }
  try {
    const { data, error } = await supabase.functions.invoke('send-otp', {
      body: { email: email.trim(), type },
    })
    if (error) return { error: error.message, data: null }
    return { data, error: null }
  } catch (e) {
    return { error: e.message || '发送验证码失败', data: null }
  }
}

/**
 * Verify OTP code via Brevo verification
 * @param {string} email - User email
 * @param {string} code - 6-digit OTP code
 * @param {string} type - 'login' or 'reset'
 */
export async function verifyBrevoOtp(email, code, type = 'login') {
  if (!supabase) return { error: 'Supabase not configured' }
  try {
    const { data, error } = await supabase.functions.invoke('verify-otp', {
      body: { email: email.trim(), code, type },
    })
    if (error) return { error: error.message, data: null }
    return { data, error: null }
  } catch (e) {
    return { error: e.message || '验证失败', data: null }
  }
}

/**
 * Sign in with email and OTP code (Brevo)
 * First verifies OTP, then signs in with password-less magic link approach
 */
export async function signInWithOtp(email, code) {
  if (!supabase) return { error: 'Supabase not configured' }

  // First verify the OTP via our Edge Function
  const { data: verifyData, error: verifyError } = await verifyBrevoOtp(email, code, 'login')
  if (verifyError) return { error: verifyError, data: null }

  // If OTP is valid, use Supabase's signInWithOtp to create a session
  // This sends a magic link that auto-confirms the email
  const { data, error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: {
      shouldCreateUser: true,
    },
  })

  if (error) return { error: error.message, data: null }
  return { data, error: null }
}

/**
 * Reset password with OTP verification
 * @param {string} email - User email
 * @param {string} code - 6-digit OTP code
 * @param {string} newPassword - New password to set
 */
export async function resetPasswordWithOtp(email, code, newPassword) {
  if (!supabase) return { error: 'Supabase not configured' }

  // First verify the OTP
  const { data: verifyData, error: verifyError } = await verifyBrevoOtp(email, code, 'reset')
  if (verifyError) return { error: verifyError, data: null }

  // Use Supabase's resetPasswordForEmail with the OTP token
  // We need to use a different approach - update password directly
  // This requires the user to be authenticated or use a special token

  // For now, we'll use the verifyOtp approach with recovery type
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: code,
    type: 'recovery',
  })

  if (error) {
    // Fallback: try to update password directly if user is somehow authenticated
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })
    if (updateError) return { error: updateError.message, data: null }
    return { data: { message: '密码已更新' }, error: null }
  }

  // If recovery OTP is valid, update the password
  if (data?.session) {
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })
    if (updateError) return { error: updateError.message, data: null }
  }

  return { data, error: null }
}
