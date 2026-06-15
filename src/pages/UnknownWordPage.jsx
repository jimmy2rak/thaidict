import { useState } from "react";
import { Sparkles, ChevronRight } from "lucide-react";
import { isSupabaseConfigured, submitWord } from "../lib/supabase.js";
import { Card } from "../components/UIComponents";
import { useAppContext } from "../context/AppContext";

const IW = 1.5;

const UnknownWordPage = ({ word }) => {
  const { handleGenerated, resetNav, setDetailWord } = useAppContext();

  const onNavigateToDetail = (w) => { resetNav(); setDetailWord(w); };

  const [step, setStep] = useState("input"); // "input" | "generating" | "preview"
  const [thaiWord, setThaiWord] = useState(word || "");
  const [zhHint, setZhHint] = useState("");
  const [generating, setGenerating] = useState(false);

  const handleConfirmWord = async () => {
    if (!thaiWord.trim()) return;
    setGenerating(true);
    setStep("generating");
    if (isSupabaseConfigured) {
      submitWord(thaiWord.trim(), zhHint.trim()).catch(err => console.error("[submitWord]", err));
    }
    try {
      await handleGenerated(thaiWord.trim(), zhHint.trim());
    } catch (err) {
      console.error("[handleConfirmWord] generation failed:", err);
    }
    setGenerating(false);
    setStep("preview");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 16px 16px" }}>
      <Card style={{ padding: 16, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>{"🔍"}</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--c-p800)", marginBottom: 4 }}>{"未找到该词"}</div>
        <div style={{ fontSize: 12, color: "var(--c-s500)", marginBottom: 16 }}>{"词库中暂无此词条，可通过 AI 自动生成词条信息"}</div>

        {/* Step 1: Input / confirm word */}
        {step === "input" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 12, color: "var(--c-s500)", marginBottom: 6, fontWeight: 500 }}>{"泰语词语"}</div>
              <input
                value={thaiWord}
                onChange={e => setThaiWord(e.target.value)}
                placeholder="请输入完整的泰语词语"
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: 10,
                  border: `1.5px solid ${"var(--c-p200)"}`, background: "var(--c-surface)",
                  fontSize: 18, fontWeight: 600, color: "var(--c-teal)",
                  fontFamily: "var(--th-font), sans-serif", outline: "none",
                  textAlign: "center", boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 12, color: "var(--c-s500)", marginBottom: 6, fontWeight: 500 }}>{"中文提示（选填）"}</div>
              <input
                value={zhHint}
                onChange={e => setZhHint(e.target.value)}
                placeholder="如有已知中文意思可填入，帮助AI更准确生成"
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10,
                  border: `1.5px solid ${"var(--c-p200)"}`, background: "var(--c-surface)",
                  fontSize: 14, color: "var(--c-p800)",
                  fontFamily: "var(--zh-font), sans-serif", outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div onClick={thaiWord.trim() ? handleConfirmWord : undefined} style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "12px 24px", borderRadius: 12, fontSize: 14, fontWeight: 600,
              background: thaiWord.trim() ? "var(--c-teal)" : "var(--c-p100)",
              color: thaiWord.trim() ? "#fff" : "var(--c-s400)",
              cursor: thaiWord.trim() ? "pointer" : "default",
              fontFamily: "var(--zh-font), sans-serif", marginTop: 4,
            }}>
              <Sparkles size={14} strokeWidth={IW} />
              {"通过 AI 新增词条信息"}
            </div>
          </div>
        )}

        {/* Step 2: Generating */}
        {step === "generating" && (
          <div style={{ padding: "20px 0" }}>
            <div style={{ width: 32, height: 32, border: `3px solid ${"var(--c-p200)"}`, borderTopColor: "var(--c-teal)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
            <div style={{ fontSize: 14, color: "var(--c-s500)" }}>{"AI 正在生成词条内容..."}</div>
          </div>
        )}

        {/* Step 3: Preview generated */}
        {step === "preview" && (
          <div style={{ padding: "12px 0" }}>
            <div style={{ fontSize: 14, color: "var(--c-ok)", fontWeight: 600, marginBottom: 8 }}>{"✓ 词条已生成"}</div>
            <div style={{ fontSize: 12, color: "var(--c-s500)", marginBottom: 16 }}>{"AI 已生成词条数据，可跳转查看详情"}</div>
            <div onClick={() => { onNavigateToDetail(thaiWord.trim()); }} style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "10px 24px", borderRadius: 12, fontSize: 14, fontWeight: 600,
              background: "var(--c-teal)", color: "#fff", cursor: "pointer",
              fontFamily: "var(--zh-font), sans-serif",
            }}>
              {"跳转到词条详情"}
              <ChevronRight size={14} strokeWidth={IW} color={"#fff"} />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default UnknownWordPage;
