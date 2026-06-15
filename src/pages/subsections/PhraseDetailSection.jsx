import { useAppContext } from "../../context/AppContext";
import { Card, TtsPlay } from "../../components/UIComponents";
import { ChevronRight, Sparkles } from "lucide-react";

const IW = 1.5;

const PhraseDetailSection = ({ phrase }) => {
  const { handleWordTap } = useAppContext();
  const isIdiom = phrase.literal && phrase.actual;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "0 16px 16px" }}>
      {/* Phrase text */}
      <Card style={{ padding: 16, background: `linear-gradient(135deg, ${`color-mix(in srgb, var(--c-teal) 3%, transparent)`}, ${`color-mix(in srgb, var(--c-gold) 2%, transparent)`})`, border: `1px solid ${`color-mix(in srgb, var(--c-teal) 9%, transparent)`}` }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--c-p900)", fontFamily: "var(--th-font), serif", lineHeight: 1.5, flex: 1 }}>
            {phrase.text}
          </div>
          <TtsPlay text={phrase.text} size={16} />
        </div>
        <div style={{ fontSize: 14, color: "var(--c-p600)", lineHeight: 1.5 }}>{phrase.zh}</div>
      </Card>

      {/* Word-by-word analysis */}
      <Card style={{ padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)", marginBottom: 14, fontFamily: "var(--zh-font), serif" }}>{"\u9010\u8BCD\u5206\u6790"}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {phrase.segmented.map((seg, i) => (
            <div key={i}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0" }}>
                <span onClick={() => handleWordTap(seg.text)} style={{
                  fontSize: 16, fontWeight: 600, color: "var(--c-teal)",
                  fontFamily: "var(--th-font), sans-serif",
                  cursor: "pointer", textDecoration: "underline",
                  textDecorationStyle: "dashed", textUnderlineOffset: 3,
                }}>{seg.text}</span>
                <span style={{ fontSize: 11, color: "var(--c-s300)", fontStyle: "italic", minWidth: 32 }}>{seg.pos}</span>
                <span style={{ fontSize: 13, color: "var(--c-p700)", flex: 1 }}>{seg.meaning}</span>
                <ChevronRight size={13} strokeWidth={IW} color={"var(--c-s300)"} />
              </div>
              {i < phrase.segmented.length - 1 && (
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
          {phrase.segmented.map((s, i) => (
            <span key={i}>
              <span style={{ fontWeight: 600, color: "var(--c-p800)" }}>{s.text}</span>
              <span style={{ color: "var(--c-s500)" }}>({s.meaning})</span>
              {i < phrase.segmented.length - 1 && <span style={{ color: "var(--c-s300)" }}> + </span>}
            </span>
          ))}
        </div>
      </Card>

      {/* Idiom: literal vs actual */}
      {isIdiom && (
        <Card style={{ padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)", marginBottom: 12, fontFamily: "var(--zh-font), serif" }}>{"\u5B57\u9762\u610F\u4E49 vs \u5B9E\u9645\u610F\u4E49"}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ padding: 12, borderRadius: 10, background: "color-mix(in srgb, var(--c-gold) 7%, transparent)", border: `1px solid ${`color-mix(in srgb, var(--c-gold) 15%, transparent)`}` }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-gold)", marginBottom: 4 }}>{"\u5B57\u9762\u610F\u4E49"}</div>
              <div style={{ fontSize: 13, color: "var(--c-p700)", lineHeight: 1.5 }}>{phrase.literal}</div>
            </div>
            <div style={{ padding: 12, borderRadius: 10, background: "color-mix(in srgb, var(--c-teal) 7%, transparent)", border: `1px solid ${`color-mix(in srgb, var(--c-teal) 15%, transparent)`}` }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-teal)", marginBottom: 4 }}>{"\u5B9E\u9645\u610F\u4E49"}</div>
              <div style={{ fontSize: 13, color: "var(--c-p700)", lineHeight: 1.5 }}>{phrase.actual}</div>
            </div>
          </div>
        </Card>
      )}

      {/* Learner tip */}
      {phrase.tip && (
        <Card style={{ padding: 16, background: "color-mix(in srgb, var(--c-info) 2%, transparent)", border: `1px solid ${`color-mix(in srgb, var(--c-info) 9%, transparent)`}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: `linear-gradient(135deg, ${"var(--c-info)"}, ${"var(--c-teal)"})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={13} strokeWidth={IW} color="#fff" />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-p800)" }}>{"\u5B66\u4E60\u8005\u5EFA\u8BAE"}</span>
          </div>
          <div style={{ fontSize: 13, color: "var(--c-p700)", lineHeight: 1.7 }}>{phrase.tip}</div>
        </Card>
      )}
    </div>
  );
};

export default PhraseDetailSection;
