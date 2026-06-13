import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

let supabase = null
if (isSupabaseConfigured) {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
}

export default supabase

/**
 * Search words in the dictionary
 * @param {string} query - Chinese or Thai word to search
 * @param {number} limit - Max results (default 20)
 */
export async function searchWords(query, limit = 20) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('dictionary_full')
    .select('*')
    .or(`word.ilike.%${query}%,zh_gloss.ilike.%${query}%`)
    .eq('is_active', true)
    .limit(limit)
  if (error) {
    console.error('[supabase] searchWords error:', error)
    return []
  }
  return data || []
}

/**
 * Get a single word by its Thai spelling
 * @param {string} word - Exact Thai word
 */
export async function getWordByThai(word) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('dictionary_full')
    .select('*')
    .eq('word', word)
    .eq('is_active', true)
    .single()
  if (error) {
    console.error('[supabase] getWordByThai error:', error)
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
    .eq('is_active', true)
    .limit(1)
    .single()
  if (error) {
    console.error('[supabase] getDailyWord error:', error)
    return null
  }
  return data
}

/**
 * Submit a new word for AI enrichment
 * @param {string} word - Thai word to add
 * @param {string} zhGloss - Chinese meaning
 */
export async function submitWord(word, zhGloss) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('submissions')
    .insert({ word, zh_gloss: zhGloss, status: 'pending' })
    .select()
    .single()
  if (error) {
    console.error('[supabase] submitWord error:', error)
    return null
  }
  return data
}
