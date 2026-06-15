import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../main.jsx'
import {
  isSupabaseConfigured, getWordByThai, transformWordData, transformCommunityWord,
  getUserSettings, getApiKeys, callAiProxy, saveCommunityWord,
  syncUserStatsOnLogin,
} from '../lib/supabase.js'

export const AppContext = createContext(null)
export const useAppContext = () => useContext(AppContext)

export function AppProvider({ children }) {
  const { user: supaUser, session, loading: authLoading, signOut: handleSignOut } = useAuth()
  const userId = supaUser?.id || null
  const isLoggedIn = !!session

  /* ── Sync user stats on login ── */
  const prevUserId = useRef(null)
  useEffect(() => {
    if (userId && userId !== prevUserId.current) {
      prevUserId.current = userId
      syncUserStatsOnLogin(userId).catch(err => console.error('[syncUserStats]', err))
    }
  }, [userId])

  /* ── Page navigation ── */
  const [page, setPage] = useState("home")
  const [detailWord, setDetailWord] = useState(null)
  const [unknownWord, setUnknownWord] = useState(null)
  const [generatedWords, setGeneratedWords] = useState({})
  const [selectedSentence, setSelectedSentence] = useState(null)
  const [dbWordData, setDbWordData] = useState({})
  const [detailLoading, setDetailLoading] = useState(false)

  /* ── Navigation history stack ── */
  const [navStack, setNavStack] = useState([])
  const [navForward, setNavForward] = useState([])

  const getCurrentView = useCallback(() => {
    if (unknownWord) return { type: 'unknown', word: unknownWord }
    if (detailWord) return { type: 'detail', word: detailWord }
    return null
  }, [unknownWord, detailWord])

  const navigateTo = useCallback((entry) => {
    const current = getCurrentView()
    if (current) setNavStack(prev => [...prev, current])
    setNavForward([])
    if (entry.type === 'detail') {
      setUnknownWord(null)
      setDetailWord(entry.word)
    } else if (entry.type === 'unknown') {
      setDetailWord(null)
      setUnknownWord(entry.word)
    }
  }, [getCurrentView])

  const goBack = useCallback(() => {
    if (navStack.length === 0) {
      setDetailWord(null)
      setUnknownWord(null)
      return
    }
    const current = getCurrentView()
    const prev = navStack[navStack.length - 1]
    setNavStack(s => s.slice(0, -1))
    if (current) setNavForward(f => [...f, current])
    if (prev.type === 'detail') { setUnknownWord(null); setDetailWord(prev.word) }
    else if (prev.type === 'unknown') { setDetailWord(null); setUnknownWord(prev.word) }
  }, [navStack, getCurrentView])

  const goForward = useCallback(() => {
    if (navForward.length === 0) return
    const current = getCurrentView()
    const next = navForward[navForward.length - 1]
    setNavForward(f => f.slice(0, -1))
    if (current) setNavStack(s => [...s, current])
    if (next.type === 'detail') { setUnknownWord(null); setDetailWord(next.word) }
    else if (next.type === 'unknown') { setDetailWord(null); setUnknownWord(next.word) }
  }, [navForward, getCurrentView])

  const resetNav = useCallback(() => {
    setDetailWord(null); setUnknownWord(null)
    setNavStack([]); setNavForward([])
  }, [])

  /* ── Theme ── */
  const [colorMode, setColorMode] = useState(() =>
    localStorage.getItem('thaidict-color-mode') || 'light'
  )
  useEffect(() => {
    if (colorMode === 'dark') document.documentElement.dataset.theme = 'dark'
    else if (colorMode === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.dataset.theme = prefersDark ? 'dark' : 'light'
    } else delete document.documentElement.dataset.theme
    localStorage.setItem('thaidict-color-mode', colorMode)
  }, [colorMode])

  /* ── Word tap handler ── */
  const handleWordTap = async (word) => {
    if (!word) return
    if (dbWordData[word] || generatedWords[word]) {
      navigateTo({ type: 'detail', word }); return
    }
    if (isSupabaseConfigured) {
      setDetailLoading(true)
      try {
        const row = await getWordByThai(word)
        if (row) {
          const transformed = row._source === 'community'
            ? transformCommunityWord(row)
            : transformWordData(row)
          setDbWordData(prev => ({ ...prev, [word]: transformed }))
          setDetailLoading(false)
          navigateTo({ type: 'detail', word }); return
        }
      } catch (err) { console.error("[handleWordTap]", err) }
      setDetailLoading(false)
    }
    navigateTo({ type: 'unknown', word })
  }

  /* ── AI generation handler ── */
  const handleGenerated = async (word, zhHint = "") => {
    if (!isSupabaseConfigured) return
    try {
      let userApi = null
      if (userId) {
        const settings = await getUserSettings(userId)
        if (settings?.default_api_id && settings.default_api_id !== 'system') {
          const keys = await getApiKeys(userId)
          const dk = keys.find(k => k.id === settings.default_api_id || String(k.id) === String(settings.default_api_id))
          if (dk) userApi = { key: dk.key, base_url: dk.base_url, model: dk.model }
        }
      }
      const prompt = `请为泰语词语"${word}"生成完整的词条数据。${zhHint ? `中文提示：${zhHint}` : ''}`
      const result = await callAiProxy(prompt, userApi)
      if (result.error) {
        setUnknownWord(null); setDetailWord(word); return
      }
      const d = result.data
      if (d && d.word) {
        const wordEntry = {
          word: d.word || word, romanization: d.romanization || "",
          romanization_source: "deepseek", sources: ["src_ai_generated"],
          sense_count: (d.senses || []).length || 1,
          senses: (d.senses || []).map((s, i) => ({
            sense_id: s.sense_id || (i+1), pos: s.pos || "未标注",
            meaning: s.meaning || "", register: s.register || "通用",
            examples: Array.isArray(s.examples) ? s.examples : [],
            segmented: Array.isArray(s.segmented) ? s.segmented : null,
            source: "ai_generated",
          })),
          freq_ttc: d.freq_ttc || null, freq_tnc: d.freq_tnc || null,
          freq_phupha: d.freq_phupha || null,
          synonyms: Array.isArray(d.synonyms) ? d.synonyms : [],
          antonyms: Array.isArray(d.antonyms) ? d.antonyms : [],
          learner_associations: Array.isArray(d.learner_associations) ? d.learner_associations : [],
          user_sentence_count: d.user_sentence_count || 0,
        }
        setGeneratedWords(prev => ({ ...prev, [word]: wordEntry }))

        // Save to community_words database for future search hits
        saveCommunityWord({
          word: wordEntry.word,
          romanization: wordEntry.romanization,
          senses: wordEntry.senses,
          synonyms: wordEntry.synonyms,
          antonyms: wordEntry.antonyms,
          learner_associations: wordEntry.learner_associations,
        }, userId, zhHint).catch(err => console.error('[saveCommunityWord]', err))
      }
    } catch (err) { console.error("[handleGenerated]", err) }
    setUnknownWord(null); setDetailWord(word)
  }

  const value = {
    // Auth
    supaUser, userId, isLoggedIn, authLoading, handleSignOut,
    // Navigation
    page, setPage, detailWord, setDetailWord,
    unknownWord, setUnknownWord, selectedSentence, setSelectedSentence,
    generatedWords, dbWordData, detailLoading,
    navStack, navForward, navigateTo, goBack, goForward, resetNav,
    // Theme
    colorMode, setColorMode,
    // Handlers
    handleWordTap, handleGenerated,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
