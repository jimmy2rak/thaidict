import { useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { Card } from "../../components/UIComponents";
import { ChevronLeft, ChevronRight } from "lucide-react";

const IW = 1.5;

const NotesDetailSection = ({ onEditNote, notes = [] }) => {
  useAppContext();
  const [monthIdx, setMonthIdx] = useState(0);
  const months = ["2025\u5E746\u6708", "2025\u5E745\u6708", "2025\u5E744\u6708"];
  const fallbackNotes = [
    { date: "6\u670812\u65E5", title: "\u6CF0\u8BED\u52A8\u8BCD\u65F6\u6001\u7B14\u8BB0", preview: "\u6CF0\u8BED\u6CA1\u6709\u4F20\u7EDF\u610F\u4E49\u7684\u65F6\u6001\u53D8\u5316\uFF0C\u901A\u8FC7\u52A9\u8BCD\u8868\u8FBE\u65F6\u95F4\u6982\u5FF5...", color: "var(--c-info)" },
    { date: "6\u670810\u65E5", title: "\u98DF\u7269\u7C7B\u8BCD\u6C47\u6574\u7406", preview: "\u6CF0\u56FD\u5E38\u89C1\u98DF\u7269\u8BCD\u6C47\u6C47\u603B\uFF0C\u5305\u62EC\u6C34\u679C\u3001\u5C0F\u5403\u3001\u4E3B\u98DF\u7B49\u5206\u7C7B...", color: "var(--c-amber)" },
    { date: "6\u67087\u65E5", title: "\u65E5\u5E38\u95EE\u5019\u8BED\u5BF9\u6BD4", preview: "\u6CF0\u8BED\u95EE\u5019\u8BED\u4E0E\u4E2D\u6587\u7684\u5BF9\u6BD4\u5206\u6790\uFF0C\u6CE8\u610F\u6587\u5316\u5DEE\u5F02\u548C\u8BED\u5883\u7528\u6CD5...", color: "var(--c-teal)" },
    { date: "6\u67084\u65E5", title: "\u6570\u5B57\u4E0E\u91CF\u8BCD\u7528\u6CD5", preview: "\u6CF0\u8BED\u6570\u5B57\u7CFB\u7EDF\u4E0E\u91CF\u8BCD\u642D\u914D\u89C4\u5219\uFF0C\u4E0E\u4E2D\u6587\u7684\u5F02\u540C\u6BD4\u8F83...", color: "var(--c-rose)" },
    { date: "6\u67081\u65E5", title: "\u6CF0\u8BED\u58F0\u8C03\u7EC3\u4E60\u7B14\u8BB0", preview: "\u6CF0\u8BED\u6709\u4E94\u4E2A\u58F0\u8C03\uFF0C\u5206\u522B\u662F\u4E2D\u5E73\u3001\u4F4E\u3001\u4E0B\u964D\u3001\u9AD8\u3001\u4E0A\u5347...", color: "var(--c-gold)" },
    { date: "5\u670828\u65E5", title: "\u5BB6\u5EAD\u79F0\u8C13\u8BCD\u6C47", preview: "\u6CF0\u8BED\u5BB6\u5EAD\u6210\u5458\u79F0\u8C13\u6C47\u603B\uFF0C\u5305\u62EC\u7236\u6BCD\u3001\u5144\u5F1F\u59D0\u59B9\u3001\u7956\u7236\u6BCD\u7B49...", color: "var(--c-ok)" },
  ];
  const noteEntries = notes.length > 0 ? notes.map((note, i) => {
    const noteColor = note.color && note.color.startsWith("#") ? note.color : (note.color || ["var(--c-info)", "var(--c-amber)", "var(--c-teal)", "var(--c-rose)", "var(--c-gold)", "var(--c-ok)"][i % 6]);
    const dateStr = note.created_at ? (() => {
      const d = new Date(note.created_at);
      return `${d.getMonth() + 1}\u6708${d.getDate()}\u65E5`;
    })() : "";
    return { date: dateStr, title: note.title, preview: note.content || "", color: noteColor };
  }) : fallbackNotes;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 16px 16px" }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--c-p800)", margin: 0, fontFamily: "var(--zh-font), serif" }}>{"\u5B66\u4E60\u7B14\u8BB0"}</h2>

      {/* Date picker */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div onClick={() => setMonthIdx(Math.min(months.length - 1, monthIdx + 1))} style={{ cursor: "pointer", padding: 4 }}>
          <ChevronLeft size={16} strokeWidth={IW} color={"var(--c-p500)"} />
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)" }}>{months[monthIdx]}</span>
        <div onClick={() => setMonthIdx(Math.max(0, monthIdx - 1))} style={{ cursor: "pointer", padding: 4 }}>
          <ChevronRight size={16} strokeWidth={IW} color={"var(--c-p500)"} />
        </div>
      </div>

      {/* Timeline */}
      <div style={{ position: "relative", paddingLeft: 24 }}>
        {/* Vertical timeline line */}
        <div style={{ position: "absolute", left: 7, top: 8, bottom: 8, width: 2, background: "var(--c-p200)" }} />

        {noteEntries.map((note, i) => (
          <div key={i} style={{ position: "relative", marginBottom: 14 }}>
            {/* Timeline dot */}
            <div style={{
              position: "absolute", left: -20, top: 18,
              width: 8, height: 8, borderRadius: "50%",
              background: note.color, zIndex: 1,
            }} />
            {/* Date label */}
            <div style={{ fontSize: 11, color: "var(--c-s300)", marginBottom: 6, fontWeight: 500 }}>{note.date}</div>
            {/* Note card */}
            <Card style={{ padding: 14 }} onClick={onEditNote}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ width: 4, height: 40, borderRadius: 2, background: note.color, flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)" }}>{note.title}</div>
                  <div style={{ fontSize: 12, color: "var(--c-s500)", marginTop: 4, lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{note.preview}</div>
                </div>
                <ChevronRight size={14} strokeWidth={IW} color={"var(--c-s300)"} style={{ flexShrink: 0, marginTop: 4 }} />
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotesDetailSection;
