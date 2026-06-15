import { useState, useEffect } from "react";
import { useAppContext } from "../../context/AppContext";
import { Card, WordTokenSpan, TooltipDismissOverlay } from "../../components/UIComponents";
import {
  isSupabaseConfigured,
  getSentencesByCategory,
  getBookmarkedSentences,
  bookmarkSentence,
  removeSentenceBookmark,
} from "../../lib/supabase.js";
import { speak } from "../../utils/tts";
import { Sparkles, Volume2, Bookmark, ChevronRight } from "lucide-react";
import phraseData from "../../data/phraseData";

const IW = 1.5;

const PhrasesSection = ({ onSelectPhrase }) => {
  const { userId, handleWordTap } = useAppContext();
  const [cat, setCat] = useState("idioms");
  const [showAll, setShowAll] = useState(false);
  const [bookmarks, setBookmarks] = useState({});
  const [wordTip, setWordTip] = useState(null);
  const [dbSentences, setDbSentences] = useState({});
  const [loading, setLoading] = useState(false);
  const cats = [
    { key: "idioms", label: "\u4FD7\u8BED", color: "var(--c-gold)" },
    { key: "buddhist", label: "\u4F5B\u6559\u7528\u8BED", color: "var(--c-teal)" },
    { key: "daily", label: "\u65E5\u5E38\u7528\u8BED", color: "var(--c-rose)" },
  ];

  // Fetch sentences for current category from DB
  useEffect(() => {
    if (!isSupabaseConfigured || dbSentences[cat]) return;
    setLoading(true);
    getSentencesByCategory(cat, 50).then(rows => {
      if (rows.length > 0) {
        const hc = phraseData[cat] || [];
        const mapped = rows.map(r => {
          let segmented = Array.isArray(r.segmented) && r.segmented.length > 0 ? r.segmented : [];
          if (segmented.length === 0) {
            const match = hc.find(p => p.text === r.text);
            if (match && match.segmented) segmented = match.segmented;
          }
          return {
            id: String(r.id),
            text: r.text,
            zh: r.actual_meaning || r.literal_meaning || '',
            segmented,
            literal: r.literal_meaning || '',
            actual: r.actual_meaning || '',
            tip: r.learner_tip || '',
            tags: Array.isArray(r.tags) ? r.tags : [],
            dbId: r.id,
            category: r.category,
          };
        });
        setDbSentences(prev => ({ ...prev, [cat]: mapped }));
      }
      setLoading(false);
    });
  }, [cat]);

  // Load existing bookmarks on mount
  useEffect(() => {
    if (!userId || userId === 'anonymous' || !isSupabaseConfigured) return;
    getBookmarkedSentences(userId).then(sentences => {
      const bm = {};
      sentences.forEach(s => { bm[String(s.id)] = true; });
      setBookmarks(bm);
    });
  }, [userId]);

  /* ── Scroll dismissal for word tooltip ── */
  useEffect(() => {
    if (!wordTip) return;
    const dismiss = () => setWordTip(null);
    window.addEventListener('scroll', dismiss, true);
    return () => window.removeEventListener('scroll', dismiss, true);
  }, [wordTip]);

  // Use DB data with fallback to hardcoded
  const list = dbSentences[cat] || phraseData[cat] || [];
  const recommended = list[0];
  const displayList = showAll ? list : [recommended];

  const toggleBm = async (phrase) => {
    const id = phrase.dbId ? String(phrase.dbId) : phrase.id;
    const isCurrentlyBookmarked = bookmarks[id];
    setBookmarks(p => ({ ...p, [id]: !p[id] }));
    if (userId && userId !== 'anonymous' && phrase.dbId) {
      if (isCurrentlyBookmarked) {
        await removeSentenceBookmark(userId, phrase.dbId);
      } else {
        await bookmarkSentence(userId, phrase.dbId);
      }
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "0 16px 16px" }}>
      {/* Category tabs */}
      <div style={{ display: "flex", gap: 6, background: "var(--c-surfaceAlt)", borderRadius: 12, padding: 4 }}>
        {cats.map(c => (
          <button key={c.key} onClick={() => { setCat(c.key); setShowAll(false); }} style={{
            flex: 1, padding: "8px 0", borderRadius: 10, border: "none", cursor: "pointer",
            background: cat === c.key ? "var(--c-surface)" : "transparent",
            color: cat === c.key ? "var(--c-p800)" : "var(--c-s500)",
            fontSize: 13, fontWeight: cat === c.key ? 600 : 400,
            boxShadow: cat === c.key ? "0 1px 3px rgba(61,43,31,0.08)" : "none",
            fontFamily: "var(--zh-font), sans-serif",
          }}>{c.label}</button>
        ))}
      </div>

      {/* 今日推荐 header */}
      {!showAll && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Sparkles size={13} strokeWidth={IW} color={"var(--c-gold)"} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-p800)" }}>{"\u4ECA\u65E5\u63A8\u8350"}</span>
          </div>
        </div>
      )}

      {/* Phrase cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {displayList.map((p) => (
          <Card key={p.id} style={{ padding: 14 }}>
            {/* Thai phrase + action buttons */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
              <div onClick={() => onSelectPhrase(p)} style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: "var(--c-p900)", fontFamily: "var(--th-font), sans-serif", lineHeight: 1.5 }}>
                  {p.segmented && p.segmented.length > 0 ? p.segmented.map((seg, j) => (
                    <WordTokenSpan key={j} seg={seg} tipId={`${p.id}-${j}`} activeTip={wordTip} onTipChange={setWordTip} onDetail={handleWordTap} />
                  )) : <span>{p.text}</span>}
                </div>
                <TooltipDismissOverlay active={wordTip} onDismiss={() => setWordTip(null)} />
                <div style={{ fontSize: 13, color: "var(--c-s500)", lineHeight: 1.4, marginTop: 4 }}>{p.zh}</div>
              </div>
              {/* Action buttons */}
              <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 8, marginTop: 2 }}>
                <div onClick={(e) => { e.stopPropagation(); speak(p.segmented && p.segmented.length > 0 ? p.segmented.map(s => s.text).join("") : p.text, "th-TH", 0.85); }} style={{ width: 28, height: 28, borderRadius: 8, background: "var(--c-surfaceAlt)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <Volume2 size={13} strokeWidth={IW} color={"var(--c-teal)"} />
                </div>
                <div onClick={(e) => { e.stopPropagation(); toggleBm(p); }} style={{ width: 28, height: 28, borderRadius: 8, background: bookmarks[p.dbId ? String(p.dbId) : p.id] ? "color-mix(in srgb, var(--c-gold) 9%, transparent)" : "var(--c-surfaceAlt)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <Bookmark size={13} strokeWidth={IW} color={bookmarks[p.dbId ? String(p.dbId) : p.id] ? "var(--c-gold)" : "var(--c-s300)"} fill={bookmarks[p.dbId ? String(p.dbId) : p.id] ? "var(--c-gold)" : "none"} />
                </div>
              </div>
            </div>
            {/* Segmented tags */}
            {p.segmented && p.segmented.length > 0 && (
            <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
              {p.segmented.map((seg, j) => (
                <span key={j} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 6, background: "var(--c-surfaceAlt)", color: "var(--c-s500)", border: `1px solid ${"var(--c-p100)"}` }}>
                  {seg.text}<span style={{ color: "var(--c-s300)", marginLeft: 3 }}>{seg.meaning}</span>
                </span>
              ))}
            </div>
            )}
          </Card>
        ))}
      </div>

      {/* 全部 button */}
      {!showAll && list.length > 1 && (
        <div onClick={() => setShowAll(true)} style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
          padding: "10px 0", borderRadius: 10, border: `1px solid ${"var(--c-p200)"}`,
          background: "var(--c-surface)", cursor: "pointer", fontSize: 13, color: "var(--c-p500)", fontWeight: 500,
        }}>
          {"\u5168\u90E8"} <span style={{ fontWeight: 600, color: "var(--c-p700)" }}>{list.length}</span> {"\u6761"} <ChevronRight size={14} strokeWidth={IW} />
        </div>
      )}
      {showAll && (
        <div onClick={() => setShowAll(false)} style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
          padding: "10px 0", borderRadius: 10, border: `1px solid ${"var(--c-p200)"}`,
          background: "var(--c-surface)", cursor: "pointer", fontSize: 13, color: "var(--c-p500)",
        }}>
          {"\u6536\u8D77"} <ChevronRight size={14} strokeWidth={IW} style={{ transform: "rotate(90deg)" }} />
        </div>
      )}
    </div>
  );
};

export default PhrasesSection;
