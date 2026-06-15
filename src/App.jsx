import { useAppContext, AppProvider } from "./context/AppContext.jsx";
import { Logo, PalmLeafBook, LotusLamp, BuddhaHead } from "./icons/CulturalIcons.jsx";
import { Card } from "./components/UIComponents.jsx";
import { ChevronLeft, ChevronRight, Play, Sparkles } from "lucide-react";
import { speak } from "./utils/tts";

import HomePage from "./pages/HomePage.jsx";
import WordBookPage from "./pages/WordBookPage.jsx";
import WordDetailPage from "./pages/WordDetailPage.jsx";
import UnknownWordPage from "./pages/UnknownWordPage.jsx";
import LearnPage from "./pages/LearnPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";

const IW = 1.5;

/* ── Sentence detail view (inline — small enough to keep here) ── */
function SentenceDetail() {
  const { selectedSentence, setSelectedSentence, handleWordTap } = useAppContext();
  const sp = selectedSentence;
  const spSegmented = Array.isArray(sp.segmented) ? sp.segmented : [];
  const isIdiom = sp.category === 'idioms';
  return (
    <div style={{ maxWidth: 430, margin: "0 auto", height: "100vh", background: "var(--c-bg)", fontFamily: "var(--zh-font), var(--th-font), sans-serif", color: "var(--c-p800)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ height: 44, background: "var(--c-bg)", flexShrink: 0 }} />
      <div style={{ padding: "4px 20px 6px", display: "flex", alignItems: "center", gap: 10 }}>
        <div onClick={() => setSelectedSentence(null)} style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 10, background: "var(--c-p100)", flexShrink: 0 }}>
          <ChevronLeft size={18} strokeWidth={IW} color={"var(--c-p700)"} />
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--c-p800)", margin: 0, fontFamily: "var(--zh-font), serif", flex: 1 }}>{"句子详情"}</h1>
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 16px 16px" }}>
          <div style={{ background: "linear-gradient(135deg, var(--c-tealL) 0%, var(--c-surface) 100%)", borderRadius: 16, padding: 16, border: `1px solid ${"var(--c-p100)"}` }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--c-p900)", fontFamily: "var(--th-font), serif", lineHeight: 1.6, flex: 1 }}>{sp.text}</div>
              <div onClick={() => speak(sp.text, "th-TH", 0.85)} style={{ cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0, marginTop: 4 }}>
                <Play size={16} strokeWidth={IW} color={"var(--c-teal)"} fill={"var(--c-teal)"} />
              </div>
            </div>
            {(sp.actual_meaning || sp.literal_meaning) && (
              <div style={{ fontSize: 14, color: "var(--c-p700)", marginTop: 12, lineHeight: 1.6 }}>{sp.actual_meaning || sp.literal_meaning}</div>
            )}
          </div>
          {spSegmented.length > 0 && (
            <Card style={{ padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-p800)", marginBottom: 12 }}>{"逐词分析"}</div>
              {spSegmented.map((tok, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: i < spSegmented.length - 1 ? `1px solid ${"var(--c-p50)"}` : "none" }}>
                  <div onClick={() => { if (tok.text) handleWordTap(tok.text); }} style={{ fontSize: 16, fontWeight: 600, color: "var(--c-teal)", fontFamily: "var(--th-font), sans-serif", cursor: "pointer" }}>{tok.text}</div>
                  {tok.pos && <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4, background: "var(--c-p100)", color: "var(--c-p700)" }}>{tok.pos}</span>}
                  {tok.meaning && <span style={{ fontSize: 13, color: "var(--c-p700)" }}>{tok.meaning}</span>}
                </div>
              ))}
            </Card>
          )}
          {isIdiom && sp.literal_meaning && sp.actual_meaning && (
            <>
              <div style={{ background: "var(--c-goldL)", borderRadius: 12, padding: 14, border: `1px solid ${"color-mix(in srgb, var(--c-gold) 30%, transparent)"}` }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-gold)", marginBottom: 6 }}>{"字面意义"}</div>
                <div style={{ fontSize: 14, color: "var(--c-p800)", lineHeight: 1.6 }}>{sp.literal_meaning}</div>
              </div>
              <div style={{ background: "color-mix(in srgb, var(--c-teal) 8%, transparent)", borderRadius: 12, padding: 14, border: `1px solid ${"color-mix(in srgb, var(--c-teal) 20%, transparent)"}` }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-teal)", marginBottom: 6 }}>{"实际意义"}</div>
                <div style={{ fontSize: 14, color: "var(--c-p800)", lineHeight: 1.6 }}>{sp.actual_meaning}</div>
              </div>
            </>
          )}
          {sp.learner_tip && (
            <Card style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Sparkles size={13} strokeWidth={IW} color={"var(--c-gold)"} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-p800)" }}>{"学习者建议"}</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--c-p700)", lineHeight: 1.6 }}>{sp.learner_tip}</div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main App ── */
export default function App() {
  const {
    supaUser, isLoggedIn, authLoading,
    page, setPage,
    detailWord, setDetailWord,
    unknownWord, setUnknownWord,
    selectedSentence,
    generatedWords, dbWordData, detailLoading,
    navForward, goBack, goForward, resetNav,
    handleWordTap,
  } = useAppContext();

  const navItems = [
    { key: "home", label: "首页", icon: Logo },
    { key: "words", label: "单词本", icon: PalmLeafBook },
    { key: "learn", label: "学习", icon: LotusLamp },
    { key: "me", label: "我的", icon: BuddhaHead },
  ];
  const pageTitles = { home: "词笺", words: "单词本", learn: "学习", me: "我的" };
  const PageIcon = { home: Logo, words: PalmLeafBook, learn: LotusLamp, me: BuddhaHead }[page];

  if (authLoading) {
    return (
      <div style={{ maxWidth: 430, margin: "0 auto", height: "100vh", background: "var(--c-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <div style={{ width: 32, height: 32, border: `3px solid ${"var(--c-p200)"}`, borderTopColor: "var(--c-teal)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <span style={{ fontSize: 13, color: "var(--c-s500)" }}>{"加载中..."}</span>
      </div>
    );
  }

  if (!isLoggedIn) return <LoginPage />;

  /* ── Unknown word page ── */
  if (unknownWord) {
    return (
      <div style={{ maxWidth: 430, margin: "0 auto", height: "100vh", background: "var(--c-bg)", fontFamily: "var(--zh-font), var(--th-font), sans-serif", color: "var(--c-p800)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ height: 44, background: "var(--c-bg)", flexShrink: 0 }} />
        <div style={{ padding: "4px 20px 6px", display: "flex", alignItems: "center", gap: 10 }}>
          <div onClick={goBack} style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 10, background: "var(--c-p100)", flexShrink: 0 }}>
            <ChevronLeft size={18} strokeWidth={IW} color={"var(--c-p700)"} />
          </div>
          {navForward.length > 0 && (
            <div onClick={goForward} style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 10, background: "var(--c-p100)", flexShrink: 0 }}>
              <ChevronRight size={18} strokeWidth={IW} color={"var(--c-p700)"} />
            </div>
          )}
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--c-p800)", margin: 0, fontFamily: "var(--zh-font), serif", flex: 1 }}>{"未知词条"}</h1>
        </div>
        <div style={{ flex: 1, overflow: "auto" }}>
          <UnknownWordPage word={unknownWord} />
        </div>
      </div>
    );
  }

  /* ── Sentence detail ── */
  if (selectedSentence) return <SentenceDetail />;

  /* ── Word detail ── */
  if (detailWord) {
    const wd = dbWordData[detailWord] || generatedWords[detailWord] || null;
    return (
      <div style={{ maxWidth: 430, margin: "0 auto", height: "100vh", background: "var(--c-bg)", fontFamily: "var(--zh-font), var(--th-font), sans-serif", color: "var(--c-p800)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ height: 44, background: "var(--c-bg)", flexShrink: 0 }} />
        <div style={{ padding: "4px 20px 6px", display: "flex", alignItems: "center", gap: 10 }}>
          <div onClick={goBack} style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 10, background: "var(--c-p100)", flexShrink: 0 }}>
            <ChevronLeft size={18} strokeWidth={IW} color={"var(--c-p700)"} />
          </div>
          {navForward.length > 0 && (
            <div onClick={goForward} style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 10, background: "var(--c-p100)", flexShrink: 0 }}>
              <ChevronRight size={18} strokeWidth={IW} color={"var(--c-p700)"} />
            </div>
          )}
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--c-p800)", margin: 0, fontFamily: "var(--zh-font), serif", flex: 1 }}>{"词条详情"}</h1>
        </div>
        <div style={{ flex: 1, overflow: "auto" }}>
          <WordDetailPage wordData={wd} />
        </div>
      </div>
    );
  }

  /* ── Main layout ── */
  return (
    <div style={{ maxWidth: 430, margin: "0 auto", height: "100vh", background: "var(--c-bg)", fontFamily: "var(--zh-font), var(--th-font), sans-serif", color: "var(--c-p800)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ height: 44, background: "var(--c-bg)", flexShrink: 0 }} />
      <div style={{ padding: "4px 20px 7px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <PageIcon size={26} color={"var(--c-p600)"} />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--c-p800)", margin: 0, fontFamily: "var(--zh-font), serif" }}>{pageTitles[page]}</h1>
        </div>
      </div>
      <div style={{ flex: 1, overflow: "auto", position: "relative" }}>
        {detailLoading && (
          <div style={{ position: "absolute", inset: 0, zIndex: 50, background: "rgba(250,247,244,0.85)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
            <div style={{ width: 32, height: 32, border: `3px solid ${"var(--c-p200)"}`, borderTopColor: "var(--c-teal)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <span style={{ fontSize: 13, color: "var(--c-s500)" }}>{"查询词库中..."}</span>
          </div>
        )}
        {page === "home" && <HomePage />}
        {page === "words" && <WordBookPage />}
        {page === "learn" && <LearnPage />}
        {page === "me" && <ProfilePage />}
      </div>
      <nav style={{ display: "flex", background: "var(--c-surface)", borderTop: `1px solid ${"var(--c-p100)"}`, paddingBottom: 20, paddingTop: 8, flexShrink: 0 }}>
        {navItems.map(item => (
          <div key={item.key} onClick={() => { resetNav(); setPage(item.key); }}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", transition: "all 0.2s" }}>
            <item.icon size={22} strokeWidth={IW} color={page === item.key ? "var(--c-p600)" : "var(--c-s300)"} />
            <span style={{ fontSize: 11, fontWeight: page === item.key ? 600 : 400, color: page === item.key ? "var(--c-p700)" : "var(--c-s300)" }}>{item.label}</span>
          </div>
        ))}
      </nav>
    </div>
  );
}
