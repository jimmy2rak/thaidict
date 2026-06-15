import { useState, useEffect, useMemo } from "react";
import {
  Play, Bookmark, AlertCircle, Sparkles,
  ChevronRight, FileText, X, Check, Star,
} from "lucide-react";
import { thaiSegment } from "../utils/thaiSegment";
import {
  isSupabaseConfigured, getWordByThai,
  isBookmarked, recordWordLookup,
  getFolders, createFolder, getUserSettings,
  submitWord, addBookmark, addWordToFolder, removeWordFromFolder,
  saveUserSettings, removeBookmark,
  getFolderWords,
  searchWords,
} from "../lib/supabase.js";
import { Card, Badge, SectionTitle, ProgressBar, TtsPlay, WordTokenSpan, TooltipDismissOverlay } from "../components/UIComponents";
import { speak } from "../utils/tts";
import { useAppContext } from "../context/AppContext";

const IW = 1.5;

const WordDetailPage = ({ wordData }) => {
  const { userId, goBack, handleWordTap: onWordTap } = useAppContext();

  const wd = wordData;
  const [bookmarked, setBookmarked] = useState(false);
  const [expandedSenses, setExpandedSenses] = useState([true, true, true]);
  const [freqTab, setFreqTab] = useState("ttc");
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [wordBookFolders, setWordBookFolders] = useState([]);
  const [wordFoldersIn, setWordFoldersIn] = useState([]); // folder IDs that contain this word
  const [lastUsedFolder, setLastUsedFolder] = useState(null);
  const [reportSection, setReportSection] = useState(null);
  const [reportItem, setReportItem] = useState(null);
  const [reportStatus, setReportStatus] = useState(null);

  // Check bookmark status and record lookup on mount
  useEffect(() => {
    if (!wd?.word || !userId || userId === 'anonymous') return;
    isBookmarked(userId, wd.word).then(setBookmarked);
    recordWordLookup(userId, wd.word);
  }, [wd?.word, userId]);

  // Load word book folders for bookmark selection (only word-type folders)
  useEffect(() => {
    if (!userId || userId === 'anonymous') return;
    getFolders(userId).then(rows => {
      const wordTypeFolders = (rows || []).filter(f => (f.folder_type || 'word') === 'word');
      const mapped = wordTypeFolders.map(f => ({
        id: f.id, name: f.name, color: f.color, count: f.word_count || 0,
      }));
      if (mapped.length === 0) {
        // Create default word book if none exist
        if (isSupabaseConfigured) {
          createFolder(userId, "我的单词", "#5B8C7E", 'word').then(folder => {
            if (folder) {
              setWordBookFolders([{ id: folder.id, name: folder.name, color: folder.color, count: 0 }]);
              setLastUsedFolder(folder.id);
            }
          });
        }
      } else {
        setWordBookFolders(mapped);
        getUserSettings(userId).then(s => {
          if (s?.last_folder_id) setLastUsedFolder(s.last_folder_id);
          else setLastUsedFolder(mapped[0].id);
        });
      }
    });
  }, [userId]);

  // When word changes or folders loaded, check which folders contain this word
  useEffect(() => {
    if (!wd?.word || !userId || userId === 'anonymous' || !isSupabaseConfigured) return;
    if (wordBookFolders.length === 0) return;
    Promise.all(wordBookFolders.map(f =>
      getFolderWords(f.id).then(words => {
        return words?.some(w => w.word === wd.word) ? f.id : null;
      })
    )).then(results => {
      setWordFoldersIn(results.filter(Boolean));
    });
  }, [wd?.word, userId, wordBookFolders.length]);

  // Fetch Chinese meanings for synonyms and antonyms
  useEffect(() => {
    if (!wd?.word || !isSupabaseConfigured) return;
    const wordsToFetch = [
      ...(wd.synonyms || []).map(s => typeof s === 'string' ? s : s.word),
      ...(wd.antonyms || []).map(a => typeof a === 'string' ? a : a.word),
    ].filter(Boolean);
    if (wordsToFetch.length === 0) return;
    // Helper: extract first Chinese meaning from a row (handles both dictionary_full and community_words)
    const extractMeaning = (row) => {
      if (!row) return '';
      // Parse senses if it's a JSON string (community_words stores JSON text)
      let senses = row.senses;
      if (typeof senses === 'string') {
        try { senses = JSON.parse(senses); } catch (e) { senses = []; }
      }
      const firstSense = Array.isArray(senses) && senses[0] ? senses[0] : {};
      return firstSense.meaning || '';
    };
    // Fetch all in parallel
    Promise.all(wordsToFetch.map(async (word) => {
      try {
        const row = await getWordByThai(word.trim());
        if (row) {
          const zh = extractMeaning(row);
          if (zh) return { word, zh };
        }
        // Fallback: try broader search if exact match failed
        const results = await searchWords(word.trim(), 3);
        if (results.length > 0) {
          const best = results[0];
          const zh = extractMeaning(best);
          if (zh) return { word, zh };
        }
      } catch (e) { /* ignore fetch errors */ }
      return { word, zh: '' };
    })).then(results => {
      const map = {};
      results.forEach(r => { if (r && r.word) map[r.word] = r.zh; });
      setSynAntZh(prev => ({ ...prev, ...map }));
    });
  }, [wd?.synonyms, wd?.antonyms, wd?.word]);

  /* ── synonym/antonym Chinese meaning cache ── */
  const [synAntZh, setSynAntZh] = useState({});
  const [wordTip, setWordTip] = useState(null);

  /* ── Scroll dismissal for word tooltip ── */
  useEffect(() => {
    if (!wordTip) return;
    const dismiss = () => setWordTip(null);
    window.addEventListener('scroll', dismiss, true);
    return () => window.removeEventListener('scroll', dismiss, true);
  }, [wordTip]);

  const toggleSense = (idx) => {
    const next = [...expandedSenses];
    next[idx] = !next[idx];
    setExpandedSenses(next);
  };

  /* ── report helpers ── */
  const openReport = (section) => {
    setReportSection(reportSection === section ? null : section);
    setReportItem(null);
    setReportStatus(null);
  };
  const submitReport = (method) => {
    console.log("[report]", { section: reportSection, item: reportItem, method });
    setReportStatus("done");
    setTimeout(() => { setReportSection(null); setReportItem(null); setReportStatus(null); }, 1200);
  };

  /* ── ReportPopover inline component ── */
  const ReportPopover = ({ items }) => (
    <div style={{
      position: "absolute", top: "100%", right: 0, zIndex: 100,
      background: "var(--c-surface)", borderRadius: 12, border: `1px solid ${"var(--c-p100)"}`,
      boxShadow: "0 4px 16px rgba(61,43,31,0.12)", padding: 12, marginTop: 4,
      minWidth: 220, maxWidth: 300,
    }}>
      {reportStatus === "done" ? (
        <div style={{ textAlign: "center", padding: "8px 0", color: "var(--c-ok)", fontSize: 14, fontWeight: 600 }}>
          {"已更正 ✓"}
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: "var(--c-p600)", fontWeight: 600, marginBottom: 8 }}>{"选择错误项"}</div>
          {items.map((item, idx) => (
            <div key={idx} onClick={() => setReportItem(idx)} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "6px 4px",
              cursor: "pointer", borderRadius: 6, background: reportItem === idx ? "var(--c-p50)" : "transparent",
            }}>
              <div style={{
                width: 16, height: 16, borderRadius: 8,
                border: `2px solid ${reportItem === idx ? "var(--c-teal)" : "var(--c-s300)"}`,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                {reportItem === idx && <div style={{ width: 8, height: 8, borderRadius: 4, background: "var(--c-teal)" }} />}
              </div>
              <span style={{ fontSize: 12, color: "var(--c-p700)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item}</span>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <div onClick={() => reportItem !== null && submitReport("ai")} style={{
              flex: 1, padding: "6px 0", borderRadius: 8, textAlign: "center", fontSize: 11, fontWeight: 600,
              background: reportItem !== null ? "var(--c-teal)" : "var(--c-p100)", color: reportItem !== null ? "#fff" : "var(--c-s300)",
              cursor: reportItem !== null ? "pointer" : "default",
            }}>{"AI 更正"}</div>
            <div onClick={() => reportItem !== null && submitReport("api")} style={{
              flex: 1, padding: "6px 0", borderRadius: 8, textAlign: "center", fontSize: 11, fontWeight: 600,
              background: reportItem !== null ? "var(--c-info)" : "var(--c-p100)", color: reportItem !== null ? "#fff" : "var(--c-s300)",
              cursor: reportItem !== null ? "pointer" : "default",
            }}>{"翻译API 更正"}</div>
          </div>
        </>
      )}
    </div>
  );

  /* ── 映射表 ── */
  const sourceMap = {
    src_words_th: { label: "主词表", bg: "var(--c-infoL)", fg: "var(--c-info)" },
    src_words_thai2fit: { label: "thai2fit", bg: "var(--c-s100)", fg: "var(--c-s700)" },
    src_words_orst: { label: "皇家学会", bg: "var(--c-goldL)", fg: "var(--c-gold)" },
    src_words_volubilis: { label: "Volubilis", bg: "var(--c-tealL)", fg: "var(--c-teal)" },
    src_words_icu: { label: "ICU 分词", bg: "#E8DEF0", fg: "#7B5EA7" },
    src_words_wikipedia: { label: "维基百科", bg: "var(--c-errL)", fg: "var(--c-err)" },
    src_words_etcc: { label: "字符簇", bg: "var(--c-s100)", fg: "var(--c-s500)" },
  };

  const posColor = (pos) => {
    if (pos === "动词") return { bg: "var(--c-amberL)", fg: "var(--c-amber)" };
    if (pos === "名词") return { bg: "var(--c-infoL)", fg: "var(--c-info)" };
    if (pos === "形容词") return { bg: "var(--c-okL)", fg: "var(--c-ok)" };
    if (pos === "副词") return { bg: "var(--c-roseL)", fg: "var(--c-rose)" };
    return { bg: "var(--c-p100)", fg: "var(--c-p700)" };
  };

  const regColor = (reg) => {
    if (reg === "通用") return { bg: "var(--c-s100)", fg: "var(--c-s700)" };
    if (reg === "口语") return { bg: "var(--c-amberL)", fg: "var(--c-amber)" };
    if (reg === "正式") return { bg: "var(--c-infoL)", fg: "var(--c-info)" };
    if (reg === "俚语") return { bg: "var(--c-errL)", fg: "var(--c-err)" };
    if (reg === "书面") return { bg: "#E8DEF0", fg: "#7B5EA7" };
    return { bg: "var(--c-p100)", fg: "var(--c-p700)" };
  };

  const sourceIcon = (src) => {
    if (src === "ai") return "🤖";
    if (src === "user") return "👤";
    if (src === "admin") return "✏️";
    return "";
  };

  const senseNums = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"];

  const freqEntries = [
    { key: "ttc", label: "教科书", value: wd.freq_ttc, total: 100000 },
    { key: "tnc", label: "国家语库", value: wd.freq_tnc, total: 1000000 },
    { key: "phupha", label: "网络", value: wd.freq_phupha, total: 2000000000 },
  ];
  const activeFreq = freqEntries.find(f => f.key === freqTab) || freqEntries[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 16px 16px" }}>
      {/* ── 1. 词条标题 ── */}
      <Card style={{ padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 32, fontWeight: 700, color: "var(--c-p900)", fontFamily: "var(--th-font), serif", letterSpacing: "0.02em" }}>
                {wd.word}
              </span>
              <span style={{ fontSize: 15, color: "var(--c-teal)", fontFamily: "monospace", fontStyle: "italic", letterSpacing: "0.02em" }}>
                {wd.romanization}
              </span>
            </div>
          </div>
          {/* 右侧：播放 + 收藏（统一风格） */}
          <div style={{ display: "flex", gap: 8, flexShrink: 0, marginLeft: 10 }}>
            <div onClick={(e) => { e.stopPropagation(); speak(wd.word, "th-TH", 0.85); }} style={{
              width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
              background: "var(--c-p50)", border: `1px solid ${"var(--c-p200)"}`, cursor: "pointer",
            }}>
              <Play size={16} strokeWidth={IW} color={"var(--c-teal)"} fill={"var(--c-teal)"} />
            </div>
            <div onClick={() => setShowBookmarkModal(true)} style={{
              width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
              background: bookmarked ? "var(--c-goldL)" : "var(--c-p50)",
              border: `1px solid ${bookmarked ? "var(--c-gold)" : "var(--c-p200)"}`, cursor: "pointer",
            }}>
              <Bookmark size={15} strokeWidth={IW} color={bookmarked ? "var(--c-gold)" : "var(--c-s500)"} fill={bookmarked ? "var(--c-gold)" : "none"} />
            </div>
          </div>
        </div>
        {/* 来源标签 */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
          {wd.romanization_source === "deepseek" && (
            <Badge bg={"var(--c-infoL)"} fg={"var(--c-info)"} style={{ fontSize: 9, padding: "1px 6px" }}>{"🤖 AI"}</Badge>
          )}
          {wd.sources.map((s, i) => {
            const info = sourceMap[s] || { label: s, bg: "var(--c-p100)", fg: "var(--c-p700)" };
            return <Badge key={i} bg={info.bg} fg={info.fg} style={{ fontSize: 9, padding: "1px 6px" }}>{info.label}</Badge>;
          })}
        </div>
        {/* 义项数 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
          <Badge bg={"var(--c-surfaceAlt)"} fg={"var(--c-s500)"}>{wd.sense_count} {"个义项"}</Badge>
        </div>
      </Card>

      {/* ── 2. 义项列表 ── */}
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <SectionTitle>{"义项"}</SectionTitle>
          <AlertCircle size={15} strokeWidth={IW} color={reportSection === "sense" ? "var(--c-teal)" : "var(--c-s300)"} style={{ cursor: "pointer" }} onClick={() => openReport("sense")} />
        </div>
        {/* Show AI generate button when word lacks data */}
        {(!wd.senses || wd.senses.length === 0 || wd.sense_count === 0) && (
          <Card style={{ padding: 16, textAlign: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 13, color: "var(--c-s500)", marginBottom: 12 }}>{"该词条暂无释义数据"}</div>
            <div onClick={() => {
              if (isSupabaseConfigured) submitWord(wd.word).catch(err => console.error("[submitWord]", err));
            }} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "10px 20px", borderRadius: 12, cursor: "pointer",
              background: "var(--c-teal)", color: "#fff", fontSize: 13, fontWeight: 600,
              fontFamily: "var(--zh-font), sans-serif",
            }}>
              <Sparkles size={14} strokeWidth={IW} />
              {"通过 AI 新增词条信息"}
            </div>
          </Card>
        )}
        {reportSection === "sense" && (
          <div style={{ position: "relative", marginBottom: 8 }}>
            <ReportPopover items={wd.senses.map((s, i) => `${senseNums[i]} ${s.meaning}`)} />
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {wd.senses.map((sense, i) => {
            const isExpanded = expandedSenses[i];
            const pc = posColor(sense.pos);
            const rc = regColor(sense.register);
            return (
              <Card key={sense.sense_id} style={{ padding: 0, overflow: "hidden", border: isExpanded ? `1.5px solid ${"var(--c-p200)"}` : `1px solid ${"var(--c-p100)"}` }}>
                {/* 义项头部 */}
                <div onClick={() => toggleSense(i)} style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "10px 12px",
                  cursor: "pointer", background: isExpanded ? "var(--c-p50)" : "var(--c-surface)",
                  borderBottom: isExpanded ? `1px solid ${"var(--c-p100)"}` : "none",
                }}>
                  <span style={{ fontSize: 15, color: "var(--c-p600)", fontWeight: 700, flexShrink: 0 }}>{senseNums[i]}</span>
                  <Badge bg={pc.bg} fg={pc.fg} style={{ fontSize: 10 }}>{sense.pos}</Badge>
                  <Badge bg={rc.bg} fg={rc.fg} style={{ fontSize: 10 }}>{sense.register}</Badge>
                  <span style={{ fontSize: 10, flexShrink: 0 }}>{sourceIcon(sense.source)}</span>
                  <div style={{ flex: 1 }} />
                  <ChevronRight size={14} strokeWidth={IW} color={"var(--c-s300)"} style={{
                    transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0,
                  }} />
                </div>
                {isExpanded && (
                  <div style={{ padding: "12px" }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "var(--c-p800)", lineHeight: 1.5 }}>
                      {sense.meaning}
                    </div>
                    {/* 例句卡片 — with segmentation */}
                    {sense.examples && sense.examples.length > 0 && (
                      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                        {sense.examples.map((ex, j) => {
                          const segTokens = sense.segmented && sense.segmented[j] ? sense.segmented[j] : null;
                          const tokens = segTokens || thaiSegment(ex.th);
                          return (
                            <div key={j} style={{ padding: "8px 12px", borderRadius: 8, background: "var(--c-surfaceAlt)" }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div style={{ fontSize: 13, fontFamily: "var(--th-font), sans-serif", lineHeight: 1.8, flex: 1 }}>
                                  {tokens.map((tok, ti) => (
                                    <WordTokenSpan key={ti} seg={tok} tipId={`wd-${i}-${j}-${ti}`} activeTip={wordTip} onTipChange={setWordTip} onDetail={onWordTap} />
                                  ))}
                                </div>
                                <TooltipDismissOverlay active={wordTip} onDismiss={() => setWordTip(null)} />
                                <TtsPlay text={ex.th} />
                              </div>
                              <div style={{ fontSize: 12, color: "var(--c-p700)", marginTop: 3 }}>{ex.zh}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── 3. 词频数据 ── */}
      <div style={{ position: "relative" }}>
        <Card style={{ padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <SectionTitle>{"词频"}</SectionTitle>
            <AlertCircle size={15} strokeWidth={IW} color={reportSection === "freq" ? "var(--c-teal)" : "var(--c-s300)"} style={{ cursor: "pointer" }} onClick={() => openReport("freq")} />
          </div>
          {reportSection === "freq" && (
            <div style={{ position: "relative", marginBottom: 8 }}>
              <ReportPopover items={freqEntries.map(f => `${f.label}: ${f.value ? f.value.toLocaleString() : "—"}`)} />
            </div>
          )}
          <div style={{ display: "flex", gap: 5, marginBottom: 10, background: "var(--c-surfaceAlt)", borderRadius: 8, padding: 2 }}>
            {freqEntries.map(f => (
              <div key={f.key} onClick={() => setFreqTab(f.key)} style={{
                flex: 1, padding: "5px 0", borderRadius: 6, textAlign: "center",
                background: freqTab === f.key ? "var(--c-surface)" : "transparent",
                color: freqTab === f.key ? "var(--c-p800)" : "var(--c-s500)",
                fontSize: 11, fontWeight: freqTab === f.key ? 600 : 400,
                boxShadow: freqTab === f.key ? "0 1px 3px rgba(61,43,31,0.08)" : "none",
                cursor: "pointer", fontFamily: "var(--zh-font), sans-serif",
              }}>{f.label}</div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: "var(--c-p800)", fontFamily: "monospace" }}>
              {activeFreq.value ? activeFreq.value.toLocaleString() : "—"}
            </span>
            <span style={{ fontSize: 10, color: "var(--c-s300)" }}>/{activeFreq.total.toLocaleString()}</span>
          </div>
          <ProgressBar value={activeFreq.value || 0} max={activeFreq.total} color={"var(--c-teal)"} height={5} />
          <div style={{ fontSize: 10, color: "var(--c-s300)", marginTop: 4, textAlign: "right" }}>
            {freqTab === "ttc" ? "教科书词频（学习者最相关）" : freqTab === "tnc" ? "泰国国家语库" : "网络语料库"}
          </div>
        </Card>
      </div>

      {/* ── 4. 近义词 / 反义词 ── */}
      {(wd.synonyms.length > 0 || wd.antonyms.length > 0) && (
        <div style={{ position: "relative" }}>
          <Card style={{ padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <SectionTitle>{"近义/反义"}</SectionTitle>
              <AlertCircle size={15} strokeWidth={IW} color={reportSection === "syn" ? "var(--c-teal)" : "var(--c-s300)"} style={{ cursor: "pointer" }} onClick={() => openReport("syn")} />
            </div>
            {reportSection === "syn" && (
              <div style={{ position: "relative", marginBottom: 8 }}>
                <ReportPopover items={[
                  ...wd.synonyms.map(s => `近义: ${s.word}`),
                  ...wd.antonyms.map(a => `反义: ${a.word}`),
                ]} />
              </div>
            )}
            {wd.synonyms.length > 0 && (
              <div style={{ marginBottom: wd.antonyms.length > 0 ? 12 : 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--c-p700)", marginBottom: 8 }}>{"近义词"}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {wd.synonyms.map((w, i) => (
                    <div key={i} onClick={() => onWordTap && onWordTap(w.word)} style={{
                      padding: "5px 12px", borderRadius: 20, background: "color-mix(in srgb, var(--c-tealL) 25%, transparent)",
                      border: `1px solid ${"var(--c-tealL)"}`, fontSize: 13, color: "var(--c-teal)", fontWeight: 500,
                      fontFamily: "var(--th-font), sans-serif", cursor: "pointer",
                    }}>
                      {w.word}
                      <span style={{ fontSize: 11, color: "var(--c-s500)", fontWeight: 400, marginLeft: 4 }}>({synAntZh[w.word] || ''})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {wd.antonyms.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--c-p700)", marginBottom: 8 }}>{"反义词"}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {wd.antonyms.map((w, i) => (
                    <div key={i} onClick={() => onWordTap && onWordTap(w.word)} style={{
                      padding: "5px 12px", borderRadius: 20, background: "color-mix(in srgb, var(--c-roseL) 25%, transparent)",
                      border: `1px solid ${"var(--c-roseL)"}`, fontSize: 13, color: "var(--c-rose)", fontWeight: 500,
                      fontFamily: "var(--th-font), sans-serif", cursor: "pointer",
                    }}>
                      {w.word}
                      <span style={{ fontSize: 11, color: "var(--c-s500)", fontWeight: 400, marginLeft: 4 }}>({synAntZh[w.word] || ''})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── 5. 用户例句 ── */}
      {wd.user_sentence_count > 0 && (
        <Card style={{ padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <FileText size={14} strokeWidth={IW} color={"var(--c-p500)"} />
              <span style={{ fontSize: 12, color: "var(--c-p700)" }}>
                {"用户贡献了"} {wd.user_sentence_count} {"条例句"}
              </span>
            </div>
            <span style={{ fontSize: 11, color: "var(--c-p500)", cursor: "pointer", display: "flex", alignItems: "center", gap: 2 }}>
              {"查看"} <ChevronRight size={13} strokeWidth={IW} />
            </span>
          </div>
        </Card>
      )}

      {/* ── 7. 学习者建议 ── */}
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <SectionTitle>{"学习者建议"}</SectionTitle>
          <AlertCircle size={15} strokeWidth={IW} color={reportSection === "tip" ? "var(--c-teal)" : "var(--c-s300)"} style={{ cursor: "pointer" }} onClick={() => openReport("tip")} />
        </div>
        {reportSection === "tip" && (
          <div style={{ position: "relative", marginBottom: 8 }}>
            <ReportPopover items={(wd.learner_associations || []).map(a => `${a.word}: ${a.note}`)} />
          </div>
        )}
        {wd.learner_associations && wd.learner_associations.length > 0 ? (
          <Card style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: `linear-gradient(135deg, ${"var(--c-info)"}, ${"var(--c-teal)"})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles size={12} strokeWidth={IW} color="#fff" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-p800)" }}>{"学习者建议"}</span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {wd.learner_associations.map((item, i) => (
                <div key={i} onClick={() => onWordTap && onWordTap(item.word)} style={{
                  display: "inline-flex", alignItems: "center", padding: "5px 12px",
                  borderRadius: 20, background: "color-mix(in srgb, var(--c-infoL) 25%, transparent)",
                  border: `1px solid ${"color-mix(in srgb, var(--c-info) 20%, transparent)"}`,
                  cursor: "pointer", transition: "all 0.15s",
                }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--c-info)", fontFamily: "var(--th-font), sans-serif" }}>{item.word}</span>
                  {item.note && <span style={{ fontSize: 11, color: "var(--c-s500)", fontWeight: 400, marginLeft: 4 }}>({item.note})</span>}
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card style={{ padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "var(--c-s500)", marginBottom: 12 }}>{"暂无学习者建议数据"}</div>
            <div onClick={() => {
              if (isSupabaseConfigured) submitWord(wd.word).catch(err => console.error("[submitWord]", err));
            }} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "10px 20px", borderRadius: 12, cursor: "pointer",
              background: "var(--c-teal)", color: "#fff", fontSize: 13, fontWeight: 600,
              fontFamily: "var(--zh-font), sans-serif",
            }}>
              <Sparkles size={14} strokeWidth={IW} />
              {"通过 AI 新增词条信息"}
            </div>
          </Card>
        )}
      </div>

      {/* ── Bookmark Word Book Selection Modal ── */}
      {showBookmarkModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "flex-end", justifyContent: "center",
        }}>
          <div onClick={() => setShowBookmarkModal(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />
          <div style={{
            position: "relative", zIndex: 1, width: "100%", maxWidth: 430,
            background: "var(--c-surface)", borderRadius: "20px 20px 0 0",
            padding: "20px 20px 32px", maxHeight: "60vh", overflow: "auto",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--c-p800)", margin: 0, fontFamily: "var(--zh-font), serif" }}>
                {"收藏到收藏夹"}
              </h3>
              <div onClick={() => setShowBookmarkModal(false)} style={{ cursor: "pointer", display: "flex" }}>
                <X size={18} strokeWidth={IW} color={"var(--c-s400)"} />
              </div>
            </div>
            <div style={{ fontSize: 12, color: "var(--c-s500)", marginBottom: 12, fontFamily: "var(--zh-font), sans-serif" }}>
              点击勾选/取消收藏夹，可同时收藏到多个收藏夹
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {wordBookFolders.map(folder => {
                const isInFolder = wordFoldersIn.includes(folder.id);
                return (
                  <div key={folder.id} onClick={async () => {
                    if (isInFolder) {
                      // Remove from this folder
                      setWordFoldersIn(prev => prev.filter(id => id !== folder.id));
                      if (userId && userId !== 'anonymous' && isSupabaseConfigured) {
                        await removeWordFromFolder(folder.id, wd.word);
                      }
                      // If word is no longer in ANY folder, remove global bookmark too
                      const remainingFolders = wordFoldersIn.filter(id => id !== folder.id);
                      if (remainingFolders.length === 0) {
                        setBookmarked(false);
                        if (userId && userId !== 'anonymous' && isSupabaseConfigured) {
                          await removeBookmark(userId, wd.word);
                        }
                      }
                    } else {
                      // Add to this folder
                      setWordFoldersIn(prev => [...prev, folder.id]);
                      setBookmarked(true);
                      setLastUsedFolder(folder.id);
                      if (userId && userId !== 'anonymous' && isSupabaseConfigured) {
                        await addBookmark(userId, wd.word);
                        addWordToFolder(folder.id, wd.word);
                        saveUserSettings(userId, { last_folder_id: folder.id });
                      }
                    }
                  }} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                    borderRadius: 12,
                    background: isInFolder ? "color-mix(in srgb, var(--c-teal) 4%, var(--c-surfaceAlt))" : "var(--c-surfaceAlt)",
                    border: `1px solid ${isInFolder ? "color-mix(in srgb, var(--c-teal) 20%, transparent)" : "var(--c-p100)"}`,
                    cursor: "pointer", transition: "all 0.15s",
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: 6, border: `1.5px solid ${isInFolder ? "var(--c-teal)" : "var(--c-p300)"}`,
                      background: isInFolder ? "var(--c-teal)" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.15s",
                    }}>
                      {isInFolder && <Check size={13} strokeWidth={2.5} color="#fff" />}
                    </div>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: folder.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 14, color: "var(--c-p800)", fontWeight: 500 }}>
                      {folder.name}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--c-s300)" }}>{folder.count} 词</span>
                  </div>
                );
              })}
            </div>
            {bookmarked && wordFoldersIn.length === 0 && (
              <div onClick={async () => {
                setBookmarked(false);
                if (userId && userId !== 'anonymous' && isSupabaseConfigured) {
                  await removeBookmark(userId, wd.word);
                }
                setShowBookmarkModal(false);
              }} style={{
                marginTop: 16, padding: "12px 0", borderRadius: 12, textAlign: "center",
                fontSize: 14, fontWeight: 600, color: "var(--c-err)",
                background: "var(--c-errL)", cursor: "pointer",
              }}>
                取消收藏
              </div>
            )}
          </div>
        </div>
      )}
      <TooltipDismissOverlay active={wordTip} onDismiss={() => setWordTip(null)} />
    </div>
  );
};

export default WordDetailPage;
