import { useState, useEffect } from "react";
import { useAppContext } from "../../context/AppContext";
import { Card, Btn } from "../../components/UIComponents";
import {
  getCheckinTasks, createCheckinTask,
  updateCheckinTask, deleteCheckinTask,
  toggleCheckinTaskCompletion, getCheckinCompletions,
  getMonthlyCheckinStreak, getTodayCST, getCSTWeekday,
  callAiProxy, getUserSettings, getApiKeys,
} from "../../lib/supabase.js";
import {
  BookOpen, PenTool, FileText, Volume2, MessageCircle,
  PlusCircle, Sparkles, Check, X, Edit3, Calendar,
  Flame, ArrowLeft, Clipboard, ClipboardCheck, Loader2,
} from "lucide-react";

const IW = 1.5;

const TASK_TYPES = [
  { key: "单词", icon: BookOpen, color: "var(--c-teal)" },
  { key: "语法", icon: PenTool, color: "var(--c-gold)" },
  { key: "阅读", icon: FileText, color: "var(--c-rose)" },
  { key: "听力", icon: Volume2, color: "var(--c-info)" },
  { key: "口语", icon: MessageCircle, color: "var(--c-amber)" },
  { key: "写作", icon: PenTool, color: "var(--c-err)" },
  { key: "自定义", icon: PlusCircle, color: "var(--c-p500)" },
];

const DURATIONS = [5, 10, 15, 20, 30, 45, 60];

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

const LEVELS = ["零基础", "初级", "中级", "高级"];

const GENERATE_PLAN_PROMPT = `你是一个泰语学习规划助手。请根据以下条件为用户生成一个个性化的每日打卡学习计划：

学习水平：{level}
每日可用学习时间：{minutes} 分钟

请生成一个包含 3-5 个学习任务的计划。每个任务必须包含：
- task_type: 任务类型，必须是以下之一：单词、语法、阅读、听力、口语、写作、自定义
- task_name: 四字中文任务名称（如：单词记忆、听力训练、语法精讲、阅读理解、口语练习、写作表达），必须恰好四个汉字
- duration_minutes: 预计时长（分钟），所有任务时长之和不超过 {minutes} 分钟
- schedule_days: 每周执行日（1=周一到7=周日），合理分配

请以JSON数组格式返回，不要包含其他内容。示例：
[{"task_type":"单词","task_name":"单词记忆","duration_minutes":10,"schedule_days":[1,2,3,4,5]}]`;

const EXTERNAL_PROMPT_TEMPLATE = `请为我生成一个泰语学习的每日打卡计划。

我的水平：[零基础/初级/中级/高级]
每日学习时间：[XX]分钟

要求：
1. 生成 3-5 个学习任务
2. 每个任务名称必须是四个汉字（如：单词记忆、听力训练、语法精讲、口语练习）
3. 每个任务需包含：学习类型（单词/语法/阅读/听力/口语/写作）、任务名称、预计时长、每周哪几天执行
4. 所有任务时长总和不超过我的每日可用时间
5. 请根据我的水平调整难度和内容侧重
6. 以列表形式呈现每个任务的详细信息`;

const AdjustPlanSection = () => {
  const { userId } = useAppContext();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [streak, setStreak] = useState(0);

  // New task form
  const [newTaskType, setNewTaskType] = useState("单词");
  const [newTaskName, setNewTaskName] = useState("");
  const [scheduleDays, setScheduleDays] = useState([1, 2, 3, 4, 5]);
  const [duration, setDuration] = useState(15);
  const [submitting, setSubmitting] = useState(false);

  // AI recommendation
  const [aiMode, setAiMode] = useState(null); // null | 'generate' | 'import'
  const [aiLevel, setAiLevel] = useState("初级");
  const [aiMinutes, setAiMinutes] = useState(30);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTasks, setAiTasks] = useState([]);
  const [aiError, setAiError] = useState(null);
  const [importText, setImportText] = useState("");
  const [parsedTasks, setParsedTasks] = useState([]);
  const [editIndex, setEditIndex] = useState(-1);
  const [copied, setCopied] = useState(false);
  const [addingTasks, setAddingTasks] = useState(false);

  // Streak calculation
  const today = getTodayCST();
  const todayWeekday = getCSTWeekday();
  const dateStr = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone: "Asia/Shanghai",
  });

  const fetchTasks = async () => {
    if (!userId || userId === "anonymous") {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [taskList, completedIds, streakResult] = await Promise.all([
        getCheckinTasks(userId),
        getCheckinCompletions(userId, today),
        getMonthlyCheckinStreak(userId),
      ]);
      setTasks(taskList.map((t) => ({ ...t, _done: completedIds.includes(t.id) })));
      setStreak(streakResult.streak);
    } catch (e) {
      console.error("[AdjustPlanSection] fetchTasks:", e);
      setError("加载失败，请重试");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, [userId]); // eslint-disable-line

  const handleToggle = async (taskId, done) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, _done: !done } : t))
    );
    const ok = await toggleCheckinTaskCompletion(userId, taskId, today, !done);
    if (!ok) {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, _done: done } : t))
      );
    }
  };

  const handleDelete = async (taskId) => {
    const prev = tasks;
    setTasks((t) => t.filter((x) => x.id !== taskId));
    const ok = await deleteCheckinTask(taskId);
    if (!ok) setTasks(prev);
  };

  const handleAdd = async () => {
    if (!newTaskName.trim()) return;
    setSubmitting(true);
    const data = await createCheckinTask(userId, {
      task_type: newTaskType,
      task_name: newTaskName.trim(),
      schedule_days: scheduleDays,
      duration_minutes: duration,
      is_custom: true,
      sort_order: tasks.length,
    });
    if (data) {
      setNewTaskName("");
      setNewTaskType("单词");
      setScheduleDays([1, 2, 3, 4, 5]);
      setDuration(15);
      await fetchTasks();
    }
    setSubmitting(false);
  };

  const toggleWeekday = (i) => {
    setScheduleDays((prev) =>
      prev.includes(i)
        ? prev.filter((d) => d !== i)
        : [...prev, i].sort()
    );
  };

  // ── AI Generation ──
  const handleGenerateAiPlan = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiTasks([]);
    try {
      let userApi = null;
      if (userId) {
        const settings = await getUserSettings(userId);
        if (settings?.default_api_id && settings.default_api_id !== "system") {
          const keys = await getApiKeys(userId);
          const dk = keys.find((k) => String(k.id) === String(settings.default_api_id));
          if (dk) userApi = { key: dk.key, base_url: dk.base_url, model: dk.model };
        }
      }
      const prompt = GENERATE_PLAN_PROMPT
        .replace(/{level}/g, aiLevel)
        .replace(/{minutes}/g, aiMinutes);
      const result = await callAiProxy(prompt, userApi);
      if (result.error) {
        setAiError("AI 生成失败，请重试");
        setAiLoading(false);
        return;
      }
      const parsed = parseAiResponse(result.data);
      if (parsed.length === 0) {
        setAiError("AI 返回格式异常，请重试");
      } else {
        setAiTasks(parsed);
      }
    } catch (e) {
      console.error("[AdjustPlanSection] handleGenerateAiPlan:", e);
      setAiError("请求失败，请检查网络后重试");
    }
    setAiLoading(false);
  };

  const parseAiResponse = (data) => {
    try {
      let jsonStr = null;
      if (typeof data === "string") {
        jsonStr = data;
      } else if (data?.choices?.[0]?.message?.content) {
        jsonStr = data.choices[0].message.content;
      } else if (data?.content) {
        jsonStr = data.content;
      } else if (typeof data === "object") {
        jsonStr = JSON.stringify(data);
      }
      if (!jsonStr) return [];
      // Extract JSON array from markdown code blocks or raw text
      const match = jsonStr.match(/\[[\s\S]*\]/);
      if (!match) return [];
      const arr = JSON.parse(match[0]);
      if (!Array.isArray(arr)) return [];
      return arr.filter((t) => t.task_type && t.task_name).map((t) => ({
        task_type: t.task_type,
        task_name: ensureFourChars(t.task_name),
        duration_minutes: Math.min(Math.max(Number(t.duration_minutes) || 15, 5), 120),
        schedule_days: Array.isArray(t.schedule_days)
          ? t.schedule_days.filter((d) => d >= 1 && d <= 7)
          : [1, 2, 3, 4, 5],
      }));
    } catch (e) {
      console.error("[parseAiResponse]", e);
      return [];
    }
  };

  const ensureFourChars = (name) => {
    if (!name) return "自定义任务";
    const clean = name.trim();
    if (clean.length === 4) return clean;
    if (clean.length > 4) return clean.slice(0, 4);
    return clean + "任务".slice(0, 4 - clean.length);
  };

  // ── Import parsing ──
  const handleParseImport = () => {
    if (!importText.trim()) return;
    const lines = importText.split("\n").filter((l) => l.trim());
    const result = [];
    for (const line of lines) {
      const trimmed = line.replace(/^[\d\-•*\.]+\s*/, "").trim();
      if (!trimmed) continue;
      // Try to extract task type
      let taskType = "自定义";
      for (const tt of TASK_TYPES) {
        if (trimmed.includes(tt.key)) {
          taskType = tt.key;
          break;
        }
      }
      // Try to extract four-char name
      const nameMatch = trimmed.match(/[\u4e00-\u9fa5]{4}/);
      const taskName = nameMatch ? nameMatch[0] : trimmed.slice(0, 4);
      // Try to extract duration
      const durMatch = trimmed.match(/(\d+)\s*(?:分钟|分|min)/i);
      const dur = durMatch ? Math.min(Math.max(parseInt(durMatch[1]), 5), 120) : 15;
      result.push({
        task_type: taskType,
        task_name: ensureFourChars(taskName),
        duration_minutes: dur,
        schedule_days: [1, 2, 3, 4, 5],
      });
    }
    setParsedTasks(result.length > 0 ? result : []);
    setEditIndex(-1);
  };

  const handleUpdateParsedTask = (index, field, value) => {
    setParsedTasks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    );
  };

  const handleRemoveParsedTask = (index) => {
    setParsedTasks((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Batch add tasks ──
  const handleAddTasks = async (taskList) => {
    if (!taskList.length) return;
    setAddingTasks(true);
    try {
      for (let i = 0; i < taskList.length; i++) {
        const t = taskList[i];
        await createCheckinTask(userId, {
          task_type: t.task_type,
          task_name: t.task_name,
          schedule_days: t.schedule_days,
          duration_minutes: t.duration_minutes,
          is_custom: true,
          sort_order: tasks.length + i,
        });
      }
      await fetchTasks();
      setAiMode(null);
      setAiTasks([]);
      setParsedTasks([]);
      setImportText("");
    } catch (e) {
      console.error("[AdjustPlanSection] handleAddTasks:", e);
    }
    setAddingTasks(false);
  };

  // ── Copy prompt ──
  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(EXTERNAL_PROMPT_TEMPLATE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("[handleCopyPrompt]", e);
    }
  };

  // ── Toggle weekday in AI task preview ──
  const toggleAiTaskWeekday = (taskIndex, dayNum) => {
    setAiTasks((prev) =>
      prev.map((t, i) => {
        if (i !== taskIndex) return t;
        const days = t.schedule_days.includes(dayNum)
          ? t.schedule_days.filter((d) => d !== dayNum)
          : [...t.schedule_days, dayNum].sort();
        return { ...t, schedule_days: days };
      })
    );
  };

  const toggleParsedTaskWeekday = (taskIndex, dayNum) => {
    setParsedTasks((prev) =>
      prev.map((t, i) => {
        if (i !== taskIndex) return t;
        const days = t.schedule_days.includes(dayNum)
          ? t.schedule_days.filter((d) => d !== dayNum)
          : [...t.schedule_days, dayNum].sort();
        return { ...t, schedule_days: days };
      })
    );
  };

  const typeMeta = TASK_TYPES.find((t) => t.key === newTaskType) || TASK_TYPES[6];
  const completedCount = tasks.filter((t) => t._done).length;

  /* ── Loading / Error states ── */
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 60,
        }}
      >
        <span style={{ fontSize: 13, color: "var(--c-s500)" }}>加载中...</span>
      </div>
    );
  }

  /* ── Task preview card (reused in both AI modes) ── */
  const renderTaskPreview = (task, index, onRemove, onChangeType, onChangeName, onChangeDur, onToggleDay) => {
    const tm = TASK_TYPES.find((t) => t.key === task.task_type) || TASK_TYPES[6];
    return (
      <Card key={index} style={{ padding: 14 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Type badge + name */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <select
                value={task.task_type}
                onChange={(e) => onChangeType(index, e.target.value)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 8,
                  border: "1.5px solid var(--c-p200)",
                  background: "var(--c-surface)",
                  fontSize: 11,
                  color: "var(--c-p800)",
                  fontWeight: 600,
                  outline: "none",
                  fontFamily: "var(--zh-font), sans-serif",
                }}
              >
                {TASK_TYPES.map((tt) => (
                  <option key={tt.key} value={tt.key}>{tt.key}</option>
                ))}
              </select>
              <input
                type="text"
                value={task.task_name}
                onChange={(e) => onChangeName(index, e.target.value)}
                maxLength={8}
                style={{
                  flex: 1,
                  padding: "4px 8px",
                  borderRadius: 8,
                  border: "1.5px solid var(--c-p200)",
                  background: "var(--c-surface)",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--c-p800)",
                  outline: "none",
                  fontFamily: "var(--zh-font), sans-serif",
                }}
              />
            </div>
            {/* Duration */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: "var(--c-s500)" }}>时长</span>
              <select
                value={task.duration_minutes}
                onChange={(e) => onChangeDur(index, Number(e.target.value))}
                style={{
                  padding: "4px 8px",
                  borderRadius: 8,
                  border: "1.5px solid var(--c-p200)",
                  background: "var(--c-surface)",
                  fontSize: 11,
                  color: "var(--c-p800)",
                  outline: "none",
                  fontFamily: "var(--zh-font), sans-serif",
                }}
              >
                {DURATIONS.map((m) => (
                  <option key={m} value={m}>{m}分钟</option>
                ))}
              </select>
            </div>
            {/* Weekday picker */}
            <div style={{ display: "flex", gap: 4 }}>
              {WEEKDAYS.map((d, i) => {
                const dayNum = i + 1;
                const active = task.schedule_days.includes(dayNum);
                return (
                  <div
                    key={i}
                    onClick={() => onToggleDay(index, dayNum)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: active ? "var(--c-p500)" : "var(--c-p50)",
                      border: active ? "none" : "1px solid var(--c-p200)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, color: active ? "#fff" : "var(--c-s400)" }}>
                      {d}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Delete */}
          <div
            onClick={() => onRemove(index)}
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <X size={15} strokeWidth={IW} color="var(--c-s300)" />
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        padding: "0 16px 16px",
      }}
    >
      {/* Date + Streak banner */}
      <Card
        style={{
          padding: 18,
          background: "linear-gradient(135deg, color-mix(in srgb, var(--c-teal) 8%, transparent), color-mix(in srgb, var(--c-gold) 5%, transparent))",
          border: "1px solid var(--c-p100)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 4,
              }}
            >
              <Calendar size={13} strokeWidth={IW} color="var(--c-s500)" />
              <span style={{ fontSize: 13, color: "var(--c-s500)", fontWeight: 500 }}>
                {dateStr}
              </span>
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--c-p800)",
              }}
            >
              {completedCount}/{tasks.length} 项已完成
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "6px 12px",
              borderRadius: 20,
              background: "color-mix(in srgb, var(--c-gold) 12%, transparent)",
            }}
          >
            <Flame size={15} strokeWidth={IW} color="var(--c-gold)" />
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "var(--c-gold)",
              }}
            >
              {streak}
            </span>
            <span style={{ fontSize: 11, color: "var(--c-gold)" }}>天</span>
          </div>
        </div>
      </Card>

      {/* Error state */}
      {error && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            background: "color-mix(in srgb, var(--c-err) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--c-err) 25%, transparent)",
            fontSize: 13,
            color: "var(--c-err)",
            textAlign: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <span>{error}</span>
          <span
            onClick={fetchTasks}
            style={{
              cursor: "pointer",
              fontWeight: 600,
              textDecoration: "underline",
            }}
          >
            重试
          </span>
        </div>
      )}

      {/* Task list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {tasks.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "24px 0",
              color: "var(--c-s500)",
              fontSize: 13,
            }}
          >
            还没有打卡任务，在下方添加你的第一个任务吧
          </div>
        )}
        {tasks.map((task) => {
          const tm =
            TASK_TYPES.find((t) => t.key === task.task_type) || TASK_TYPES[6];
          const daysStr = (task.schedule_days || [])
            .map((d) => WEEKDAYS[d - 1])
            .join(" ");
          const isTodayTask = (task.schedule_days || []).includes(todayWeekday);
          return (
            <Card
              key={task.id}
              style={{
                padding: 14,
                opacity: task._done ? 0.55 : 1,
                transition: "opacity 0.2s",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                {/* Checkbox */}
                <div
                  onClick={() => handleToggle(task.id, task._done)}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: task._done ? "var(--c-ok)" : "transparent",
                    border: task._done
                      ? "none"
                      : `1.5px solid var(--c-p200)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    flexShrink: 0,
                    transition: "all 0.2s",
                  }}
                >
                  {task._done && (
                    <Check size={14} strokeWidth={2} color="#fff" />
                  )}
                </div>

                {/* Task info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: task._done
                          ? "var(--c-s400)"
                          : "var(--c-p800)",
                        textDecoration: task._done
                          ? "line-through"
                          : "none",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {task.task_name}
                    </span>
                    {!isTodayTask && (
                      <span
                        style={{
                          fontSize: 9,
                          padding: "1px 6px",
                          borderRadius: 4,
                          background: "var(--c-p100)",
                          color: "var(--c-s400)",
                          flexShrink: 0,
                        }}
                      >
                        非今日
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        padding: "1px 6px",
                        borderRadius: 4,
                        background: `color-mix(in srgb, ${tm.color} 15%, transparent)`,
                        color: tm.color,
                        fontWeight: 600,
                      }}
                    >
                      {task.task_type}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--c-s400)",
                      }}
                    >
                      {task.duration_minutes || 15}分钟
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--c-s300)",
                      }}
                    >
                      {daysStr}
                    </span>
                  </div>
                </div>

                {/* Delete button */}
                <div
                  onClick={() => handleDelete(task.id)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    flexShrink: 0,
                    transition: "all 0.15s",
                  }}
                >
                  <X size={15} strokeWidth={IW} color="var(--c-s300)" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Divider */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          margin: "4px 0",
        }}
      >
        <div
          style={{ flex: 1, height: 1, background: "var(--c-p100)" }}
        />
        <span
          style={{
            fontSize: 11,
            color: "var(--c-s400)",
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          添加新任务
        </span>
        <div
          style={{ flex: 1, height: 1, background: "var(--c-p100)" }}
        />
      </div>

      {/* Add task form */}
      <Card style={{ padding: 18 }}>
        {/* Task type radio */}
        <div
          style={{
            fontSize: 12,
            color: "var(--c-s500)",
            marginBottom: 8,
            fontWeight: 500,
          }}
        >
          学习类型
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 14,
          }}
        >
          {TASK_TYPES.map((t) => (
            <div
              key={t.key}
              onClick={() => setNewTaskType(t.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "5px 10px",
                borderRadius: 20,
                border:
                  newTaskType === t.key
                    ? `1.5px solid ${t.color}`
                    : "1.5px solid var(--c-p100)",
                background:
                  newTaskType === t.key
                    ? `color-mix(in srgb, ${t.color} 12%, transparent)`
                    : "var(--c-surface)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <t.icon size={12} strokeWidth={IW} color={newTaskType === t.key ? t.color : "var(--c-s400)"} />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: newTaskType === t.key ? 600 : 400,
                  color:
                    newTaskType === t.key ? "var(--c-p800)" : "var(--c-s500)",
                }}
              >
                {t.key}
              </span>
            </div>
          ))}
        </div>

        {/* Task name input */}
        <div
          style={{
            fontSize: 12,
            color: "var(--c-s500)",
            marginBottom: 8,
            fontWeight: 500,
          }}
        >
          任务名称
        </div>
        <input
          type="text"
          value={newTaskName}
          onChange={(e) => setNewTaskName(e.target.value)}
          placeholder="例如：复习泰语基础词汇"
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 10,
            border: `1.5px solid var(--c-p200)`,
            background: "var(--c-surface)",
            fontSize: 13,
            color: "var(--c-p800)",
            outline: "none",
            fontFamily: "var(--zh-font), sans-serif",
            boxSizing: "border-box",
            marginBottom: 14,
          }}
        />

        {/* Weekday picker */}
        <div
          style={{
            fontSize: 12,
            color: "var(--c-s500)",
            marginBottom: 8,
            fontWeight: 500,
          }}
        >
          重复日
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          {WEEKDAYS.map((d, i) => {
            const dayNum = i + 1;
            const active = scheduleDays.includes(dayNum);
            return (
              <div
                key={i}
                onClick={() => toggleWeekday(dayNum)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: active
                    ? "var(--c-p500)"
                    : "var(--c-p50)",
                  border: active
                    ? "none"
                    : "1.5px solid var(--c-p200)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: active ? 600 : 400,
                    color: active ? "#fff" : "var(--c-s400)",
                  }}
                >
                  {d}
                </span>
              </div>
            );
          })}
        </div>

        {/* Duration picker */}
        <div
          style={{
            fontSize: 12,
            color: "var(--c-s500)",
            marginBottom: 8,
            fontWeight: 500,
          }}
        >
          预计时长
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 16,
          }}
        >
          {DURATIONS.map((m) => (
            <div
              key={m}
              onClick={() => setDuration(m)}
              style={{
                padding: "6px 12px",
                borderRadius: 20,
                border:
                  duration === m
                    ? "1.5px solid var(--c-teal)"
                    : "1.5px solid var(--c-p100)",
                background:
                  duration === m
                    ? "color-mix(in srgb, var(--c-teal) 12%, transparent)"
                    : "var(--c-surface)",
                cursor: "pointer",
                transition: "all 0.15s",
                fontSize: 12,
                fontWeight: duration === m ? 600 : 400,
                color:
                  duration === m ? "var(--c-p800)" : "var(--c-s500)",
              }}
            >
              {m}分钟
            </div>
          ))}
        </div>

        {/* Add button */}
        <Btn
          variant="primary"
          onClick={handleAdd}
          disabled={submitting || !newTaskName.trim()}
          style={{
            width: "100%",
            padding: "12px 0",
            borderRadius: 10,
            opacity: submitting || !newTaskName.trim() ? 0.5 : 1,
          }}
        >
          {submitting ? "添加中..." : "添加任务"}
        </Btn>
      </Card>

      {/* Divider */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          margin: "4px 0",
        }}
      >
        <div
          style={{ flex: 1, height: 1, background: "var(--c-p100)" }}
        />
        <span
          style={{
            fontSize: 11,
            color: "var(--c-s400)",
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          AI 推荐
        </span>
        <div
          style={{ flex: 1, height: 1, background: "var(--c-p100)" }}
        />
      </div>

      {/* ═══════════════ AI Recommendation Section ═══════════════ */}

      {/* Mode: Entry (aiMode === null) */}
      {aiMode === null && (
        <Card
          style={{
            padding: 18,
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--c-info) 4%, transparent), color-mix(in srgb, var(--c-teal) 3%, transparent))",
            border: "1px solid color-mix(in srgb, var(--c-info) 15%, transparent)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background:
                "linear-gradient(135deg, var(--c-info), var(--c-teal))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 10px",
            }}
          >
            <Sparkles size={20} strokeWidth={IW} color="#fff" />
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--c-p800)",
              marginBottom: 4,
            }}
          >
            AI 智能推荐
          </div>
          <div style={{ fontSize: 12, color: "var(--c-s500)", lineHeight: 1.6, marginBottom: 14 }}>
            根据你的水平和时间，AI 为你定制最优打卡计划
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <Btn
              variant="primary"
              onClick={() => setAiMode("generate")}
              style={{ flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 13 }}
            >
              <Sparkles size={14} strokeWidth={IW} style={{ marginRight: 4 }} />
              AI 生成计划
            </Btn>
            <Btn
              variant="secondary"
              onClick={() => setAiMode("import")}
              style={{ flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 13 }}
            >
              导入外部计划
            </Btn>
          </div>
          {/* Copy prompt */}
          <div
            onClick={handleCopyPrompt}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "6px 12px",
              borderRadius: 8,
              background: copied
                ? "color-mix(in srgb, var(--c-ok) 12%, transparent)"
                : "var(--c-surface)",
              border: "1px solid var(--c-p200)",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {copied ? (
              <ClipboardCheck size={12} strokeWidth={IW} color="var(--c-ok)" />
            ) : (
              <Clipboard size={12} strokeWidth={IW} color="var(--c-s400)" />
            )}
            <span style={{ fontSize: 11, color: copied ? "var(--c-ok)" : "var(--c-s400)" }}>
              {copied ? "已复制" : "复制 Prompt 到外部AI"}
            </span>
          </div>
        </Card>
      )}

      {/* Mode: AI Generate (aiMode === 'generate') */}
      {aiMode === "generate" && (
        <Card style={{ padding: 18 }}>
          {/* Header with back */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
            }}
          >
            <div
              onClick={() => { setAiMode(null); setAiTasks([]); setAiError(null); }}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                background: "var(--c-p50)",
              }}
            >
              <ArrowLeft size={16} strokeWidth={IW} color="var(--c-s400)" />
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--c-p800)" }}>
              AI 智能推荐
            </span>
          </div>

          {/* Level selector */}
          <div style={{ fontSize: 12, color: "var(--c-s500)", marginBottom: 8, fontWeight: 500 }}>
            学习水平
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {LEVELS.map((lv) => (
              <div
                key={lv}
                onClick={() => setAiLevel(lv)}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: 20,
                  border: aiLevel === lv ? "1.5px solid var(--c-info)" : "1.5px solid var(--c-p100)",
                  background: aiLevel === lv
                    ? "color-mix(in srgb, var(--c-info) 12%, transparent)"
                    : "var(--c-surface)",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <span style={{
                  fontSize: 12,
                  fontWeight: aiLevel === lv ? 600 : 400,
                  color: aiLevel === lv ? "var(--c-p800)" : "var(--c-s500)",
                }}>
                  {lv}
                </span>
              </div>
            ))}
          </div>

          {/* Minutes slider */}
          <div style={{ fontSize: 12, color: "var(--c-s500)", marginBottom: 8, fontWeight: 500 }}>
            每日学习时间
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 11, color: "var(--c-s400)", flexShrink: 0 }}>10分</span>
            <input
              type="range"
              min={10}
              max={120}
              step={5}
              value={aiMinutes}
              onChange={(e) => setAiMinutes(Number(e.target.value))}
              style={{
                flex: 1,
                height: 4,
                accentColor: "var(--c-info)",
                cursor: "pointer",
              }}
            />
            <span style={{ fontSize: 11, color: "var(--c-s400)", flexShrink: 0 }}>120分</span>
          </div>
          <div style={{
            textAlign: "center",
            fontSize: 18,
            fontWeight: 700,
            color: "var(--c-info)",
            marginBottom: 16,
          }}>
            {aiMinutes}<span style={{ fontSize: 12, fontWeight: 400, color: "var(--c-s400)" }}> 分钟/天</span>
          </div>

          {/* Generate button */}
          {aiTasks.length === 0 && !aiLoading && (
            <Btn
              variant="primary"
              onClick={handleGenerateAiPlan}
              disabled={aiLoading}
              style={{
                width: "100%",
                padding: "12px 0",
                borderRadius: 10,
                fontSize: 14,
                background: "linear-gradient(135deg, var(--c-info), var(--c-teal))",
              }}
            >
              <Sparkles size={16} strokeWidth={IW} style={{ marginRight: 4 }} />
              生成推荐计划
            </Btn>
          )}

          {/* Loading */}
          {aiLoading && (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <Loader2
                size={28}
                strokeWidth={IW}
                color="var(--c-info)"
                style={{ marginBottom: 8, animation: "spin 1s linear infinite" }}
              />
              <div style={{ fontSize: 13, color: "var(--c-s500)" }}>
                AI 正在为你定制学习计划...
              </div>
            </div>
          )}

          {/* Error */}
          {aiError && !aiLoading && (
            <div style={{
              padding: "12px 16px",
              borderRadius: 10,
              background: "color-mix(in srgb, var(--c-err) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--c-err) 25%, transparent)",
              fontSize: 13,
              color: "var(--c-err)",
              textAlign: "center",
              marginBottom: 12,
            }}>
              {aiError}
              <span
                onClick={handleGenerateAiPlan}
                style={{ cursor: "pointer", fontWeight: 600, textDecoration: "underline", marginLeft: 8 }}
              >
                重试
              </span>
            </div>
          )}

          {/* Task preview list */}
          {aiTasks.length > 0 && !aiLoading && (
            <>
              <div style={{ fontSize: 12, color: "var(--c-s500)", marginBottom: 8, fontWeight: 500 }}>
                推荐任务（可编辑）
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                {aiTasks.map((task, i) =>
                  renderTaskPreview(
                    task, i,
                    (idx) => setAiTasks((prev) => prev.filter((_, j) => j !== idx)),
                    (idx, val) => setAiTasks((prev) => prev.map((t, j) => j === idx ? { ...t, task_type: val } : t)),
                    (idx, val) => setAiTasks((prev) => prev.map((t, j) => j === idx ? { ...t, task_name: val } : t)),
                    (idx, val) => setAiTasks((prev) => prev.map((t, j) => j === idx ? { ...t, duration_minutes: val } : t)),
                    toggleAiTaskWeekday,
                  )
                )}
              </div>
              <Btn
                variant="primary"
                onClick={() => handleAddTasks(aiTasks)}
                disabled={addingTasks || aiTasks.length === 0}
                style={{
                  width: "100%",
                  padding: "12px 0",
                  borderRadius: 10,
                  opacity: addingTasks ? 0.6 : 1,
                }}
              >
                {addingTasks ? "添加中..." : `一键添加全部 (${aiTasks.length} 项)`}
              </Btn>
              <div
                onClick={handleGenerateAiPlan}
                style={{
                  textAlign: "center",
                  marginTop: 10,
                  fontSize: 12,
                  color: "var(--c-info)",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                重新生成
              </div>
            </>
          )}

          {/* Back to entry */}
          <div
            onClick={() => { setAiMode(null); setAiTasks([]); setAiError(null); }}
            style={{
              textAlign: "center",
              marginTop: 14,
              fontSize: 12,
              color: "var(--c-s400)",
              cursor: "pointer",
            }}
          >
            返回
          </div>
        </Card>
      )}

      {/* Mode: Import (aiMode === 'import') */}
      {aiMode === "import" && (
        <Card style={{ padding: 18 }}>
          {/* Header with back */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
            }}
          >
            <div
              onClick={() => { setAiMode(null); setParsedTasks([]); setImportText(""); }}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                background: "var(--c-p50)",
              }}
            >
              <ArrowLeft size={16} strokeWidth={IW} color="var(--c-s400)" />
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--c-p800)" }}>
              导入外部计划
            </span>
          </div>

          {/* Text input */}
          <div style={{ fontSize: 12, color: "var(--c-s500)", marginBottom: 8, fontWeight: 500 }}>
            粘贴 AI 生成的学习计划
          </div>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={"例如：\n1. 单词记忆 - 每天15分钟 - 周一至周五\n2. 听力训练 - 每天10分钟 - 周一至周日\n3. 口语练习 - 每天10分钟 - 周六周日"}
            rows={6}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 10,
              border: "1.5px solid var(--c-p200)",
              background: "var(--c-surface)",
              fontSize: 13,
              color: "var(--c-p800)",
              outline: "none",
              fontFamily: "var(--zh-font), sans-serif",
              boxSizing: "border-box",
              marginBottom: 12,
              resize: "vertical",
              lineHeight: 1.6,
            }}
          />

          {/* Parse button */}
          <Btn
            variant="primary"
            onClick={handleParseImport}
            disabled={!importText.trim()}
            style={{
              width: "100%",
              padding: "10px 0",
              borderRadius: 10,
              opacity: importText.trim() ? 1 : 0.5,
              marginBottom: 14,
            }}
          >
            解析计划
          </Btn>

          {/* Parsed tasks preview */}
          {parsedTasks.length > 0 && (
            <>
              <div style={{ fontSize: 12, color: "var(--c-s500)", marginBottom: 8, fontWeight: 500 }}>
                解析结果（可编辑）
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                {parsedTasks.map((task, i) =>
                  renderTaskPreview(
                    task, i,
                    handleRemoveParsedTask,
                    handleUpdateParsedTask,
                    handleUpdateParsedTask,
                    handleUpdateParsedTask,
                    toggleParsedTaskWeekday,
                  )
                )}
              </div>
              <Btn
                variant="primary"
                onClick={() => handleAddTasks(parsedTasks)}
                disabled={addingTasks}
                style={{
                  width: "100%",
                  padding: "12px 0",
                  borderRadius: 10,
                  opacity: addingTasks ? 0.6 : 1,
                }}
              >
                {addingTasks ? "添加中..." : `添加全部 (${parsedTasks.length} 项)`}
              </Btn>
            </>
          )}

          {/* Copy prompt */}
          <div
            onClick={handleCopyPrompt}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "6px 12px",
              borderRadius: 8,
              background: copied
                ? "color-mix(in srgb, var(--c-ok) 12%, transparent)"
                : "var(--c-surface)",
              border: "1px solid var(--c-p200)",
              cursor: "pointer",
              transition: "all 0.2s",
              marginTop: parsedTasks.length > 0 ? 12 : 0,
            }}
          >
            {copied ? (
              <ClipboardCheck size={12} strokeWidth={IW} color="var(--c-ok)" />
            ) : (
              <Clipboard size={12} strokeWidth={IW} color="var(--c-s400)" />
            )}
            <span style={{ fontSize: 11, color: copied ? "var(--c-ok)" : "var(--c-s400)" }}>
              {copied ? "已复制" : "复制 Prompt 到外部AI"}
            </span>
          </div>

          {/* Back to entry */}
          <div
            onClick={() => { setAiMode(null); setParsedTasks([]); setImportText(""); }}
            style={{
              textAlign: "center",
              marginTop: 14,
              fontSize: 12,
              color: "var(--c-s400)",
              cursor: "pointer",
            }}
          >
            返回
          </div>
        </Card>
      )}

      {/* Spin animation for loader */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AdjustPlanSection;
