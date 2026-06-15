import { useState, useEffect } from "react";
import { useAppContext } from "../../context/AppContext";
import { Card, Btn } from "../../components/UIComponents";
import {
  getCheckinTasks, createCheckinTask,
  updateCheckinTask, deleteCheckinTask,
  toggleCheckinTaskCompletion, getCheckinCompletions,
  getMonthlyCheckinStreak,
} from "../../lib/supabase.js";
import {
  BookOpen, PenTool, FileText, Volume2, MessageCircle,
  PlusCircle, Sparkles, Check, X, Edit3, Calendar,
  Flame,
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

  // Streak calculation
  const today = new Date().toISOString().split("T")[0];
  const dayOfWeek = new Date().getDay(); // 0=Sun → map to 7
  const todayWeekday = dayOfWeek === 0 ? 7 : dayOfWeek;
  const dateStr = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
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
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, _done: !done } : t))
    );
    const ok = await toggleCheckinTaskCompletion(userId, taskId, today, !done);
    if (!ok) {
      // Rollback
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, _done: done } : t))
      );
    }
  };

  const handleDelete = async (taskId) => {
    // Optimistic remove
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
            const dayNum = i + 1; // 1=周一
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

      {/* AI placeholder card */}
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
        <div style={{ fontSize: 12, color: "var(--c-s500)", lineHeight: 1.6 }}>
          AI 将根据你的学习记录，自动为你推荐最优的打卡任务组合。该功能即将上线，敬请期待。
        </div>
      </Card>
    </div>
  );
};

export default AdjustPlanSection;
