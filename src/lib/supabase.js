import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

let supabase = null
if (isSupabaseConfigured) {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
}

export default supabase

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

  // Search Chinese meaning inside senses JSONB
  const { data: meaning } = await supabase
    .from('dictionary_full')
    .select('*')
    .filter('senses', 'cs', JSON.stringify([{ meaning: query }]))
    .limit(limit)

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
  const { data, error } = await supabase
    .from('dictionary_full')
    .select('*')
    .eq('enrichment_status', 'enriched')
    .gt('sense_count', 0)
    .limit(1)
    .single()
  if (error) {
    console.error('[supabase] getDailyWord:', error.message)
    return null
  }
  return data
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
