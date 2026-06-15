import { useAppContext } from "../../context/AppContext";
import { Card, SectionTitle, StatCard, HeatCell } from "../../components/UIComponents";
import {
  weekDays, weekDone, heatmapLevels,
  vocabGrowth, studyTimeData, pieData,
} from "../../data/mockData";
import { Flame, Target, Clock, Award, Check } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

const IW = 1.5;

const StatsSection = () => {
  useAppContext();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 16px 16px" }}>
      {/* Top stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <StatCard icon={Flame} label={"\u8FDE\u7EED\u6253\u5361"} value="25" sub={"\u5929"} color={"var(--c-gold)"} />
        <StatCard icon={Target} label={"\u672C\u5468\u5B66\u4E60"} value="186" sub={"\u8BCD"} color={"var(--c-teal)"} />
        <StatCard icon={Clock} label={"\u672C\u5468\u65F6\u957F"} value="4.5" sub="h" color={"var(--c-amber)"} />
        <StatCard icon={Award} label={"\u603B\u8BCD\u6C47"} value="680" color={"var(--c-rose)"} />
      </div>

      {/* Weekly check-in */}
      <Card>
        <SectionTitle>{"\u672C\u5468\u6253\u5361"}</SectionTitle>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {weekDays.map((d, i) => (
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
          <Check size={14} strokeWidth={IW} /> {"\u672C\u5468\u5DF2\u5B8C\u6210 4/7 \u5929\uFF0C\u7EE7\u7EED\u52A0\u6CB9!"}
        </div>
      </Card>

      {/* Heatmap */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--c-p800)", margin: 0, fontFamily: "var(--zh-font), serif" }}>{"\u5B66\u4E60\u65E5\u5386"}</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--c-s300)" }}>
            {"\u5C11"}
            {[0, 1, 2, 3, 4].map(l => <HeatCell key={l} level={l} size={10} />)}
            {"\u591A"}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, justifyContent: "center" }}>
          {Array.from({ length: 35 }).map((_, i) => <HeatCell key={i} level={heatmapLevels[i]} size={14} />)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 10, color: "var(--c-s300)" }}>
          <span>{"5\u5468\u524D"}</span><span>{"\u4ECA\u5929"}</span>
        </div>
      </Card>

      {/* Vocabulary growth chart */}
      <Card>
        <SectionTitle>{"\u8BCD\u6C47\u91CF\u589E\u957F"}</SectionTitle>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={vocabGrowth}>
            <defs>
              <linearGradient id="colorG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={"var(--c-teal)"} stopOpacity={0.3} />
                <stop offset="95%" stopColor={"var(--c-teal)"} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={"var(--c-p100)"} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--c-s300)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--c-s300)" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${"var(--c-p100)"}`, background: "var(--c-surface)", fontSize: 12 }} />
            <Area type="monotone" dataKey="total" stroke={"var(--c-teal)"} fill="url(#colorG)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Study time chart */}
      <Card>
        <SectionTitle>{"\u672C\u5468\u5B66\u4E60\u65F6\u957F"}</SectionTitle>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={studyTimeData}>
            <CartesianGrid strokeDasharray="3 3" stroke={"var(--c-p100)"} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--c-s300)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--c-s300)" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${"var(--c-p100)"}`, background: "var(--c-surface)", fontSize: 12 }} />
            <Bar dataKey="mins" fill={"var(--c-amber)"} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Pie chart */}
      <Card>
        <SectionTitle>{"\u8BCD\u6C47\u638C\u63E1\u60C5\u51B5"}</SectionTitle>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <ResponsiveContainer width={140} height={140}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={58} paddingAngle={3} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pieData.map((d, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: d.color }} />
                <span style={{ fontSize: 12, color: "var(--c-s500)" }}>{d.name}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-p800)" }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default StatsSection;
