import { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import { Card, TtsPlay, WordTokenSpan, TooltipDismissOverlay, Badge } from "./UIComponents";
import { ChevronLeft, ChevronRight, Sparkles, Tag, Bookmark, Star } from "lucide-react";
import { thaiSegment } from "../utils/thaiSegment";
import { bookmarkSentence, removeSentenceBookmark, getBookmarkedSentences } from "../lib/supabase.js";

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
  const [isBookmarked, setIsBookmarked] = useState(false);
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

  /* ── Check bookmark status ── */
  useEffect(() => {
    if (!userId || userId === 'anonymous' || !sp.dbId) return;
    getBookmarkedSentences(userId).then(sentences => {
      const bm = {};
      sentences.forEach(s => { bm[String(s.id)] = true; });
      setIsBookmarked(bm[String(sp.dbId)] || false);
    });
  }, [userId, sp.dbId]);

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
                  <div onClick={(e) => { e.stopPropagation(); toggleBookmark(); }} style={{
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
              <div style={{ fontSize: 16, fontFamily: "var(--th-font), sans-serif", lineHeight: 2, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0 }}>
                {spSegmented.map((seg, i) => (
                  <span key={i} style={{ display: "inline-flex", alignItems: "center" }}>
                    <WordTokenSpan seg={seg} tipId={`sd-${i}`} activeTip={wordTip} onTipChange={setWordTip} onDetail={handleWordTap} />
                    <span style={{ fontSize: 12, color: "var(--c-s500)", fontWeight: 400, marginLeft: 2, fontFamily: "var(--zh-font), sans-serif" }}>({seg.meaning || ''})</span>
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
      <TooltipDismissOverlay active={wordTip} onDismiss={() => setWordTip(null)} />
    </div>
  );
};

export default SentenceDetail;
