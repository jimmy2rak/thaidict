import { useAppContext, AppProvider } from "./context/AppContext.jsx";
import { useEffect, useState } from "react";
import { Logo, PalmLeafBook, LotusLamp, BuddhaHead } from "./icons/CulturalIcons.jsx";
import { Card } from "./components/UIComponents.jsx";
import { ChevronLeft, ChevronRight } from "lucide-react";

import HomePage from "./pages/HomePage.jsx";
import WordBookPage from "./pages/WordBookPage.jsx";
import WordDetailPage from "./pages/WordDetailPage.jsx";
import UnknownWordPage from "./pages/UnknownWordPage.jsx";
import LearnPage from "./pages/LearnPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import SentenceDetail from "./components/SentenceDetail.jsx";

const IW = 1.5;

/* ── Main App ── */
export default function App() {
  const {
    supaUser, isLoggedIn, authLoading,
    page, setPage, visitedPages,
    detailWord, setDetailWord,
    unknownWord, setUnknownWord,
    selectedSentence, setSelectedSentence,
    generatedWords, dbWordData, detailLoading,
    navForward, goBack, goForward, resetNav,
    handleWordTap,
  } = useAppContext();

  // Auth page state: "login" | "reset-password"
  const [authPage, setAuthPage] = useState("login");

  /* ── Dynamic viewport height for bottom address bar adaptation ── */
  useEffect(() => {
    const setAppHeight = () => {
      document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
    };
    setAppHeight();
    window.addEventListener('resize', setAppHeight);
    window.addEventListener('orientationchange', setAppHeight);
    return () => {
      window.removeEventListener('resize', setAppHeight);
      window.removeEventListener('orientationchange', setAppHeight);
    };
  }, []);

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
      <div style={{ maxWidth: 430, margin: "0 auto", height: "var(--app-height, 100dvh)", background: "var(--c-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <div style={{ width: 32, height: 32, border: `3px solid ${"var(--c-p200)"}`, borderTopColor: "var(--c-teal)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <span style={{ fontSize: 13, color: "var(--c-s500)" }}>{"加载中..."}</span>
      </div>
    );
  }

  if (!isLoggedIn) {
    if (authPage === "reset-password") {
      return <ResetPasswordPage onNavigate={(page) => setAuthPage(page)} />;
    }
    return <LoginPage onNavigate={(page) => setAuthPage(page)} />;
  }

  const hasOverlay = !!unknownWord || !!detailWord || !!selectedSentence;

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", height: "var(--app-height, 100dvh)", background: "var(--c-bg)", fontFamily: "var(--zh-font), var(--th-font), sans-serif", color: "var(--c-p800)", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
      {/* ── Main layout: always rendered ── */}
      <div style={{ height: 15, background: "var(--c-bg)", flexShrink: 0 }} />
      <div style={{ padding: "4px 20px 7px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, position: "sticky", top: 0, zIndex: 10, background: "var(--c-bg)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <PageIcon size={26} color={"var(--c-p600)"} />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--c-p800)", margin: 0, fontFamily: "var(--zh-font), serif" }}>{pageTitles[page]}</h1>
        </div>
      </div>
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {detailLoading && !hasOverlay && (
          <div style={{ position: "absolute", inset: 0, zIndex: 50, background: "rgba(250,247,244,0.85)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
            <div style={{ width: 32, height: 32, border: `3px solid ${"var(--c-p200)"}`, borderTopColor: "var(--c-teal)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <span style={{ fontSize: 13, color: "var(--c-s500)" }}>{"查询词库中..."}</span>
          </div>
        )}
        {visitedPages.has("home") && <div style={{ position: "absolute", inset: 0, overflow: "auto", display: page === "home" ? "block" : "none" }}><HomePage /></div>}
        {visitedPages.has("words") && <div style={{ position: "absolute", inset: 0, overflow: "auto", display: page === "words" ? "block" : "none" }}><WordBookPage /></div>}
        {visitedPages.has("learn") && <div style={{ position: "absolute", inset: 0, overflow: "auto", display: page === "learn" ? "block" : "none" }}><LearnPage /></div>}
        {visitedPages.has("me") && <div style={{ position: "absolute", inset: 0, overflow: "auto", display: page === "me" ? "block" : "none" }}><ProfilePage /></div>}
      </div>
      <nav style={{ display: "flex", background: "var(--c-surface)", borderTop: `1px solid ${"var(--c-p100)"}`, paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))", paddingTop: 8, flexShrink: 0, position: "sticky", bottom: 0, zIndex: 10 }}>
        {navItems.map(item => (
          <div key={item.key} onClick={() => { resetNav(); setPage(item.key); }}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", transition: "all 0.2s" }}>
            <item.icon size={22} strokeWidth={IW} color={page === item.key ? "var(--c-p600)" : "var(--c-s300)"} />
            <span style={{ fontSize: 11, fontWeight: page === item.key ? 600 : 400, color: page === item.key ? "var(--c-p700)" : "var(--c-s300)" }}>{item.label}</span>
          </div>
        ))}
      </nav>

      {/* ── Overlay: Unknown word page ── */}
      {unknownWord && (
        <div style={{ position: "absolute", inset: 0, zIndex: 100, background: "var(--c-bg)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ height: 15, background: "var(--c-bg)", flexShrink: 0 }} />
          <div style={{ padding: "4px 20px 6px", display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, zIndex: 110, background: "var(--c-bg)" }}>
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
          <div key={unknownWord} style={{ flex: 1, overflow: "auto" }}>
            <UnknownWordPage word={unknownWord} />
          </div>
        </div>
      )}

      {/* ── Overlay: Sentence detail ── */}
      {selectedSentence && (
        <div style={{ position: "absolute", inset: 0, zIndex: 100 }}>
          <SentenceDetail phrase={selectedSentence} onBack={() => setSelectedSentence(null)} />
        </div>
      )}

      {/* ── Overlay: Word detail ── */}
      {detailWord && (() => {
        const wd = dbWordData[detailWord] || generatedWords[detailWord] || null;
        return (
          <div style={{ position: "absolute", inset: 0, zIndex: 100, background: "var(--c-bg)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ height: 15, background: "var(--c-bg)", flexShrink: 0 }} />
            <div style={{ padding: "4px 20px 6px", display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, zIndex: 110, background: "var(--c-bg)" }}>
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
            <div key={detailWord} style={{ flex: 1, overflow: "auto" }}>
              <WordDetailPage wordData={wd} />
            </div>
          </div>
        );
      })()}
    </div>
  );
}
