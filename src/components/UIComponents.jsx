import { useState } from "react";
import { ChevronRight, Play, Pause } from "lucide-react";
import { speak, stopSpeak } from "../utils/tts";

const IW = 1.5;

/* ────────────────────────────────────────────
   REUSABLE UI COMPONENTS
   ──────────────────────────────────────────── */

export const Card = ({ children, style, onClick }) => (
  <div onClick={onClick} style={{
    background: "var(--c-surface)", borderRadius: 16, padding: 20,
    border: `1px solid ${"var(--c-p100)"}`, transition: "all 0.2s ease",
    cursor: onClick ? "pointer" : "default", ...style,
  }}>
    {children}
  </div>
);

export const Badge = ({ children, bg, fg, style }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", padding: "2px 10px",
    borderRadius: 20, fontSize: 11, fontWeight: 500,
    background: bg || "var(--c-p100)", color: fg || "var(--c-p700)", letterSpacing: "0.04em", ...style,
  }}>{children}</span>
);

export const Btn = ({ children, variant = "primary", icon: Icon, onClick, style }) => {
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
    padding: "10px 18px", borderRadius: 12, fontSize: 14, fontWeight: 500,
    cursor: "pointer", transition: "all 0.2s ease", border: "none",
    fontFamily: "var(--zh-font), sans-serif",
  };
  const variants = {
    primary: { background: "var(--c-p600)", color: "#fff" },
    secondary: { background: "var(--c-p50)", color: "var(--c-p700)", border: `1px solid ${"var(--c-p200)"}` },
    ghost: { background: "transparent", color: "var(--c-p600)" },
    gold: { background: "var(--c-gold)", color: "#fff" },
    amber: { background: "var(--c-amber)", color: "#fff" },
    teal: { background: "var(--c-teal)", color: "#fff" },
  };
  return (
    <button onClick={onClick} style={{ ...base, ...variants[variant], ...style }}>
      {Icon && <Icon size={16} strokeWidth={IW} />}
      {children}
    </button>
  );
};

export const SectionTitle = ({ children, action, onAction }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
    <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--c-p800)", margin: 0, fontFamily: "var(--zh-font), serif" }}>{children}</h2>
    {action && (
      <span onClick={onAction} style={{ fontSize: 12, color: "var(--c-p500)", cursor: "pointer", display: "flex", alignItems: "center", gap: 2 }}>
        {action} <ChevronRight size={14} strokeWidth={IW} />
      </span>
    )}
  </div>
);

export const ProgressBar = ({ value, max, color, height = 5 }) => (
  <div style={{ width: "100%", height, borderRadius: height, background: "var(--c-p100)", overflow: "hidden" }}>
    <div style={{ width: `${(value / max) * 100}%`, height: "100%", borderRadius: height, background: color || "var(--c-p500)", transition: "width 0.5s ease" }} />
  </div>
);

export const StatCard = ({ icon: Icon, label, value, sub, color }) => (
  <div style={{
    background: "var(--c-surface)", borderRadius: 12, padding: 12, flex: 1,
    border: `1px solid ${"var(--c-p100)"}`, display: "flex", flexDirection: "column", gap: 5,
    minWidth: 0,
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <div style={{ width: 28, height: 28, borderRadius: 7, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={14} strokeWidth={IW} color={color} />
      </div>
      <span style={{ fontSize: 10, color: "var(--c-s500)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
    </div>
    <div>
      <span style={{ fontSize: 20, fontWeight: 700, color: "var(--c-p800)" }}>{value}</span>
      {sub && <span style={{ fontSize: 10, color: "var(--c-s300)", marginLeft: 3 }}>{sub}</span>}
    </div>
  </div>
);

export const AudioBtn = ({ text, lang, label, color, rate }) => {
  const [speaking, setSpeaking] = useState(false);
  const handleClick = () => {
    if (speaking) { stopSpeak(); setSpeaking(false); return; }
    if (!text) return;
    const uttLang = lang || "th-TH";
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = uttLang;
    utt.rate = rate || 0.9;
    utt.onend = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utt);
  };
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20, background: "var(--c-p50)", border: `1px solid ${"var(--c-p100)"}`, cursor: "pointer" }}
      onClick={handleClick}>
      {speaking ? <Pause size={13} strokeWidth={IW} color={color || "var(--c-p600)"} /> : <Play size={13} strokeWidth={IW} color={color || "var(--c-p600)"} />}
      {label && <span style={{ fontSize: 12, color: color || "var(--c-p600)", fontWeight: 500 }}>{label}</span>}
    </div>
  );
};

/* Small inline TTS play button for examples */
export const TtsPlay = ({ text, lang = "th-TH", size = 12 }) => {
  const [speaking, setSpeaking] = useState(false);
  const handleClick = (e) => {
    e.stopPropagation();
    if (speaking) { stopSpeak(); setSpeaking(false); return; }
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = lang;
    utt.rate = 0.9;
    utt.onend = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utt);
  };
  return (
    <div onClick={handleClick} style={{ cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center" }}>
      {speaking ? <Pause size={size} strokeWidth={IW} color={"var(--c-p500)"} /> : <Play size={size} strokeWidth={IW} color={"var(--c-p500)"} />}
    </div>
  );
};

export const HeatCell = ({ level, size = 12 }) => {
  const colors = ["var(--c-p100)", "var(--c-tealL)", "var(--c-teal)", "var(--c-ok)", "var(--c-gold)"];
  return <div style={{ width: size, height: size, borderRadius: 3, background: colors[level] || "var(--c-p100)" }} />;
};

export const PageHeader = ({ title, subtitle }) => (
  <div style={{ padding: "16px 20px 12px" }}>
    <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--c-p800)", margin: 0, fontFamily: "var(--zh-font), serif" }}>{title}</h1>
    {subtitle && <p style={{ fontSize: 13, color: "var(--c-s500)", margin: "4px 0 0" }}>{subtitle}</p>}
  </div>
);
