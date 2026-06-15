import { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import { Card, TtsPlay, WordTokenSpan, TooltipDismissOverlay, Badge } from "./UIComponents";
import { ChevronLeft, ChevronRight, Sparkles, Tag } from "lucide-react";
import { thaiSegment } from "../utils/thaiSegment";

const IW = 1.5;

const SentenceDetail = ({ phrase, onBack }) => {
  const { handleWordTap } = useAppContext();
  const [wordTip, setWordTip] = useState(null);
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

          {/* Card 1: Sentence text — matches PhraseDetailSection's first card */}
          <Card style={{ padding: 16, background: `linear-gradient(135deg, ${`color-mix(in srgb, var(--c-teal) 3%, transparent)`}, ${`color-mix(in srgb, var(--c-gold) 2%, transparent)`})`, border: `1px solid ${`color-mix(in srgb, var(--c-teal) 9%, transparent)`}` }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--c-p900)", fontFamily: "var(--th-font), serif", lineHeight: 1.5, flex: 1 }}>
                {sp.text}
              </div>
              <TtsPlay text={sp.text} size={16} />
            </div>
            <div style={{ fontSize: 14, color: "var(--c-p600)", lineHeight: 1.5 }}>
              {sp.zh || sp.actual_meaning || sp.literal_meaning || ''}
            </div>
          </Card>

          {/* Card 2: Word-by-word analysis — matches PhraseDetailSection */}
          {spSegmented.length > 0 && (
            <Card style={{ padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)", marginBottom: 14, fontFamily: "var(--zh-font), serif" }}>{"逐词分析"}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {spSegmented.map((seg, i) => (
                  <div key={i}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0" }}>
                      <WordTokenSpan seg={seg} tipId={`sd-${i}`} activeTip={wordTip} onTipChange={setWordTip} onDetail={handleWordTap} bgColor="var(--c-surface)" />
                      {seg.pos && (
                        <span style={{ fontSize: 11, color: "var(--c-s300)", fontStyle: "italic", minWidth: 32 }}>{seg.pos}</span>
                      )}
                      <span style={{ fontSize: 13, color: "var(--c-p700)", flex: 1 }}>{seg.meaning}</span>
                      <ChevronRight size={13} strokeWidth={IW} color={"var(--c-s300)"} />
                    </div>
                    {i < spSegmented.length - 1 && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "0 0 0 4px" }}>
                        <span style={{ fontSize: 12, color: "var(--c-s300)" }}>+</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {/* Combined gloss */}
              <div style={{
                marginTop: 12, padding: "10px 14px", borderRadius: 10,
                background: "var(--c-surfaceAlt)", border: `1px solid ${"var(--c-p100)"}`,
                fontSize: 13, color: "var(--c-p700)", lineHeight: 1.6,
              }}>
                {spSegmented.map((s, i) => (
                  <span key={i}>
                    <span style={{ fontWeight: 600, color: "var(--c-p800)" }}>{s.text}</span>
                    <span style={{ color: "var(--c-s500)" }}>({s.meaning})</span>
                    {i < spSegmented.length - 1 && <span style={{ color: "var(--c-s300)" }}> + </span>}
                  </span>
                ))}
              </div>
              <TooltipDismissOverlay active={wordTip} onDismiss={() => setWordTip(null)} />
            </Card>
          )}

          {/* Card 3: Idiom literal vs actual — matches PhraseDetailSection */}
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

          {/* Card 4: Learner tip — matches PhraseDetailSection */}
          {(sp.learner_tip || sp.tip) && (
            <Card style={{ padding: 16, background: "color-mix(in srgb, var(--c-info) 2%, transparent)", border: `1px solid ${`color-mix(in srgb, var(--c-info) 9%, transparent)`}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: `linear-gradient(135deg, ${"var(--c-info)"}, ${"var(--c-teal)"})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Sparkles size={13} strokeWidth={IW} color="#fff" />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-p800)" }}>{"学习者建议"}</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--c-p700)", lineHeight: 1.7 }}>{sp.learner_tip || sp.tip}</div>
            </Card>
          )}

          {/* Card 5: Tags — new fixed card from database */}
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
    </div>
  );
};

export default SentenceDetail;
