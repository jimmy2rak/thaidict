import { useState, useEffect } from "react";
import { useAppContext } from "../../context/AppContext";
import { Card, TooltipDismissOverlay } from "../../components/UIComponents";
import {
  isSupabaseConfigured,
  getSentencesByCategory,
  getBookmarkedSentences,
  bookmarkSentence, removeSentenceBookmark,
} from "../../lib/supabase.js";
import { speak } from "../../utils/tts";
import { Sparkles, Volume2, Bookmark, ChevronRight, ChevronLeft, RefreshCw } from "lucide-react";
import phraseData from "../../data/phraseData";

const IW = 1.5;
const PER_PAGE = 30;

/* ── Flip Card: shows Thai text front, Chinese meaning back ── */
const FlipCard = ({ thai, zh, onClick }) => {
  const [flipped, setFlipped] = useState(false);
  return (
    <div onClick={() => { if (onClick) onClick(); }} style={{
      perspective: 600, cursor: onClick ? "pointer" : "default",
      minHeight: 80, width: "100%",
    }}>
      <div style={{
        position: "relative", width: "100%", minHeight: 80,
        transformStyle: "preserve-3d",
        transition: "transform 0.5s ease",
        transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
      }}>
        {/* Front: Thai text */}
        <div style={{
          position: "absolute", inset: 0, backfaceVisibility: "hidden",
          background: "var(--c-surface)", borderRadius: 14,
          border: `1px solid ${"var(--c-p100)"}`, padding: 16,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: 6,
        }}>
          <span style={{
            fontSize: 17, fontWeight: 600, color: "var(--c-p900)",
            fontFamily: "var(--th-font), sans-serif", lineHeight: 1.4,
            textAlign: "center",
          }}>{thai}</span>
          <div onClick={(e) => { e.stopPropagation(); setFlipped(f => !f); }} style={{
            fontSize: 10, color: "var(--c-s300)", cursor: "pointer",
            padding: "2px 8px", borderRadius: 6,
            background: "var(--c-surfaceAlt)",
          }}>翻转查看释义 ↻</div>
        </div>
        {/* Back: Chinese meaning */}
        <div style={{
          position: "absolute", inset: 0, backfaceVisibility: "hidden",
          transform: "rotateY(180deg)",
          background: "color-mix(in srgb, var(--c-gold) 6%, var(--c-surface))",
          borderRadius: 14, border: `1px solid ${"color-mix(in srgb, var(--c-gold) 15%, transparent)"}`,
          padding: 16, display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: 6,
        }}>
          <span style={{
            fontSize: 15, fontWeight: 600, color: "var(--c-p800)",
            fontFamily: "var(--zh-font), sans-serif", textAlign: "center", lineHeight: 1.5,
          }}>{zh}</span>
          <div onClick={(e) => { e.stopPropagation(); setFlipped(f => !f); }} style={{
            fontSize: 10, color: "var(--c-s300)", cursor: "pointer",
            padding: "2px 8px", borderRadius: 6, background: "var(--c-surfaceAlt)",
          }}>翻转 ↻</div>
        </div>
      </div>
    </div>
  );
};

const PhrasesSection = ({ onSelectPhrase }) => {
  const { userId, handleWordTap } = useAppContext();
  const [cat, setCat] = useState("idioms");
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState(1);
  const [bookmarks, setBookmarks] = useState({});
  const [dbSentences, setDbSentences] = useState({});
  const [loading, setLoading] = useState(false);
  const cats = [
    { key: "idioms", label: "俗语", color: "var(--c-gold)" },
    { key: "buddhist", label: "佛教用语", color: "var(--c-teal)" },
    { key: "daily", label: "日常用语", color: "var(--c-rose)" },
  ];

  // Fetch sentences for current category from DB — all entries
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    getSentencesByCategory(cat, 1000).then(rows => {
      if (rows && rows.length > 0) {
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

  // Use DB data with fallback to hardcoded
  const list = dbSentences[cat] || phraseData[cat] || [];
  const recommended = list[0];

  // Pagination when showAll is true
  const totalPages = Math.ceil(list.length / PER_PAGE);
  const paginatedList = showAll ? list.slice((page - 1) * PER_PAGE, page * PER_PAGE) : [recommended];

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
          <button key={c.key} onClick={() => { setCat(c.key); setShowAll(false); setPage(1); }} style={{
            flex: 1, padding: "8px 0", borderRadius: 10, border: "none", cursor: "pointer",
            background: cat === c.key ? "var(--c-surface)" : "transparent",
            color: cat === c.key ? "var(--c-p800)" : "var(--c-s500)",
            fontSize: 13, fontWeight: cat === c.key ? 600 : 400,
            boxShadow: cat === c.key ? "0 1px 3px rgba(61,43,31,0.08)" : "none",
            fontFamily: "var(--zh-font), sans-serif",
          }}>{c.label}</button>
        ))}
      </div>

      {/* 今日推荐 — single flip card */}
      {!showAll && recommended && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: -6 }}>
          <Sparkles size={13} strokeWidth={IW} color={"var(--c-gold)"} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-p800)" }}>{"今日推荐"}</span>
        </div>
      )}

      {/* Phrase flip cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {paginatedList.map((p) => (
          <div key={p.id} style={{ position: "relative" }}>
            <FlipCard
              thai={p.text}
              zh={p.zh}
              onClick={() => onSelectPhrase(p)}
            />
            {/* Action buttons overlay */}
            <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 4 }}>
              <div onClick={(e) => { e.stopPropagation(); speak(p.text, "th-TH", 0.85); }} style={{
                width: 26, height: 26, borderRadius: 8, background: "var(--c-surfaceAlt)",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              }}>
                <Volume2 size={12} strokeWidth={IW} color={"var(--c-teal)"} />
              </div>
              <div onClick={(e) => { e.stopPropagation(); toggleBm(p); }} style={{
                width: 26, height: 26, borderRadius: 8,
                background: bookmarks[p.dbId ? String(p.dbId) : p.id] ? "color-mix(in srgb, var(--c-gold) 9%, transparent)" : "var(--c-surfaceAlt)",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              }}>
                <Bookmark size={12} strokeWidth={IW} color={bookmarks[p.dbId ? String(p.dbId) : p.id] ? "var(--c-gold)" : "var(--c-s300)"} fill={bookmarks[p.dbId ? String(p.dbId) : p.id] ? "var(--c-gold)" : "none"} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 16, color: "var(--c-s400)", fontSize: 13 }}>{"加载中..."}</div>
      )}

      {/* 全部 button or pagination */}
      {!showAll && list.length > 1 && (
        <div onClick={() => { setShowAll(true); setPage(1); }} style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
          padding: "10px 0", borderRadius: 10, border: `1px solid ${"var(--c-p200)"}`,
          background: "var(--c-surface)", cursor: "pointer", fontSize: 13, color: "var(--c-p500)", fontWeight: 500,
        }}>
          {"全部"} <span style={{ fontWeight: 600, color: "var(--c-p700)" }}>{list.length}</span> {"条"} <ChevronRight size={14} strokeWidth={IW} />
        </div>
      )}

      {showAll && totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "10px 0" }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{
            padding: "8px 14px", borderRadius: 8, border: `1px solid ${"var(--c-p200)"}`,
            background: page === 1 ? "var(--c-surfaceAlt)" : "var(--c-surface)",
            color: page === 1 ? "var(--c-s300)" : "var(--c-p700)", cursor: page === 1 ? "default" : "pointer",
            fontSize: 13, fontWeight: 500, fontFamily: "var(--zh-font), sans-serif",
          }}>
            <ChevronLeft size={14} strokeWidth={IW} /> 上一页
          </button>
          <span style={{ fontSize: 13, color: "var(--c-s500)" }}>
            {page} / {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{
            padding: "8px 14px", borderRadius: 8, border: `1px solid ${"var(--c-p200)"}`,
            background: page === totalPages ? "var(--c-surfaceAlt)" : "var(--c-surface)",
            color: page === totalPages ? "var(--c-s300)" : "var(--c-p700)", cursor: page === totalPages ? "default" : "pointer",
            fontSize: 13, fontWeight: 500, fontFamily: "var(--zh-font), sans-serif",
          }}>
            下一页 <ChevronRight size={14} strokeWidth={IW} />
          </button>
        </div>
      )}

      {showAll && (
        <div onClick={() => { setShowAll(false); setPage(1); }} style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
          padding: "10px 0", borderRadius: 10, border: `1px solid ${"var(--c-p200)"}`,
          background: "var(--c-surface)", cursor: "pointer", fontSize: 13, color: "var(--c-p500)",
        }}>
          {"收起"} <ChevronRight size={14} strokeWidth={IW} style={{ transform: "rotate(90deg)" }} />
        </div>
      )}
    </div>
  );
};

export default PhrasesSection;
