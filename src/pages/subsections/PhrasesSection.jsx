import { useState, useEffect } from "react";
import { useAppContext } from "../../context/AppContext";
import { Card } from "../../components/UIComponents";
import {
  isSupabaseConfigured,
  getSentencesByCategory,
  getBookmarkedSentences,
  bookmarkSentence,
  removeSentenceBookmark,
} from "../../lib/supabase.js";
import { speak } from "../../utils/tts";
import { Sparkles, Volume2, Bookmark, ChevronRight } from "lucide-react";

const IW = 1.5;

const phraseData = {
  idioms: [
    {
      id: "p1", text: "\u0E01\u0E34\u0E19\u0E1B\u0E25\u0E32\u0E17\u0E35\u0E48\u0E2B\u0E19\u0E49\u0E32\u0E41\u0E25\u0E49\u0E27\u0E01\u0E34\u0E19\u0E1B\u0E25\u0E32\u0E17\u0E35\u0E48\u0E2B\u0E31\u0E27",
      zh: "\u5403\u5B8C\u76D8\u5B50\u53C8\u5403\u76D8\u5B50\uFF08\u8D2A\u5FC3\u4E0D\u8DB3\uFF09",
      segmented: [
        { text: "\u0E01\u0E34\u0E19", pos: "v.", meaning: "\u5403" },
        { text: "\u0E1B\u0E25\u0E32", pos: "n.", meaning: "\u76D8\u5B50" },
        { text: "\u0E17\u0E35\u0E48", pos: "rel.", meaning: "\u7684" },
        { text: "\u0E2B\u0E19\u0E49\u0E32", pos: "n.", meaning: "\u8138" },
        { text: "\u0E41\u0E25\u0E49\u0E27", pos: "conj.", meaning: "\u7136\u540E" },
        { text: "\u0E01\u0E34\u0E19", pos: "v.", meaning: "\u5403" },
        { text: "\u0E1B\u0E25\u0E32", pos: "n.", meaning: "\u76D8\u5B50" },
        { text: "\u0E17\u0E35\u0E48", pos: "rel.", meaning: "\u7684" },
        { text: "\u0E2B\u0E31\u0E27", pos: "n.", meaning: "\u5934" },
      ],
      literal: "\u5403\u5B8C\u8138\u524D\u7684\u76D8\u5B50\u53C8\u53BB\u5403\u5934\u4E0A\u7684\u76D8\u5B50",
      actual: "\u5F62\u5BB9\u4E00\u4E2A\u4EBA\u8D2A\u5FC3\u4E0D\u8DB3\uFF0C\u5F97\u5BF8\u8FDB\u5C3A\uFF0C\u6C38\u8FDC\u4E0D\u77E5\u8DB3",
      tip: "\u8FD9\u4E2A\u4FD7\u8BED\u5E38\u7528\u4E8E\u8B66\u544A\u4ED6\u4EBA\u4E0D\u8981\u592A\u8D2A\u5FC3\u3002\u6CE8\u610F\u6CF0\u8BED\u4E2D \u0E2B\u0E19\u0E49\u0E32(\u8138)\u548C \u0E2B\u0E31\u0E27(\u5934)\u7684\u5BF9\u6BD4\uFF0C\u5F62\u8C61\u5730\u8868\u8FBE\u4E86\u4ECE\u4F4E\u5230\u9AD8\u7684\u8D2A\u5A6A\u3002",
    },
    {
      id: "p2", text: "\u0E19\u0E49\u0E33\u0E02\u0E36\u0E49\u0E19\u0E1B\u0E25\u0E32\u0E44\u0E21\u0E48\u0E44\u0E2B\u0E25",
      zh: "\u6C34\u6DA8\u4E0D\u6D41\uFF08\u6CE1\u6C64\u4E0D\u6EDA\uFF09",
      segmented: [
        { text: "\u0E19\u0E49\u0E33", pos: "n.", meaning: "\u6C34" },
        { text: "\u0E02\u0E36\u0E49\u0E19", pos: "v.", meaning: "\u4E0A\u6DA8" },
        { text: "\u0E1B\u0E25\u0E32", pos: "n.", meaning: "\u9C7C" },
        { text: "\u0E44\u0E21\u0E48", pos: "neg.", meaning: "\u4E0D" },
        { text: "\u0E44\u0E2B\u0E25", pos: "v.", meaning: "\u6D41\u52A8" },
      ],
      literal: "\u6C34\u6DA8\u4E86\u4F46\u9C7C\u4E0D\u6E38\u52A8",
      actual: "\u5F62\u5BB9\u4E8B\u60C5\u770B\u4F3C\u6709\u53D8\u5316\u4F46\u5B9E\u8D28\u6CA1\u6709\u6539\u53D8\uFF0C\u6216\u6307\u4EBA\u5BF9\u5916\u754C\u53D8\u5316\u65E0\u52A8\u4E8E\u8877",
      tip: "\u5E38\u7528\u4E8E\u63CF\u8FF0\u793E\u4F1A\u73B0\u8C61\uFF0C\u8868\u9762\u53D8\u5316\u4F46\u672C\u8D28\u672A\u53D8\u3002",
    },
  ],
  buddhist: [
    {
      id: "p3", text: "\u0E2A\u0E1A\u0E42\u0E20 \u0E1B\u0E23\u0E30\u0E17\u0E35\u0E1B \u0E2A\u0E31\u0E07\u0E06\u0E27\u0E31\u0E0F\u0E10\u0E38",
      zh: "\u56DB\u5723\u8C1B\uFF08\u4F5B\u6559\u6838\u5FC3\u6559\u4E49\uFF09",
      segmented: [
        { text: "\u0E2A\u0E1A\u0E42\u0E20", pos: "num.", meaning: "\u56DB" },
        { text: "\u0E1B\u0E23\u0E30\u0E17\u0E35\u0E1B", pos: "n.", meaning: "\u8C1B\u8BC0" },
        { text: "\u0E2A\u0E31\u0E07\u0E04\u0E27\u0E31\u0E0F\u0E10\u0E38", pos: "n.", meaning: "\u4F5B\u6CD5\u5C5E\u6027" },
      ],
      tip: "\u56DB\u5723\u8C1B\u662F\u4F5B\u6559\u6700\u6838\u5FC3\u7684\u6559\u4E49\uFF0C\u5305\u62EC\u82E6\u8C1B\u3001\u96C6\u8C1B\u3001\u706D\u8C1B\u3001\u9053\u8C1B\u3002\u5728\u6CF0\u56FD\u4F5B\u6559\u6587\u5316\u4E2D\u6781\u4E3A\u91CD\u8981\u3002",
    },
    {
      id: "p4", text: "\u0E17\u0E33\u0E1A\u0E38\u0E0D \u0E44\u0E14\u0E49\u0E1A\u0E38\u0E0D",
      zh: "\u884C\u5584\u5F97\u5584\uFF08\u5584\u6709\u5584\u62A5\uFF09",
      segmented: [
        { text: "\u0E17\u0E33", pos: "v.", meaning: "\u505A" },
        { text: "\u0E1A\u0E38\u0E0D", pos: "n.", meaning: "\u529F\u5FB7/\u5584" },
        { text: "\u0E44\u0E14\u0E49", pos: "v.", meaning: "\u5F97\u5230" },
        { text: "\u0E1A\u0E38\u0E0D", pos: "n.", meaning: "\u529F\u5FB7/\u5584" },
      ],
      tip: "\u8FD9\u662F\u6CF0\u56FD\u4F5B\u6559\u6587\u5316\u4E2D\u6700\u5E38\u89C1\u7684\u4E00\u53E5\u8BDD\uFF0C\u4F53\u73B0\u4E86\u56E0\u679C\u62A5\u5E94\u7684\u6838\u5FC3\u601D\u60F3\u3002\u6CF0\u56FD\u4EBA\u5E38\u7528\u8FD9\u53E5\u8BDD\u52C9\u52B1\u4ED6\u4EBA\u884C\u5584\u3002",
    },
    {
      id: "p5", text: "\u0E2D\u0E19\u0E34\u0E08\u0E08\u0E4C \u0E44\u0E21\u0E48\u0E40\u0E1B\u0E47\u0E19\u0E2D\u0E19\u0E34\u0E08\u0E08\u0E4C",
      zh: "\u65E0\u5E38\uFF08\u4E07\u7269\u7686\u65E0\u5E38\uFF09",
      segmented: [
        { text: "\u0E2D\u0E19\u0E34\u0E08\u0E08\u0E4C", pos: "n.", meaning: "\u65E0\u5E38" },
        { text: "\u0E44\u0E21\u0E48", pos: "neg.", meaning: "\u4E0D" },
        { text: "\u0E40\u0E1B\u0E47\u0E19", pos: "v.", meaning: "\u662F" },
        { text: "\u0E2D\u0E19\u0E34\u0E08\u0E08\u0E4C", pos: "n.", meaning: "\u65E0\u5E38" },
      ],
      tip: "\u6E90\u81EA\u5DF4\u5229\u6587\u0E2D\u0E19\u0E34\u0E08\u0E08\u0E4C(Anicca)\uFF0C\u6307\u4E16\u95F4\u4E07\u7269\u90FD\u5728\u4E0D\u65AD\u53D8\u5316\uFF0C\u6CA1\u6709\u6C38\u6052\u4E0D\u53D8\u7684\u4E8B\u7269\u3002\u8FD9\u662F\u4F5B\u6559\u4E09\u6CD5\u5370\u4E4B\u4E00\u3002",
    },
  ],
  daily: [
    {
      id: "p6", text: "\u0E09\u0E31\u0E19\u0E40\u0E23\u0E35\u0E22\u0E19\u0E20\u0E32\u0E29\u0E32\u0E44\u0E17\u0E22\u0E17\u0E38\u0E01\u0E27\u0E31\u0E19",
      zh: "\u6211\u6BCF\u5929\u90FD\u5B66\u4E60\u6CF0\u8BED",
      segmented: [
        { text: "\u0E09\u0E31\u0E19", pos: "pron.", meaning: "\u6211" },
        { text: "\u0E40\u0E23\u0E35\u0E22\u0E19", pos: "v.", meaning: "\u5B66\u4E60" },
        { text: "\u0E20\u0E32\u0E29\u0E32\u0E44\u0E17\u0E22", pos: "n.", meaning: "\u6CF0\u8BED" },
        { text: "\u0E17\u0E38\u0E01\u0E27\u0E31\u0E19", pos: "adv.", meaning: "\u6BCF\u5929" },
      ],
      tip: "\u8FD9\u662F\u5B66\u4E60\u6CF0\u8BED\u65F6\u7684\u7ECF\u5178\u7EC3\u4E60\u53E5\u3002\u6CE8\u610F\u6CF0\u8BED\u8BED\u5E8F\u4E0E\u4E2D\u6587\u76F8\u4F3C\uFF1A\u4E3B\u8BED+\u52A8\u8BED+\u5BBE\u8BED+\u65F6\u95F4\u72B6\u8BED\u3002",
    },
    {
      id: "p7", text: "\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35\u0E04\u0E23\u0E31\u0E1A/\u0E04\u0E48\u0E30",
      zh: "\u4F60\u597D\uFF08\u7537/\u5973\u6027\u7528\uFF09",
      segmented: [
        { text: "\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35", pos: "intj.", meaning: "\u4F60\u597D" },
        { text: "\u0E04\u0E23\u0E31\u0E1A", pos: "part.", meaning: "\u7537\u6027\u793C\u8C8C\u8BCD" },
        { text: "\u0E04\u0E48\u0E30", pos: "part.", meaning: "\u5973\u6027\u793C\u8C8C\u8BCD" },
      ],
      tip: "\u6CF0\u8BED\u4E2D\u7684\u793C\u8C8C\u52A9\u8BCD\u6839\u636E\u8BF4\u8BDD\u8005\u6027\u522B\u4E0D\u540C\uFF1A\u7537\u6027\u7528 \u0E04\u0E23\u0E31\u0E1A(khrap)\uFF0C\u5973\u6027\u7528 \u0E04\u0E48\u0E30(kha)\u3002\u8FD9\u662F\u6CF0\u8BED\u6700\u57FA\u672C\u7684\u793C\u8C8C\u89C4\u5219\u3002",
    },
    {
      id: "p8", text: "\u0E44\u0E21\u0E48\u0E40\u0E1B\u0E47\u0E19\u0E44\u0E2B\u0E23",
      zh: "\u6CA1\u5173\u7CFB/\u4E0D\u8981\u7D27",
      segmented: [
        { text: "\u0E44\u0E21\u0E48", pos: "neg.", meaning: "\u4E0D" },
        { text: "\u0E40\u0E1B\u0E47\u0E19", pos: "v.", meaning: "\u662F" },
        { text: "\u0E44\u0E2B\u0E23", pos: "intj.", meaning: "\u4EC0\u4E48" },
      ],
      tip: "\u6CF0\u56FD\u65E5\u5E38\u751F\u6D3B\u4E2D\u6700\u5E38\u7528\u7684\u8868\u8FBE\u4E4B\u4E00\uFF0C\u7528\u4E8E\u56DE\u5E94\u9053\u6B49\u6216\u8868\u793A\u65E0\u6240\u8C13\u3002\u4F53\u73B0\u4E86\u6CF0\u56FD\u4EBA\u968F\u548C\u7684\u6027\u683C\u3002",
    },
  ],
};

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
        const mapped = rows.map(r => ({
          id: String(r.id),
          text: r.text,
          zh: r.actual_meaning || r.literal_meaning || '',
          segmented: Array.isArray(r.segmented) ? r.segmented : [],
          literal: r.literal_meaning || '',
          actual: r.actual_meaning || '',
          tip: r.learner_tip || '',
          dbId: r.id,
          category: r.category,
        }));
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
                    <span key={j} style={{ position: "relative", display: "inline" }}>
                      <span onClick={(e) => { e.stopPropagation(); setWordTip(wordTip?.id === `${p.id}-${j}` ? null : { id: `${p.id}-${j}`, text: seg.text, pos: seg.pos, meaning: seg.meaning }); }} style={{
                        cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dashed",
                        textUnderlineOffset: 3, color: "var(--c-p900)",
                      }}>{seg.text}</span>
                      {wordTip?.id === `${p.id}-${j}` && (
                        <div style={{
                          position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
                          background: "var(--c-p800)", color: "#fff", padding: "6px 10px", borderRadius: 8,
                          fontSize: 11, whiteSpace: "nowrap", zIndex: 50, marginBottom: 4,
                          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                        }}>
                          <span style={{ color: "var(--c-gold)", fontStyle: "italic", marginRight: 6 }}>{seg.pos}</span>
                          {seg.meaning}
                          <div onClick={(e) => { e.stopPropagation(); setWordTip(null); handleWordTap(seg.text); }} style={{
                            marginTop: 4, fontSize: 10, color: "var(--c-teal)", cursor: "pointer", textAlign: "center",
                          }}>{"\u67E5\u770B\u8BE6\u60C5 \u203A"}</div>
                        </div>
                      )}
                    </span>
                  )) : <span>{p.text}</span>}
                </div>
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
