import { useState, useRef, useEffect } from "react";
import { Card, Btn } from "../../components/UIComponents";
import { Bold, Italic, Strikethrough, Heading1, Heading2, List, Quote, Code, Upload, Image } from "lucide-react";
import { createNote, updateNote } from "../../lib/supabase.js";

const IW = 1.5;

/* Markdown formatting toolbar button */
const MdBtn = ({ icon: Icon, label, onClick, active }) => (
  <div onClick={onClick} style={{
    width: 32, height: 32, borderRadius: 8,
    background: active ? "color-mix(in srgb, var(--c-teal) 12%, transparent)" : "var(--c-surfaceAlt)",
    border: `1px solid ${active ? "var(--c-teal)" : "var(--c-p100)"}`,
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", transition: "all 0.15s",
  }}>
    {Icon ? <Icon size={14} strokeWidth={IW} color={active ? "var(--c-teal)" : "var(--c-p700)"} /> : <span style={{ fontSize: 11, fontWeight: 600, color: active ? "var(--c-teal)" : "var(--c-p700)" }}>{label}</span>}
  </div>
);

const NoteEditorSection = ({ noteId, initialTitle, initialContent, initialColor, onSaveSuccess }) => {
  const [noteTitle, setNoteTitle] = useState(initialTitle || "");
  const [noteContent, setNoteContent] = useState(initialContent || "");
  const [noteColor, setNoteColor] = useState(initialColor || "#5B7E9E");
  const [savingNote, setSavingNote] = useState(false);
  const textareaRef = useRef(null);
  const noteImageRef = useRef(null);

  const COLORS = ["#5B7E9E", "#C4993D", "#D4845A", "#5B8C7E", "#B56576", "#6B8F5E"];

  /* Insert markdown syntax into textarea at cursor position */
  const insertMarkdown = (prefix, suffix = "", block = false) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = noteContent.slice(start, end);
    const before = noteContent.slice(0, start);
    const after = noteContent.slice(end);
    let insertion;
    if (block) {
      // Block-level: insert on new line
      const needNewline = before.length > 0 && !before.endsWith("\n");
      insertion = `${needNewline ? "\n" : ""}${prefix}${selected}${suffix}\n`;
    } else {
      insertion = `${prefix}${selected || "文字"}${suffix}`;
    }
    const newContent = before + insertion + after;
    setNoteContent(newContent);
    // Set cursor position after insertion
    setTimeout(() => {
      const cursorPos = block ? start + insertion.length : start + prefix.length + (selected ? selected.length : 2);
      textarea.focus();
      textarea.setSelectionRange(cursorPos, cursorPos + (selected ? 0 : 2));
    }, 0);
  };

  const mdActions = [
    { icon: Bold, action: () => insertMarkdown("**", "**") },
    { icon: Italic, action: () => insertMarkdown("*", "*") },
    { icon: Strikethrough, action: () => insertMarkdown("~", "~") },
    { icon: Heading1, action: () => insertMarkdown("# ", "", true) },
    { icon: Heading2, action: () => insertMarkdown("## ", "", true) },
    { icon: List, action: () => insertMarkdown("- ", "", true) },
    { icon: Quote, action: () => insertMarkdown("> ", "", true) },
    { icon: Code, action: () => insertMarkdown("```\n", "\n```", true) },
    { icon: Image, action: () => noteImageRef.current?.click() },
  ];

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // For now, insert markdown image placeholder
    // Future: implement actual upload to Supabase storage
    const imgMarkdown = `\n![${file.name}](pending-upload)\n`;
    insertMarkdown(imgMarkdown, "", true);
    e.target.value = "";
  };

  const handleSaveNote = async () => {
    if (!noteTitle.trim()) return;
    setSavingNote(true);
    try {
      // Let parent handle both create and update + navigation + refresh
      await onSaveSuccess?.({ title: noteTitle, content: noteContent, color: noteColor }, noteId);
    } catch (e) {
      console.error("[saveNote]", e);
    }
    setSavingNote(false);
  };

  /* Auto-focus title on mount for new notes */
  useEffect(() => {
    if (!noteId && !initialTitle) {
      // New note — focus is ready
    }
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "0 16px 16px" }}>
      {/* Title */}
      <input
        value={noteTitle}
        onChange={e => setNoteTitle(e.target.value)}
        placeholder={"输入笔记标题..."}
        style={{
          fontSize: 22, fontWeight: 700, color: "var(--c-p800)", fontFamily: "var(--zh-font), serif",
          padding: "4px 0", border: "none", background: "transparent", outline: "none",
          width: "100%", flexShrink: 0,
        }}
      />

      {/* Editor textarea — this is the main editing area */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", marginTop: 8 }}>
        <textarea
          ref={textareaRef}
          value={noteContent}
          onChange={e => setNoteContent(e.target.value)}
          placeholder={"在这里输入笔记内容... (支持 Markdown 格式)"}
          style={{
            flex: 1, width: "100%", minHeight: 160, border: "none", outline: "none",
            background: "transparent", resize: "none",
            fontSize: 14, color: "var(--c-p700)", lineHeight: 1.8,
            fontFamily: "var(--zh-font), sans-serif",
            padding: 0,
          }}
        />
      </div>

      {/* Markdown toolbar + image upload — BELOW textarea, follows IME */}
      <div style={{
        display: "flex", gap: 4, padding: "10px 0 6px", flexWrap: "wrap",
        alignItems: "center", borderTop: `1px solid ${"var(--c-p100)"}`, flexShrink: 0,
      }}>
        {mdActions.map((btn, i) => (
          <MdBtn key={i} icon={btn.icon} onClick={btn.action} />
        ))}
        {/* Hidden file input for image upload */}
        <input ref={noteImageRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
      </div>

      {/* Color picker */}
      <div style={{ display: "flex", gap: 8, padding: "6px 0", alignItems: "center", flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: "var(--c-s500)", marginRight: 4 }}>{"颜色"}</span>
        {COLORS.map(c => (
          <div key={c} onClick={() => setNoteColor(c)} style={{
            width: 22, height: 22, borderRadius: 6, background: c,
            border: noteColor === c ? `2px solid ${c}` : `1px solid var(--c-p200)`,
            cursor: "pointer", transition: "all 0.15s",
            boxShadow: noteColor === c ? `0 0 0 2px var(--c-surface), 0 0 0 4px ${c}` : "none",
          }} />
        ))}
      </div>

      {/* Save button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, paddingTop: 4 }}>
        <Btn variant="primary" onClick={handleSaveNote} style={{ flex: 1, opacity: savingNote ? 0.6 : 1 }}>
          {savingNote ? "保存中..." : "保存"}
        </Btn>
        <span style={{ fontSize: 11, color: "var(--c-s300)", marginLeft: 12 }}>Markdown 格式</span>
      </div>
    </div>
  );
};

export default NoteEditorSection;
