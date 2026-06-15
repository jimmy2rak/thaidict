import { useState, useEffect, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import { Search, Mic, X, Play, RefreshCw, Sparkles, ChevronRight, Bookmark, CalendarCheck } from "lucide-react";
import { Card, Badge, StatCard, SectionTitle, WordTokenSpan, TooltipDismissOverlay } from "../components/UIComponents";
import {
  isSupabaseConfigured,
  loadDailyPick, refreshDailyPick, getRecentWords,
  searchWords, transformWordData, transformSearchResult,
  getStreak, getDictionaryCount,
  getBookmarks, getMonthlyCheckinStreak,
} from "../lib/supabase.js";
import { speak } from "../utils/tts";
import phraseData from "../data/phraseData";
import { thaiSegment } from "../utils/thaiSegment";

const IW = 1.5;

const HomePage = () => {
  const { userId, handleWordTap, setSelectedSentence, setPage } = useAppContext();

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [dailyData, setDailyData] = useState(null);
  const [dailyRefreshing, setDailyRefreshing] = useState(false);
  const [dailySentence, setDailySentence] = useState(null);
  const [sentenceRefreshing, setSentenceRefreshing] = useState(false);
  const [recentData, setRecentData] = useState([]);
  const [streak, setStreak] = useState(0);
  const [dictCount, setDictCount] = useState(null);
  const [sentenceWordTip, setSentenceWordTip] = useState(null);
  const [sentenceFlipped, setSentenceFlipped] = useState(false);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [monthlyCheckinDays, setMonthlyCheckinDays] = useState(0);

  const loadRandomWord = async () => {
    setDailyRefreshing(true)
    const result = await refreshDailyPick('word')
    if (result.word) setDailyData(result.word)
    setDailyRefreshing(false)
  }

  const loadRandomSentence = async () => {
    setSentenceRefreshing(true)
    const result = await refreshDailyPick('sentence')
    if (result.sentence) setDailySentence(result.sentence)
    setSentenceRefreshing(false)
  }

  /* ── Fetch daily word + sentence (global persistent per day) + recent words + streak + dict count ── */
  useEffect(() => {
    if (!isSupabaseConfigured) return
    // Load daily pick (global, cached for today — no userId needed)
    loadDailyPick().then(({ word, sentence }) => {
      if (word) setDailyData(word)
      if (sentence) setDailySentence(sentence)
    })
    if (userId && userId !== 'anonymous') {
      getStreak(userId).then(setStreak)
      getBookmarks(userId).then(rows => setBookmarkCount((rows || []).length))
      getMonthlyCheckinStreak(userId).then(r => setMonthlyCheckinDays(r.totalDays))
    }
    getRecentWords(8).then(rows => { setRecentData(rows.map(transformSearchResult).filter(Boolean)) })
    getDictionaryCount().then(setDictCount)
  }, [userId])

  /* ── Debounced search (internal state) ── */
  useEffect(() => {
    if (!query.trim() || !isSupabaseConfigured) { setSearchResults([]); return; }
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      const results = await searchWords(query.trim(), 15);
      setSearchResults(results.map(transformSearchResult).filter(Boolean));
      setSearchLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  /* ── Scroll dismissal for word tooltip ── */
  useEffect(() => {
    if (!sentenceWordTip) return;
    const dismiss = () => setSentenceWordTip(null);
    window.addEventListener('scroll', dismiss, true);
    return () => window.removeEventListener('scroll', dismiss, true);
  }, [sentenceWordTip]);

  /* ── Display helpers ── */
  const dw = dailyData;
  const dwSense = dw?.senses?.[0];
  const dwExample = dwSense?.examples?.[0];

  // Enrich daily sentence with segmented fallback from phraseData when DB segmented is empty
  const dailySentenceEnriched = useMemo(() => {
    if (!dailySentence) return null;
    const seg = Array.isArray(dailySentence.segmented) && dailySentence.segmented.length > 0
      ? dailySentence.segmented
      : null;
    if (seg) return dailySentence; // already has good segmented data
    // Search all phraseData categories for matching text
    for (const cat of Object.values(phraseData)) {
      const match = cat.find(p => p.text === dailySentence.text);
      if (match && match.segmented) {
        return { ...dailySentence, segmented: match.segmented };
      }
    }
    return dailySentence;
  }, [dailySentence]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "0 16px 16px" }}>
      {/* Search bar */}
      <div style={{ position: "relative" }}>
        <Search size={18} strokeWidth={IW} color={"var(--c-s300)"} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }} />
        <input
          value={query} onChange={e => setQuery(e.target.value)}
          placeholder={"\u8F93\u5165\u4E2D\u6587\u6216\u6CF0\u6587\u641C\u7D22..."}
          style={{
            width: "100%", padding: "14px 44px 14px 44px", borderRadius: 14,
            border: `1.5px solid ${"var(--c-p200)"}`, background: "var(--c-surface)", fontSize: 15,
            color: "var(--c-p800)", outline: "none", transition: "border-color 0.2s",
            fontFamily: "var(--zh-font), sans-serif", boxSizing: "border-box",
          }}
          onFocus={e => e.target.style.borderColor = "var(--c-p500)"}
          onBlur={e => e.target.style.borderColor = "var(--c-p200)"}
        />
        {query ? <X size={16} strokeWidth={IW} color={"var(--c-s300)"} style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", cursor: "pointer" }} onClick={() => { setQuery(""); setSearchResults([]); }} /> : <Mic size={16} strokeWidth={IW} color={"var(--c-s300)"} style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", cursor: "pointer" }} />}
      </div>

      {/* Search results overlay */}
      {query.trim() && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {searchLoading && <div style={{ textAlign: "center", padding: 16, color: "var(--c-s500)", fontSize: 13 }}>{"\u641C\u7D22\u4E2D..."}</div>}
          {!searchLoading && searchResults.length === 0 && (
            <div style={{ textAlign: "center", padding: "20px 16px" }}>
              <div style={{ fontSize: 13, color: "var(--c-s500)", marginBottom: 12 }}>{"未找到「" + query.trim() + "」"}</div>
              <div onClick={() => handleWordTap(query.trim())} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "10px 20px", borderRadius: 12, cursor: "pointer",
                background: "var(--c-teal)", color: "#fff", fontSize: 13, fontWeight: 600,
                fontFamily: "var(--zh-font), sans-serif",
              }}>
                <Sparkles size={14} strokeWidth={IW} />
                {"通过 AI 新增词条信息"}
              </div>
            </div>
          )}
          {searchResults.map((r, i) => (
            <div key={r.word + i} onClick={() => handleWordTap(r.word)} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 16px", borderRadius: 14, background: "var(--c-surface)",
              border: `1px solid ${"var(--c-p100)"}`, cursor: "pointer",
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: "var(--c-teal)", fontFamily: "var(--th-font), sans-serif" }}>{r.word}</span>
                  {r.pos && <Badge bg={"var(--c-p100)"} fg={"var(--c-p700)"} style={{ fontSize: 9 }}>{r.pos}</Badge>}
                  {r.sense_count > 1 && <span style={{ fontSize: 10, color: "var(--c-s400)" }}>{r.sense_count}{"\u4E49"}</span>}
                </div>
                {r.meaning && <div style={{ fontSize: 13, color: "var(--c-p700)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.meaning}</div>}
              </div>
              <ChevronRight size={14} strokeWidth={IW} color={"var(--c-s300)"} style={{ flexShrink: 0 }} />
            </div>
          ))}
          {/* AI search button — always visible at bottom of results (Bug 3) */}
          {!searchLoading && searchResults.length > 0 && (
            <div onClick={() => handleWordTap(query.trim())} style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "12px 20px", borderRadius: 12, cursor: "pointer", marginTop: 2,
              background: "color-mix(in srgb, var(--c-teal) 10%, transparent)",
              border: `1px dashed ${"var(--c-teal)"}`,
            }}>
              <Sparkles size={13} strokeWidth={IW} color={"var(--c-teal)"} />
              <span style={{ fontSize: 12, color: "var(--c-teal)", fontWeight: 600 }}>{"没找到想要的？试试 AI 搜索"}</span>
            </div>
          )}
        </div>
      )}

      {/* When not searching, show dashboard */}
      {!query.trim() && <>
        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div onClick={() => setPage("words")} style={{ cursor: "pointer" }}>
            <StatCard icon={Bookmark} label={"我的收藏"} value={bookmarkCount > 0 ? String(bookmarkCount) : "—"} sub={"个"} color={"var(--c-teal)"} />
          </div>
          <StatCard icon={CalendarCheck} label={"本月打卡"} value={monthlyCheckinDays > 0 ? String(monthlyCheckinDays) : "—"} sub={"天"} color={"var(--c-gold)"} />
        </div>

        {/* Daily Word */}
        <Card onClick={() => dw && handleWordTap(dw.word)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <Badge bg={"var(--c-goldL)"} fg={"var(--c-gold)"}>{"\u6BCF\u65E5\u4E00\u8BCD"}</Badge>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "var(--c-s300)" }}>{new Date().toLocaleDateString("zh-CN")}</span>
              <div onClick={(e) => { e.stopPropagation(); loadRandomWord(); }} style={{ cursor: "pointer", display: "flex", alignItems: "center", padding: 4 }}>
                <RefreshCw size={14} strokeWidth={IW} color={"var(--c-s400)"} style={{ animation: dailyRefreshing ? "spin 0.8s linear infinite" : "none" }} />
              </div>
            </div>
          </div>
          {dw ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: "var(--c-p900)", fontFamily: "var(--th-font), serif", letterSpacing: "0.04em" }}>{dw.word}</div>
                <div onClick={(e) => { e.stopPropagation(); speak(dw.word, "th-TH", 0.85); }} style={{ cursor: "pointer", display: "flex", alignItems: "center" }}>
                  <Play size={16} strokeWidth={IW} color={"var(--c-teal)"} fill={"var(--c-teal)"} />
                </div>
              </div>
              {dw.romanization && <div style={{ fontSize: 13, color: "var(--c-teal)", fontFamily: "monospace", fontStyle: "italic", marginTop: 2 }}>{dw.romanization}</div>}
              {dwSense && (
                <>
                  <div style={{ fontSize: 14, color: "var(--c-p700)", lineHeight: 1.6, marginTop: 10 }}>
                    {dwSense.pos && <Badge bg={"var(--c-p100)"} fg={"var(--c-p700)"} style={{ fontSize: 10, marginRight: 6 }}>{dwSense.pos}</Badge>}
                    {dwSense.meaning}
                  </div>
                  {dwExample && (
                    <div style={{ borderTop: `1px solid ${"var(--c-p100)"}`, marginTop: 12, paddingTop: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ fontSize: 13, color: "var(--c-teal)", flex: 1 }}>{dwExample.th}</div>
                        <div onClick={(e) => { e.stopPropagation(); speak(dwExample.th, "th-TH", 0.85); }} style={{ cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}>
                          <Play size={12} strokeWidth={IW} color={"var(--c-teal)"} fill={"var(--c-teal)"} />
                        </div>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--c-p700)", marginTop: 3 }}>{dwExample.zh}</div>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div style={{ padding: "12px 0", textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "var(--c-s300)", marginBottom: 8, lineHeight: 1.5 }}>
                {"\u6BCF\u65E5\u63A8\u8350\u5C1A\u672A\u751F\u6210"}
              </div>
              <div onClick={(e) => { e.stopPropagation(); loadRandomWord(); }} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 18px", borderRadius: 10, cursor: "pointer",
                background: "color-mix(in srgb, var(--c-gold) 12%, transparent)",
                border: `1px dashed ${"var(--c-gold)"}`,
              }}>
                <Sparkles size={12} strokeWidth={IW} color={"var(--c-gold)"} />
                <span style={{ fontSize: 12, color: "var(--c-gold)", fontWeight: 600 }}>{"\u751F\u6210\u4ECA\u65E5\u63A8\u8350"}</span>
              </div>
            </div>
          )}
        </Card>

        {/* Daily Sentence — flip card style */}
        {dailySentenceEnriched && (
          <div style={{ position: "relative" }}>
            <div onClick={() => { if (setSelectedSentence) setSelectedSentence(dailySentenceEnriched); }} style={{
              perspective: 600, cursor: "pointer", minHeight: 90,
            }}>
              <div style={{
                position: "relative", width: "100%", minHeight: 90,
                transformStyle: "preserve-3d", transition: "transform 0.5s ease",
                transform: sentenceFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}>
                {/* Front: Thai text */}
                <div style={{
                  position: "absolute", inset: 0, backfaceVisibility: "hidden",
                  background: "var(--c-surface)", borderRadius: 16,
                  border: `1px solid ${"var(--c-p100)"}`, padding: 20,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 4 }}>
                    <Badge bg={"color-mix(in srgb, var(--c-teal) 15%, transparent)"} fg={"var(--c-teal)"}>{"每日一句"}</Badge>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {dailySentenceEnriched?.category && (
                        <Badge bg={"var(--c-p100)"} fg={"var(--c-p700)"} style={{ fontSize: 9 }}>
                          {dailySentenceEnriched.category === "idioms" ? "俗语" : dailySentenceEnriched.category === "buddhist" ? "佛教用语" : "日常用语"}
                        </Badge>
                      )}
                      <div onClick={(e) => { e.stopPropagation(); loadRandomSentence(); }} style={{ cursor: "pointer", display: "flex" }}>
                        <RefreshCw size={14} strokeWidth={IW} color={"var(--c-s400)"} style={{ animation: sentenceRefreshing ? "spin 0.8s linear infinite" : "none" }} />
                      </div>
                    </div>
                  </div>
                  <span style={{
                    fontSize: 18, fontWeight: 600, color: "var(--c-p900)",
                    fontFamily: "var(--th-font), sans-serif", textAlign: "center", lineHeight: 1.5,
                  }}>{dailySentenceEnriched.text}</span>
                  <div onClick={(e) => { e.stopPropagation(); setSentenceFlipped(f => !f); }} style={{
                    fontSize: 11, color: "var(--c-s300)", cursor: "pointer",
                    padding: "3px 10px", borderRadius: 8, background: "var(--c-surfaceAlt)",
                  }}>翻转查看释义 ↻</div>
                </div>
                {/* Back: Chinese meaning */}
                <div style={{
                  position: "absolute", inset: 0, backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                  background: "color-mix(in srgb, var(--c-gold) 6%, var(--c-surface))",
                  borderRadius: 16, border: `1px solid ${"color-mix(in srgb, var(--c-gold) 15%, transparent)"}`,
                  padding: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                  <Badge bg={"color-mix(in srgb, var(--c-gold) 15%, transparent)"} fg={"var(--c-gold)"}>{"释义"}</Badge>
                  <span style={{
                    fontSize: 16, fontWeight: 600, color: "var(--c-p800)",
                    fontFamily: "var(--zh-font), sans-serif", textAlign: "center", lineHeight: 1.5,
                  }}>{dailySentenceEnriched.actual_meaning || dailySentenceEnriched.literal_meaning || ''}</span>
                  <div onClick={(e) => { e.stopPropagation(); setSentenceFlipped(f => !f); }} style={{
                    fontSize: 11, color: "var(--c-s300)", cursor: "pointer",
                    padding: "3px 10px", borderRadius: 8, background: "var(--c-surfaceAlt)",
                  }}>翻转 ↻</div>
                </div>
              </div>
            </div>
            {/* Action buttons overlay */}
            <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 4, zIndex: 5 }}>
              <div onClick={(e) => { e.stopPropagation(); speak(dailySentenceEnriched.text, "th-TH", 0.85); }} style={{
                width: 28, height: 28, borderRadius: 8, background: "var(--c-surfaceAlt)",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              }}>
                <Play size={13} strokeWidth={IW} color={"var(--c-teal)"} fill={"var(--c-teal)"} />
              </div>
            </div>
          </div>
        )}
        {!dailySentenceEnriched && (
          <Card style={{ padding: 20, textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "var(--c-s300)", marginBottom: 8 }}>{"每日推荐尚未生成"}</div>
            <div onClick={() => loadRandomSentence()} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 18px", borderRadius: 10, cursor: "pointer",
              background: "color-mix(in srgb, var(--c-teal) 12%, transparent)",
              border: `1px dashed ${"var(--c-teal)"}`,
            }}>
              <Sparkles size={12} strokeWidth={IW} color={"var(--c-teal)"} />
              <span style={{ fontSize: 12, color: "var(--c-teal)", fontWeight: 600 }}>{"生成今日推荐"}</span>
            </div>
          </Card>
        )}

        {/* Recent words from Supabase */}
        {recentData.length > 0 && (
          <div>
            <SectionTitle action={"\u66F4\u591A"}>{"\u6700\u8FD1\u5BCC\u5316\u8BCD\u6761"}</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recentData.map((w, i) => (
                <div key={w.word + i} onClick={() => handleWordTap(w.word)} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 16px", borderRadius: 14, background: "var(--c-surface)",
                  border: `1px solid ${"var(--c-p100)"}`, cursor: "pointer",
                }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 600, color: "var(--c-teal)", fontFamily: "var(--th-font), sans-serif" }}>{w.word}</span>
                      {w.pos && <Badge bg={"var(--c-p100)"} fg={"var(--c-p700)"} style={{ fontSize: 9 }}>{w.pos}</Badge>}
                    </div>
                    {w.meaning && <div style={{ fontSize: 13, color: "var(--c-p700)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.meaning}</div>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {w.romanization && <span style={{ fontSize: 10, color: "var(--c-s300)", fontFamily: "monospace" }}>{w.romanization}</span>}
                    <ChevronRight size={14} strokeWidth={IW} color={"var(--c-s300)"} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </>}
    </div>
  );
};

export default HomePage;
