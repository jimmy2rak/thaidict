import { useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { Card } from "../../components/UIComponents";
import { morphExamples, grammarPatterns } from "../../data/mockData";

const IW = 1.5;

const MorphologySection = () => {
  useAppContext();
  const [tab, setTab] = useState("th");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 16px 16px" }}>
      <div style={{ display: "flex", gap: 6, background: "var(--c-surfaceAlt)", borderRadius: 12, padding: 4 }}>
        {[
          { key: "th", label: "\u6CF0\u8BED\u6784\u8BCD" },
          { key: "grammar", label: "\u8BED\u6CD5\u6A21\u5F0F" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: "8px 0", borderRadius: 10, border: "none", cursor: "pointer",
            background: tab === t.key ? "var(--c-surface)" : "transparent",
            color: tab === t.key ? "var(--c-p800)" : "var(--c-s500)",
            fontSize: 13, fontWeight: tab === t.key ? 600 : 400,
            boxShadow: tab === t.key ? "0 1px 3px rgba(61,43,31,0.08)" : "none",
            fontFamily: "var(--zh-font), sans-serif",
          }}>{t.label}</button>
        ))}
      </div>

      {tab === "th" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {morphExamples.map((m, i) => (
            <Card key={i} style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12, background: "color-mix(in srgb, var(--c-tealL) 38%, transparent)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, fontWeight: 700, color: "var(--c-teal)", fontFamily: "var(--th-font), serif",
                }}>{m.char}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)" }}>{m.meaning}</div>
                  <div style={{ fontSize: 11, color: "var(--c-s500)" }}>{"\u5E38\u89C1\u7EC4\u5408\u8BCD"}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {m.compounds.map((c, j) => (
                  <div key={j} style={{
                    padding: "6px 12px", borderRadius: 8, background: "var(--c-surfaceAlt)",
                    fontSize: 13, color: "var(--c-p700)", border: `1px solid ${"var(--c-p100)"}`,
                  }}>{c}</div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "grammar" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {grammarPatterns.map((g, i) => (
            <Card key={i} style={{ padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)", fontFamily: "monospace", marginBottom: 8, padding: "6px 12px", borderRadius: 8, background: "var(--c-surfaceAlt)" }}>{g.pattern}</div>
              <div style={{ fontSize: 14, color: "var(--c-teal)" }}>{g.example}</div>
              <div style={{ fontSize: 13, color: "var(--c-s500)", marginTop: 3 }}>{g.zh}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MorphologySection;
