import { useState, useEffect } from "react";
import { useAppContext } from "../../context/AppContext";
import { Card, SectionTitle, HeatCell } from "../../components/UIComponents";
import {
  getMonthlyCheckinStreak, getCheckinHeatmapData, getWeeklyStudyMinutes,
} from "../../lib/supabase.js";
import { Flame, Clock, Check, Target } from "lucide-react";
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const IW = 1.5;

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

/* ── Map a completion count to a heatmap level (0-4) ── */
const countToLevel = (count) => {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 4) return 2;
  if (count <= 7) return 3;
  return 4;
};

const StatsSection = () => {
  const { userId } = useAppContext();

  const [streak, setStreak] = useState(0);
  const [totalMonthDays, setTotalMonthDays] = useState(0);
  const [weekDone, setWeekDone] = useState([false, false, false, false, false, false, false]);
  const [weekCompletedDays, setWeekCompletedDays] = useState(0);
  const [heatmapLevels, setHeatmapLevels] = useState([]);
  const [studyTimeData, setStudyTimeData] = useState([]);
  const [weeklyTotalMins, setWeeklyTotalMins] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || userId === "anonymous") {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      setLoading(true);
      try {
        // Fetch all data in parallel
        const [streakResult, heatmapData, studyMinutes] = await Promise.all([
          getMonthlyCheckinStreak(userId),
          getCheckinHeatmapData(userId, 35),
          getWeeklyStudyMinutes(userId),
        ]);

        // Streak
        setStreak(streakResult.streak);
        setTotalMonthDays(streakResult.totalDays);

        // Heatmap levels from last 35 days
        setHeatmapLevels(heatmapData.map(d => countToLevel(d.count)));

        // This week's checkin (last 7 days of heatmapData)
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0=Sun -> mapped to index 6
        const todayIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Mon=0

        // The last 7 entries in heatmapData correspond to this week (Mon-Sun)
        // But heatmapData covers 35 days ending today, so the last (todayIdx+1) entries cover Mon-today
        // We need to align to this week's Monday
        // Actually, simpler: use the heatmap data to determine which weekdays have checkins
        const monday = new Date(now);
        monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        monday.setHours(0, 0, 0, 0);

        const done = [false, false, false, false, false, false, false];
        let completedCount = 0;

        for (let i = 0; i < 7; i++) {
          const checkDate = new Date(monday);
          checkDate.setDate(monday.getDate() + i);
          const cstMs = checkDate.getTime() + (8 * 60 * 60 * 1000) - (checkDate.getTimezoneOffset() * 60 * 1000);
          const dateStr = new Date(cstMs).toISOString().split("T")[0];
          const found = heatmapData.find(d => d.date === dateStr);
          if (found && found.count > 0) {
            done[i] = true;
            completedCount++;
          }
        }

        setWeekDone(done);
        setWeekCompletedDays(completedCount);

        // Study time
        setStudyTimeData(studyMinutes);
        const totalMins = studyMinutes.reduce((sum, d) => sum + (d.mins || 0), 0);
        setWeeklyTotalMins(totalMins);
      } catch (e) {
        console.error("[StatsSection] fetchStats:", e);
      }
      setLoading(false);
    };

    fetchStats();
  }, [userId]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60 }}>
        <span style={{ fontSize: 13, color: "var(--c-s500)" }}>加载中...</span>
      </div>
    );
  }

  const weeklyHours = (weeklyTotalMins / 60).toFixed(1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 16px 16px" }}>
      {/* Top stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {/* 连续打卡 */}
        <div style={{
          background: "var(--c-surface)", borderRadius: 14, padding: "14px 16px",
          border: "1px solid var(--c-p100)", display: "flex", flexDirection: "column", gap: 6,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Flame size={16} strokeWidth={IW} color="var(--c-gold)" />
            <span style={{ fontSize: 12, color: "var(--c-s500)", fontWeight: 500 }}>本月打卡</span>
          </div>
          <span style={{ fontSize: 28, fontWeight: 700, color: "var(--c-gold)", lineHeight: 1 }}>
            {totalMonthDays}
          </span>
          <span style={{ fontSize: 11, color: "var(--c-s400)" }}>连续 {streak} 天</span>
        </div>

        {/* 本周时长 */}
        <div style={{
          background: "var(--c-surface)", borderRadius: 14, padding: "14px 16px",
          border: "1px solid var(--c-p100)", display: "flex", flexDirection: "column", gap: 6,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Clock size={16} strokeWidth={IW} color="var(--c-amber)" />
            <span style={{ fontSize: 12, color: "var(--c-s500)", fontWeight: 500 }}>本周时长</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: "var(--c-amber)", lineHeight: 1 }}>
              {weeklyHours}
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--c-amber)" }}>h</span>
          </div>
          <span style={{ fontSize: 11, color: "var(--c-s400)" }}>{weeklyTotalMins} 分钟</span>
        </div>
      </div>

      {/* Weekly check-in */}
      <Card>
        <SectionTitle>本周打卡</SectionTitle>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {WEEKDAYS.map((d, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "var(--c-s500)", fontWeight: 500 }}>{d}</span>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: weekDone[i] ? "var(--c-ok)" : "var(--c-p100)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {weekDone[i] ? <Check size={16} strokeWidth={IW} color="#fff" /> : <span style={{ fontSize: 11, color: "var(--c-s300)" }}>{i + 1}</span>}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 10, background: "color-mix(in srgb, var(--c-okL) 25%, transparent)", fontSize: 12, color: "var(--c-ok)", display: "flex", alignItems: "center", gap: 6 }}>
          <Check size={14} strokeWidth={IW} /> 本周已完成 {weekCompletedDays}/7 天{weekCompletedDays >= 5 ? "，太棒了！" : "，继续加油！"}
        </div>
      </Card>

      {/* Heatmap */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--c-p800)", margin: 0, fontFamily: "var(--zh-font), serif" }}>学习日历</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--c-s300)" }}>
            少
            {[0, 1, 2, 3, 4].map(l => <HeatCell key={l} level={l} size={10} />)}
            多
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, justifyContent: "center" }}>
          {heatmapLevels.length === 35
            ? heatmapLevels.map((level, i) => <HeatCell key={i} level={level} size={14} />)
            : Array.from({ length: 35 }).map((_, i) => <HeatCell key={i} level={0} size={14} />)
          }
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 10, color: "var(--c-s300)" }}>
          <span>5周前</span><span>今天</span>
        </div>
      </Card>

      {/* Study time chart */}
      <Card>
        <SectionTitle>本周学习时长</SectionTitle>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={studyTimeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--c-p100)" />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--c-s300)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--c-s300)" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid var(--c-p100)", background: "var(--c-surface)", fontSize: 12 }} />
            <Bar dataKey="mins" fill="var(--c-amber)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};

export default StatsSection;
