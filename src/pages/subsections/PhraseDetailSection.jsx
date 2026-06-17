import { useState, useEffect } from "react";
import { useAppContext } from "../../context/AppContext";
import { Card, TtsPlay, Badge, WordTokenSpan, TooltipDismissOverlay } from "../../components/UIComponents";
import { ChevronRight, Sparkles, Tag, Bookmark } from "lucide-react";
import { bookmarkSentence, removeSentenceBookmark, getBookmarkedSentences } from "../../lib/supabase.js";
import { thaiSegment } from "../../utils/thaiSegment";
import phraseData from "../../data/phraseData";

const IW = 1.5;

/* Clickable word pill — same style as 近反义词 */
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
      <span style={{ fontSize: 13, fontWeight: 500, color: c.fg, fontFamily: "var(--th-font), sans-serif" }}>{word}</span>
      {meaning && <span style={{ fontSize: 11, color: "var(--c-s500)", fontWeight: 400, marginLeft: 4 }}>({meaning})</span>}
    </div>
  );
};

const PhraseDetailSection = ({ phrase }) => {
  const { handleWordTap, userId } = useAppContext();
  const [wordTip, setWordTip] = useState(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const sp = phrase;

  const spSegmented = (() => {
    if (Array.isArray(sp.segmented) && sp.segmented.length > 0 && sp.segmented.some(s => s.meaning)) {
      return sp.segmented;
    }
    for (const cat of Object.values(phraseData)) {
      const match = cat.find(p => p.text === sp.text);
      if (match && match.segmented && match.segmented.length > 0) {
        return match.segmented;
      }
    }
    if (Array.isArray(sp.segmented) && sp.segmented.length > 0) {
      return sp.segmented;
    }
    const seg = thaiSegment(sp.text);
    return seg.length > 1 ? seg : [];
  })();

  const isIdiom = sp.literal && sp.actual;

  /* ── Scroll dismissal ── */
  useEffect(() => {
    if (!wordTip) return;
    const dismiss = () => setWordTip(null);
    window.addEventListener('scroll', dismiss, true);
    return () => window.removeEventListener('scroll', dismiss, true);
  }, [wordTip]);

  /* ── Check bookmark ── */
  useEffect(() => {
    if (!userId || userId === 'anonymous' || !phrase.dbId) return;
    getBookmarkedSentences(userId).then(sentences => {
      const bm = {};
      sentences.forEach(s => { bm[String(s.id)] = true; });
      setIsBookmarked(bm[String(phrase.dbId)] || false);
    });
  }, [userId, phrase.dbId]);

  const toggleBookmark = async () => {
    if (!userId || userId === 'anonymous' || !phrase.dbId) return;
    const prev = isBookmarked;
    setIsBookmarked(!prev);
    try {
      if (prev) await removeSentenceBookmark(userId, phrase.dbId);
      else await bookmarkSentence(userId, phrase.dbId);
    } catch (e) { console.error("[toggleBm]", e); setIsBookmarked(prev); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "0 16px 16px" }}>
      {/* Phrase text + bookmark */}
      <Card style={{ padding: 16, background: `linear-gradient(135deg, ${`color-mix(in srgb, var(--c-teal) 3%, transparent)`}, ${`color-mix(in srgb, var(--c-gold) 2%, transparent)`})`, border: `1px solid ${`color-mix(in srgb, var(--c-teal) 9%, transparent)`}` }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--c-p900)", fontFamily: "var(--th-font), serif", lineHeight: 1.5, flex: 1 }}>
            {phrase.text}
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <TtsPlay text={phrase.text} size={16} />
            {phrase.dbId && (
              <div onClick={toggleBookmark} style={{
                width: 28, height: 28, borderRadius: 8,
                background: isBookmarked ? "color-mix(in srgb, var(--c-gold) 9%, transparent)" : "var(--c-surfaceAlt)",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              }}>
                <Bookmark size={13} strokeWidth={IW} color={isBookmarked ? "var(--c-gold)" : "var(--c-s300)"} fill={isBookmarked ? "var(--c-gold)" : "none"} />
              </div>
            )}
          </div>
        </div>
        <div style={{ fontSize: 14, color: "var(--c-p600)", lineHeight: 1.5 }}>{phrase.zh}</div>
      </Card>

      {/* Word-by-word analysis — horizontal arithmetic format */}
      {spSegmented.length > 0 && (
        <Card style={{ padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)", marginBottom: 14, fontFamily: "var(--zh-font), serif" }}>{"逐词分析"}</div>
          <div style={{ fontSize: 18, fontFamily: "var(--th-font), sans-serif", lineHeight: 2, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4 }}>
            {spSegmented.map((seg, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center" }}>
                <WordTokenSpan seg={seg} tipId={`pd-${i}`} activeTip={wordTip} onTipChange={setWordTip} onDetail={handleWordTap} />
                <span style={{ fontSize: 12, color: "var(--c-s500)", fontWeight: 400, marginLeft: 2, fontFamily: "var(--zh-font), sans-serif" }}>({seg.meaning || ''})</span>
                {i < spSegmented.length - 1 && <span style={{ fontSize: 14, color: "var(--c-s300)", margin: "0 6px", fontWeight: 600 }}>+</span>}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Idiom: literal vs actual */}
      {isIdiom && (
        <Card style={{ padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)", marginBottom: 12, fontFamily: "var(--zh-font), serif" }}>{"字面意义 vs 实际意义"}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ padding: 12, borderRadius: 10, background: "color-mix(in srgb, var(--c-gold) 7%, transparent)", border: `1px solid ${`color-mix(in srgb, var(--c-gold) 15%, transparent)`}` }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-gold)", marginBottom: 4 }}>{"字面意义"}</div>
              <div style={{ fontSize: 13, color: "var(--c-p700)", lineHeight: 1.5 }}>{phrase.literal}</div>
            </div>
            <div style={{ padding: 12, borderRadius: 10, background: "color-mix(in srgb, var(--c-teal) 7%, transparent)", border: `1px solid ${`color-mix(in srgb, var(--c-teal) 15%, transparent)`}` }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-teal)", marginBottom: 4 }}>{"实际意义"}</div>
              <div style={{ fontSize: 13, color: "var(--c-p700)", lineHeight: 1.5 }}>{phrase.actual}</div>
            </div>
          </div>
        </Card>
      )}

      {/* Learner tip — pill-button style */}
      {phrase.tip && (() => {
        const thaiPattern = /([\u0E00-\u0E7F]+)/g;
        const parts = phrase.tip.split(thaiPattern);
        return (
          <Card style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: `linear-gradient(135deg, ${"var(--c-info)"}, ${"var(--c-teal)"})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles size={13} strokeWidth={IW} color="#fff" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-p800)" }}>{"学习者建议"}</span>
            </div>
            <div style={{ fontSize: 13, color: "var(--c-p700)", lineHeight: 1.8 }}>
              {parts.map((part, i) => {
                if (thaiPattern.test(part)) {
                  return <WordPill key={i} word={part} onClick={() => handleWordTap(part)} theme="info" />;
                }
                return <span key={i}>{part}</span>;
              })}
            </div>
          </Card>
        );
      })()}

      {/* Tags */}
      {Array.isArray(phrase.tags) && phrase.tags.length > 0 && (
        <Card style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: "color-mix(in srgb, var(--c-teal) 12%, transparent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Tag size={13} strokeWidth={IW} color={"var(--c-teal)"} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-p800)" }}>{"标签分类"}</span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {phrase.tags.map((tag, i) => (
              <Badge key={i} bg={"color-mix(in srgb, var(--c-teal) 10%, transparent)"} fg={"var(--c-teal)"} style={{ fontSize: 12 }}>{tag}</Badge>
            ))}
          </div>
        </Card>
      )}
      <TooltipDismissOverlay active={wordTip} onDismiss={() => setWordTip(null)} />
    </div>
  );
};

export default PhraseDetailSection;
