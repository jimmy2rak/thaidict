import { useState } from "react";
import { useAppContext } from "../context/AppContext";
import { Card } from "./UIComponents";
import { ChevronLeft, Play, Sparkles, ChevronRight } from "lucide-react";
import { speak } from "../utils/tts";

const IW = 1.5;

const SentenceDetail = ({ phrase, onBack }) => {
  const { handleWordTap } = useAppContext();
  const [tooltipWord, setTooltipWord] = useState(null);
  const sp = phrase;
  const spSegmented = Array.isArray(sp.segmented) ? sp.segmented : [];
  const isIdiom = sp.category === 'idioms';

  return (
    <div style={{
      maxWidth: 430, margin: "0 auto", height: "100vh",
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
        }}>{"\u53E5\u5B50\u8BE6\u60C5"}</h1>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 16px 16px" }}>

          {/* Thai sentence card */}
          <Card style={{
            padding: 16, background: "linear-gradient(135deg, var(--c-tealL) 0%, var(--c-surface) 100%)",
            border: `1px solid ${"var(--c-p100)"}`,
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <div style={{
                fontSize: 20, fontWeight: 700, color: "var(--c-p900)",
                fontFamily: "var(--th-font), serif", lineHeight: 1.8, flex: 1,
              }}>
                {spSegmented.length > 0 ? spSegmented.map((tok, i) => (
                  <span key={i} style={{ position: "relative", display: "inline" }}>
                    <span onClick={(e) => {
                      e.stopPropagation();
                      setTooltipWord(tooltipWord === i ? null : i);
                    }} style={{
                      cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dashed",
                      textUnderlineOffset: 3,
                    }}>{tok.text}</span>
                    {tooltipWord === i && (
                      <div onClick={(e) => e.stopPropagation()} style={{
                        position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
                        background: "var(--c-p800)", color: "#fff", padding: "6px 10px", borderRadius: 8,
                        fontSize: 11, whiteSpace: "nowrap", zIndex: 50, marginBottom: 4,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                      }}>
                        <span style={{ color: "var(--c-gold)", fontStyle: "italic", marginRight: 6 }}>{tok.pos}</span>
                        {tok.meaning}
                        <div onClick={(ev) => {
                          ev.stopPropagation();
                          setTooltipWord(null);
                          if (tok.text) handleWordTap(tok.text);
                        }} style={{
                          marginTop: 4, fontSize: 10, color: "var(--c-teal)", cursor: "pointer", textAlign: "center",
                        }}>{"\u67E5\u770B\u8BE6\u60C5 \u203A"}</div>
                      </div>
                    )}
                  </span>
                )) : <span>{sp.text}</span>}
              </div>
              <div onClick={() => speak(sp.text, "th-TH", 0.85)} style={{
                cursor: "pointer", display: "flex", alignItems: "center",
                flexShrink: 0, marginTop: 4,
              }}>
                <Play size={16} strokeWidth={IW} color={"var(--c-teal)"} fill={"var(--c-teal)"} />
              </div>
            </div>
            {sp.zh && (
              <div style={{ fontSize: 14, color: "var(--c-p700)", marginTop: 12, lineHeight: 1.6 }}>
                {sp.zh}
              </div>
            )}
          </Card>

          {/* Word-by-word analysis */}
          {spSegmented.length > 0 && (
            <Card style={{ padding: 16 }}>
              <div style={{
                fontSize: 14, fontWeight: 600, color: "var(--c-p800)",
                marginBottom: 14, fontFamily: "var(--zh-font), serif",
              }}>{"\u9010\u8BCD\u5206\u6790"}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {spSegmented.map((tok, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
                    }}>
                      <span onClick={(e) => {
                        e.stopPropagation();
                        setTooltipWord(tooltipWord === i ? null : i);
                      }} style={{
                        fontSize: 16, fontWeight: 600, color: "var(--c-teal)",
                        fontFamily: "var(--th-font), sans-serif", cursor: "pointer",
                        textDecoration: "underline", textDecorationStyle: "dashed",
                        textUnderlineOffset: 3,
                      }}>
                        {tok.text}
                      </span>
                      {tok.pos && (
                        <span style={{
                          fontSize: 10, padding: "2px 6px", borderRadius: 4,
                          background: "var(--c-p100)", color: "var(--c-p700)",
                        }}>{tok.pos}</span>
                      )}
                      {tok.meaning && (
                        <span style={{ fontSize: 13, color: "var(--c-p700)", flex: 1 }}>{tok.meaning}</span>
                      )}
                      {i < spSegmented.length - 1 && (
                        <span style={{ fontSize: 12, color: "var(--c-s300)", marginLeft: 4 }}>+</span>
                      )}
                    </div>

                    {/* Tooltip bubble */}
                    {tooltipWord === i && (
                      <div onClick={(e) => e.stopPropagation()} style={{
                        position: "absolute", top: "100%", left: 0, zIndex: 20,
                        background: "var(--c-surface)", borderRadius: 12,
                        padding: "10px 14px", boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                        border: `1px solid ${"var(--c-p100)"}`, minWidth: 160,
                        marginTop: 2,
                      }}>
                        <div style={{ fontSize: 11, color: "var(--c-s500)", marginBottom: 4 }}>
                          {tok.pos ? `${tok.pos} · ` : ""}{tok.meaning || ""}
                        </div>
                        <div onClick={() => {
                          setTooltipWord(null);
                          if (tok.text) handleWordTap(tok.text);
                        }} style={{
                          display: "flex", alignItems: "center", gap: 4,
                          fontSize: 12, fontWeight: 600, color: "var(--c-teal)",
                          cursor: "pointer",
                        }}>
                          {"\u67E5\u770B\u8BE6\u60C5"} <ChevronRight size={11} strokeWidth={IW} />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Idiom: literal vs actual — merged single card */}
          {isIdiom && sp.literal_meaning && sp.actual_meaning && (
            <Card style={{ padding: 16 }}>
              <div style={{
                fontSize: 14, fontWeight: 600, color: "var(--c-p800)",
                marginBottom: 12, fontFamily: "var(--zh-font), serif",
              }}>{"\u5B57\u9762\u610F\u4E49 vs \u5B9E\u9645\u610F\u4E49"}</div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{
                  flex: 1, padding: 12, borderRadius: 10,
                  background: "color-mix(in srgb, var(--c-gold) 7%, transparent)",
                  border: `1px solid ${"color-mix(in srgb, var(--c-gold) 15%, transparent)"}`,
                }}>
                  <div style={{
                    fontSize: 11, fontWeight: 600, color: "var(--c-gold)", marginBottom: 4,
                  }}>{"\u5B57\u9762\u610F\u4E49"}</div>
                  <div style={{ fontSize: 13, color: "var(--c-p700)", lineHeight: 1.6 }}>
                    {sp.literal_meaning}
                  </div>
                </div>
                <div style={{
                  flex: 1, padding: 12, borderRadius: 10,
                  background: "color-mix(in srgb, var(--c-teal) 7%, transparent)",
                  border: `1px solid ${"color-mix(in srgb, var(--c-teal) 15%, transparent)"}`,
                }}>
                  <div style={{
                    fontSize: 11, fontWeight: 600, color: "var(--c-teal)", marginBottom: 4,
                  }}>{"\u5B9E\u9645\u610F\u4E49"}</div>
                  <div style={{ fontSize: 13, color: "var(--c-p700)", lineHeight: 1.6 }}>
                    {sp.actual_meaning}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Non-idiom: single meaning */}
          {!isIdiom && (sp.actual_meaning || sp.literal_meaning) && (
            <Card style={{ padding: 16 }}>
              <div style={{ fontSize: 14, color: "var(--c-p700)", lineHeight: 1.7 }}>
                {sp.actual_meaning || sp.literal_meaning}
              </div>
            </Card>
          )}

          {/* Learner tip */}
          {sp.learner_tip && (
            <Card style={{
              padding: 16, background: "color-mix(in srgb, var(--c-info) 2%, transparent)",
              border: `1px solid ${"color-mix(in srgb, var(--c-info) 9%, transparent)"}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 7,
                  background: `linear-gradient(135deg, ${"var(--c-info)"}, ${"var(--c-teal)"})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Sparkles size={13} strokeWidth={IW} color="#fff" />
                </div>
                <span style={{
                  fontSize: 13, fontWeight: 600, color: "var(--c-p800)",
                }}>{"\u5B66\u4E60\u8005\u5EFA\u8BAE"}</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--c-p700)", lineHeight: 1.7 }}>
                {sp.learner_tip}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Tooltip dismiss overlay */}
      {tooltipWord !== null && (
        <div onClick={() => setTooltipWord(null)} style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 15,
        }} />
      )}
    </div>
  );
};

export default SentenceDetail;
