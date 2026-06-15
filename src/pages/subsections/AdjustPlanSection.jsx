import { useState, useEffect } from "react";
import { useAppContext } from "../../context/AppContext";
import { Card, Btn } from "../../components/UIComponents";
import {
  getLearningPlan, saveLearningPlan,
} from "../../lib/supabase.js";
import {
  BookOpen, PenTool, FileText, Volume2, Globe,
  Check, Plus, Minus, Sparkles,
} from "lucide-react";

const IW = 1.5;

const AdjustPlanSection = () => {
  const { userId, goBack } = useAppContext();
  const [level, setLevel] = useState("intermediate"); // beginner | intermediate | advanced
  const [goals, setGoals] = useState({ words: 30, grammar: 20, reading: 5, listening: 3, speaking: 2, writing: 2 });
  const [times, setTimes] = useState({ words: "30", grammar: "30", reading: "30", listening: "20", speaking: "15", writing: "20" });
  const [enabledSubjects, setEnabledSubjects] = useState({ words: true, grammar: true, reading: true, listening: false, speaking: false, writing: false });
  const [customFor, setCustomFor] = useState(null);
  const [customMin, setCustomMin] = useState("");
  const [activeDays, setActiveDays] = useState([true, true, false, true, true, false, true]);
  const [sessionTime, setSessionTime] = useState("morning"); // morning | afternoon | evening | flexible
  const [studyMethods, setStudyMethods] = useState(["flashcard", "quiz"]);
  const [reviewDay, setReviewDay] = useState(6); // 0=Mon ... 6=Sun, default Sunday
  const [dailyTotal, setDailyTotal] = useState(90); // total minutes per day
  const [savingPlan, setSavingPlan] = useState(false);
  const dayLabels = ["\u4E00", "\u4E8C", "\u4E09", "\u56DB", "\u4E94", "\u516D", "\u65E5"];

  // Load existing plan from Supabase
  useEffect(() => {
    if (!userId || userId === 'anonymous') return;
    getLearningPlan(userId).then(plan => {
      if (!plan) return;
      if (plan.goals) setGoals(prev => ({ ...prev, ...plan.goals }));
      if (plan.schedule) {
        if (plan.schedule.times) setTimes(prev => ({ ...prev, ...plan.schedule.times }));
        if (plan.schedule.activeDays) setActiveDays(plan.schedule.activeDays);
        if (plan.schedule.level) setLevel(plan.schedule.level);
        if (plan.schedule.sessionTime) setSessionTime(plan.schedule.sessionTime);
        if (plan.schedule.studyMethods) setStudyMethods(plan.schedule.studyMethods);
        if (plan.schedule.reviewDay !== undefined) setReviewDay(plan.schedule.reviewDay);
        if (plan.schedule.dailyTotal) setDailyTotal(plan.schedule.dailyTotal);
        if (plan.schedule.enabledSubjects) setEnabledSubjects(prev => ({ ...prev, ...plan.schedule.enabledSubjects }));
      }
    });
  }, [userId]);

  const handleSavePlan = async () => {
    if (!userId || userId === 'anonymous') { goBack && goBack(); return; }
    setSavingPlan(true);
    const schedule = { times, activeDays, level, sessionTime, studyMethods, reviewDay, dailyTotal, enabledSubjects };
    try {
      await saveLearningPlan(userId, goals, schedule);
    } catch (e) {
      console.error("[saveLearningPlan]", e);
    }
    setSavingPlan(false);
    goBack && goBack();
  };

  const toggleDay = (i) => {
    const next = [...activeDays];
    next[i] = !next[i];
    setActiveDays(next);
  };

  const toggleMethod = (m) => {
    setStudyMethods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  const toggleSubject = (key) => {
    setEnabledSubjects(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const levels = [
    { key: "beginner", label: "初级", desc: "零基础~N3", color: "var(--c-ok)" },
    { key: "intermediate", label: "中级", desc: "N3~N1", color: "var(--c-teal)" },
    { key: "advanced", label: "高级", desc: "N1+", color: "var(--c-rose)" },
  ];

  const sessions = [
    { key: "morning", label: "早晨", icon: "\uD83C\uDF05", desc: "6:00-12:00" },
    { key: "afternoon", label: "下午", icon: "\u2600\uFE0F", desc: "12:00-18:00" },
    { key: "evening", label: "晚上", icon: "\uD83C\uDF19", desc: "18:00-23:00" },
    { key: "flexible", label: "灵活", icon: "\u23F0", desc: "随时学习" },
  ];

  const methods = [
    { key: "flashcard", label: "闪卡复习", desc: "快速记忆词汇" },
    { key: "quiz", label: "选择题测验", desc: "测试掌握程度" },
    { key: "reading", label: "阅读理解", desc: "语境中学习" },
    { key: "listening", label: "听力练习", desc: "提升听力能力" },
    { key: "writing", label: "造句练习", desc: "主动输出训练" },
    { key: "conversation", label: "情景对话", desc: "模拟真实对话" },
  ];

  const subjects = [
    { key: "words", label: "单词", goalLabel: "目标词汇量", unit: "词/天", icon: BookOpen, color: "var(--c-teal)", min: 5, max: 100, step: 5 },
    { key: "grammar", label: "语法", goalLabel: "目标语法量", unit: "条/天", icon: PenTool, color: "var(--c-gold)", min: 2, max: 50, step: 2 },
    { key: "reading", label: "阅读", goalLabel: "目标阅读量", unit: "篇/天", icon: FileText, color: "var(--c-rose)", min: 1, max: 20, step: 1 },
    { key: "listening", label: "听力", goalLabel: "目标听力量", unit: "段/天", icon: Volume2, color: "var(--c-info)", min: 1, max: 15, step: 1 },
    { key: "speaking", label: "口语", goalLabel: "目标口语量", unit: "组/天", icon: Globe, color: "var(--c-amber)", min: 1, max: 10, step: 1 },
    { key: "writing", label: "写作", goalLabel: "目标写作量", unit: "篇/天", icon: PenTool, color: "var(--c-err)", min: 1, max: 10, step: 1 },
  ];

  const SubjectCard = ({ s }) => {
    const goal = goals[s.key];
    const time = times[s.key];
    const enabled = enabledSubjects[s.key];
    const pct = ((goal - s.min) / (s.max - s.min)) * 100;
    return (
      <Card style={{ padding: 16, opacity: enabled ? 1 : 0.5 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: enabled ? 14 : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: `${s.color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <s.icon size={15} strokeWidth={IW} color={s.color} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--c-p800)" }}>{s.label}</span>
          </div>
          {/* Enable/disable toggle */}
          <div onClick={() => toggleSubject(s.key)} style={{
            width: 40, height: 22, borderRadius: 11, padding: 2,
            background: enabled ? s.color : "var(--c-p200)",
            cursor: "pointer", transition: "all 0.2s",
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: "50%", background: "#fff",
              transform: enabled ? "translateX(18px)" : "translateX(0)",
              transition: "transform 0.2s",
            }} />
          </div>
        </div>
        {enabled && (<>
          {/* Study time */}
          <div style={{ fontSize: 12, color: "var(--c-s500)", marginBottom: 8 }}>{"学习时长"}</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {["15", "30", "45"].map(m => (
              <button key={m} onClick={() => setTimes(p => ({ ...p, [s.key]: m }))} style={{
                flex: 1, padding: "7px 0", borderRadius: 8,
                border: time === m ? `1.5px solid ${s.color}` : `1px solid ${"var(--c-p200)"}`,
                background: time === m ? s.color + "12" : "var(--c-surface)",
                color: time === m ? "var(--c-p800)" : "var(--c-s500)",
                fontSize: 12, fontWeight: time === m ? 600 : 400,
                cursor: "pointer", fontFamily: "var(--zh-font), sans-serif",
              }}>{m}{"分钟"}</button>
            ))}
            <button onClick={() => { setCustomFor(s.key); setCustomMin(""); }} style={{
              flex: 1, padding: "7px 0", borderRadius: 8,
              border: !["15","30","45"].includes(time) ? `1.5px solid ${s.color}` : `1px solid ${"var(--c-p200)"}`,
              background: !["15","30","45"].includes(time) ? s.color + "12" : "var(--c-surface)",
              color: !["15","30","45"].includes(time) ? "var(--c-p800)" : "var(--c-s500)",
              fontSize: 12, fontWeight: !["15","30","45"].includes(time) ? 600 : 400,
              cursor: "pointer", fontFamily: "var(--zh-font), sans-serif",
            }}>
              {!["15","30","45"].includes(time) ? `${time}分钟` : "自定义"}
            </button>
          </div>
          {/* Goal */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "var(--c-s500)" }}>{s.goalLabel}{"："}</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{goal}</span>
            <span style={{ fontSize: 11, color: "var(--c-s300)" }}>{s.unit}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 9, color: "var(--c-s300)" }}>{s.min}</span>
            <div style={{ flex: 1, height: 5, borderRadius: 3, background: "var(--c-p100)", overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: s.color, transition: "width 0.3s ease" }} />
            </div>
            <span style={{ fontSize: 9, color: "var(--c-s300)" }}>{s.max}</span>
            <div onClick={() => setGoals(p => ({ ...p, [s.key]: Math.max(s.min, goal - s.step) }))} style={{
              width: 26, height: 26, borderRadius: "50%", background: "var(--c-p50)",
              border: `1px solid ${"var(--c-p200)"}`, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexShrink: 0,
            }}>
              <Minus size={13} strokeWidth={IW} color={"var(--c-p600)"} />
            </div>
            <div onClick={() => setGoals(p => ({ ...p, [s.key]: Math.min(s.max, goal + s.step) }))} style={{
              width: 26, height: 26, borderRadius: "50%", background: "var(--c-p50)",
              border: `1px solid ${"var(--c-p200)"}`, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexShrink: 0,
            }}>
              <Plus size={13} strokeWidth={IW} color={"var(--c-p600)"} />
            </div>
          </div>
        </>)}
      </Card>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "0 16px 16px" }}>

      {/* ── Section 1: Level ── */}
      <Card style={{ padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)", marginBottom: 12 }}>{"当前水平"}</div>
        <div style={{ display: "flex", gap: 8 }}>
          {levels.map(l => (
            <div key={l.key} onClick={() => setLevel(l.key)} style={{
              flex: 1, padding: "10px 8px", borderRadius: 10, textAlign: "center",
              border: level === l.key ? `1.5px solid ${l.color}` : `1px solid ${"var(--c-p200)"}`,
              background: level === l.key ? `${l.color}12` : "var(--c-surface)",
              cursor: "pointer",
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: level === l.key ? l.color : "var(--c-s500)" }}>{l.label}</div>
              <div style={{ fontSize: 10, color: "var(--c-s400)", marginTop: 2 }}>{l.desc}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Section 2: Learning Modules ── */}
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--c-p800)", marginBottom: 10, padding: "0 2px" }}>{"学习模块"}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {subjects.map(s => <SubjectCard key={s.key} s={s} />)}
        </div>
      </div>

      {/* ── Section 3: Schedule ── */}
      <Card style={{ padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)", marginBottom: 14 }}>{"学习日程"}</div>
        {/* Days */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          {dayLabels.map((d, i) => (
            <div key={i} onClick={() => toggleDay(i)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <span style={{ fontSize: 11, color: activeDays[i] ? "var(--c-p700)" : "var(--c-s300)", fontWeight: 500 }}>{d}</span>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: activeDays[i] ? "var(--c-p600)" : "var(--c-p50)",
                border: activeDays[i] ? "none" : `1.5px solid ${"var(--c-p200)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s",
              }}>
                {activeDays[i] ? <Check size={16} strokeWidth={IW} color="#fff" /> : <span style={{ fontSize: 11, color: "var(--c-s300)" }}>{i + 1}</span>}
              </div>
            </div>
          ))}
        </div>
        {/* Daily total time */}
        <div style={{ fontSize: 12, color: "var(--c-s500)", marginBottom: 8 }}>{"每日总时长上限"}</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {[60, 90, 120, 150].map(m => (
            <button key={m} onClick={() => setDailyTotal(m)} style={{
              flex: 1, padding: "8px 0", borderRadius: 8,
              border: dailyTotal === m ? `1.5px solid ${"var(--c-teal)"}` : `1px solid ${"var(--c-p200)"}`,
              background: dailyTotal === m ? "color-mix(in srgb, var(--c-teal) 10%, transparent)" : "var(--c-surface)",
              color: dailyTotal === m ? "var(--c-p800)" : "var(--c-s500)",
              fontSize: 12, fontWeight: dailyTotal === m ? 600 : 400,
              cursor: "pointer", fontFamily: "var(--zh-font), sans-serif",
            }}>{m}分钟</button>
          ))}
        </div>
        {/* Session preference */}
        <div style={{ fontSize: 12, color: "var(--c-s500)", marginBottom: 8 }}>{"偏好学习时段"}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {sessions.map(s => (
            <div key={s.key} onClick={() => setSessionTime(s.key)} style={{
              padding: "10px 12px", borderRadius: 10, display: "flex", alignItems: "center", gap: 8,
              border: sessionTime === s.key ? `1.5px solid ${"var(--c-teal)"}` : `1px solid ${"var(--c-p200)"}`,
              background: sessionTime === s.key ? "color-mix(in srgb, var(--c-teal) 8%, transparent)" : "var(--c-surface)",
              cursor: "pointer",
            }}>
              <span style={{ fontSize: 18 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: sessionTime === s.key ? "var(--c-p800)" : "var(--c-s500)" }}>{s.label}</div>
                <div style={{ fontSize: 10, color: "var(--c-s400)" }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
        {/* Review day */}
        <div style={{ fontSize: 12, color: "var(--c-s500)", marginTop: 16, marginBottom: 8 }}>{"每周复习日"}</div>
        <div style={{ display: "flex", gap: 6 }}>
          {dayLabels.map((d, i) => (
            <div key={i} onClick={() => setReviewDay(i)} style={{
              flex: 1, padding: "8px 0", borderRadius: 8, textAlign: "center",
              border: reviewDay === i ? `1.5px solid ${"var(--c-gold)"}` : `1px solid ${"var(--c-p200)"}`,
              background: reviewDay === i ? "color-mix(in srgb, var(--c-gold) 12%, transparent)" : "var(--c-surface)",
              cursor: "pointer", fontSize: 12, fontWeight: reviewDay === i ? 600 : 400,
              color: reviewDay === i ? "var(--c-p800)" : "var(--c-s500)",
            }}>{d}</div>
          ))}
        </div>
      </Card>

      {/* ── Section 4: Study Methods ── */}
      <Card style={{ padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)", marginBottom: 4 }}>{"学习方式"}</div>
        <div style={{ fontSize: 12, color: "var(--c-s500)", marginBottom: 12 }}>{"选择你偏好的学习方法（可多选）"}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {methods.map(m => {
            const active = studyMethods.includes(m.key);
            return (
              <div key={m.key} onClick={() => toggleMethod(m.key)} style={{
                padding: "10px 12px", borderRadius: 10,
                border: active ? `1.5px solid ${"var(--c-teal)"}` : `1px solid ${"var(--c-p200)"}`,
                background: active ? "color-mix(in srgb, var(--c-teal) 8%, transparent)" : "var(--c-surface)",
                cursor: "pointer", position: "relative",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: active ? "var(--c-p800)" : "var(--c-s500)" }}>{m.label}</div>
                  {active && <Check size={14} strokeWidth={2} color={"var(--c-teal)"} />}
                </div>
                <div style={{ fontSize: 10, color: "var(--c-s400)", marginTop: 2 }}>{m.desc}</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── Save button ── */}
      <Btn variant="primary" icon={Sparkles} onClick={handleSavePlan} style={{ width: "100%", padding: "14px 0", borderRadius: 12, marginTop: 4, opacity: savingPlan ? 0.6 : 1 }}>
        {savingPlan ? "保存中..." : "保存并重新生成计划"}
      </Btn>

      {/* Custom minutes modal */}
      {customFor && (
        <div onClick={() => setCustomFor(null)} style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.4)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "var(--c-surface)", maxWidth: 300, width: "85%",
            borderRadius: 16, padding: 24,
          }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--c-p800)", marginBottom: 16 }}>{"自定义学习时长"}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="number" value={customMin} onChange={e => setCustomMin(e.target.value.replace(/\D/g, ""))}
                placeholder=""
                style={{
                  flex: 1, padding: "10px 14px", borderRadius: 10,
                  border: `1.5px solid ${"var(--c-p200)"}`, background: "var(--c-surface)",
                  fontSize: 18, fontWeight: 600, color: "var(--c-p800)",
                  outline: "none", fontFamily: "var(--zh-font), sans-serif",
                  textAlign: "center",
                }}
              />
              <span style={{ fontSize: 15, color: "var(--c-s500)", fontWeight: 500 }}>{"分钟"}</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button onClick={() => setCustomFor(null)} style={{
                flex: 1, padding: "10px 0", borderRadius: 10,
                border: `1px solid ${"var(--c-p200)"}`, background: "var(--c-surface)",
                color: "var(--c-s500)", fontSize: 14, cursor: "pointer",
                fontFamily: "var(--zh-font), sans-serif",
              }}>{"取消"}</button>
              <button onClick={() => {
                const v = parseInt(customMin);
                if (v && v > 0) { setTimes(p => ({ ...p, [customFor]: String(v) })); }
                setCustomFor(null);
              }} style={{
                flex: 1, padding: "10px 0", borderRadius: 10,
                border: "none", background: "var(--c-p600)",
                color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
                fontFamily: "var(--zh-font), sans-serif",
              }}>{"确定"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdjustPlanSection;
