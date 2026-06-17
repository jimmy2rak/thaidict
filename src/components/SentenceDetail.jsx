import { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import { Card, TtsPlay, WordTokenSpan, TooltipDismissOverlay, Badge } from "./UIComponents";
import { ChevronLeft, ChevronRight, Sparkles, Tag, Bookmark, Star, Check, X } from "lucide-react";
import { thaiSegment } from "../utils/thaiSegment";
import { bookmarkSentence, removeSentenceBookmark, getBookmarkedSentences, isSupabaseConfigured, getFolders, addSentenceToFolder, removeSentenceFromFolder, batchGetWordMeanings, getFoldersContainingSentence } from "../lib/supabase.js";

const IW = 1.5;

/* Clickable word pill — same style as 近反义词 in WordDetailPage */
const WordPill = ({ word, meaning, onClick, theme = "teal" }) => {
  const colors = {
    teal: { bg: "color-mix(in srgb, var(--c-tealL) 25%, transparent)", border: "color-mix(in srgb, var(--c-teal) 20%, transparent)", fg: "var(--c-teal)" },
    rose: { bg: "color-mix(in srgb, var(--c-roseL) 25%, transparent)", border: "color-mix(in srgb, var(--c-rose) 20%, transparent)", fg: "var(--c-rose)" },
    info: { bg: "color-mix(in srgb, var(--c-infoL) 25%, transparent)", border: "color-mix(in srgb, var(--c-info) 20%, transparent)", fg: "var(--c-info)" },
  };
  const c = colors[theme] || colors.teal;
  return (
    <div onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", padding: "5px 12px",
      borderRadius: 20, background: c.bg,
      border: `1px solid ${c.border}`, cursor: "pointer",
      transition: "all 0.15s",
    }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: c.f, fontFamily: "var(--th-font), sans-serif" }}>{word}</span>
      {meaning && <span style={{ fontSize: 11, color: "var(--c-s500)", fontWeight: 400, marginLeft: 4 }}>({meaning})</span>}
    </div>
  );
};

const SentenceDetail = ({ phrase, onBack }) => {
  const { handleWordTap, userId } = useAppContext();
  const [wordTip, setWordTip] = useState(null);
  const [segMeanings, setSegMeanings] = useState({});
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [sentenceFolders, setSentenceFolders] = useState([]);
  const [sentenceFoldersIn, setSentenceFoldersIn] = useState([]);
  const sp = phrase;

  // Get segmented data — use DB segmented, fallback to phraseData, then thaiSegment
  const spSegmented = Array.isArray(sp.segmented) && sp.segmented.length > 0
    ? sp.segmented
    : (() => {
        const seg = thaiSegment(sp.text);
        return seg.length > 1 ? seg : [];
      })();

  const isIdiom = sp.category === 'idioms';

  /* ── Scroll dismissal for word tooltip ── */
  useEffect(() => {
    if (!wordTip) return;
    const dismiss = () => setWordTip(null);
    window.addEventListener('scroll', dismiss, true);
    return () => window.removeEventListener('scroll', dismiss, true);
  }, [wordTip]);


  /* ── Batch fetch Chinese meanings for segmented words ── */
  useEffect(() => {
    if (!isSupabaseConfigured || spSegmented.length === 0) return;
    const wordsToFetch = spSegmented.map(seg => seg.text).filter(w => w && w.trim());
    if (wordsToFetch.length === 0) return;
    batchGetWordMeanings(wordsToFetch).then(meaningMap => {
      setSegMeanings(meaningMap);
    });
  }, [spSegmented.length]);


  /* ── Check bookmark status ── */
  useEffect(() => {
    if (!userId || userId === 'anonymous' || !sp.dbId) return;
    getBookmarkedSentences(userId).then(sentences => {
      const bm = {};
      sentences.forEach(s => { bm[String(s.id)] = true; });
      setIsBookmarked(bm[String(sp.dbId)] || false);
    });
  }, [userId, sp.dbId]);

  /* ── Load sentence folders ── */
  useEffect(() => {
    if (!userId || userId === 'anonymous') return;
    if (!isSupabaseConfigured) return;
    getFolders(userId).then(rows => {
      const sFolders = (rows || []).filter(f => f.folder_type === 'sentence');
      setSentenceFolders(sFolders.map(f => ({
        id: f.id, name: f.name, color: f.color, sentenceCount: f.sentence_count || 0,
      })));
    });
  }, [userId]);

  /* ── Check which sentence folders contain this sentence ── */
  useEffect(() => {
    if (!userId || userId === 'anonymous' || !sp.dbId || !isSupabaseConfigured) return;
    if (sentenceFolders.length === 0) return;
    const folderIds = sentenceFolders.map(f => f.id);
    getFoldersContainingSentence(userId, sp.dbId, folderIds).then(ids => {
      setSentenceFoldersIn(ids);
    });
  }, [userId, sp.dbId, sentenceFolders.length]);

  const toggleBookmark = async () => {
    if (!userId || userId === 'anonymous' || !sp.dbId) return;
    const prev = isBookmarked;
    setIsBookmarked(!prev);
    try {
      if (prev) {
        await removeSentenceBookmark(userId, sp.dbId);
      } else {
        await bookmarkSentence(userId, sp.dbId);
      }
    } catch (e) {
      console.error("[toggleBookmark]", e);
      setIsBookmarked(prev); // rollback
    }
  };

  return (
    <div style={{
      maxWidth: 430, margin: "0 auto", height: "var(--app-height, 100dvh)",
      background: "var(--c-bg)", fontFamily: "var(--zh-font), var(--th-font), sans-serif",
      color: "var(--c-p800)", display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Sticky header */}
      <div style={{ height: 15, background: "var(--c-bg)", flexShrink: 0 }} />
      <div style={{
        padding: "4px 20px 6px", display: "flex", alignItems: "center", gap: 10,
        position: "sticky", top: 0, zIndex: 10, background: "var(--c-bg)",
      }}>
        <div onClick={onBack} style={{
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          width: 32, height: 32, borderRadius: 10, background: "var(--c-p100)", flexShrink: 0,
        }}>
          <ChevronLeft size={18} strokeWidth={IW} color={"var(--c-p700)"} />
        </div>
        <h1 style={{
          fontSize: 20, fontWeight: 700, color: "var(--c-p800)", margin: 0,
          fontFamily: "var(--zh-font), serif", flex: 1,
        }}>{"句子详情"}</h1>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "0 16px 16px" }}>

          {/* Card 1: Sentence text + bookmark */}
          <Card style={{ padding: 16, background: `linear-gradient(135deg, ${`color-mix(in srgb, var(--c-teal) 3%, transparent)`}, ${`color-mix(in srgb, var(--c-gold) 2%, transparent)`})`, border: `1px solid ${`color-mix(in srgb, var(--c-teal) 9%, transparent)`}` }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--c-p900)", fontFamily: "var(--th-font), serif", lineHeight: 1.5, flex: 1 }}>
                {sp.text}
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0, marginTop: 2 }}>
                <TtsPlay text={sp.text} size={16} />
                {sp.dbId && (
                  <div onClick={(e) => { e.stopPropagation(); setShowBookmarkModal(true); }} style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: isBookmarked ? "color-mix(in srgb, var(--c-gold) 9%, transparent)" : "var(--c-surfaceAlt)",
                    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                  }}>
                    <Bookmark size={13} strokeWidth={IW} color={isBookmarked ? "var(--c-gold)" : "var(--c-s300)"} fill={isBookmarked ? "var(--c-gold)" : "none"} />
                  </div>
                )}
              </div>
            </div>
            <div style={{ fontSize: 14, color: "var(--c-p600)", lineHeight: 1.5 }}>
              {sp.zh || sp.actual_meaning || sp.literal_meaning || ''}
            </div>
          </Card>

          {/* Card 2: 逐词分析 — horizontal arithmetic format */}
          {spSegmented.length > 0 && (
            <Card style={{ padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)", marginBottom: 14, fontFamily: "var(--zh-font), serif" }}>{"逐词分析"}</div>
              {/* Horizontal arithmetic-style formula */}
              <div style={{ fontSize: 18, fontFamily: "var(--th-font), sans-serif", lineHeight: 2, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4 }}>
                {spSegmented.map((seg, i) => (
                  <span key={i} style={{ display: "inline-flex", alignItems: "center" }}>
                    <WordTokenSpan seg={seg} tipId={`sd-${i}`} activeTip={wordTip} onTipChange={setWordTip} onDetail={handleWordTap} />
                    <span style={{ fontSize: 12, color: "var(--c-s500)", fontWeight: 400, marginLeft: 2, fontFamily: "var(--zh-font), sans-serif" }}>({segMeanings[seg.text] || seg.meaning || ''})</span>
                    {i < spSegmented.length - 1 && <span style={{ fontSize: 14, color: "var(--c-s300)", margin: "0 6px", fontWeight: 600 }}>+</span>}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* Card 3: Idiom literal vs actual */}
          {isIdiom && sp.literal_meaning && sp.actual_meaning && (
            <Card style={{ padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)", marginBottom: 12, fontFamily: "var(--zh-font), serif" }}>{"字面意义 vs 实际意义"}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ padding: 12, borderRadius: 10, background: "color-mix(in srgb, var(--c-gold) 7%, transparent)", border: `1px solid ${`color-mix(in srgb, var(--c-gold) 15%, transparent)`}` }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-gold)", marginBottom: 4 }}>{"字面意义"}</div>
                  <div style={{ fontSize: 13, color: "var(--c-p700)", lineHeight: 1.5 }}>{sp.literal_meaning}</div>
                </div>
                <div style={{ padding: 12, borderRadius: 10, background: "color-mix(in srgb, var(--c-teal) 7%, transparent)", border: `1px solid ${`color-mix(in srgb, var(--c-teal) 15%, transparent)`}` }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-teal)", marginBottom: 4 }}>{"实际意义"}</div>
                  <div style={{ fontSize: 13, color: "var(--c-p700)", lineHeight: 1.5 }}>{sp.actual_meaning}</div>
                </div>
              </div>
            </Card>
          )}

          {/* Non-idiom: single meaning */}
          {!isIdiom && (sp.actual_meaning || sp.literal_meaning) && !(sp.literal_meaning && sp.actual_meaning) && (
            <Card style={{ padding: 16 }}>
              <div style={{ fontSize: 14, color: "var(--c-p700)", lineHeight: 1.7 }}>
                {sp.actual_meaning || sp.literal_meaning}
              </div>
            </Card>
          )}

          {/* Card 4: Learner tip — pill-button style like 近反义词 */}
          {(sp.learner_tip || sp.tip) && (() => {
            const tipText = sp.learner_tip || sp.tip;
            // Split tip into individual word suggestions if it contains known words
            // Otherwise show as plain text with clickable word pills for any Thai words found
            return (
              <Card style={{ padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: `linear-gradient(135deg, ${"var(--c-info)"}, ${"var(--c-teal)"})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Sparkles size={13} strokeWidth={IW} color="#fff" />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-p800)" }}>{"学习者建议"}</span>
                </div>
                {/* Render tip text, but make Thai words in it clickable */}
                <div style={{ fontSize: 13, color: "var(--c-p700)", lineHeight: 1.8 }}>
                  {/* Split by Thai word boundaries and render as mixed text/pills */}
                  {(() => {
                    const thaiPattern = /([\u0E00-\u0E7F]+)/g;
                    const parts = tipText.split(thaiPattern);
                    return parts.map((part, i) => {
                      if (thaiPattern.test(part)) {
                        // Thai word — render as clickable pill
                        return <WordPill key={i} word={part} onClick={() => handleWordTap(part)} theme="info" />;
                      }
                      // Non-Thai text — render as plain text
                      return <span key={i}>{part}</span>;
                    });
                  })()}
                </div>
              </Card>
            );
          })()}

          {/* Card 5: Tags */}
          {Array.isArray(sp.tags) && sp.tags.length > 0 && (
            <Card style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: "color-mix(in srgb, var(--c-teal) 12%, transparent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Tag size={13} strokeWidth={IW} color={"var(--c-teal)"} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-p800)" }}>{"标签分类"}</span>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {sp.tags.map((tag, i) => (
                  <Badge key={i} bg={"color-mix(in srgb, var(--c-teal) 10%, transparent)"} fg={"var(--c-teal)"} style={{ fontSize: 12 }}>{tag}</Badge>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* ── Sentence Bookmark Folder Selection Modal ── */}
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
                {"收藏句子到收藏夹"}
              </h3>
              <div onClick={() => setShowBookmarkModal(false)} style={{ cursor: "pointer", display: "flex" }}>
                <X size={18} strokeWidth={IW} color={"var(--c-s400)"} />
              </div>
            </div>
            <div style={{ fontSize: 12, color: "var(--c-s500)", marginBottom: 12, fontFamily: "var(--zh-font), sans-serif" }}>
              点击勾选/取消收藏夹，可同时收藏到多个收藏夹
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sentenceFolders.map(folder => {
                const isInFolder = sentenceFoldersIn.includes(folder.id);
                return (
                  <div key={folder.id} onClick={async () => {
                    if (isInFolder) {
                      setSentenceFoldersIn(prev => prev.filter(id => id !== folder.id));
                      if (userId && userId !== 'anonymous' && isSupabaseConfigured) {
                        await removeSentenceFromFolder(folder.id, sp.dbId);
                      }
                      const remainingFolders = sentenceFoldersIn.filter(id => id !== folder.id);
                      if (remainingFolders.length === 0) {
                        setIsBookmarked(false);
                        if (userId && userId !== 'anonymous' && isSupabaseConfigured) {
                          await removeSentenceBookmark(userId, sp.dbId);
                        }
                      }
                    } else {
                      setSentenceFoldersIn(prev => [...prev, folder.id]);
                      setIsBookmarked(true);
                      if (userId && userId !== 'anonymous' && isSupabaseConfigured) {
                        await bookmarkSentence(userId, sp.dbId);
                        addSentenceToFolder(folder.id, sp.dbId);
                      }
                    }
                  }} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                    borderRadius: 12,
                    background: isInFolder ? "color-mix(in srgb, var(--c-gold) 4%, var(--c-surfaceAlt))" : "var(--c-surfaceAlt)",
                    border: `1px solid ${isInFolder ? "color-mix(in srgb, var(--c-gold) 20%, transparent)" : "var(--c-p100)"}`,
                    cursor: "pointer", transition: "all 0.15s",
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: 6, border: `1.5px solid ${isInFolder ? "var(--c-gold)" : "var(--c-p300)"}`,
                      background: isInFolder ? "var(--c-gold)" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.15s",
                    }}>
                      {isInFolder && <Check size={13} strokeWidth={2.5} color="#fff" />}
                    </div>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: folder.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 14, color: "var(--c-p800)", fontWeight: 500 }}>
                      {folder.name}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--c-s300)" }}>{folder.sentenceCount} 句</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <TooltipDismissOverlay active={wordTip} onDismiss={() => setWordTip(null)} />
    </div>
  );
};

export default SentenceDetail;
