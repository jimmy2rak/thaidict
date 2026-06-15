import { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import { Card, Btn, SectionTitle, ProgressBar } from "../components/UIComponents";
import { exercises } from "../data/mockData";
import {
  getLearningPlan, getNotes,
  getLearningProgress, updateDailyProgress,
} from "../lib/supabase.js";
import {
  ChevronLeft, ChevronRight, Calendar,
  Target, BookOpen, PenTool, Check,
  Plus, Sparkles, Globe, BarChart3,
} from "lucide-react";

import AdjustPlanSection from "./subsections/AdjustPlanSection";
import NotesDetailSection from "./subsections/NotesDetailSection";
import NoteEditorSection from "./subsections/NoteEditorSection";
import MorphologySection from "./subsections/MorphologySection";
import StatsSection from "./subsections/StatsSection";
import PhrasesSection from "./subsections/PhrasesSection";
import PhraseDetailSection from "./subsections/PhraseDetailSection";

const IW = 1.5;

const LearnPage = () => {
  const { userId, handleWordTap } = useAppContext();
  const [section, setSection] = useState("main");
  const [showAiInfo, setShowAiInfo] = useState(false);
  const [noteEditorFrom, setNoteEditorFrom] = useState("main");
  const [selectedPhrase, setSelectedPhrase] = useState(null);
  const [planData, setPlanData] = useState(null);
  const [notesData, setNotesData] = useState([]);
  const [todayTasks, setTodayTasks] = useState([
    { icon: Target, text: "\u590D\u4E60 20 \u4E2A\u65E7\u8BCD", done: false, color: "var(--c-teal)" },
    { icon: BookOpen, text: "\u5B66\u4E60 10 \u4E2A\u65B0\u8BCD", done: false, color: "var(--c-rose)" },
    { icon: BookOpen, text: "\u5B8C\u6210 1 \u7BC7\u9605\u8BFB\u7406\u89E3", done: false, color: "var(--c-gold)" },
    { icon: PenTool, text: "\u5B8C\u6210 5 \u9053\u9020\u53E5\u7EC3\u4E60", done: false, color: "var(--c-amber)" },
  ]);

  useEffect(() => {
    if (!userId || userId === 'anonymous') return;
    getLearningPlan(userId).then(setPlanData);
    getNotes(userId).then(setNotesData);
    // Load today's task progress
    const today = new Date().toISOString().split('T')[0];
    getLearningProgress(userId, 1).then(rows => {
      const todayRow = (rows || []).find(r => r.date === today);
      if (todayRow?.tasks_completed) {
        setTodayTasks(prev => prev.map((t, i) => ({
          ...t,
          done: todayRow.tasks_completed.includes(i),
        })));
      }
    });
  }, [userId]); // eslint-disable-line

  const toggleTask = async (idx) => {
    const next = todayTasks.map((t, i) => i === idx ? { ...t, done: !t.done } : t);
    setTodayTasks(next);
    // Save to Supabase
    if (userId && userId !== 'anonymous') {
      const doneIndices = next.filter(t => t.done).map((_, i) => i);
      const today = new Date().toISOString().split('T')[0];
      const allDone = doneIndices.length === next.length;
      try {
        await updateDailyProgress(userId, today, {
          tasks_completed: doneIndices,
          checked_in: allDone,
          streak_days: allDone ? undefined : 0,
        });
      } catch (e) {
        console.error("[toggleTask] save failed:", e);
      }
    }
  };

  /* ── Sub-page fixed header config ── */
  const subPageInfo = {
    adjustPlan: { title: "\u8C03\u6574\u5B66\u4E60\u8BA1\u5212", onBack: () => setSection("main") },
    notesDetail: { title: "\u5B66\u4E60\u7B14\u8BB0", onBack: () => setSection("main") },
    noteEditor: { title: "\u7F16\u8F91\u7B14\u8BB0", onBack: () => setSection(noteEditorFrom) },
    morphology: { title: "\u6784\u8BCD\u6CD5", onBack: () => setSection("main") },
    stats: { title: "\u5B66\u4E60\u7EDF\u8BA1", onBack: () => setSection("main") },
    phrases: { title: "\u5E38\u7528\u8BED", onBack: () => setSection("main") },
    phraseDetail: { title: "\u8BCD\u8BED\u8BE6\u60C5", onBack: () => setSection("phrases") },
  };
  const info = subPageInfo[section];
  if (info) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ padding: "4px 16px 6px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div onClick={info.onBack} style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 10, background: "var(--c-p100)", flexShrink: 0 }}>
            <ChevronLeft size={18} strokeWidth={IW} color={"var(--c-p700)"} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--c-p800)", margin: 0, fontFamily: "var(--zh-font), serif" }}>{info.title}</h1>
        </div>
        <div style={{ flex: 1, overflow: "auto" }}>
          {section === "adjustPlan" && <AdjustPlanSection />}
          {section === "notesDetail" && <NotesDetailSection onEditNote={() => { setNoteEditorFrom("notesDetail"); setSection("noteEditor"); }} notes={notesData} />}
          {section === "noteEditor" && <NoteEditorSection />}
          {section === "morphology" && <MorphologySection />}
          {section === "stats" && <StatsSection />}
          {section === "phrases" && <PhrasesSection onSelectPhrase={(p) => { setSelectedPhrase(p); setSection("phraseDetail"); }} />}
          {section === "phraseDetail" && selectedPhrase && <PhraseDetailSection phrase={selectedPhrase} />}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "0 16px 16px" }}>
      {/* AI Study Plan */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--c-p800)", margin: 0, fontFamily: "var(--zh-font), serif" }}>{"\u5B66\u4E60\u8BA1\u5212"}</h2>
          </div>
          <span onClick={() => setSection("adjustPlan")} style={{ fontSize: 12, color: "var(--c-p500)", cursor: "pointer", display: "flex", alignItems: "center", gap: 2 }}>
            {"\u8C03\u6574\u8BA1\u5212"} <ChevronRight size={14} strokeWidth={IW} />
          </span>
        </div>
        <Card style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Calendar size={14} strokeWidth={IW} color={"var(--c-s500)"} />
              <span style={{ fontSize: 13, color: "var(--c-s500)", fontWeight: 500 }}>{"\u4ECA\u65E5\u4EFB\u52A1"}</span>
            </div>
            <span style={{ fontSize: 12, color: "var(--c-teal)", fontWeight: 600 }}>
              {todayTasks.filter(t => t.done).length}/{todayTasks.length} {"\u5DF2\u5B8C\u6210"}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {todayTasks.map((task, i) => (
              <div key={i} onClick={() => toggleTask(i)} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                background: task.done ? "color-mix(in srgb, var(--c-okL) 19%, transparent)" : "var(--c-surfaceAlt)",
                border: `1px solid ${task.done ? "color-mix(in srgb, var(--c-ok) 19%, transparent)" : "var(--c-p100)"}`,
                transition: "all 0.2s",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: task.done ? "var(--c-ok)" : "transparent",
                    border: task.done ? "none" : `1.5px solid ${"var(--c-p200)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.2s",
                  }}>
                    {task.done && <Check size={13} strokeWidth={2} color="#fff" />}
                  </div>
                  <task.icon size={15} strokeWidth={IW} color={task.done ? "var(--c-ok)" : task.color} />
                  <span style={{
                    fontSize: 13, color: task.done ? "var(--c-s300)" : "var(--c-p800)",
                    fontWeight: 500, textDecoration: task.done ? "line-through" : "none",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0,
                  }}>{task.text}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: "var(--c-s500)" }}>{"\u4ECA\u65E5\u8FDB\u5EA6"}</span>
              <span style={{ fontSize: 11, color: "var(--c-teal)", fontWeight: 600 }}>
                {Math.round((todayTasks.filter(t => t.done).length / todayTasks.length) * 100)}%
              </span>
            </div>
            <ProgressBar value={todayTasks.filter(t => t.done).length} max={todayTasks.length} color={"var(--c-teal)"} height={6} />
            {todayTasks.filter(t => t.done).length === todayTasks.length && (
              <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "color-mix(in srgb, var(--c-ok) 12%, transparent)", textAlign: "center" }}>
                <span style={{ fontSize: 12, color: "var(--c-ok)", fontWeight: 600 }}>{"✓ 今日已打卡！"}</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Practice exercises */}
      <div>
        <SectionTitle>{"\u4E13\u9879\u7EC3\u4E60"}</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {exercises.map((ex, i) => (
            <Card key={i} style={{ padding: 16 }} onClick={() => {}}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${ex.color}15`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                <ex.icon size={18} strokeWidth={IW} color={ex.color} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)" }}>{ex.name}</div>
              <div style={{ fontSize: 11, color: "var(--c-s500)", marginTop: 2 }}>{ex.count}{"\u9898"}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* Learning Notes - large standalone section */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--c-p800)", margin: 0, fontFamily: "var(--zh-font), serif" }}>{"\u5B66\u4E60\u7B14\u8BB0"}</h2>
          </div>
          <span style={{ fontSize: 12, color: "var(--c-p500)", cursor: "pointer", display: "flex", alignItems: "center", gap: 2 }}>
            {"\u5168\u90E8"} <ChevronRight size={14} strokeWidth={IW} />
          </span>
        </div>

        {/* AI Summary Card */}
        <Card style={{ padding: 18, marginBottom: 10, background: `linear-gradient(135deg, ${`color-mix(in srgb, var(--c-info) 3%, transparent)`}, ${`color-mix(in srgb, var(--c-teal) 3%, transparent)`})`, border: `1px solid ${`color-mix(in srgb, var(--c-info) 13%, transparent)`}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${"var(--c-info)"}, ${"var(--c-teal)"})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={16} strokeWidth={IW} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)" }}>AI{"\u667A\u80FD\u603B\u7ED3"}</div>
              <div style={{ fontSize: 11, color: "var(--c-s500)" }}>{"\u57FA\u4E8E\u4F60\u7684\u5B66\u4E60\u8BB0\u5F55\u81EA\u52A8\u751F\u6210"}</div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: "var(--c-p700)", lineHeight: 1.7, wordBreak: "break-word" }}>
            {"\u672C\u5468\u4F60\u5B66\u4E60\u4E86 186 \u4E2A\u65B0\u8BCD\uFF0C\u91CD\u70B9\u638C\u63E1\u4E86\u65E5\u5E38\u5BF9\u8BDD\u548C\u98DF\u7269\u7C7B\u8BCD\u6C47\u3002\u5EFA\u8BAE\u52A0\u5F3A\u52A8\u8BCD\u65F6\u6001\u53D8\u5316\u7684\u7EC3\u4E60\uFF0C\u5C1D\u8BD5\u7528\u65B0\u8BCD\u9020\u53E5\u6765\u52A0\u6DF1\u8BB0\u5FC6\u3002"}
          </div>
        </Card>

        {/* Add new note button */}
        <div onClick={() => { setNoteEditorFrom("main"); setSection("noteEditor"); }} style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          padding: "12px 0", marginBottom: 10, borderRadius: 12,
          border: `1.5px dashed ${"var(--c-p300)"}`, background: "var(--c-surface)",
          cursor: "pointer", transition: "all 0.2s",
        }}>
          <Plus size={15} strokeWidth={IW} color={"var(--c-p500)"} />
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--c-p500)" }}>{"\u6DFB\u52A0\u65B0\u7B14\u8BB0"}</span>
        </div>

        {/* Note entries - scrollable with fade */}
        <div style={{ position: "relative" }}>
          <div style={{ maxHeight: 280, overflow: "hidden", display: "flex", flexDirection: "column", gap: 8 }}>
            {(notesData.length > 0 ? notesData : [
              { title: "\u6CF0\u8BED\u52A8\u8BCD\u65F6\u6001\u7B14\u8BB0", created_at: null, content: "\u6CF0\u8BED\u6CA1\u6709\u4F20\u7EDF\u610F\u4E49\u7684\u65F6\u6001\u53D8\u5316\uFF0C\u901A\u8FC7\u52A9\u8BCD\u8868\u8FBE\u65F6\u95F4\u6982\u5FF5...", color: "var(--c-info)" },
              { title: "\u98DF\u7269\u7C7B\u8BCD\u6C47\u6574\u7406", created_at: null, content: "\u6CF0\u56FD\u5E38\u89C1\u98DF\u7269\u8BCD\u6C47\u6C47\u603B\uFF0C\u5305\u62EC\u6C34\u679C\u3001\u5C0F\u5403\u3001\u4E3B\u98DF\u7B49\u5206\u7C7B...", color: "var(--c-amber)" },
              { title: "\u65E5\u5E38\u95EE\u5019\u8BED\u5BF9\u6BD4", created_at: null, content: "\u6CF0\u8BED\u95EE\u5019\u8BED\u4E0E\u4E2D\u6587\u7684\u5BF9\u6BD4\u5206\u6790\uFF0C\u6CE8\u610F\u6587\u5316\u5DEE\u5F02\u548C\u8BED\u5883\u7528\u6CD5...", color: "var(--c-teal)" },
            ]).map((note, i) => {
              const noteColor = note.color && note.color.startsWith("#") ? note.color : (note.color || ["var(--c-info)", "var(--c-amber)", "var(--c-teal)", "var(--c-rose)", "var(--c-gold)"][i % 5]);
              const dateStr = note.created_at ? (() => {
                const diff = Math.floor((Date.now() - new Date(note.created_at).getTime()) / 86400000);
                if (diff === 0) return "\u4ECA\u5929";
                if (diff === 1) return "\u6628\u5929";
                if (diff < 7) return `${diff}\u5929\u524D`;
                if (diff < 30) return `${Math.floor(diff / 7)}\u5468\u524D`;
                return new Date(note.created_at).toLocaleDateString();
              })() : "";
              return (
              <Card key={note.id || i} style={{ padding: 16 }} onClick={() => { setNoteEditorFrom("main"); setSection("noteEditor"); }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 4, height: 48, borderRadius: 2, background: noteColor, flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)" }}>{note.title}</div>
                    {dateStr && <div style={{ fontSize: 11, color: "var(--c-s300)", marginTop: 2 }}>{dateStr}</div>}
                    <div style={{ fontSize: 12, color: "var(--c-s500)", marginTop: 6, lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{note.content}</div>
                  </div>
                  <ChevronRight size={14} strokeWidth={IW} color={"var(--c-s300)"} style={{ flexShrink: 0, marginTop: 4 }} />
                </div>
              </Card>
              );
            })}
          </div>
          {/* Gradient fade overlay */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 60,
            background: `linear-gradient(transparent, ${"var(--c-bg)"})`,
            pointerEvents: "none",
          }} />
        </div>

        <Btn variant="secondary" icon={ChevronRight} onClick={() => setSection("notesDetail")} style={{ width: "100%", marginTop: 10, padding: "10px 0" }}>
          {"\u5168\u5C4F\u67E5\u770B"}
        </Btn>
      </div>

      {/* AI Info Modal */}
      {showAiInfo && (
        <div onClick={() => setShowAiInfo(false)} style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.4)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "var(--c-surface)", maxWidth: 320, width: "90%",
            borderRadius: 16, padding: 24,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${"var(--c-info)"}, ${"var(--c-teal)"})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles size={16} strokeWidth={IW} color="#fff" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--c-p800)", margin: 0 }}>{"AI \u5B66\u4E60\u7B14\u8BB0"}</h3>
            </div>
            <p style={{ fontSize: 13, color: "var(--c-p700)", lineHeight: 1.7, margin: "0 0 20px" }}>
              {"AI\u4F1A\u6839\u636E\u4F60\u7684\u5B66\u4E60\u8BB0\u5F55\u81EA\u52A8\u751F\u6210\u7B14\u8BB0\u603B\u7ED3\uFF0C\u5E2E\u52A9\u4F60\u68B3\u7406\u77E5\u8BC6\u8981\u70B9\u3002\u4F60\u53EF\u4EE5\u5728\u6B64\u57FA\u7840\u4E0A\u6DFB\u52A0\u81EA\u5DF1\u7684\u7B14\u8BB0\u3002"}
            </p>
            <Btn variant="primary" onClick={() => setShowAiInfo(false)} style={{ width: "100%" }}>
              {"\u77E5\u9053\u4E86"}
            </Btn>
          </div>
        </div>
      )}

      {/* More modules */}
      <div>
        <SectionTitle>{"\u66F4\u591A\u5B66\u4E60"}</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Card style={{ padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }} onClick={() => setSection("phrases")}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${`color-mix(in srgb, var(--c-gold) 8%, transparent)`}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Globe size={18} strokeWidth={IW} color={"var(--c-gold)"} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{"\u5E38\u7528\u8BED"}</div>
                <div style={{ fontSize: 11, color: "var(--c-s500)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{"\u4FD7\u8BED\u3001\u4F5B\u6559\u7528\u8BED\u4E0E\u65E5\u5E38\u8868\u8FBE"}</div>
              </div>
            </div>
            <ChevronRight size={16} strokeWidth={IW} color={"var(--c-s300)"} style={{ flexShrink: 0 }} />
          </Card>
          <Card style={{ padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }} onClick={() => setSection("stats")}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${`color-mix(in srgb, var(--c-teal) 8%, transparent)`}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <BarChart3 size={18} strokeWidth={IW} color={"var(--c-teal)"} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{"\u5B66\u4E60\u7EDF\u8BA1"}</div>
                <div style={{ fontSize: 11, color: "var(--c-s500)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{"\u6253\u5361\u8BB0\u5F55\u3001\u8BCD\u6C47\u589E\u957F\u4E0E\u5B66\u4E60\u62A5\u544A"}</div>
              </div>
            </div>
            <ChevronRight size={16} strokeWidth={IW} color={"var(--c-s300)"} style={{ flexShrink: 0 }} />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LearnPage;
