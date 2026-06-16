import { useState, useEffect } from "react";
import { useAppContext } from "../../context/AppContext";
import { Card, Btn } from "../../components/UIComponents";
import {
  getUserSettings, saveUserSettings,
  getCheckinTasks, getCheckinCompletions, getTodayCST,
  sendReminder,
} from "../../lib/supabase.js";
import {
  ChevronLeft, ChevronRight,
  Bell, BellOff, Mail, Clock, Send, Check,
  BookOpen, PenTool, FileText, Volume2, MessageCircle, PlusCircle,
  Sparkles, AlertCircle, CheckCircle2,
} from "lucide-react";

const IW = 1.5;

const TASK_TYPE_META = {
  "单词": { icon: BookOpen, color: "var(--c-teal)" },
  "语法": { icon: PenTool, color: "var(--c-gold)" },
  "阅读": { icon: FileText, color: "var(--c-rose)" },
  "听力": { icon: Volume2, color: "var(--c-info)" },
  "口语": { icon: MessageCircle, color: "var(--c-amber)" },
  "写作": { icon: PenTool, color: "var(--c-err)" },
  "自定义": { icon: PlusCircle, color: "var(--c-p500)" },
};

const EMAIL_TEMPLATES = [
  {
    id: "classic",
    name: "经典简洁",
    desc: "干净清爽，信息一目了然",
    color: "var(--c-teal)",
    icon: Mail,
  },
  {
    id: "warm",
    name: "温暖柔和",
    desc: "温馨配色，柔和的提醒",
    color: "var(--c-gold)",
    icon: Sparkles,
  },
  {
    id: "modern",
    name: "现代极简",
    desc: "深色表头，现代设计感",
    color: "var(--c-p700)",
    icon: Bell,
  },
];

const TIME_OPTIONS = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    const label = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    TIME_OPTIONS.push({ value: label, label: label + " CST" });
  }
}

const Toggle = ({ on, onToggle }) => (
  <div onClick={onToggle} style={{
    width: 44, height: 24, borderRadius: 12, background: on ? "var(--c-ok)" : "var(--c-p200)",
    cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0,
  }}>
    <div style={{
      width: 20, height: 20, borderRadius: "50%", background: "#fff",
      position: "absolute", top: 2, left: on ? 22 : 2, transition: "left 0.2s",
      boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
    }} />
  </div>
);

const ReminderPage = ({ onBack }) => {
  const { userId, supaUser } = useAppContext();

  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderEmail, setReminderEmail] = useState("");
  const [reminderTime, setReminderTime] = useState("08:00");
  const [reminderTemplate, setReminderTemplate] = useState("modern");
  const [todayTasks, setTodayTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const defaultEmail = supaUser?.email || "";

  useEffect(() => {
    if (!userId || userId === "anonymous") return;
    getUserSettings(userId).then((s) => {
      if (s) {
        if (s.reminder_enabled !== undefined) setReminderEnabled(s.reminder_enabled);
        if (s.reminder_email) setReminderEmail(s.reminder_email);
        if (s.reminder_time) setReminderTime(s.reminder_time);
        if (s.reminder_template) setReminderTemplate(s.reminder_template);
      }
    });
    fetchTodayTasks();
  }, [userId]);

  useEffect(() => {
    if (!reminderEmail && defaultEmail) {
      setReminderEmail(defaultEmail);
    }
  }, [defaultEmail]);

  const fetchTodayTasks = async () => {
    if (!userId || userId === "anonymous") {
      setTasksLoading(false);
      return;
    }
    try {
      const tasks = await getCheckinTasks(userId);
      const today = getTodayCST();
      const todayWeekday = new Date().getDay() === 0 ? 7 : new Date().getDay();
      const todaysTasks = (tasks || []).filter((t) => {
        const days = t.schedule_days || [];
        return days.includes(todayWeekday);
      });
      const completions = await getCheckinCompletions(userId, today);
      const completedIds = new Set(completions || []);
      setTodayTasks(
        todaysTasks.map((t) => ({
          ...t,
          done: completedIds.has(t.id),
        }))
      );
    } catch (e) {
      console.error("[ReminderPage] fetchTodayTasks:", e);
    }
    setTasksLoading(false);
  };

  const saveSetting = (key, value) => {
    if (userId && userId !== "anonymous") {
      saveUserSettings(userId, { [key]: value });
    }
  };

  const handleToggle = (val) => {
    setReminderEnabled(val);
    saveSetting("reminder_enabled", val);
  };

  const handleEmailChange = (val) => {
    setReminderEmail(val);
    saveSetting("reminder_email", val);
  };

  const handleTimeChange = (val) => {
    setReminderTime(val);
    setShowTimePicker(false);
    saveSetting("reminder_time", val);
  };

  const handleTemplateChange = (val) => {
    setReminderTemplate(val);
    saveSetting("reminder_template", val);
  };

  const handleTestSend = async () => {
    if (!reminderEmail.trim()) {
      setSendResult({ ok: false, msg: "请先填写邮箱地址" });
      setTimeout(() => setSendResult(null), 3000);
      return;
    }
    setSending(true);
    setSendResult(null);
    try {
      const result = await sendReminder({
        email: reminderEmail.trim(),
        template: reminderTemplate,
        tasks: todayTasks.map((t) => ({
          name: t.task_name,
          type: t.task_type,
          done: t.done,
        })),
        time: reminderTime,
      });
      if (result.error) {
        setSendResult({ ok: false, msg: result.error });
      } else {
        setSendResult({ ok: true, msg: "测试邮件已发送，请查收邮箱" });
      }
    } catch (e) {
      setSendResult({ ok: false, msg: "发送失败：" + (e.message || "未知错误") });
    }
    setSending(false);
    setTimeout(() => setSendResult(null), 5000);
  };

  const completedCount = todayTasks.filter((t) => t.done).length;
  const totalCount = todayTasks.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 16px 16px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div onClick={onBack} style={{
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          width: 32, height: 32, borderRadius: 10, background: "var(--c-p100)", flexShrink: 0,
        }}>
          <ChevronLeft size={18} strokeWidth={IW} color={"var(--c-p700)"} />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--c-p800)", margin: 0, fontFamily: "var(--zh-font), serif" }}>复习提醒</h2>
      </div>

      {/* Main Toggle Card */}
      <Card style={{ padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {reminderEnabled ? (
              <Bell size={18} strokeWidth={IW} color="var(--c-teal)" />
            ) : (
              <BellOff size={18} strokeWidth={IW} color="var(--c-s400)" />
            )}
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--c-p800)" }}>每日提醒</div>
              <div style={{ fontSize: 12, color: "var(--c-s500)", marginTop: 2 }}>
                {reminderEnabled ? `每天 ${reminderTime} CST 发送提醒` : "开启后将每日发送学习提醒邮件"}
              </div>
            </div>
          </div>
          <Toggle on={reminderEnabled} onToggle={() => handleToggle(!reminderEnabled)} />
        </div>
      </Card>

      {/* Email Setting */}
      <Card style={{ padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Mail size={16} strokeWidth={IW} color="var(--c-p500)" />
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)" }}>提醒邮箱</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--c-s500)", marginBottom: 10 }}>
          默认发送到注册邮箱，可自定义修改
        </div>
        <input
          type="email"
          value={reminderEmail}
          onChange={(e) => handleEmailChange(e.target.value)}
          placeholder={defaultEmail || "请输入邮箱地址"}
          style={{
            width: "100%", padding: "12px 14px", borderRadius: 10,
            border: "1.5px solid var(--c-p200)", background: "var(--c-surface)",
            fontSize: 14, color: "var(--c-p800)", outline: "none",
            fontFamily: "var(--zh-font), sans-serif", boxSizing: "border-box",
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => e.target.style.borderColor = "var(--c-teal)"}
          onBlur={(e) => e.target.style.borderColor = "var(--c-p200)"}
        />
        {defaultEmail && reminderEmail !== defaultEmail && (
          <div
            onClick={() => handleEmailChange(defaultEmail)}
            style={{
              marginTop: 8, fontSize: 12, color: "var(--c-teal)", cursor: "pointer",
              fontWeight: 500, display: "flex", alignItems: "center", gap: 4,
            }}
          >
            <CheckCircle2 size={12} strokeWidth={IW} />
            使用注册邮箱：{defaultEmail}
          </div>
        )}
      </Card>

      {/* Time Setting */}
      <Card style={{ padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Clock size={16} strokeWidth={IW} color="var(--c-p500)" />
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)" }}>提醒时间</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--c-s500)", marginBottom: 10 }}>
          默认使用中国标准时间（UTC+8）
        </div>
        <div
          onClick={() => setShowTimePicker(!showTimePicker)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 14px", borderRadius: 10,
            border: "1.5px solid var(--c-p200)", background: "var(--c-surface)",
            cursor: "pointer", transition: "border-color 0.2s",
          }}
        >
          <span style={{ fontSize: 14, color: "var(--c-p800)", fontWeight: 600 }}>{reminderTime} CST</span>
          <ChevronRight size={16} strokeWidth={IW} color="var(--c-s400)" style={{
            transform: showTimePicker ? "rotate(90deg)" : "rotate(0)",
            transition: "transform 0.2s",
          }} />
        </div>
        {showTimePicker && (
          <div style={{
            marginTop: 8, maxHeight: 200, overflow: "auto", borderRadius: 10,
            border: "1px solid var(--c-p100)", background: "var(--c-surfaceAlt)",
          }}>
            {TIME_OPTIONS.map((opt) => (
              <div
                key={opt.value}
                onClick={() => handleTimeChange(opt.value)}
                style={{
                  padding: "10px 14px", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  borderBottom: "1px solid var(--c-p100)",
                  background: reminderTime === opt.value ? "var(--c-teal)08" : "transparent",
                  transition: "background 0.15s",
                }}
              >
                <span style={{
                  fontSize: 13, fontWeight: reminderTime === opt.value ? 600 : 400,
                  color: reminderTime === opt.value ? "var(--c-teal)" : "var(--c-p700)",
                }}>{opt.label}</span>
                {reminderTime === opt.value && (
                  <Check size={14} strokeWidth={2} color="var(--c-teal)" />
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Email Template Selection */}
      <Card style={{ padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Sparkles size={16} strokeWidth={IW} color="var(--c-p500)" />
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)" }}>邮件样式</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {EMAIL_TEMPLATES.map((tpl) => {
            const Icon = tpl.icon;
            const active = reminderTemplate === tpl.id;
            return (
              <div
                key={tpl.id}
                onClick={() => handleTemplateChange(tpl.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "14px 16px", borderRadius: 12, cursor: "pointer",
                  border: active ? `2px solid ${tpl.color}` : "1.5px solid var(--c-p100)",
                  background: active ? `color-mix(in srgb, ${tpl.color} 6%, transparent)` : "var(--c-surface)",
                  transition: "all 0.2s",
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: `color-mix(in srgb, ${tpl.color} 12%, transparent)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <Icon size={16} strokeWidth={IW} color={tpl.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: active ? "var(--c-p800)" : "var(--c-p700)" }}>
                    {tpl.name}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--c-s500)", marginTop: 2 }}>{tpl.desc}</div>
                </div>
                {active && (
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%", background: tpl.color,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <Check size={12} strokeWidth={2} color="#fff" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Today's Tasks Preview */}
      <Card style={{ padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <BookOpen size={16} strokeWidth={IW} color="var(--c-p500)" />
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)" }}>今日任务预览</span>
          </div>
          {totalCount > 0 && (
            <span style={{ fontSize: 12, color: "var(--c-teal)", fontWeight: 600 }}>
              {completedCount}/{totalCount} 已完成
            </span>
          )}
        </div>
        {tasksLoading ? (
          <div style={{ padding: "20px 0", textAlign: "center" }}>
            <span style={{ fontSize: 12, color: "var(--c-s400)" }}>加载中...</span>
          </div>
        ) : todayTasks.length === 0 ? (
          <div style={{ padding: "20px 0", textAlign: "center" }}>
            <AlertCircle size={28} strokeWidth={IW} color="var(--c-s300)" style={{ margin: "0 auto 8px" }} />
            <div style={{ fontSize: 13, color: "var(--c-s400)" }}>今天没有安排学习任务</div>
            <div style={{ fontSize: 12, color: "var(--c-s300)", marginTop: 4 }}>开启提醒后，有任务时才会发送邮件</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {todayTasks.map((task) => {
              const meta = TASK_TYPE_META[task.task_type] || TASK_TYPE_META["自定义"];
              const TaskIcon = meta.icon;
              return (
                <div key={task.id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px", borderRadius: 8,
                  background: task.done ? "color-mix(in srgb, var(--c-okL) 19%, transparent)" : "var(--c-surfaceAlt)",
                  border: `1px solid ${task.done ? "color-mix(in srgb, var(--c-ok) 19%, transparent)" : "var(--c-p100)"}`,
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    background: task.done ? "var(--c-ok)" : "transparent",
                    border: task.done ? "none" : "1.5px solid var(--c-p200)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    {task.done && <Check size={11} strokeWidth={2} color="#fff" />}
                  </div>
                  <TaskIcon size={14} strokeWidth={IW} color={task.done ? "var(--c-ok)" : meta.color} />
                  <span style={{
                    fontSize: 13, color: task.done ? "var(--c-s300)" : "var(--c-p800)",
                    fontWeight: 500, textDecoration: task.done ? "line-through" : "none",
                    flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{task.task_name}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Test Send Button */}
      <Btn
        variant="primary"
        onClick={handleTestSend}
        disabled={sending}
        style={{
          width: "100%", padding: "13px 0", borderRadius: 12,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          opacity: sending ? 0.6 : 1,
        }}
      >
        <Send size={15} strokeWidth={IW} color="#fff" />
        <span>{sending ? "发送中..." : "发送测试邮件"}</span>
      </Btn>

      {/* Send Result Toast */}
      {sendResult && (
        <div style={{
          padding: "12px 16px", borderRadius: 10,
          background: sendResult.ok
            ? "color-mix(in srgb, var(--c-ok) 12%, transparent)"
            : "color-mix(in srgb, var(--c-err) 12%, transparent)",
          border: `1px solid ${sendResult.ok ? "color-mix(in srgb, var(--c-ok) 30%, transparent)" : "color-mix(in srgb, var(--c-err) 30%, transparent)"}`,
          display: "flex", alignItems: "center", gap: 8,
          fontSize: 13, color: sendResult.ok ? "var(--c-ok)" : "var(--c-err)",
          fontWeight: 500,
        }}>
          {sendResult.ok ? (
            <CheckCircle2 size={16} strokeWidth={IW} />
          ) : (
            <AlertCircle size={16} strokeWidth={IW} />
          )}
          {sendResult.msg}
        </div>
      )}

      {/* Info Note */}
      <div style={{
        padding: "14px 16px", borderRadius: 12,
        background: "color-mix(in srgb, var(--c-info) 6%, transparent)",
        border: "1px solid color-mix(in srgb, var(--c-info) 15%, transparent)",
      }}>
        <div style={{ fontSize: 12, color: "var(--c-info)", fontWeight: 600, marginBottom: 4 }}>
          提醒说明
        </div>
        <div style={{ fontSize: 12, color: "var(--c-s500)", lineHeight: 1.6 }}>
          系统会在您设定的时间检查今日学习任务。如果当天有未完成的任务，将通过邮件发送提醒。
          邮件由 Brevo 服务发送，默认发送至您的注册邮箱。
        </div>
      </div>
    </div>
  );
};

export default ReminderPage;
