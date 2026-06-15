import { useState, useRef } from "react";
import { useAppContext } from "../../context/AppContext";
import { Card, Btn } from "../../components/UIComponents";
import { Upload } from "lucide-react";
import { createNote } from "../../lib/supabase.js";

const IW = 1.5;

const NoteEditorSection = ({ webdavConnected }) => {
  const { userId, goBack } = useAppContext();
  const [noteTitle, setNoteTitle] = useState("泰语动词时态笔记");
  const [noteContent, setNoteContent] = useState("\u6CF0\u8BED\u6CA1\u6709\u4F20\u7EDF\u610F\u4E49\u7684\u65F6\u6001\u53D8\u5316\uFF0C\u800C\u662F\u901A\u8FC7\u52A9\u8BCD\u6765\u8868\u8FBE\u65F6\u95F4\u6982\u5FF5\u3002\n\n\u73B0\u5728\u65F6\uFF1A\u57FA\u672C\u5F62\u5F0F\n\u8FC7\u53BB\u65F6\uFF1A\u4F7F\u7528\u52A9\u8BCD \u0E44\u0E14\u0E49 (dai) \u8868\u793A\u52A8\u4F5C\u5DF2\u5B8C\u6210\u3002\n\n\u5E38\u7528\u65F6\u6001\u52A9\u8BCD\uFF1A\n- \u0E44\u0E14\u0E49 (dai) \u2014 \u8FC7\u53BB/\u5B8C\u6210\n- \u0E01\u0E33\u0E25\u0E31\u0E07 (gam-lang) \u2014 \u6B63\u5728\u8FDB\u884C\n- \u0E08\u0E30 (ja) \u2014 \u5C06\u6765/\u5C06\u8981\n- \u0E41\u0E25\u0E49\u0E27 (laew) \u2014 \u5DF2\u7ECF\u5B8C\u6210");
  const [noteColor, setNoteColor] = useState("var(--c-info)");
  const [savingNote, setSavingNote] = useState(false);
  const noteImageRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!webdavConnected) {
      alert("请先在「我的」页面配置 WebDAV 后再上传图片");
      e.target.value = "";
      return;
    }
    const imgMarkdown = `\n![${file.name}](pending-upload)\n`;
    setNoteContent(prev => prev + imgMarkdown);
    e.target.value = "";
  };

  const handleSaveNote = async () => {
    if (!userId || userId === 'anonymous') { goBack && goBack(); return; }
    if (!noteTitle.trim()) return;
    setSavingNote(true);
    try {
      await createNote(userId, noteTitle, noteContent, noteColor);
    } catch (e) {
      console.error("[createNote]", e);
    }
    setSavingNote(false);
    goBack && goBack();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 16px 16px" }}>
      {/* Title */}
      <input
        value={noteTitle}
        onChange={e => setNoteTitle(e.target.value)}
        style={{
          fontSize: 22, fontWeight: 700, color: "var(--c-p800)", fontFamily: "var(--zh-font), serif",
          padding: "4px 0", border: "none", background: "transparent", outline: "none",
          width: "100%",
        }}
      />

      {/* Toolbar */}
      <div style={{
        display: "flex", gap: 6, padding: "8px 0",
        borderBottom: `1px solid ${"var(--c-p100)"}`, flexWrap: "wrap",
        alignItems: "center",
      }}>
        {[
          { label: "B", style: { fontWeight: 700 } },
          { label: "I", style: { fontStyle: "italic" } },
          { label: "H1", style: { fontWeight: 700, fontSize: 11 } },
          { label: "H2", style: { fontWeight: 600, fontSize: 11 } },
          { label: "\u2022", style: { fontSize: 16 } },
          { label: "\u201C", style: { fontSize: 16, fontWeight: 600 } },
          { label: "{}", style: { fontFamily: "monospace", fontSize: 11 } },
        ].map((btn, i) => (
          <div key={i} style={{
            width: 28, height: 28, borderRadius: 6,
            background: "var(--c-surfaceAlt)", border: `1px solid ${"var(--c-p100)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontSize: 13, color: "var(--c-p700)", ...btn.style,
          }}>{btn.label}</div>
        ))}
        <input ref={noteImageRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
        <div onClick={() => noteImageRef.current?.click()} style={{
          width: 28, height: 28, borderRadius: 6,
          background: "var(--c-surfaceAlt)", border: `1px solid ${"var(--c-p100)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", marginLeft: "auto",
        }}>
          <Upload size={14} strokeWidth={IW} color={"var(--c-p700)"} />
        </div>
      </div>

      {/* Editor area - editable content */}
      <Card style={{ padding: 18, flex: 1, minHeight: 320 }}>
        <textarea
          value={noteContent}
          onChange={e => setNoteContent(e.target.value)}
          placeholder={"\u5728\u8FD9\u91CC\u8F93\u5165\u7B14\u8BB0\u5185\u5BB9..."}
          style={{
            width: "100%", minHeight: 280, border: "none", outline: "none",
            background: "transparent", resize: "none",
            fontSize: 14, color: "var(--c-p700)", lineHeight: 1.8,
            fontFamily: "var(--zh-font), sans-serif",
          }}
        />
      </Card>

      {/* Bottom bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Btn variant="primary" onClick={handleSaveNote} style={{ flex: 1, opacity: savingNote ? 0.6 : 1 }}>
          {savingNote ? "\u4FDD\u5B58\u4E2D..." : "\u4FDD\u5B58"}
        </Btn>
        <span style={{ fontSize: 11, color: "var(--c-s300)", marginLeft: 12 }}>Markdown {"\u683C\u5F0F"}</span>
      </div>
    </div>
  );
};

export default NoteEditorSection;
