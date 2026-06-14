import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./main.jsx";
import {
  signInWithEmail, signUpWithEmail, signInWithOAuth,
  signOut as supaSignOut, updateUserProfile, uploadAvatar, verifyEmailOtp,
} from "./lib/supabase.js";
import {
  isSupabaseConfigured,
  searchWords, getWordByThai, getDailyWord, getRecentWords,
  submitWord, transformWordData, transformSearchResult,
  getBookmarks, addBookmark, removeBookmark, isBookmarked,
  getUserRecentWords, recordWordLookup,
  getFolders, createFolder, renameFolder, deleteFolder,
  getFolderWords, addWordToFolder, removeWordFromFolder,
  getLearningPlan, saveLearningPlan,
  getLearningProgress, updateDailyProgress, getStreak,
  getNotes, createNote, updateNote, deleteNote,
  getUserSettings, saveUserSettings,
  getApiKeys, saveApiKey, deleteApiKey,
  getDictionaryCount,
  callAiProxy, getDefaultApi, setDefaultApi,
  getDailySentence, getSentencesByCategory,
  bookmarkSentence, removeSentenceBookmark, getBookmarkedSentences,
} from "./lib/supabase.js";
import {
  Search, BookOpen,
  Mic, Play, Pause,
  Bookmark, Check,
  Flame, Target, Award, Cloud, Moon, Sun, Smartphone,
  Globe, PenTool, Bell, RefreshCw,
  Download, Upload, HardDrive, Plus,
  Volume2, ChevronRight, ChevronLeft, Clock, Star,
  BarChart3, GitBranch,
  FileText, HelpCircle, Sparkles,
  Calendar, ListChecks, Minus, AlertCircle,
  Folder, Pencil, X, Trash2,
  Eye, EyeOff, Key
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

/* ────────────────────────────────────────────
   COLOR TOKENS — managed via CSS variables in index.css
   Light: :root  |  Dark: [data-theme="dark"]
   Inline styles use var(--c-xxx) which auto-switches.
   ──────────────────────────────────────────── */

const IW = 1.5; // icon stroke width constant

/* ────────────────────────────────────────────
   THAI CULTURAL LINE ICONS (stroke only, no fill)
   外轮廓 + 1~3 条必要内部线条
   ──────────────────────────────────────────── */

// 首页 — 黎明寺 Wat Arun (主塔 + 左右小塔 + 多层内部线)
const Logo = ({ size = 28, color = "var(--c-p600)" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    {/* 主塔轮廓 */}
    <path d="M20 3 L18 9 L17 15 L15.5 21 L13.5 26 L11 30 L9 34.5 L31 34.5 L29 30 L26.5 26 L24.5 21 L23 15 L22 9 Z" />
    {/* 左侧小塔 */}
    <path d="M8 18 L6.5 24 L5 30 L3.5 34.5 L12.5 34.5 L11 30 L9.5 24 Z" />
    {/* 右侧小塔 */}
    <path d="M32 18 L30.5 24 L29 30 L27.5 34.5 L36.5 34.5 L35 30 L33.5 24 Z" />
    {/* 内部线条：4 条平台线 + 拱门 + 塔身窗纹 */}
    <line x1="15.5" y1="21" x2="24.5" y2="21" />
    <line x1="13.5" y1="26" x2="26.5" y2="26" />
    <line x1="11" y1="30" x2="29" y2="30" />
    <line x1="9" y1="34.5" x2="31" y2="34.5" />
    <line x1="18" y1="12" x2="22" y2="12" />
    <circle cx="20" cy="16" r="1" />
    <path d="M18 34.5 L18 31.5 Q20 29.5 22 31.5 L22 34.5" />
  </svg>
);

// 单词本 — 贝叶经 Palm Leaf Manuscript (展开扇形 + 叶脉线)
const PalmLeafBook = ({ size = 22, color = "var(--c-p600)" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    {/* 外轮廓：扇形展开 */}
    <path d="M7 9 Q20 3 33 9 L20 36 Z" />
    {/* 内部线条：2 条折叶纹 + 绳结 */}
    <line x1="13" y1="8" x2="20" y2="36" />
    <line x1="27" y1="8" x2="20" y2="36" />
    <circle cx="20" cy="35" r="1.5" />
  </svg>
);

// 学习 — 莲花油灯 Lotus Oil Lamp (火焰 + 灯碗 + 莲瓣弧)
const LotusLamp = ({ size = 22, color = "var(--c-p600)" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    {/* 火焰 */}
    <path d="M20 3 Q18 8 18.5 12 L21.5 12 Q22 8 20 3 Z" />
    {/* 灯碗轮廓 */}
    <path d="M10 15 L30 15 L27 25 Q20 30 13 25 Z" />
    {/* 莲瓣底座 */}
    <path d="M14 34 Q17 32 20 34 Q23 32 26 34" />
  </svg>
);

// 我的 — 佛头 Buddha Head (圆润轮廓 + 宽眼距 + 小肉髻)
const BuddhaHead = ({ size = 22, color = "var(--c-p600)" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    {/* 外轮廓：小肉髻 → 圆润额 → 耳 → 圆颊 → 下巴 */}
    <path d="M20 5 C22 5 22.5 6.5 22 8.5 C25 9.5 28 13 28.5 17 C29.5 21 28.5 25 26.5 28 C24.5 31 22 33 20 34 C18 33 15.5 31 13.5 28 C11.5 25 10.5 21 11.5 17 C12 13 15 9.5 18 8.5 C17.5 6.5 18 5 20 5 Z" />
    {/* 半闭眼（宽间距）+ 鼻梁 */}
    <path d="M13 19 Q15.5 21 17.5 19" />
    <path d="M22.5 19 Q24.5 21 27 19" />
    <line x1="20" y1="22" x2="20" y2="26" />
  </svg>
);

/* ────────────────────────────────────────────
   MOCK DATA - Chinese learning Thai
   ──────────────────────────────────────────── */
const dailyWord = {
  zh: "\u5B66\u4E60", th: "\u0E40\u0E23\u0E35\u0E22\u0E19\u0E23\u0E39\u0E49",
  pinyin: "xu\u00e9x\u00ed", phonetic: "riian-r\u00f9u",
  pos: "v.", def: "\u901A\u8FC7\u7EC3\u4E60\u83B7\u5F97\u77E5\u8BC6\u6216\u6280\u80FD",
  defTh: "\u0E2D\u0E48\u0E32\u0E19\u0E2B\u0E19\u0E31\u0E07\u0E2A\u0E37\u0E2D\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E43\u0E2B\u0E49\u0E44\u0E14\u0E49\u0E04\u0E27\u0E32\u0E21\u0E23\u0E39\u0E49",
  exZh: "\u6211\u6BCF\u5929\u90FD\u5728\u5B66\u4E60\u6CF0\u8BED\u3002",
  exTh: "\u0E09\u0E31\u0E19\u0E40\u0E23\u0E35\u0E22\u0E19\u0E20\u0E32\u0E29\u0E32\u0E44\u0E17\u0E22\u0E17\u0E38\u0E01\u0E27\u0E31\u0E19",
};

const recentWords = [
  { zh: "\u4F60\u597D", th: "\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35", phonetic: "sa-w\u00e0t-dii", time: "10\u5206\u949F\u524D" },
  { zh: "\u8C22\u8C22", th: "\u0E02\u0E2D\u0E1A\u0E04\u0E38\u0E13", phonetic: "k\u0E14\u002E\u0011p-kun", time: "25\u5206\u949F\u524D" },
  { zh: "\u670B\u53CB", th: "\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E19", phonetic: "p\u00eE\u00EAn", time: "1\u5C0F\u65F6\u524D" },
  { zh: "\u5B66\u6821", th: "\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19", phonetic: "roong-riian", time: "2\u5C0F\u65F6\u524D" },
  { zh: "\u5403\u996D", th: "\u0E01\u0E34\u0E19\u0E02\u0E49\u0E32\u0E27", phonetic: "gin-k\u00e2ao", time: "\u6628\u5929" },
];

const wordDetail = {
  word: "\u0E01\u0E34\u0E19",
  romanization: "gin",
  romanization_source: "deepseek",
  sources: ["src_words_th", "src_words_volubilis", "src_words_orst"],
  sense_count: 3,
  senses: [
    {
      sense_id: 1, pos: "\u52A8\u8BCD", meaning: "\u5403\uFF1B\u98DF\u7528",
      register: "\u901A\u7528",
      examples: [
        { th: "\u0E09\u0E31\u0E19\u0E01\u0E34\u0E19\u0E02\u0E49\u0E32\u0E27\u0E41\u0E25\u0E49\u0E27", zh: "\u6211\u5DF2\u7ECF\u5403\u8FC7\u996D\u4E86" },
        { th: "\u0E01\u0E34\u0E19\u0E1C\u0E25\u0E44\u0E21\u0E49\u0E17\u0E38\u0E01\u0E27\u0E31\u0E19\u0E14\u0E35\u0E15\u0E48\u0E2D\u0E2A\u0E38\u0E02\u0E20\u0E32\u0E1E", zh: "\u6BCF\u5929\u5403\u6C34\u679C\u6709\u76CA\u5065\u5EB7" },
      ],
      segmented: [
        [
          { text: "\u0E09\u0E31\u0E19", pos: "\u4EE3\u8BCD", meaning: "\u6211" },
          { text: "\u0E01\u0E34\u0E19", pos: "\u52A8\u8BCD", meaning: "\u5403" },
          { text: "\u0E02\u0E49\u0E32\u0E27", pos: "\u540D\u8BCD", meaning: "\u7C73\u996D" },
          { text: "\u0E41\u0E25\u0E49\u0E27", pos: "\u52A9\u8BCD", meaning: "\u5DF2\u7ECF" },
        ],
        [
          { text: "\u0E01\u0E34\u0E19", pos: "\u52A8\u8BCD", meaning: "\u5403" },
          { text: "\u0E1C\u0E25\u0E44\u0E21\u0E49", pos: "\u540D\u8BCD", meaning: "\u6C34\u679C" },
          { text: "\u0E17\u0E38\u0E01\u0E27\u0E31\u0E19", pos: "\u526F\u8BCD", meaning: "\u6BCF\u5929" },
          { text: "\u0E14\u0E35", pos: "\u5F62\u5BB9\u8BCD", meaning: "\u597D" },
          { text: "\u0E15\u0E48\u0E2D", pos: "\u4ECB\u8BCD", meaning: "\u5BF9/\u5BF9\u4E8E" },
          { text: "\u0E2A\u0E38\u0E02\u0E20\u0E32\u0E1E", pos: "\u540D\u8BCD", meaning: "\u5065\u5EB7" },
        ],
      ],
      source: "ai",
    },
    {
      sense_id: 2, pos: "\u52A8\u8BCD", meaning: "\u559D\uFF08\u9152\uFF09\uFF0C\u996E\u9152",
      register: "\u53E3\u8BED",
      examples: [
        { th: "\u0E44\u0E1B\u0E01\u0E34\u0E19\u0E40\u0E2B\u0E25\u0E49\u0E32\u0E44\u0E2B\u0E21", zh: "\u53BB\u559D\u9152\u5417\uFF1F" },
      ],
      segmented: [
        [
          { text: "\u0E44\u0E1B", pos: "\u52A8\u8BCD", meaning: "\u53BB" },
          { text: "\u0E01\u0E34\u0E19", pos: "\u52A8\u8BCD", meaning: "\u559D" },
          { text: "\u0E40\u0E2B\u0E25\u0E49\u0E32", pos: "\u540D\u8BCD", meaning: "\u9152" },
          { text: "\u0E44\u0E2B\u0E21", pos: "\u52A9\u8BCD", meaning: "\u5417" },
        ],
      ],
      source: "ai",
    },
    {
      sense_id: 3, pos: "\u52A8\u8BCD", meaning: "\u8150\u8680\uFF1B\u4FB5\u8680",
      register: "\u4E66\u9762",
      examples: [
        { th: "\u0E01\u0E23\u0E14\u0E01\u0E34\u0E19\u0E40\u0E2B\u0E25\u0E47\u0E01", zh: "\u9178\u8150\u8680\u94C1" },
      ],
      segmented: [
        [
          { text: "\u0E01\u0E23\u0E14", pos: "\u540D\u8BCD", meaning: "\u9178" },
          { text: "\u0E01\u0E34\u0E19", pos: "\u52A8\u8BCD", meaning: "\u8150\u8680" },
          { text: "\u0E40\u0E2B\u0E25\u0E47\u0E01", pos: "\u540D\u8BCD", meaning: "\u94C1" },
        ],
      ],
      source: "user",
    },
  ],
  freq_tnc: 351980,
  freq_ttc: 46567,
  freq_phupha: 816073594,
  synonyms: [
    { word: "\u0E17\u0E32\u0E19", zh: "\u5403\uFF08\u793C\u8C8C\uFF09" },
    { word: "\u0E23\u0E31\u0E1A\u0E1B\u0E23\u0E30\u0E17\u0E32\u0E19", zh: "\u7528\u9910\uFF08\u6B63\u5F0F\uFF09" },
  ],
  antonyms: [
    { word: "\u0E2D\u0E14", zh: "\u7981\u98DF" },
  ],
  learner_associations: [
    { word: "\u0E23\u0E31\u0E1A\u0E1B\u0E23\u0E30\u0E17\u0E32\u0E19", note: "\u66F4\u6B63\u5F0F\u7684\u201C\u5403\u201D\uFF0C\u4E66\u9762\u8BED\u548C\u6B63\u5F0F\u573A\u5408\u4F7F\u7528" },
    { word: "\u0E02\u0E49\u0E32\u0E27", note: "\u7C73\u996D\uFF0C\u5403+\u0E02\u0E49\u0E32\u0E27 = \u5403\u996D\uFF0C\u6700\u5E38\u7528\u642D\u914D" },
    { word: "\u0E2B\u0E34\u0E27", note: "\u997F\uFF0C\u0E2B\u0E34\u0E27\u0E02\u0E49\u0E32\u0E27 = \u997F\u4E86\uFF08\u60F3\u5403\u996D\uFF09" },
    { word: "\u0E2D\u0E34\u0E48\u0E21", note: "\u9971\uFF0C\u0E01\u0E34\u0E19\u0E2D\u0E34\u0E48\u0E21 = \u5403\u9971\u4E86" },
  ],
  user_sentence_count: 3,
};

const wordBooks = [
  { name: "\u6CF0\u8BED\u521D\u7EA7 500\u8BCD", count: 500, learned: 287, color: "var(--c-teal)" },
  { name: "\u65E5\u5E38\u4F1A\u8BDD 300\u53E5", count: 300, learned: 124, color: "var(--c-rose)" },
  { name: "\u65C5\u884C\u6CF0\u8BED\u5FC5\u5907", count: 80, learned: 62, color: "var(--c-amber)" },
  { name: "\u5546\u52A1\u6CF0\u8BED\u6838\u5FC3", count: 200, learned: 45, color: "var(--c-gold)" },
];

const exercises = [
  { name: "\u9605\u8BFB\u7406\u89E3", desc: "\u6CF0\u6587\u9605\u8BFB", count: 18, icon: BookOpen, color: "var(--c-rose)" },
  { name: "\u5199\u4F5C\u7EC3\u4E60", desc: "\u9020\u53E5\u586B\u7A7A", count: 12, icon: PenTool, color: "var(--c-gold)" },
];

const weekDays = ["\u4E00", "\u4E8C", "\u4E09", "\u56DB", "\u4E94", "\u516D", "\u65E5"];
const weekDone = [true, true, true, true, false, false, false];

const vocabGrowth = [
  { month: "1\u6708", total: 320, new: 45 },
  { month: "2\u6708", total: 378, new: 58 },
  { month: "3\u6708", total: 445, new: 67 },
  { month: "4\u6708", total: 530, new: 85 },
  { month: "5\u6708", total: 612, new: 82 },
  { month: "6\u6708", total: 680, new: 68 },
];

const studyTimeData = [
  { day: "\u5468\u4E00", mins: 45 }, { day: "\u5468\u4E8C", mins: 30 },
  { day: "\u5468\u4E09", mins: 60 }, { day: "\u5468\u56DB", mins: 25 },
  { day: "\u5468\u4E94", mins: 50 }, { day: "\u5468\u516D", mins: 15 },
  { day: "\u5468\u65E5", mins: 40 },
];

const pieData = [
  { name: "\u5DF2\u638C\u63E1", value: 342, color: "var(--c-ok)" },
  { name: "\u5B66\u4E60\u4E2D", value: 198, color: "var(--c-gold)" },
  { name: "\u672A\u5B66", value: 140, color: "var(--c-p200)" },
];

const morphExamples = [
  { char: "\u0E40\u0E23\u0E35\u0E22\u0E19", meaning: "\u5B66\u4E60", compounds: ["\u0E19\u0E31\u0E01\u0E40\u0E23\u0E35\u0E22\u0E19 (\u5B66\u751F)", "\u0E23\u0E2D\u0E14\u0E40\u0E23\u0E35\u0E22\u0E19 (\u8BFE\u7A0B)", "\u0E40\u0E23\u0E35\u0E22\u0E19\u0E23\u0E39\u0E49 (\u5B66\u4E60)"] },
  { char: "\u0E01\u0E34\u0E19", meaning: "\u5403", compounds: ["\u0E01\u0E34\u0E19\u0E02\u0E49\u0E32\u0E27 (\u5403\u996D)", "\u0E01\u0E34\u0E19\u0E19\u0E49\u0E33 (\u559D\u6C34)", "\u0E01\u0E34\u0E19\u0E1B\u0E25\u0E32 (\u5403\u9C7C)"] },
  { char: "\u0E2B\u0E49\u0E2D\u0E07", meaning: "\u623F\u95F4", compounds: ["\u0E2B\u0E49\u0E2D\u0E07\u0E2A\u0E21\u0E38\u0E14 (\u56FE\u4E66\u9986)", "\u0E2B\u0E49\u0E2D\u0E07\u0E19\u0E2D\u0E19 (\u5367\u5BA4)", "\u0E2B\u0E49\u0E2D\u0E07\u0E04\u0E23\u0E31\u0E27 (\u5BA2\u5385)"] },
];

const grammarPatterns = [
  { pattern: "\u4E3B\u8BED + \u0E21\u0E35 + \u5BBE\u8BED", example: "\u0E09\u0E31\u0E19\u0E21\u0E35\u0E2B\u0E19\u0E31\u0E07\u0E2A\u0E37\u0E2D", zh: "\u6211\u6709\u4E66" },
  { pattern: "\u4E3B\u8BED + \u0E2D\u0E22\u0E32\u0E01 + \u52A8\u8BCD", example: "\u0E09\u0E31\u0E19\u0E2D\u0E22\u0E32\u0E01\u0E40\u0E23\u0E35\u0E22\u0E19\u0E20\u0E32\u0E29\u0E32\u0E44\u0E17\u0E22", zh: "\u6211\u60F3\u5B66\u6CF0\u8BED" },
  { pattern: "\u4E3B\u8BED + \u0E01\u0E33\u0E25\u0E31\u0E07 + \u52A8\u8BCD", example: "\u0E40\u0E02\u0E32\u0E01\u0E33\u0E25\u0E31\u0E07\u0E01\u0E34\u0E19\u0E02\u0E49\u0E32\u0E27", zh: "\u4ED6\u6B63\u5728\u5403\u996D" },
];

const heatmapLevels = [0,1,2,3,4,2,1,0,3,4,2,1,3,0,4,2,3,1,0,2,4,3,1,2,0,3,4,2,1,3,0,2,4,3,1];

/* ────────────────────────────────────────────
   REUSABLE SUB-COMPONENTS
   ──────────────────────────────────────────── */
const Card = ({ children, style, onClick }) => (
  <div onClick={onClick} style={{
    background: "var(--c-surface)", borderRadius: 16, padding: 20,
    border: `1px solid ${"var(--c-p100)"}`, transition: "all 0.2s ease",
    cursor: onClick ? "pointer" : "default", ...style,
  }}>
    {children}
  </div>
);

const Badge = ({ children, bg, fg, style }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", padding: "2px 10px",
    borderRadius: 20, fontSize: 11, fontWeight: 500,
    background: bg || "var(--c-p100)", color: fg || "var(--c-p700)", letterSpacing: "0.04em", ...style,
  }}>{children}</span>
);

const Btn = ({ children, variant = "primary", icon: Icon, onClick, style }) => {
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
    padding: "10px 18px", borderRadius: 12, fontSize: 14, fontWeight: 500,
    cursor: "pointer", transition: "all 0.2s ease", border: "none",
    fontFamily: "var(--zh-font), sans-serif",
  };
  const variants = {
    primary: { background: "var(--c-p600)", color: "#fff" },
    secondary: { background: "var(--c-p50)", color: "var(--c-p700)", border: `1px solid ${"var(--c-p200)"}` },
    ghost: { background: "transparent", color: "var(--c-p600)" },
    gold: { background: "var(--c-gold)", color: "#fff" },
    amber: { background: "var(--c-amber)", color: "#fff" },
    teal: { background: "var(--c-teal)", color: "#fff" },
  };
  return (
    <button onClick={onClick} style={{ ...base, ...variants[variant], ...style }}>
      {Icon && <Icon size={16} strokeWidth={IW} />}
      {children}
    </button>
  );
};

const SectionTitle = ({ children, action, onAction }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
    <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--c-p800)", margin: 0, fontFamily: "var(--zh-font), serif" }}>{children}</h2>
    {action && (
      <span onClick={onAction} style={{ fontSize: 12, color: "var(--c-p500)", cursor: "pointer", display: "flex", alignItems: "center", gap: 2 }}>
        {action} <ChevronRight size={14} strokeWidth={IW} />
      </span>
    )}
  </div>
);

const ProgressBar = ({ value, max, color, height = 5 }) => (
  <div style={{ width: "100%", height, borderRadius: height, background: "var(--c-p100)", overflow: "hidden" }}>
    <div style={{ width: `${(value / max) * 100}%`, height: "100%", borderRadius: height, background: color || "var(--c-p500)", transition: "width 0.5s ease" }} />
  </div>
);

const StatCard = ({ icon: Icon, label, value, sub, color }) => (
  <div style={{
    background: "var(--c-surface)", borderRadius: 12, padding: 12, flex: 1,
    border: `1px solid ${"var(--c-p100)"}`, display: "flex", flexDirection: "column", gap: 5,
    minWidth: 0,
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <div style={{ width: 28, height: 28, borderRadius: 7, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={14} strokeWidth={IW} color={color} />
      </div>
      <span style={{ fontSize: 10, color: "var(--c-s500)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
    </div>
    <div>
      <span style={{ fontSize: 20, fontWeight: 700, color: "var(--c-p800)" }}>{value}</span>
      {sub && <span style={{ fontSize: 10, color: "var(--c-s300)", marginLeft: 3 }}>{sub}</span>}
    </div>
  </div>
);

/* ── Global TTS utility using Web Speech API ── */
let _currentUtterance = null;
const speak = (text, lang = "th-TH", rate = 0.9) => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = lang;
  utt.rate = rate;
  _currentUtterance = utt;
  window.speechSynthesis.speak(utt);
};
const stopSpeak = () => {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  _currentUtterance = null;
};

const AudioBtn = ({ text, lang, label, color, rate }) => {
  const [speaking, setSpeaking] = useState(false);
  const handleClick = () => {
    if (speaking) { stopSpeak(); setSpeaking(false); return; }
    if (!text) return;
    const uttLang = lang || "th-TH";
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = uttLang;
    utt.rate = rate || 0.9;
    utt.onend = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utt);
  };
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20, background: "var(--c-p50)", border: `1px solid ${"var(--c-p100)"}`, cursor: "pointer" }}
      onClick={handleClick}>
      {speaking ? <Pause size={13} strokeWidth={IW} color={color || "var(--c-p600)"} /> : <Play size={13} strokeWidth={IW} color={color || "var(--c-p600)"} />}
      {label && <span style={{ fontSize: 12, color: color || "var(--c-p600)", fontWeight: 500 }}>{label}</span>}
    </div>
  );
};

/* Small inline TTS play button for examples */
const TtsPlay = ({ text, lang = "th-TH", size = 12 }) => {
  const [speaking, setSpeaking] = useState(false);
  const handleClick = (e) => {
    e.stopPropagation();
    if (speaking) { stopSpeak(); setSpeaking(false); return; }
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = lang;
    utt.rate = 0.9;
    utt.onend = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utt);
  };
  return (
    <div onClick={handleClick} style={{ cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center" }}>
      {speaking ? <Pause size={size} strokeWidth={IW} color={"var(--c-p500)"} /> : <Play size={size} strokeWidth={IW} color={"var(--c-p500)"} />}
    </div>
  );
};

const HeatCell = ({ level, size = 12 }) => {
  const colors = ["var(--c-p100)", "var(--c-tealL)", "var(--c-teal)", "var(--c-ok)", "var(--c-gold)"];
  return <div style={{ width: size, height: size, borderRadius: 3, background: colors[level] || "var(--c-p100)" }} />;
};

const PageHeader = ({ title, subtitle }) => (
  <div style={{ padding: "16px 20px 12px" }}>
    <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--c-p800)", margin: 0, fontFamily: "var(--zh-font), serif" }}>{title}</h1>
    {subtitle && <p style={{ fontSize: 13, color: "var(--c-s500)", margin: "4px 0 0" }}>{subtitle}</p>}
  </div>
);

/* ────────────────────────────────────────────
   PAGE: HOME (Mobile-first)
   ──────────────────────────────────────────── */
const HomePage = ({ userId, onNavigate, onWordTap, onSelectSentence }) => {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [dailyData, setDailyData] = useState(null);
  const [dailyRefreshing, setDailyRefreshing] = useState(false);
  const [dailySentence, setDailySentence] = useState(null);
  const [sentenceRefreshing, setSentenceRefreshing] = useState(false);
  const [recentData, setRecentData] = useState([]);
  const [streak, setStreak] = useState(0);
  const [dictCount, setDictCount] = useState(null);

  const loadRandomWord = async () => {
    setDailyRefreshing(true);
    const d = await getDailyWord();
    if (d) setDailyData(transformWordData(d));
    setDailyRefreshing(false);
  };

  const loadRandomSentence = async () => {
    setSentenceRefreshing(true);
    const s = await getDailySentence();
    if (s) setDailySentence(s);
    setSentenceRefreshing(false);
  };

  /* ── Fetch daily word + sentence + recent words + streak + dict count from Supabase ── */
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    getDailyWord().then(d => { if (d) setDailyData(transformWordData(d)); });
    getDailySentence().then(s => { if (s) setDailySentence(s); });
    getRecentWords(8).then(rows => { setRecentData(rows.map(transformSearchResult).filter(Boolean)); });
    if (userId && userId !== 'anonymous') {
      getStreak(userId).then(setStreak);
    }
    getDictionaryCount().then(setDictCount);
  }, [userId]);

  /* ── Debounced search (internal state) ── */
  useEffect(() => {
    if (!query.trim() || !isSupabaseConfigured) { setSearchResults([]); return; }
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      const results = await searchWords(query.trim(), 15);
      setSearchResults(results.map(transformSearchResult).filter(Boolean));
      setSearchLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  /* ── Display helpers ── */
  const dw = dailyData;
  const dwSense = dw?.senses?.[0];
  const dwExample = dwSense?.examples?.[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "0 16px 16px" }}>
      {/* Search bar */}
      <div style={{ position: "relative" }}>
        <Search size={18} strokeWidth={IW} color={"var(--c-s300)"} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }} />
        <input
          value={query} onChange={e => setQuery(e.target.value)}
          placeholder={"\u8F93\u5165\u4E2D\u6587\u6216\u6CF0\u6587\u641C\u7D22..."}
          style={{
            width: "100%", padding: "14px 44px 14px 44px", borderRadius: 14,
            border: `1.5px solid ${"var(--c-p200)"}`, background: "var(--c-surface)", fontSize: 15,
            color: "var(--c-p800)", outline: "none", transition: "border-color 0.2s",
            fontFamily: "var(--zh-font), sans-serif", boxSizing: "border-box",
          }}
          onFocus={e => e.target.style.borderColor = "var(--c-p500)"}
          onBlur={e => e.target.style.borderColor = "var(--c-p200)"}
        />
        {query ? <X size={16} strokeWidth={IW} color={"var(--c-s300)"} style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", cursor: "pointer" }} onClick={() => { setQuery(""); setSearchResults([]); }} /> : <Mic size={16} strokeWidth={IW} color={"var(--c-s300)"} style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", cursor: "pointer" }} />}
      </div>

      {/* Search results overlay */}
      {query.trim() && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {searchLoading && <div style={{ textAlign: "center", padding: 16, color: "var(--c-s500)", fontSize: 13 }}>{"\u641C\u7D22\u4E2D..."}</div>}
          {!searchLoading && searchResults.length === 0 && (
            <div style={{ textAlign: "center", padding: "20px 16px" }}>
              <div style={{ fontSize: 13, color: "var(--c-s500)", marginBottom: 12 }}>{"未找到「" + query.trim() + "」"}</div>
              <div onClick={() => onWordTap(query.trim())} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "10px 20px", borderRadius: 12, cursor: "pointer",
                background: "var(--c-teal)", color: "#fff", fontSize: 13, fontWeight: 600,
                fontFamily: "var(--zh-font), sans-serif",
              }}>
                <Sparkles size={14} strokeWidth={IW} />
                {"通过 AI 新增词条信息"}
              </div>
            </div>
          )}
          {searchResults.map((r, i) => (
            <div key={r.word + i} onClick={() => onWordTap(r.word)} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 16px", borderRadius: 14, background: "var(--c-surface)",
              border: `1px solid ${"var(--c-p100)"}`, cursor: "pointer",
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: "var(--c-teal)", fontFamily: "var(--th-font), sans-serif" }}>{r.word}</span>
                  {r.pos && <Badge bg={"var(--c-p100)"} fg={"var(--c-p700)"} style={{ fontSize: 9 }}>{r.pos}</Badge>}
                  {r.sense_count > 1 && <span style={{ fontSize: 10, color: "var(--c-s400)" }}>{r.sense_count}{"\u4E49"}</span>}
                </div>
                {r.meaning && <div style={{ fontSize: 13, color: "var(--c-p700)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.meaning}</div>}
              </div>
              <ChevronRight size={14} strokeWidth={IW} color={"var(--c-s300)"} style={{ flexShrink: 0 }} />
            </div>
          ))}
          {/* AI search button — always visible at bottom of results (Bug 3) */}
          {!searchLoading && searchResults.length > 0 && (
            <div onClick={() => onWordTap(query.trim())} style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "12px 20px", borderRadius: 12, cursor: "pointer", marginTop: 2,
              background: "color-mix(in srgb, var(--c-teal) 10%, transparent)",
              border: `1px dashed ${"var(--c-teal)"}`,
            }}>
              <Sparkles size={13} strokeWidth={IW} color={"var(--c-teal)"} />
              <span style={{ fontSize: 12, color: "var(--c-teal)", fontWeight: 600 }}>{"没找到想要的？试试 AI 搜索"}</span>
            </div>
          )}
        </div>
      )}

      {/* When not searching, show dashboard */}
      {!query.trim() && <>
        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <StatCard icon={BookOpen} label={"\u8BCD\u5E93\u8BCD\u6761"} value={dictCount != null ? dictCount.toLocaleString() : (isSupabaseConfigured ? "\u2014" : "0")} sub={""} color={"var(--c-teal)"} />
          <StatCard icon={Flame} label={"\u8FDE\u7EED\u6253\u5361"} value={streak > 0 ? String(streak) : "\u2014"} sub={"\u5929"} color={"var(--c-gold)"} />
        </div>

        {/* Daily Word */}
        {dw && (
          <Card onClick={() => onWordTap(dw.word)}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <Badge bg={"var(--c-goldL)"} fg={"var(--c-gold)"}>{"\u6BCF\u65E5\u4E00\u8BCD"}</Badge>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "var(--c-s300)" }}>{new Date().toLocaleDateString("zh-CN")}</span>
                <div onClick={(e) => { e.stopPropagation(); loadRandomWord(); }} style={{ cursor: "pointer", display: "flex", alignItems: "center", padding: 4 }}>
                  <RefreshCw size={14} strokeWidth={IW} color={"var(--c-s400)"} style={{ animation: dailyRefreshing ? "spin 0.8s linear infinite" : "none" }} />
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--c-p900)", fontFamily: "var(--th-font), serif", letterSpacing: "0.04em" }}>{dw.word}</div>
              <div onClick={(e) => { e.stopPropagation(); speak(dw.word, "th-TH", 0.85); }} style={{ cursor: "pointer", display: "flex", alignItems: "center" }}>
                <Play size={16} strokeWidth={IW} color={"var(--c-teal)"} fill={"var(--c-teal)"} />
              </div>
            </div>
            {dw.romanization && <div style={{ fontSize: 13, color: "var(--c-teal)", fontFamily: "monospace", fontStyle: "italic", marginTop: 2 }}>{dw.romanization}</div>}
            {dwSense && (
              <>
                <div style={{ fontSize: 14, color: "var(--c-p700)", lineHeight: 1.6, marginTop: 10 }}>
                  {dwSense.pos && <Badge bg={"var(--c-p100)"} fg={"var(--c-p700)"} style={{ fontSize: 10, marginRight: 6 }}>{dwSense.pos}</Badge>}
                  {dwSense.meaning}
                </div>
                {dwExample && (
                  <div style={{ borderTop: `1px solid ${"var(--c-p100)"}`, marginTop: 12, paddingTop: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ fontSize: 13, color: "var(--c-teal)", flex: 1 }}>{dwExample.th}</div>
                      <div onClick={(e) => { e.stopPropagation(); speak(dwExample.th, "th-TH", 0.85); }} style={{ cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}>
                        <Play size={12} strokeWidth={IW} color={"var(--c-teal)"} fill={"var(--c-teal)"} />
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--c-p700)", marginTop: 3 }}>{dwExample.zh}</div>
                  </div>
                )}
              </>
            )}
          </Card>
        )}

        {/* Daily Sentence */}
        {dailySentence && (
          <Card onClick={() => { if (onSelectSentence) onSelectSentence(dailySentence); }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <Badge bg={"color-mix(in srgb, var(--c-teal) 15%, transparent)"} fg={"var(--c-teal)"}>{"\u6BCF\u65E5\u4E00\u53E5"}</Badge>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {dailySentence.category && (
                  <Badge bg={"var(--c-p100)"} fg={"var(--c-p700)"} style={{ fontSize: 9 }}>
                    {dailySentence.category === "idioms" ? "俗语" : dailySentence.category === "buddhist" ? "佛教用语" : "日常用语"}
                  </Badge>
                )}
                <div onClick={(e) => { e.stopPropagation(); loadRandomSentence(); }} style={{ cursor: "pointer", display: "flex", alignItems: "center", padding: 4 }}>
                  <RefreshCw size={14} strokeWidth={IW} color={"var(--c-s400)"} style={{ animation: sentenceRefreshing ? "spin 0.8s linear infinite" : "none" }} />
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--c-p900)", fontFamily: "var(--th-font), sans-serif", flex: 1, lineHeight: 1.5 }}>{dailySentence.text}</div>
              <div onClick={(e) => { e.stopPropagation(); speak(dailySentence.text, "th-TH", 0.85); }} style={{ cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0, marginTop: 2 }}>
                <Play size={14} strokeWidth={IW} color={"var(--c-teal)"} fill={"var(--c-teal)"} />
              </div>
            </div>
            {dailySentence.actual_meaning && (
              <div style={{ fontSize: 13, color: "var(--c-p700)", marginTop: 8, lineHeight: 1.5 }}>{dailySentence.actual_meaning}</div>
            )}
            {!dailySentence.actual_meaning && dailySentence.literal_meaning && (
              <div style={{ fontSize: 13, color: "var(--c-p700)", marginTop: 8, lineHeight: 1.5 }}>{dailySentence.literal_meaning}</div>
            )}
          </Card>
        )}

        {/* Recent words from Supabase */}
        {recentData.length > 0 && (
          <div>
            <SectionTitle action={"\u66F4\u591A"}>{"\u6700\u8FD1\u5BCC\u5316\u8BCD\u6761"}</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recentData.map((w, i) => (
                <div key={w.word + i} onClick={() => onWordTap(w.word)} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 16px", borderRadius: 14, background: "var(--c-surface)",
                  border: `1px solid ${"var(--c-p100)"}`, cursor: "pointer",
                }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 600, color: "var(--c-teal)", fontFamily: "var(--th-font), sans-serif" }}>{w.word}</span>
                      {w.pos && <Badge bg={"var(--c-p100)"} fg={"var(--c-p700)"} style={{ fontSize: 9 }}>{w.pos}</Badge>}
                    </div>
                    {w.meaning && <div style={{ fontSize: 13, color: "var(--c-p700)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.meaning}</div>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {w.romanization && <span style={{ fontSize: 10, color: "var(--c-s300)", fontFamily: "monospace" }}>{w.romanization}</span>}
                    <ChevronRight size={14} strokeWidth={IW} color={"var(--c-s300)"} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </>}
    </div>
  );
};

/* ────────────────────────────────────────────
   PAGE: WORD BOOK (单词本)
   ──────────────────────────────────────────── */
const WordBookPage = ({ userId, onWordTap }) => {
  const [tab, setTab] = useState("recent");
  const [recentData, setRecentData] = useState([]);
  const [bookmarksData, setBookmarksData] = useState([]);
  const [foldersData, setFoldersData] = useState([]);
  const [folders, setFolders] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  /* ── Fetch recent words, bookmarks, and folders from Supabase ── */
  useEffect(() => {
    if (!userId || userId === 'anonymous') return;
    if (!isSupabaseConfigured) return;
    getUserRecentWords(userId, 20).then(rows => {
      setRecentData((rows || []).map(transformSearchResult).filter(Boolean));
    });
    getBookmarks(userId).then(rows => {
      setBookmarksData(rows || []);
    });
    getFolders(userId).then(rows => {
      const mapped = (rows || []).map(f => ({
        id: f.id, name: f.name, color: f.color, count: f.word_count || 0,
      }));
      setFoldersData(mapped);
      setFolders(mapped);
    });
  }, [userId]);

  /* ── Folder CRUD helpers ── */
  const handleCreateFolder = (name) => {
    const colors = ["var(--c-teal)", "var(--c-rose)", "var(--c-gold)", "var(--c-amber)", "var(--c-info)"];
    const color = colors[folders.length % colors.length];
    // Optimistic update
    const tempFolder = { id: `temp-${Date.now()}`, name, count: 0, color };
    setFolders(prev => [...prev, tempFolder]);
    if (isSupabaseConfigured && userId && userId !== 'anonymous') {
      createFolder(userId, name, color).then(folder => {
        if (folder) {
          setFolders(prev => prev.map(f =>
            f.id === tempFolder.id ? { id: folder.id, name: folder.name, color: folder.color, count: folder.word_count || 0 } : f
          ));
        }
      }).catch(() => {
        setFolders(prev => prev.filter(f => f.id !== tempFolder.id));
      });
    }
  };

  const handleRenameFolder = (folderId, newName) => {
    setFolders(prev => prev.map(f => f.id === folderId ? { ...f, name: newName } : f));
    if (isSupabaseConfigured) {
      renameFolder(folderId, newName).catch(() => {});
    }
  };

  const handleDeleteFolder = (folderId) => {
    setFolders(prev => prev.filter(f => f.id !== folderId));
    if (isSupabaseConfigured) {
      deleteFolder(folderId).catch(() => {});
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 16px 16px" }}>
      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 6, background: "var(--c-surfaceAlt)", borderRadius: 12, padding: 4 }}>
        {[
          { key: "recent", label: "\u6700\u8FD1\u67E5\u8BCD" },
          { key: "starred", label: "\u6211\u7684\u6536\u85CF" },
          { key: "books", label: "\u8BCD\u4E66" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: "8px 0", borderRadius: 10, border: "none", cursor: "pointer",
            background: tab === t.key ? "var(--c-surface)" : "transparent",
            color: tab === t.key ? "var(--c-p800)" : "var(--c-s500)",
            fontSize: 13, fontWeight: tab === t.key ? 600 : 400,
            boxShadow: tab === t.key ? "0 1px 3px rgba(61,43,31,0.08)" : "none",
            fontFamily: "var(--zh-font), sans-serif", transition: "all 0.2s",
          }}>{t.label}</button>
        ))}
      </div>

      {(tab === "recent" || tab === "starred") && (
        <>
          {/* Search */}
          <div style={{ position: "relative" }}>
            <Search size={16} strokeWidth={IW} color={"var(--c-s300)"} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
            <input placeholder={tab === "recent" ? "\u641C\u7D22\u5386\u53F2\u67E5\u8BCD..." : "\u641C\u7D22\u6536\u85CF\u8BCD\u6C47..."} style={{
              width: "100%", padding: "12px 16px 12px 38px", borderRadius: 12,
              border: `1px solid ${"var(--c-p100)"}`, background: "var(--c-input)", fontSize: 14,
              color: "var(--c-p800)", outline: "none", fontFamily: "var(--zh-font), sans-serif",
              boxSizing: "border-box",
            }} />
          </div>

          {/* Word list — recent tab */}
          {tab === "recent" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recentData.length === 0 && (
                <div style={{ textAlign: "center", padding: 24, color: "var(--c-s400)", fontSize: 13 }}>
                  {isSupabaseConfigured ? "暂无记录" : "未连接数据库"}
                </div>
              )}
              {recentData.map((w, i) => (
                <div key={w.word + i} onClick={() => onWordTap(w.word)} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 16px", borderRadius: 14, background: "var(--c-surface)",
                  border: `1px solid ${"var(--c-p100)"}`, cursor: "pointer",
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 600, color: "var(--c-teal)", fontFamily: "var(--th-font), sans-serif" }}>{w.word}</span>
                      {w.pos && <Badge bg={"var(--c-p100)"} fg={"var(--c-p700)"} style={{ fontSize: 9 }}>{w.pos}</Badge>}
                      {w.sense_count > 1 && <span style={{ fontSize: 10, color: "var(--c-s400)" }}>{w.sense_count}{"义"}</span>}
                    </div>
                    {w.meaning && <div style={{ fontSize: 13, color: "var(--c-p700)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.meaning}</div>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {w.romanization && <span style={{ fontSize: 10, color: "var(--c-s300)", fontFamily: "monospace" }}>{w.romanization}</span>}
                    <ChevronRight size={14} strokeWidth={IW} color={"var(--c-s300)"} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Word list — starred / bookmarks tab */}
          {tab === "starred" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {bookmarksData.length === 0 && (
                <div style={{ textAlign: "center", padding: 24, color: "var(--c-s400)", fontSize: 13 }}>
                  {isSupabaseConfigured ? "暂无收藏" : "未连接数据库"}
                </div>
              )}
              {bookmarksData.map((item, i) => (
                <div key={item.word + i} onClick={() => onWordTap(item.word)} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 16px", borderRadius: 14, background: "var(--c-surface)",
                  border: `1px solid ${"var(--c-p100)"}`, cursor: "pointer",
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 600, color: "var(--c-teal)", fontFamily: "var(--th-font), sans-serif" }}>{item.word}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Star size={14} strokeWidth={IW} color={"var(--c-gold)"} fill={"var(--c-gold)"} />
                    <ChevronRight size={14} strokeWidth={IW} color={"var(--c-s300)"} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "books" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* System word books */}
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-s500)", paddingLeft: 2 }}>{"\u7CFB\u7EDF\u8BCD\u4E66"}</div>
          {wordBooks.map((book, i) => (
            <Card key={`wb-${i}`} style={{ padding: 14 }} onClick={() => {}}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: `${book.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <BookOpen size={14} strokeWidth={IW} color={book.color} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)" }}>{book.name}</div>
                </div>
                <Badge bg={`${book.color}18`} fg={book.color}>{book.count}{"\u8BCD"}</Badge>
              </div>
              <ProgressBar value={book.learned} max={book.count} color={book.color} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontSize: 11, color: "var(--c-s300)" }}>{"\u5DF2\u5B66"} {book.learned}/{book.count}</span>
                <span style={{ fontSize: 11, color: book.color, fontWeight: 500 }}>{Math.round(book.learned / book.count * 100)}%</span>
              </div>
            </Card>
          ))}

          {/* User folders */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, paddingLeft: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-s500)" }}>{"\u6211\u7684\u6587\u4EF6\u5939"}</span>
            <div onClick={() => setShowAddFolder(true)} style={{
              display: "flex", alignItems: "center", gap: 3, padding: "4px 10px",
              borderRadius: 8, background: "var(--c-p50)", border: `1px dashed ${"var(--c-p200)"}`,
              cursor: "pointer", fontSize: 12, color: "var(--c-p600)", fontWeight: 500,
            }}>
              <Plus size={12} strokeWidth={IW} color={"var(--c-p500)"} />
              <span>{"\u65B0\u5EFA"}</span>
            </div>
          </div>

          {/* Add folder input */}
          {showAddFolder && (
            <Card style={{ padding: 12, background: "var(--c-p50)", border: `1px solid ${"var(--c-p200)"}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  autoFocus
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  placeholder={"\u6587\u4EF6\u5939\u540D\u79F0..."}
                  style={{
                    flex: 1, padding: "8px 12px", borderRadius: 8,
                    border: `1px solid ${"var(--c-p200)"}`, background: "var(--c-surface)",
                    fontSize: 13, color: "var(--c-p800)", outline: "none",
                    fontFamily: "var(--zh-font), sans-serif",
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter" && newFolderName.trim()) {
                      handleCreateFolder(newFolderName.trim());
                      setNewFolderName("");
                      setShowAddFolder(false);
                    }
                    if (e.key === "Escape") { setShowAddFolder(false); setNewFolderName(""); }
                  }}
                />
                <div onClick={() => {
                  if (newFolderName.trim()) {
                    handleCreateFolder(newFolderName.trim());
                    setNewFolderName("");
                    setShowAddFolder(false);
                  }
                }} style={{
                  width: 32, height: 32, borderRadius: 8, background: "var(--c-teal)",
                  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                }}>
                  <Check size={14} strokeWidth={2} color="#fff" />
                </div>
                <div onClick={() => { setShowAddFolder(false); setNewFolderName(""); }} style={{
                  width: 32, height: 32, borderRadius: 8, background: "var(--c-surfaceAlt)",
                  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                }}>
                  <X size={14} strokeWidth={IW} color={"var(--c-s500)"} />
                </div>
              </div>
            </Card>
          )}

          {/* Folder cards */}
          {folders.map(folder => (
            <Card key={folder.id} style={{ padding: 14 }}>
              {editingId === folder.id ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    style={{
                      flex: 1, padding: "8px 12px", borderRadius: 8,
                      border: `1px solid ${"var(--c-p200)"}`, background: "var(--c-surface)",
                      fontSize: 14, color: "var(--c-p800)", outline: "none",
                      fontFamily: "var(--zh-font), sans-serif", fontWeight: 600,
                    }}
                    onKeyDown={e => {
                      if (e.key === "Enter" && editName.trim()) {
                        handleRenameFolder(folder.id, editName.trim());
                        setEditingId(null); setEditName("");
                      }
                      if (e.key === "Escape") { setEditingId(null); setEditName(""); }
                    }}
                  />
                  <div onClick={() => {
                    if (editName.trim()) {
                      handleRenameFolder(folder.id, editName.trim());
                      setEditingId(null); setEditName("");
                    }
                  }} style={{
                    width: 30, height: 30, borderRadius: 8, background: "var(--c-teal)",
                    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                  }}>
                    <Check size={13} strokeWidth={2} color="#fff" />
                  </div>
                  <div onClick={() => { setEditingId(null); setEditName(""); }} style={{
                    width: 30, height: 30, borderRadius: 8, background: "var(--c-surfaceAlt)",
                    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                  }}>
                    <X size={13} strokeWidth={IW} color={"var(--c-s500)"} />
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 10, background: `${folder.color}15`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Folder size={16} strokeWidth={IW} color={folder.color} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)" }}>{folder.name}</div>
                      <div style={{ fontSize: 11, color: "var(--c-s300)", marginTop: 1 }}>{folder.count} {"\u8BCD"}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div onClick={() => { setEditingId(folder.id); setEditName(folder.name); }} style={{
                      width: 28, height: 28, borderRadius: 7, background: "var(--c-surfaceAlt)",
                      display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                    }}>
                      <Pencil size={12} strokeWidth={IW} color={"var(--c-s500)"} />
                    </div>
                    <div onClick={() => handleDeleteFolder(folder.id)} style={{
                      width: 28, height: 28, borderRadius: 7, background: "var(--c-surfaceAlt)",
                      display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                    }}>
                      <Trash2 size={12} strokeWidth={IW} color={"var(--c-err)"} />
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}

          {folders.length === 0 && !showAddFolder && (
            <div style={{ textAlign: "center", padding: "24px 0", color: "var(--c-s400)", fontSize: 13 }}>
              {"\u8FD8\u6CA1\u6709\u6587\u4EF6\u5939\uFF0C\u70B9\u51FB\u201C\u65B0\u5EFA\u201D\u521B\u5EFA\u4E00\u4E2A\u5427"}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ────────────────────────────────────────────
   PAGE: WORD DETAIL — compact cards, segmented examples,
   error report popovers, clickable synonyms/associations
   ──────────────────────────────────────────── */
const WordDetailPage = ({ userId, onBack, onWordTap, wordData }) => {
  const wd = wordData || wordDetail; // wordDetail mock kept as dev fallback
  const [bookmarked, setBookmarked] = useState(false);
  const [expandedSenses, setExpandedSenses] = useState([true, true, true]);
  const [freqTab, setFreqTab] = useState("ttc");
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [wordBookFolders, setWordBookFolders] = useState([]);
  const [lastUsedFolder, setLastUsedFolder] = useState(null);

  // Check bookmark status and record lookup on mount
  useEffect(() => {
    if (!wd?.word || !userId || userId === 'anonymous') return;
    isBookmarked(userId, wd.word).then(setBookmarked);
    recordWordLookup(userId, wd.word);
  }, [wd?.word, userId]);

  // Load word book folders for bookmark selection
  useEffect(() => {
    if (!userId || userId === 'anonymous') return;
    getFolders(userId).then(rows => {
      const mapped = (rows || []).map(f => ({
        id: f.id, name: f.name, color: f.color, count: f.word_count || 0,
      }));
      if (mapped.length === 0) {
        // Create default word book if none exist
        if (isSupabaseConfigured) {
          createFolder(userId, "默认单词本", "var(--c-teal)").then(folder => {
            if (folder) {
              setWordBookFolders([{ id: folder.id, name: folder.name, color: folder.color, count: 0 }]);
              setLastUsedFolder(folder.id);
            }
          });
        }
      } else {
        setWordBookFolders(mapped);
        // Load last used folder from settings
        getUserSettings(userId).then(s => {
          if (s?.last_folder_id) setLastUsedFolder(s.last_folder_id);
          else setLastUsedFolder(mapped[0].id);
        });
      }
    });
  }, [userId]);

  /* ── error report state ── */
  const [reportSection, setReportSection] = useState(null);
  const [reportItem, setReportItem] = useState(null);
  const [reportStatus, setReportStatus] = useState(null);

  /* ── word popover state (segmentation) ── */
  const [wordPopover, setWordPopover] = useState(null);
  const [popoverWordData, setPopoverWordData] = useState({}); // cache: { "word": { pos, meaning, loading, notFound } }

  const handlePopoverWordClick = async (tokText, senseIdx, exIdx, tokenIdx) => {
    const isOpen = wordPopover && wordPopover.senseIdx === senseIdx && wordPopover.exIdx === exIdx && wordPopover.tokenIdx === tokenIdx;
    if (isOpen) { setWordPopover(null); return; }
    setWordPopover({ senseIdx, exIdx, tokenIdx, text: tokText });
    // If already cached, skip fetch
    if (popoverWordData[tokText]) return;
    // Mark as loading
    setPopoverWordData(prev => ({ ...prev, [tokText]: { loading: true } }));
    try {
      const row = await getWordByThai(tokText);
      if (row) {
        const firstSense = Array.isArray(row.senses) && row.senses[0] ? row.senses[0] : {};
        setPopoverWordData(prev => ({ ...prev, [tokText]: { pos: firstSense.pos || "", meaning: firstSense.meaning || "", loading: false } }));
      } else {
        setPopoverWordData(prev => ({ ...prev, [tokText]: { pos: "", meaning: "", loading: false, notFound: true } }));
      }
    } catch (e) {
      setPopoverWordData(prev => ({ ...prev, [tokText]: { pos: "", meaning: "", loading: false, notFound: true } }));
    }
  };

  const toggleSense = (idx) => {
    const next = [...expandedSenses];
    next[idx] = !next[idx];
    setExpandedSenses(next);
  };

  /* ── report helpers ── */
  const openReport = (section) => {
    setReportSection(reportSection === section ? null : section);
    setReportItem(null);
    setReportStatus(null);
  };
  const submitReport = (method) => {
    console.log("[report]", { section: reportSection, item: reportItem, method });
    setReportStatus("done");
    setTimeout(() => { setReportSection(null); setReportItem(null); setReportStatus(null); }, 1200);
  };

  /* ── ReportPopover inline component ── */
  const ReportPopover = ({ items }) => (
    <div style={{
      position: "absolute", top: "100%", right: 0, zIndex: 100,
      background: "var(--c-surface)", borderRadius: 12, border: `1px solid ${"var(--c-p100)"}`,
      boxShadow: "0 4px 16px rgba(61,43,31,0.12)", padding: 12, marginTop: 4,
      minWidth: 220, maxWidth: 300,
    }}>
      {reportStatus === "done" ? (
        <div style={{ textAlign: "center", padding: "8px 0", color: "var(--c-ok)", fontSize: 14, fontWeight: 600 }}>
          {"\u5DF2\u66F4\u6B63 \u2713"}
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: "var(--c-p600)", fontWeight: 600, marginBottom: 8 }}>{"\u9009\u62E9\u9519\u8BEF\u9879"}</div>
          {items.map((item, idx) => (
            <div key={idx} onClick={() => setReportItem(idx)} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "6px 4px",
              cursor: "pointer", borderRadius: 6, background: reportItem === idx ? "var(--c-p50)" : "transparent",
            }}>
              <div style={{
                width: 16, height: 16, borderRadius: 8,
                border: `2px solid ${reportItem === idx ? "var(--c-teal)" : "var(--c-s300)"}`,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                {reportItem === idx && <div style={{ width: 8, height: 8, borderRadius: 4, background: "var(--c-teal)" }} />}
              </div>
              <span style={{ fontSize: 12, color: "var(--c-p700)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item}</span>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <div onClick={() => reportItem !== null && submitReport("ai")} style={{
              flex: 1, padding: "6px 0", borderRadius: 8, textAlign: "center", fontSize: 11, fontWeight: 600,
              background: reportItem !== null ? "var(--c-teal)" : "var(--c-p100)", color: reportItem !== null ? "#fff" : "var(--c-s300)",
              cursor: reportItem !== null ? "pointer" : "default",
            }}>{"AI \u66F4\u6B63"}</div>
            <div onClick={() => reportItem !== null && submitReport("api")} style={{
              flex: 1, padding: "6px 0", borderRadius: 8, textAlign: "center", fontSize: 11, fontWeight: 600,
              background: reportItem !== null ? "var(--c-info)" : "var(--c-p100)", color: reportItem !== null ? "#fff" : "var(--c-s300)",
              cursor: reportItem !== null ? "pointer" : "default",
            }}>{"\u7FFB\u8BD1API \u66F4\u6B63"}</div>
          </div>
        </>
      )}
    </div>
  );

  /* ── 映射表 ── */
  const sourceMap = {
    src_words_th: { label: "\u4E3B\u8BCD\u8868", bg: "var(--c-infoL)", fg: "var(--c-info)" },
    src_words_thai2fit: { label: "thai2fit", bg: "var(--c-s100)", fg: "var(--c-s700)" },
    src_words_orst: { label: "\u7687\u5BB6\u5B66\u4F1A", bg: "var(--c-goldL)", fg: "var(--c-gold)" },
    src_words_volubilis: { label: "Volubilis", bg: "var(--c-tealL)", fg: "var(--c-teal)" },
    src_words_icu: { label: "ICU \u5206\u8BCD", bg: "#E8DEF0", fg: "#7B5EA7" },
    src_words_wikipedia: { label: "\u7EF4\u57FA\u767E\u79D1", bg: "var(--c-errL)", fg: "var(--c-err)" },
    src_words_etcc: { label: "\u5B57\u7B26\u7C07", bg: "var(--c-s100)", fg: "var(--c-s500)" },
  };

  const posColor = (pos) => {
    if (pos === "\u52A8\u8BCD") return { bg: "var(--c-amberL)", fg: "var(--c-amber)" };
    if (pos === "\u540D\u8BCD") return { bg: "var(--c-infoL)", fg: "var(--c-info)" };
    if (pos === "\u5F62\u5BB9\u8BCD") return { bg: "var(--c-okL)", fg: "var(--c-ok)" };
    if (pos === "\u526F\u8BCD") return { bg: "var(--c-roseL)", fg: "var(--c-rose)" };
    return { bg: "var(--c-p100)", fg: "var(--c-p700)" };
  };

  const regColor = (reg) => {
    if (reg === "\u901A\u7528") return { bg: "var(--c-s100)", fg: "var(--c-s700)" };
    if (reg === "\u53E3\u8BED") return { bg: "var(--c-amberL)", fg: "var(--c-amber)" };
    if (reg === "\u6B63\u5F0F") return { bg: "var(--c-infoL)", fg: "var(--c-info)" };
    if (reg === "\u4FF3\u8BED") return { bg: "var(--c-errL)", fg: "var(--c-err)" };
    if (reg === "\u4E66\u9762") return { bg: "#E8DEF0", fg: "#7B5EA7" };
    return { bg: "var(--c-p100)", fg: "var(--c-p700)" };
  };

  const sourceIcon = (src) => {
    if (src === "ai") return "\uD83E\uDD16";
    if (src === "user") return "\uD83D\uDC64";
    if (src === "admin") return "\u270F\uFE0F";
    return "";
  };

  const senseNums = ["\u2460", "\u2461", "\u2462", "\u2463", "\u2464", "\u2465", "\u2466", "\u2467", "\u2468", "\u2469"];

  const freqEntries = [
    { key: "ttc", label: "\u6559\u79D1\u4E66", value: wd.freq_ttc, total: 100000 },
    { key: "tnc", label: "\u56FD\u5BB6\u8BED\u5E93", value: wd.freq_tnc, total: 1000000 },
    { key: "phupha", label: "\u7F51\u7EDC", value: wd.freq_phupha, total: 2000000000 },
  ];
  const activeFreq = freqEntries.find(f => f.key === freqTab) || freqEntries[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 16px 16px" }}>
      {/* ── 1. 词条标题 ── */}
      <Card style={{ padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 32, fontWeight: 700, color: "var(--c-p900)", fontFamily: "var(--th-font), serif", letterSpacing: "0.02em" }}>
                {wd.word}
              </span>
              <span style={{ fontSize: 15, color: "var(--c-teal)", fontFamily: "monospace", fontStyle: "italic", letterSpacing: "0.02em" }}>
                {wd.romanization}
              </span>
            </div>
          </div>
          {/* 右侧：播放 + 收藏（统一风格） */}
          <div style={{ display: "flex", gap: 8, flexShrink: 0, marginLeft: 10 }}>
            <div onClick={(e) => { e.stopPropagation(); speak(wd.word, "th-TH", 0.85); }} style={{
              width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
              background: "var(--c-p50)", border: `1px solid ${"var(--c-p200)"}`, cursor: "pointer",
            }}>
              <Play size={16} strokeWidth={IW} color={"var(--c-teal)"} fill={"var(--c-teal)"} />
            </div>
            <div onClick={() => setShowBookmarkModal(true)} style={{
              width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
              background: bookmarked ? "var(--c-goldL)" : "var(--c-p50)",
              border: `1px solid ${bookmarked ? "var(--c-gold)" : "var(--c-p200)"}`, cursor: "pointer",
            }}>
              <Bookmark size={15} strokeWidth={IW} color={bookmarked ? "var(--c-gold)" : "var(--c-s500)"} fill={bookmarked ? "var(--c-gold)" : "none"} />
            </div>
          </div>
        </div>
        {/* 来源标签 */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
          {wd.romanization_source === "deepseek" && (
            <Badge bg={"var(--c-infoL)"} fg={"var(--c-info)"} style={{ fontSize: 9, padding: "1px 6px" }}>{"🤖 AI"}</Badge>
          )}
          {wd.sources.map((s, i) => {
            const info = sourceMap[s] || { label: s, bg: "var(--c-p100)", fg: "var(--c-p700)" };
            return <Badge key={i} bg={info.bg} fg={info.fg} style={{ fontSize: 9, padding: "1px 6px" }}>{info.label}</Badge>;
          })}
        </div>
        {/* 义项数 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
          <Badge bg={"var(--c-surfaceAlt)"} fg={"var(--c-s500)"}>{wd.sense_count} {"\u4E2A\u4E49\u9879"}</Badge>
        </div>
      </Card>

      {/* ── 2. 义项列表 ── */}
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <SectionTitle>{"\u4E49\u9879"}</SectionTitle>
          <AlertCircle size={15} strokeWidth={IW} color={reportSection === "sense" ? "var(--c-teal)" : "var(--c-s300)"} style={{ cursor: "pointer" }} onClick={() => openReport("sense")} />
        </div>
        {/* Show AI generate button when word lacks data */}
        {(!wd.senses || wd.senses.length === 0 || wd.sense_count === 0) && (
          <Card style={{ padding: 16, textAlign: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 13, color: "var(--c-s500)", marginBottom: 12 }}>{"该词条暂无释义数据"}</div>
            <div onClick={() => {
              if (isSupabaseConfigured) submitWord(wd.word).catch(err => console.error("[submitWord]", err));
            }} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "10px 20px", borderRadius: 12, cursor: "pointer",
              background: "var(--c-teal)", color: "#fff", fontSize: 13, fontWeight: 600,
              fontFamily: "var(--zh-font), sans-serif",
            }}>
              <Sparkles size={14} strokeWidth={IW} />
              {"通过 AI 新增词条信息"}
            </div>
          </Card>
        )}
        {reportSection === "sense" && (
          <div style={{ position: "relative", marginBottom: 8 }}>
            <ReportPopover items={wd.senses.map((s, i) => `${senseNums[i]} ${s.meaning}`)} />
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {wd.senses.map((sense, i) => {
            const isExpanded = expandedSenses[i];
            const pc = posColor(sense.pos);
            const rc = regColor(sense.register);
            return (
              <Card key={sense.sense_id} style={{ padding: 0, overflow: "hidden", border: isExpanded ? `1.5px solid ${"var(--c-p200)"}` : `1px solid ${"var(--c-p100)"}` }}>
                {/* 义项头部 */}
                <div onClick={() => toggleSense(i)} style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "10px 12px",
                  cursor: "pointer", background: isExpanded ? "var(--c-p50)" : "var(--c-surface)",
                  borderBottom: isExpanded ? `1px solid ${"var(--c-p100)"}` : "none",
                }}>
                  <span style={{ fontSize: 15, color: "var(--c-p600)", fontWeight: 700, flexShrink: 0 }}>{senseNums[i]}</span>
                  <Badge bg={pc.bg} fg={pc.fg} style={{ fontSize: 10 }}>{sense.pos}</Badge>
                  <Badge bg={rc.bg} fg={rc.fg} style={{ fontSize: 10 }}>{sense.register}</Badge>
                  <span style={{ fontSize: 10, flexShrink: 0 }}>{sourceIcon(sense.source)}</span>
                  <div style={{ flex: 1 }} />
                  <ChevronRight size={14} strokeWidth={IW} color={"var(--c-s300)"} style={{
                    transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0,
                  }} />
                </div>
                {isExpanded && (
                  <div style={{ padding: "12px" }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "var(--c-p800)", lineHeight: 1.5 }}>
                      {sense.meaning}
                    </div>
                    {/* 例句卡片 — with segmentation */}
                    {sense.examples && sense.examples.length > 0 && (
                      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                        {sense.examples.map((ex, j) => {
                          const segTokens = sense.segmented && sense.segmented[j] ? sense.segmented[j] : null;
                          return (
                            <div key={j} style={{ padding: "8px 12px", borderRadius: 8, background: "var(--c-surfaceAlt)" }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
                                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0 }}>
                                  {segTokens ? segTokens.map((tok, ti) => (
                                    <span
                                      key={ti}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePopoverWordClick(tok.text, i, j, ti);
                                      }}
                                      style={{
                                        fontSize: 13, color: "var(--c-teal)", fontWeight: 500,
                                        fontFamily: "var(--th-font), sans-serif",
                                        borderBottom: `1px dashed ${"var(--c-teal)"}`,
                                        cursor: "pointer", padding: "0 2px", lineHeight: 1.8,
                                      }}
                                    >{tok.text}</span>
                                  )) : (
                                    <span style={{ fontSize: 13, color: "var(--c-teal)", fontWeight: 500, fontFamily: "var(--th-font), sans-serif" }}>{ex.th}</span>
                                  )}
                                </div>
                                <TtsPlay text={ex.th} />
                                {/* Word token popover — enhanced with DB fetch */}
                                {wordPopover && wordPopover.senseIdx === i && wordPopover.exIdx === j && (() => {
                                  const tok = segTokens ? segTokens[wordPopover.tokenIdx] : null;
                                  const tokText = wordPopover.text || (tok ? tok.text : "");
                                  const cached = popoverWordData[tokText];
                                  const dbPos = cached?.pos || (tok?.pos || "");
                                  const dbMeaning = cached?.meaning || (tok?.meaning || "");
                                  const isLoading = cached?.loading;
                                  const notFound = cached?.notFound && !tok?.pos;
                                  return (
                                    <div style={{
                                      position: "absolute", top: "100%", left: Math.min(wordPopover.tokenIdx * 48, 180),
                                      zIndex: 100, background: "var(--c-surface)", borderRadius: 10,
                                      border: `1px solid ${"var(--c-p100)"}`, boxShadow: "0 4px 16px rgba(61,43,31,0.15)",
                                      padding: "8px 12px", marginTop: 4, minWidth: 120, maxWidth: 220,
                                    }}>
                                      {/* Word header */}
                                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-teal)", fontFamily: "var(--th-font), sans-serif", marginBottom: 4 }}>{tokText}</div>
                                      {isLoading ? (
                                        <div style={{ fontSize: 11, color: "var(--c-s400)", padding: "2px 0" }}>{"查询中..."}</div>
                                      ) : notFound && !dbPos ? (
                                        <div style={{ fontSize: 11, color: "var(--c-s400)" }}>{"未找到词条"}</div>
                                      ) : (
                                        <div style={{ fontSize: 12, color: "var(--c-p700)", lineHeight: 1.5 }}>
                                          {dbPos && <span style={{ color: "var(--c-teal)", fontWeight: 600, fontSize: 11 }}>{dbPos}</span>}
                                          {dbPos && dbMeaning && <span style={{ color: "var(--c-s300)" }}>{" · "}</span>}
                                          {dbMeaning && <span>{dbMeaning}</span>}
                                        </div>
                                      )}
                                      {/* 查看详情 button */}
                                      {!isLoading && (
                                        <div onClick={(e) => {
                                          e.stopPropagation();
                                          setWordPopover(null);
                                          if (onWordTap) onWordTap(tokText);
                                        }} style={{
                                          marginTop: 6, padding: "4px 8px", borderRadius: 6,
                                          background: "var(--c-p50)", border: `1px solid ${"var(--c-p200)"}`,
                                          cursor: "pointer", textAlign: "center",
                                        }}>
                                          <span style={{ fontSize: 11, color: "var(--c-teal)", fontWeight: 600 }}>{"查看详情"}</span>
                                          <ChevronRight size={10} strokeWidth={IW} color={"var(--c-teal)"} style={{ marginLeft: 2, verticalAlign: "middle" }} />
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                              <div style={{ fontSize: 12, color: "var(--c-p700)", marginTop: 3 }}>{ex.zh}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── 3. 词频数据 ── */}
      <div style={{ position: "relative" }}>
        <Card style={{ padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <SectionTitle>{"\u8BCD\u9891"}</SectionTitle>
            <AlertCircle size={15} strokeWidth={IW} color={reportSection === "freq" ? "var(--c-teal)" : "var(--c-s300)"} style={{ cursor: "pointer" }} onClick={() => openReport("freq")} />
          </div>
          {reportSection === "freq" && (
            <div style={{ position: "relative", marginBottom: 8 }}>
              <ReportPopover items={freqEntries.map(f => `${f.label}: ${f.value ? f.value.toLocaleString() : "\u2014"}`)} />
            </div>
          )}
          <div style={{ display: "flex", gap: 5, marginBottom: 10, background: "var(--c-surfaceAlt)", borderRadius: 8, padding: 2 }}>
            {freqEntries.map(f => (
              <div key={f.key} onClick={() => setFreqTab(f.key)} style={{
                flex: 1, padding: "5px 0", borderRadius: 6, textAlign: "center",
                background: freqTab === f.key ? "var(--c-surface)" : "transparent",
                color: freqTab === f.key ? "var(--c-p800)" : "var(--c-s500)",
                fontSize: 11, fontWeight: freqTab === f.key ? 600 : 400,
                boxShadow: freqTab === f.key ? "0 1px 3px rgba(61,43,31,0.08)" : "none",
                cursor: "pointer", fontFamily: "var(--zh-font), sans-serif",
              }}>{f.label}</div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: "var(--c-p800)", fontFamily: "monospace" }}>
              {activeFreq.value ? activeFreq.value.toLocaleString() : "\u2014"}
            </span>
            <span style={{ fontSize: 10, color: "var(--c-s300)" }}>/{activeFreq.total.toLocaleString()}</span>
          </div>
          <ProgressBar value={activeFreq.value || 0} max={activeFreq.total} color={"var(--c-teal)"} height={5} />
          <div style={{ fontSize: 10, color: "var(--c-s300)", marginTop: 4, textAlign: "right" }}>
            {freqTab === "ttc" ? "\u6559\u79D1\u4E66\u8BCD\u9891\uFF08\u5B66\u4E60\u8005\u6700\u76F8\u5173\uFF09" : freqTab === "tnc" ? "\u6CF0\u56FD\u56FD\u5BB6\u8BED\u5E93" : "\u7F51\u7EDC\u8BED\u6599\u5E93"}
          </div>
        </Card>
      </div>

      {/* ── 4. 近义词 / 反义词 ── */}
      {(wd.synonyms.length > 0 || wd.antonyms.length > 0) && (
        <div style={{ position: "relative" }}>
          <Card style={{ padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <SectionTitle>{"\u8FD1\u4E49/\u53CD\u4E49"}</SectionTitle>
              <AlertCircle size={15} strokeWidth={IW} color={reportSection === "syn" ? "var(--c-teal)" : "var(--c-s300)"} style={{ cursor: "pointer" }} onClick={() => openReport("syn")} />
            </div>
            {reportSection === "syn" && (
              <div style={{ position: "relative", marginBottom: 8 }}>
                <ReportPopover items={[
                  ...wd.synonyms.map(s => `\u8FD1\u4E49: ${s.word}`),
                  ...wd.antonyms.map(a => `\u53CD\u4E49: ${a.word}`),
                ]} />
              </div>
            )}
            {wd.synonyms.length > 0 && (
              <div style={{ marginBottom: wd.antonyms.length > 0 ? 12 : 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--c-p700)", marginBottom: 8 }}>{"\u8FD1\u4E49\u8BCD"}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {wd.synonyms.map((w, i) => (
                    <div key={i} onClick={() => onWordTap && onWordTap(w.word)} style={{
                      padding: "5px 12px", borderRadius: 20, background: "color-mix(in srgb, var(--c-tealL) 25%, transparent)",
                      border: `1px solid ${"var(--c-tealL)"}`, fontSize: 13, color: "var(--c-teal)", fontWeight: 500,
                      fontFamily: "var(--th-font), sans-serif", cursor: "pointer",
                    }}>
                      {w.word}
                      <span style={{ fontSize: 11, color: "var(--c-s500)", fontWeight: 400, marginLeft: 4 }}>({w.zh})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {wd.antonyms.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--c-p700)", marginBottom: 8 }}>{"\u53CD\u4E49\u8BCD"}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {wd.antonyms.map((w, i) => (
                    <div key={i} onClick={() => onWordTap && onWordTap(w.word)} style={{
                      padding: "5px 12px", borderRadius: 20, background: "color-mix(in srgb, var(--c-roseL) 25%, transparent)",
                      border: `1px solid ${"var(--c-roseL)"}`, fontSize: 13, color: "var(--c-rose)", fontWeight: 500,
                      fontFamily: "var(--th-font), sans-serif", cursor: "pointer",
                    }}>
                      {w.word}
                      <span style={{ fontSize: 11, color: "var(--c-s500)", fontWeight: 400, marginLeft: 4 }}>({w.zh})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── 5. 学习者关联词 — merged single card ── */}
      {wd.learner_associations && wd.learner_associations.length > 0 && (
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <SectionTitle>{"\u5173\u8054\u8BCD\u6C47"}</SectionTitle>
            <AlertCircle size={15} strokeWidth={IW} color={reportSection === "assoc" ? "var(--c-teal)" : "var(--c-s300)"} style={{ cursor: "pointer" }} onClick={() => openReport("assoc")} />
          </div>
          {reportSection === "assoc" && (
            <div style={{ position: "relative", marginBottom: 8 }}>
              <ReportPopover items={wd.learner_associations.map(a => `${a.word}: ${a.note}`)} />
            </div>
          )}
          <Card style={{ padding: 0, overflow: "hidden" }}>
            {wd.learner_associations.map((item, i) => (
              <div key={i}>
                <div onClick={() => onWordTap && onWordTap(item.word)} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                  cursor: "pointer",
                }}>
                  <div style={{
                    fontSize: 15, fontWeight: 700, color: "var(--c-p800)",
                    fontFamily: "var(--th-font), sans-serif", flexShrink: 0, minWidth: 60,
                  }}>{item.word}</div>
                  <div style={{
                    flex: 1, minWidth: 0, fontSize: 12, color: "var(--c-p600)", lineHeight: 1.4,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{item.note}</div>
                  <ChevronRight size={13} strokeWidth={IW} color={"var(--c-s300)"} style={{ flexShrink: 0 }} />
                </div>
                {i < wd.learner_associations.length - 1 && (
                  <div style={{ margin: "0 16px", borderBottom: `1px solid ${"var(--c-p100)"}` }} />
                )}
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* ── 6. 用户例句 ── */}
      {wd.user_sentence_count > 0 && (
        <Card style={{ padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <FileText size={14} strokeWidth={IW} color={"var(--c-p500)"} />
              <span style={{ fontSize: 12, color: "var(--c-p700)" }}>
                {"\u7528\u6237\u8D21\u732E\u4E86"} {wd.user_sentence_count} {"\u6761\u4F8B\u53E5"}
              </span>
            </div>
            <span style={{ fontSize: 11, color: "var(--c-p500)", cursor: "pointer", display: "flex", alignItems: "center", gap: 2 }}>
              {"\u67E5\u770B"} <ChevronRight size={13} strokeWidth={IW} />
            </span>
          </div>
        </Card>
      )}

      {/* ── Bookmark Word Book Selection Modal ── */}
      {showBookmarkModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "flex-end", justifyContent: "center",
        }}>
          <div onClick={() => setShowBookmarkModal(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />
          <div style={{
            position: "relative", zIndex: 1, width: "100%", maxWidth: 430,
            background: "var(--c-surface)", borderRadius: "20px 20px 0 0",
            padding: "20px 20px 32px", maxHeight: "60vh", overflow: "auto",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--c-p800)", margin: 0, fontFamily: "var(--zh-font), serif" }}>
                {bookmarked ? "管理收藏" : "添加到单词本"}
              </h3>
              <div onClick={() => setShowBookmarkModal(false)} style={{ cursor: "pointer", display: "flex" }}>
                <X size={18} strokeWidth={IW} color={"var(--c-s400)"} />
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {wordBookFolders.map(folder => {
                const isDefault = folder.name === "默认单词本";
                return (
                  <div key={folder.id} onClick={async () => {
                    if (!bookmarked) {
                      // Add bookmark + add to folder
                      setBookmarked(true);
                      if (userId && userId !== 'anonymous') {
                        await addBookmark(userId, wd.word);
                        addWordToFolder(folder.id, wd.word);
                        setLastUsedFolder(folder.id);
                        saveUserSettings(userId, { last_folder_id: folder.id });
                      }
                    }
                    setShowBookmarkModal(false);
                  }} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                    borderRadius: 12, background: "var(--c-surfaceAlt)",
                    border: `1px solid ${"var(--c-p100)"}`, cursor: "pointer",
                  }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: folder.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 14, color: "var(--c-p800)", fontWeight: 500 }}>
                      {folder.name}{isDefault ? " (默认)" : ""}
                    </span>
                    {lastUsedFolder === folder.id && (
                      <span style={{ fontSize: 10, color: "var(--c-s400)" }}>上次使用</span>
                    )}
                  </div>
                );
              })}
            </div>
            {bookmarked && (
              <div onClick={async () => {
                setBookmarked(false);
                if (userId && userId !== 'anonymous') {
                  await removeBookmark(userId, wd.word);
                }
                setShowBookmarkModal(false);
              }} style={{
                marginTop: 16, padding: "12px 0", borderRadius: 12, textAlign: "center",
                fontSize: 14, fontWeight: 600, color: "var(--c-err)",
                background: "var(--c-errL)", cursor: "pointer",
              }}>
                取消收藏
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
const UnknownWordPage = ({ word, onBack, onWordTap, onGenerated, onNavigateToDetail }) => {
  const [step, setStep] = useState("input"); // "input" | "generating" | "preview"
  const [thaiWord, setThaiWord] = useState(word || "");
  const [zhHint, setZhHint] = useState("");
  const [generating, setGenerating] = useState(false);

  const handleConfirmWord = async () => {
    if (!thaiWord.trim()) return;
    setGenerating(true);
    setStep("generating");
    if (isSupabaseConfigured) {
      submitWord(thaiWord.trim(), zhHint.trim()).catch(err => console.error("[submitWord]", err));
    }
    try {
      await onGenerated(thaiWord.trim(), zhHint.trim());
    } catch (err) {
      console.error("[handleConfirmWord] generation failed:", err);
    }
    setGenerating(false);
    setStep("preview");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 16px 16px" }}>
      <Card style={{ padding: 16, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>{"🔍"}</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--c-p800)", marginBottom: 4 }}>{"未找到该词"}</div>
        <div style={{ fontSize: 12, color: "var(--c-s500)", marginBottom: 16 }}>{"词库中暂无此词条，可通过 AI 自动生成词条信息"}</div>

        {/* Step 1: Input / confirm word */}
        {step === "input" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 12, color: "var(--c-s500)", marginBottom: 6, fontWeight: 500 }}>{"泰语词语"}</div>
              <input
                value={thaiWord}
                onChange={e => setThaiWord(e.target.value)}
                placeholder="请输入完整的泰语词语"
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: 10,
                  border: `1.5px solid ${"var(--c-p200)"}`, background: "var(--c-surface)",
                  fontSize: 18, fontWeight: 600, color: "var(--c-teal)",
                  fontFamily: "var(--th-font), sans-serif", outline: "none",
                  textAlign: "center", boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 12, color: "var(--c-s500)", marginBottom: 6, fontWeight: 500 }}>{"中文提示（选填）"}</div>
              <input
                value={zhHint}
                onChange={e => setZhHint(e.target.value)}
                placeholder="如有已知中文意思可填入，帮助AI更准确生成"
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10,
                  border: `1.5px solid ${"var(--c-p200)"}`, background: "var(--c-surface)",
                  fontSize: 14, color: "var(--c-p800)",
                  fontFamily: "var(--zh-font), sans-serif", outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div onClick={thaiWord.trim() ? handleConfirmWord : undefined} style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "12px 24px", borderRadius: 12, fontSize: 14, fontWeight: 600,
              background: thaiWord.trim() ? "var(--c-teal)" : "var(--c-p100)",
              color: thaiWord.trim() ? "#fff" : "var(--c-s400)",
              cursor: thaiWord.trim() ? "pointer" : "default",
              fontFamily: "var(--zh-font), sans-serif", marginTop: 4,
            }}>
              <Sparkles size={14} strokeWidth={IW} />
              {"通过 AI 新增词条信息"}
            </div>
          </div>
        )}

        {/* Step 2: Generating */}
        {step === "generating" && (
          <div style={{ padding: "20px 0" }}>
            <div style={{ width: 32, height: 32, border: `3px solid ${"var(--c-p200)"}`, borderTopColor: "var(--c-teal)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
            <div style={{ fontSize: 14, color: "var(--c-s500)" }}>{"AI 正在生成词条内容..."}</div>
          </div>
        )}

        {/* Step 3: Preview generated */}
        {step === "preview" && (
          <div style={{ padding: "12px 0" }}>
            <div style={{ fontSize: 14, color: "var(--c-ok)", fontWeight: 600, marginBottom: 8 }}>{"✓ 词条已生成"}</div>
            <div style={{ fontSize: 12, color: "var(--c-s500)", marginBottom: 16 }}>{"AI 已生成词条数据，可跳转查看详情"}</div>
            <div onClick={() => { if (onNavigateToDetail) onNavigateToDetail(thaiWord.trim()); }} style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "10px 24px", borderRadius: 12, fontSize: 14, fontWeight: 600,
              background: "var(--c-teal)", color: "#fff", cursor: "pointer",
              fontFamily: "var(--zh-font), sans-serif",
            }}>
              {"跳转到词条详情"}
              <ChevronRight size={14} strokeWidth={IW} color={"#fff"} />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

/* ────────────────────────────────────────────
   PAGE: LEARN (学习 - includes study plan, exercises, notes, morphology, stats)
   ──────────────────────────────────────────── */
const LearnPage = ({ userId, onWordTap }) => {
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
          {section === "adjustPlan" && <AdjustPlanSection onBack={info.onBack} userId={userId} />}
          {section === "notesDetail" && <NotesDetailSection onBack={info.onBack} onEditNote={() => { setNoteEditorFrom("notesDetail"); setSection("noteEditor"); }} notes={notesData} />}
          {section === "noteEditor" && <NoteEditorSection onBack={info.onBack} userId={userId} />}
          {section === "morphology" && <MorphologySection onBack={info.onBack} />}
          {section === "stats" && <StatsSection onBack={info.onBack} />}
          {section === "phrases" && <PhrasesSection onBack={info.onBack} onWordTap={onWordTap} userId={userId} onSelectPhrase={(p) => { setSelectedPhrase(p); setSection("phraseDetail"); }} />}
          {section === "phraseDetail" && selectedPhrase && <PhraseDetailSection phrase={selectedPhrase} onBack={info.onBack} onWordTap={onWordTap} />}
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

/* ─── Adjust Plan Sub-section (Redesigned) ─── */
const AdjustPlanSection = ({ onBack, userId }) => {
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
    if (!userId || userId === 'anonymous') { onBack && onBack(); return; }
    setSavingPlan(true);
    const schedule = { times, activeDays, level, sessionTime, studyMethods, reviewDay, dailyTotal, enabledSubjects };
    try {
      await saveLearningPlan(userId, goals, schedule);
    } catch (e) {
      console.error("[saveLearningPlan]", e);
    }
    setSavingPlan(false);
    onBack && onBack();
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
    { key: "morning", label: "早晨", icon: "🌅", desc: "6:00-12:00" },
    { key: "afternoon", label: "下午", icon: "☀️", desc: "12:00-18:00" },
    { key: "evening", label: "晚上", icon: "🌙", desc: "18:00-23:00" },
    { key: "flexible", label: "灵活", icon: "⏰", desc: "随时学习" },
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

/* ─── Notes Detail Sub-section (Timeline) ─── */
const NotesDetailSection = ({ onBack, onEditNote, notes = [] }) => {
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

/* ─── Note Editor Sub-section (Markdown style) ─── */
const NoteEditorSection = ({ onBack, userId, webdavConnected }) => {
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
    if (!userId || userId === 'anonymous') { onBack && onBack(); return; }
    if (!noteTitle.trim()) return;
    setSavingNote(true);
    try {
      await createNote(userId, noteTitle, noteContent, noteColor);
    } catch (e) {
      console.error("[createNote]", e);
    }
    setSavingNote(false);
    onBack && onBack();
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

/* ─── Morphology Sub-section ─── */
const MorphologySection = ({ onBack }) => {
  const [tab, setTab] = useState("th");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 16px 16px" }}>
      <div style={{ display: "flex", gap: 6, background: "var(--c-surfaceAlt)", borderRadius: 12, padding: 4 }}>
        {[
          { key: "th", label: "\u6CF0\u8BED\u6784\u8BCD" },
          { key: "grammar", label: "\u8BED\u6CD5\u6A21\u5F0F" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: "8px 0", borderRadius: 10, border: "none", cursor: "pointer",
            background: tab === t.key ? "var(--c-surface)" : "transparent",
            color: tab === t.key ? "var(--c-p800)" : "var(--c-s500)",
            fontSize: 13, fontWeight: tab === t.key ? 600 : 400,
            boxShadow: tab === t.key ? "0 1px 3px rgba(61,43,31,0.08)" : "none",
            fontFamily: "var(--zh-font), sans-serif",
          }}>{t.label}</button>
        ))}
      </div>

      {tab === "th" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {morphExamples.map((m, i) => (
            <Card key={i} style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12, background: "color-mix(in srgb, var(--c-tealL) 38%, transparent)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, fontWeight: 700, color: "var(--c-teal)", fontFamily: "var(--th-font), serif",
                }}>{m.char}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)" }}>{m.meaning}</div>
                  <div style={{ fontSize: 11, color: "var(--c-s500)" }}>{"\u5E38\u89C1\u7EC4\u5408\u8BCD"}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {m.compounds.map((c, j) => (
                  <div key={j} style={{
                    padding: "6px 12px", borderRadius: 8, background: "var(--c-surfaceAlt)",
                    fontSize: 13, color: "var(--c-p700)", border: `1px solid ${"var(--c-p100)"}`,
                  }}>{c}</div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "grammar" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {grammarPatterns.map((g, i) => (
            <Card key={i} style={{ padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)", fontFamily: "monospace", marginBottom: 8, padding: "6px 12px", borderRadius: 8, background: "var(--c-surfaceAlt)" }}>{g.pattern}</div>
              <div style={{ fontSize: 14, color: "var(--c-teal)" }}>{g.example}</div>
              <div style={{ fontSize: 13, color: "var(--c-s500)", marginTop: 3 }}>{g.zh}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Stats Sub-section ─── */
const StatsSection = ({ onBack }) => {
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

/* ─── Phrases Section (常用语) ─── */
const phraseData = {
  idioms: [
    {
      id: "p1", text: "\u0E01\u0E34\u0E19\u0E1B\u0E25\u0E32\u0E17\u0E35\u0E48\u0E2B\u0E19\u0E49\u0E32\u0E41\u0E25\u0E49\u0E27\u0E01\u0E34\u0E19\u0E1B\u0E25\u0E32\u0E17\u0E35\u0E48\u0E2B\u0E31\u0E27",
      zh: "\u5403\u5B8C\u76D8\u5B50\u53C8\u5403\u76D8\u5B50\uFF08\u8D2A\u5FC3\u4E0D\u8DB3\uFF09",
      segmented: [
        { text: "\u0E01\u0E34\u0E19", pos: "v.", meaning: "\u5403" },
        { text: "\u0E1B\u0E25\u0E32", pos: "n.", meaning: "\u76D8\u5B50" },
        { text: "\u0E17\u0E35\u0E48", pos: "rel.", meaning: "\u7684" },
        { text: "\u0E2B\u0E19\u0E49\u0E32", pos: "n.", meaning: "\u8138" },
        { text: "\u0E41\u0E25\u0E49\u0E27", pos: "conj.", meaning: "\u7136\u540E" },
        { text: "\u0E01\u0E34\u0E19", pos: "v.", meaning: "\u5403" },
        { text: "\u0E1B\u0E25\u0E32", pos: "n.", meaning: "\u76D8\u5B50" },
        { text: "\u0E17\u0E35\u0E48", pos: "rel.", meaning: "\u7684" },
        { text: "\u0E2B\u0E31\u0E27", pos: "n.", meaning: "\u5934" },
      ],
      literal: "\u5403\u5B8C\u8138\u524D\u7684\u76D8\u5B50\u53C8\u53BB\u5403\u5934\u4E0A\u7684\u76D8\u5B50",
      actual: "\u5F62\u5BB9\u4E00\u4E2A\u4EBA\u8D2A\u5FC3\u4E0D\u8DB3\uFF0C\u5F97\u5BF8\u8FDB\u5C3A\uFF0C\u6C38\u8FDC\u4E0D\u77E5\u8DB3",
      tip: "\u8FD9\u4E2A\u4FD7\u8BED\u5E38\u7528\u4E8E\u8B66\u544A\u4ED6\u4EBA\u4E0D\u8981\u592A\u8D2A\u5FC3\u3002\u6CE8\u610F\u6CF0\u8BED\u4E2D \u0E2B\u0E19\u0E49\u0E32(\u8138)\u548C \u0E2B\u0E31\u0E27(\u5934)\u7684\u5BF9\u6BD4\uFF0C\u5F62\u8C61\u5730\u8868\u8FBE\u4E86\u4ECE\u4F4E\u5230\u9AD8\u7684\u8D2A\u5A6A\u3002",
    },
    {
      id: "p2", text: "\u0E19\u0E49\u0E33\u0E02\u0E36\u0E49\u0E19\u0E1B\u0E25\u0E32\u0E44\u0E21\u0E48\u0E44\u0E2B\u0E25",
      zh: "\u6C34\u6DA8\u4E0D\u6D41\uFF08\u6CE1\u6C64\u4E0D\u6EDA\uFF09",
      segmented: [
        { text: "\u0E19\u0E49\u0E33", pos: "n.", meaning: "\u6C34" },
        { text: "\u0E02\u0E36\u0E49\u0E19", pos: "v.", meaning: "\u4E0A\u6DA8" },
        { text: "\u0E1B\u0E25\u0E32", pos: "n.", meaning: "\u9C7C" },
        { text: "\u0E44\u0E21\u0E48", pos: "neg.", meaning: "\u4E0D" },
        { text: "\u0E44\u0E2B\u0E25", pos: "v.", meaning: "\u6D41\u52A8" },
      ],
      literal: "\u6C34\u6DA8\u4E86\u4F46\u9C7C\u4E0D\u6E38\u52A8",
      actual: "\u5F62\u5BB9\u4E8B\u60C5\u770B\u4F3C\u6709\u53D8\u5316\u4F46\u5B9E\u8D28\u6CA1\u6709\u6539\u53D8\uFF0C\u6216\u6307\u4EBA\u5BF9\u5916\u754C\u53D8\u5316\u65E0\u52A8\u4E8E\u8877",
      tip: "\u5E38\u7528\u4E8E\u63CF\u8FF0\u793E\u4F1A\u73B0\u8C61\uFF0C\u8868\u9762\u53D8\u5316\u4F46\u672C\u8D28\u672A\u53D8\u3002",
    },
  ],
  buddhist: [
    {
      id: "p3", text: "\u0E2A\u0E1A\u0E42\u0E20 \u0E1B\u0E23\u0E30\u0E17\u0E35\u0E1B \u0E2A\u0E31\u0E07\u0E06\u0E27\u0E31\u0E0F\u0E10\u0E38",
      zh: "\u56DB\u5723\u8C1B\uFF08\u4F5B\u6559\u6838\u5FC3\u6559\u4E49\uFF09",
      segmented: [
        { text: "\u0E2A\u0E1A\u0E42\u0E20", pos: "num.", meaning: "\u56DB" },
        { text: "\u0E1B\u0E23\u0E30\u0E17\u0E35\u0E1B", pos: "n.", meaning: "\u8C1B\u8BC0" },
        { text: "\u0E2A\u0E31\u0E07\u0E04\u0E27\u0E31\u0E0F\u0E10\u0E38", pos: "n.", meaning: "\u4F5B\u6CD5\u5C5E\u6027" },
      ],
      tip: "\u56DB\u5723\u8C1B\u662F\u4F5B\u6559\u6700\u6838\u5FC3\u7684\u6559\u4E49\uFF0C\u5305\u62EC\u82E6\u8C1B\u3001\u96C6\u8C1B\u3001\u706D\u8C1B\u3001\u9053\u8C1B\u3002\u5728\u6CF0\u56FD\u4F5B\u6559\u6587\u5316\u4E2D\u6781\u4E3A\u91CD\u8981\u3002",
    },
    {
      id: "p4", text: "\u0E17\u0E33\u0E1A\u0E38\u0E0D \u0E44\u0E14\u0E49\u0E1A\u0E38\u0E0D",
      zh: "\u884C\u5584\u5F97\u5584\uFF08\u5584\u6709\u5584\u62A5\uFF09",
      segmented: [
        { text: "\u0E17\u0E33", pos: "v.", meaning: "\u505A" },
        { text: "\u0E1A\u0E38\u0E0D", pos: "n.", meaning: "\u529F\u5FB7/\u5584" },
        { text: "\u0E44\u0E14\u0E49", pos: "v.", meaning: "\u5F97\u5230" },
        { text: "\u0E1A\u0E38\u0E0D", pos: "n.", meaning: "\u529F\u5FB7/\u5584" },
      ],
      tip: "\u8FD9\u662F\u6CF0\u56FD\u4F5B\u6559\u6587\u5316\u4E2D\u6700\u5E38\u89C1\u7684\u4E00\u53E5\u8BDD\uFF0C\u4F53\u73B0\u4E86\u56E0\u679C\u62A5\u5E94\u7684\u6838\u5FC3\u601D\u60F3\u3002\u6CF0\u56FD\u4EBA\u5E38\u7528\u8FD9\u53E5\u8BDD\u52C9\u52B1\u4ED6\u4EBA\u884C\u5584\u3002",
    },
    {
      id: "p5", text: "\u0E2D\u0E19\u0E34\u0E08\u0E08\u0E4C \u0E44\u0E21\u0E48\u0E40\u0E1B\u0E47\u0E19\u0E2D\u0E19\u0E34\u0E08\u0E08\u0E4C",
      zh: "\u65E0\u5E38\uFF08\u4E07\u7269\u7686\u65E0\u5E38\uFF09",
      segmented: [
        { text: "\u0E2D\u0E19\u0E34\u0E08\u0E08\u0E4C", pos: "n.", meaning: "\u65E0\u5E38" },
        { text: "\u0E44\u0E21\u0E48", pos: "neg.", meaning: "\u4E0D" },
        { text: "\u0E40\u0E1B\u0E47\u0E19", pos: "v.", meaning: "\u662F" },
        { text: "\u0E2D\u0E19\u0E34\u0E08\u0E08\u0E4C", pos: "n.", meaning: "\u65E0\u5E38" },
      ],
      tip: "\u6E90\u81EA\u5DF4\u5229\u6587\u0E2D\u0E19\u0E34\u0E08\u0E08\u0E4C(Anicca)\uFF0C\u6307\u4E16\u95F4\u4E07\u7269\u90FD\u5728\u4E0D\u65AD\u53D8\u5316\uFF0C\u6CA1\u6709\u6C38\u6052\u4E0D\u53D8\u7684\u4E8B\u7269\u3002\u8FD9\u662F\u4F5B\u6559\u4E09\u6CD5\u5370\u4E4B\u4E00\u3002",
    },
  ],
  daily: [
    {
      id: "p6", text: "\u0E09\u0E31\u0E19\u0E40\u0E23\u0E35\u0E22\u0E19\u0E20\u0E32\u0E29\u0E32\u0E44\u0E17\u0E22\u0E17\u0E38\u0E01\u0E27\u0E31\u0E19",
      zh: "\u6211\u6BCF\u5929\u90FD\u5B66\u4E60\u6CF0\u8BED",
      segmented: [
        { text: "\u0E09\u0E31\u0E19", pos: "pron.", meaning: "\u6211" },
        { text: "\u0E40\u0E23\u0E35\u0E22\u0E19", pos: "v.", meaning: "\u5B66\u4E60" },
        { text: "\u0E20\u0E32\u0E29\u0E32\u0E44\u0E17\u0E22", pos: "n.", meaning: "\u6CF0\u8BED" },
        { text: "\u0E17\u0E38\u0E01\u0E27\u0E31\u0E19", pos: "adv.", meaning: "\u6BCF\u5929" },
      ],
      tip: "\u8FD9\u662F\u5B66\u4E60\u6CF0\u8BED\u65F6\u7684\u7ECF\u5178\u7EC3\u4E60\u53E5\u3002\u6CE8\u610F\u6CF0\u8BED\u8BED\u5E8F\u4E0E\u4E2D\u6587\u76F8\u4F3C\uFF1A\u4E3B\u8BED+\u52A8\u8BED+\u5BBE\u8BED+\u65F6\u95F4\u72B6\u8BED\u3002",
    },
    {
      id: "p7", text: "\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35\u0E04\u0E23\u0E31\u0E1A/\u0E04\u0E48\u0E30",
      zh: "\u4F60\u597D\uFF08\u7537/\u5973\u6027\u7528\uFF09",
      segmented: [
        { text: "\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35", pos: "intj.", meaning: "\u4F60\u597D" },
        { text: "\u0E04\u0E23\u0E31\u0E1A", pos: "part.", meaning: "\u7537\u6027\u793C\u8C8C\u8BCD" },
        { text: "\u0E04\u0E48\u0E30", pos: "part.", meaning: "\u5973\u6027\u793C\u8C8C\u8BCD" },
      ],
      tip: "\u6CF0\u8BED\u4E2D\u7684\u793C\u8C8C\u52A9\u8BCD\u6839\u636E\u8BF4\u8BDD\u8005\u6027\u522B\u4E0D\u540C\uFF1A\u7537\u6027\u7528 \u0E04\u0E23\u0E31\u0E1A(khrap)\uFF0C\u5973\u6027\u7528 \u0E04\u0E48\u0E30(kha)\u3002\u8FD9\u662F\u6CF0\u8BED\u6700\u57FA\u672C\u7684\u793C\u8C8C\u89C4\u5219\u3002",
    },
    {
      id: "p8", text: "\u0E44\u0E21\u0E48\u0E40\u0E1B\u0E47\u0E19\u0E44\u0E2B\u0E23",
      zh: "\u6CA1\u5173\u7CFB/\u4E0D\u8981\u7D27",
      segmented: [
        { text: "\u0E44\u0E21\u0E48", pos: "neg.", meaning: "\u4E0D" },
        { text: "\u0E40\u0E1B\u0E47\u0E19", pos: "v.", meaning: "\u662F" },
        { text: "\u0E44\u0E2B\u0E23", pos: "intj.", meaning: "\u4EC0\u4E48" },
      ],
      tip: "\u6CF0\u56FD\u65E5\u5E38\u751F\u6D3B\u4E2D\u6700\u5E38\u7528\u7684\u8868\u8FBE\u4E4B\u4E00\uFF0C\u7528\u4E8E\u56DE\u5E94\u9053\u6B49\u6216\u8868\u793A\u65E0\u6240\u8C13\u3002\u4F53\u73B0\u4E86\u6CF0\u56FD\u4EBA\u968F\u548C\u7684\u6027\u683C\u3002",
    },
  ],
};

const PhrasesSection = ({ onBack, onWordTap, onSelectPhrase, userId }) => {
  const [cat, setCat] = useState("idioms");
  const [showAll, setShowAll] = useState(false);
  const [bookmarks, setBookmarks] = useState({});
  const [wordTip, setWordTip] = useState(null);
  const [dbSentences, setDbSentences] = useState({});
  const [loading, setLoading] = useState(false);
  const cats = [
    { key: "idioms", label: "\u4FD7\u8BED", color: "var(--c-gold)" },
    { key: "buddhist", label: "\u4F5B\u6559\u7528\u8BED", color: "var(--c-teal)" },
    { key: "daily", label: "\u65E5\u5E38\u7528\u8BED", color: "var(--c-rose)" },
  ];

  // Fetch sentences for current category from DB
  useEffect(() => {
    if (!isSupabaseConfigured || dbSentences[cat]) return;
    setLoading(true);
    getSentencesByCategory(cat, 50).then(rows => {
      if (rows.length > 0) {
        const mapped = rows.map(r => ({
          id: String(r.id),
          text: r.text,
          zh: r.actual_meaning || r.literal_meaning || '',
          segmented: Array.isArray(r.segmented) ? r.segmented : [],
          literal: r.literal_meaning || '',
          actual: r.actual_meaning || '',
          tip: r.learner_tip || '',
          dbId: r.id,
          category: r.category,
        }));
        setDbSentences(prev => ({ ...prev, [cat]: mapped }));
      }
      setLoading(false);
    });
  }, [cat]);

  // Load existing bookmarks on mount
  useEffect(() => {
    if (!userId || userId === 'anonymous' || !isSupabaseConfigured) return;
    getBookmarkedSentences(userId).then(sentences => {
      const bm = {};
      sentences.forEach(s => { bm[String(s.id)] = true; });
      setBookmarks(bm);
    });
  }, [userId]);

  // Use DB data with fallback to hardcoded
  const list = dbSentences[cat] || phraseData[cat] || [];
  const recommended = list[0];
  const displayList = showAll ? list : [recommended];

  const toggleBm = async (phrase) => {
    const id = phrase.dbId ? String(phrase.dbId) : phrase.id;
    const isCurrentlyBookmarked = bookmarks[id];
    setBookmarks(p => ({ ...p, [id]: !p[id] }));
    if (userId && userId !== 'anonymous' && phrase.dbId) {
      if (isCurrentlyBookmarked) {
        await removeSentenceBookmark(userId, phrase.dbId);
      } else {
        await bookmarkSentence(userId, phrase.dbId);
      }
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "0 16px 16px" }}>
      {/* Category tabs */}
      <div style={{ display: "flex", gap: 6, background: "var(--c-surfaceAlt)", borderRadius: 12, padding: 4 }}>
        {cats.map(c => (
          <button key={c.key} onClick={() => { setCat(c.key); setShowAll(false); }} style={{
            flex: 1, padding: "8px 0", borderRadius: 10, border: "none", cursor: "pointer",
            background: cat === c.key ? "var(--c-surface)" : "transparent",
            color: cat === c.key ? "var(--c-p800)" : "var(--c-s500)",
            fontSize: 13, fontWeight: cat === c.key ? 600 : 400,
            boxShadow: cat === c.key ? "0 1px 3px rgba(61,43,31,0.08)" : "none",
            fontFamily: "var(--zh-font), sans-serif",
          }}>{c.label}</button>
        ))}
      </div>

      {/* 今日推荐 header */}
      {!showAll && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Sparkles size={13} strokeWidth={IW} color={"var(--c-gold)"} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-p800)" }}>{"\u4ECA\u65E5\u63A8\u8350"}</span>
          </div>
        </div>
      )}

      {/* Phrase cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {displayList.map((p) => (
          <Card key={p.id} style={{ padding: 14 }}>
            {/* Thai phrase + action buttons */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
              <div onClick={() => onSelectPhrase(p)} style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: "var(--c-p900)", fontFamily: "var(--th-font), sans-serif", lineHeight: 1.5 }}>
                  {p.segmented.map((seg, j) => (
                    <span key={j} style={{ position: "relative", display: "inline" }}>
                      <span onClick={(e) => { e.stopPropagation(); setWordTip(wordTip?.id === `${p.id}-${j}` ? null : { id: `${p.id}-${j}`, text: seg.text, pos: seg.pos, meaning: seg.meaning }); }} style={{
                        cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dashed",
                        textUnderlineOffset: 3, color: "var(--c-p900)",
                      }}>{seg.text}</span>
                      {wordTip?.id === `${p.id}-${j}` && (
                        <div style={{
                          position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
                          background: "var(--c-p800)", color: "#fff", padding: "6px 10px", borderRadius: 8,
                          fontSize: 11, whiteSpace: "nowrap", zIndex: 50, marginBottom: 4,
                          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                        }}>
                          <span style={{ color: "var(--c-gold)", fontStyle: "italic", marginRight: 6 }}>{seg.pos}</span>
                          {seg.meaning}
                          <div onClick={(e) => { e.stopPropagation(); setWordTip(null); onWordTap(seg.text); }} style={{
                            marginTop: 4, fontSize: 10, color: "var(--c-teal)", cursor: "pointer", textAlign: "center",
                          }}>{"\u67E5\u770B\u8BE6\u60C5 \u203A"}</div>
                        </div>
                      )}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: 13, color: "var(--c-s500)", lineHeight: 1.4, marginTop: 4 }}>{p.zh}</div>
              </div>
              {/* Action buttons */}
              <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 8, marginTop: 2 }}>
                <div onClick={(e) => { e.stopPropagation(); speak(p.segmented.map(s => s.text).join(""), "th-TH", 0.85); }} style={{ width: 28, height: 28, borderRadius: 8, background: "var(--c-surfaceAlt)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <Volume2 size={13} strokeWidth={IW} color={"var(--c-teal)"} />
                </div>
                <div onClick={(e) => { e.stopPropagation(); toggleBm(p); }} style={{ width: 28, height: 28, borderRadius: 8, background: bookmarks[p.dbId ? String(p.dbId) : p.id] ? "color-mix(in srgb, var(--c-gold) 9%, transparent)" : "var(--c-surfaceAlt)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <Bookmark size={13} strokeWidth={IW} color={bookmarks[p.dbId ? String(p.dbId) : p.id] ? "var(--c-gold)" : "var(--c-s300)"} fill={bookmarks[p.dbId ? String(p.dbId) : p.id] ? "var(--c-gold)" : "none"} />
                </div>
              </div>
            </div>
            {/* Segmented tags */}
            <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
              {p.segmented.map((seg, j) => (
                <span key={j} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 6, background: "var(--c-surfaceAlt)", color: "var(--c-s500)", border: `1px solid ${"var(--c-p100)"}` }}>
                  {seg.text}<span style={{ color: "var(--c-s300)", marginLeft: 3 }}>{seg.meaning}</span>
                </span>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* 全部 button */}
      {!showAll && list.length > 1 && (
        <div onClick={() => setShowAll(true)} style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
          padding: "10px 0", borderRadius: 10, border: `1px solid ${"var(--c-p200)"}`,
          background: "var(--c-surface)", cursor: "pointer", fontSize: 13, color: "var(--c-p500)", fontWeight: 500,
        }}>
          {"\u5168\u90E8"} <span style={{ fontWeight: 600, color: "var(--c-p700)" }}>{list.length}</span> {"\u6761"} <ChevronRight size={14} strokeWidth={IW} />
        </div>
      )}
      {showAll && (
        <div onClick={() => setShowAll(false)} style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
          padding: "10px 0", borderRadius: 10, border: `1px solid ${"var(--c-p200)"}`,
          background: "var(--c-surface)", cursor: "pointer", fontSize: 13, color: "var(--c-p500)",
        }}>
          {"\u6536\u8D77"} <ChevronRight size={14} strokeWidth={IW} style={{ transform: "rotate(90deg)" }} />
        </div>
      )}
    </div>
  );
};

const PhraseDetailSection = ({ phrase, onBack, onWordTap }) => {
  const isIdiom = phrase.literal && phrase.actual;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "0 16px 16px" }}>
      {/* Phrase text */}
      <Card style={{ padding: 16, background: `linear-gradient(135deg, ${`color-mix(in srgb, var(--c-teal) 3%, transparent)`}, ${`color-mix(in srgb, var(--c-gold) 2%, transparent)`})`, border: `1px solid ${`color-mix(in srgb, var(--c-teal) 9%, transparent)`}` }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--c-p900)", fontFamily: "var(--th-font), serif", lineHeight: 1.5, flex: 1 }}>
            {phrase.text}
          </div>
          <TtsPlay text={phrase.text} size={16} />
        </div>
        <div style={{ fontSize: 14, color: "var(--c-p600)", lineHeight: 1.5 }}>{phrase.zh}</div>
      </Card>

      {/* Word-by-word analysis */}
      <Card style={{ padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)", marginBottom: 14, fontFamily: "var(--zh-font), serif" }}>{"\u9010\u8BCD\u5206\u6790"}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {phrase.segmented.map((seg, i) => (
            <div key={i}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0" }}>
                <span onClick={() => onWordTap(seg.text)} style={{
                  fontSize: 16, fontWeight: 600, color: "var(--c-teal)",
                  fontFamily: "var(--th-font), sans-serif",
                  cursor: "pointer", textDecoration: "underline",
                  textDecorationStyle: "dashed", textUnderlineOffset: 3,
                }}>{seg.text}</span>
                <span style={{ fontSize: 11, color: "var(--c-s300)", fontStyle: "italic", minWidth: 32 }}>{seg.pos}</span>
                <span style={{ fontSize: 13, color: "var(--c-p700)", flex: 1 }}>{seg.meaning}</span>
                <ChevronRight size={13} strokeWidth={IW} color={"var(--c-s300)"} />
              </div>
              {i < phrase.segmented.length - 1 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "0 0 0 4px" }}>
                  <span style={{ fontSize: 12, color: "var(--c-s300)" }}>+</span>
                </div>
              )}
            </div>
          ))}
        </div>
        {/* Combined gloss */}
        <div style={{
          marginTop: 12, padding: "10px 14px", borderRadius: 10,
          background: "var(--c-surfaceAlt)", border: `1px solid ${"var(--c-p100)"}`,
          fontSize: 13, color: "var(--c-p700)", lineHeight: 1.6,
        }}>
          {phrase.segmented.map((s, i) => (
            <span key={i}>
              <span style={{ fontWeight: 600, color: "var(--c-p800)" }}>{s.text}</span>
              <span style={{ color: "var(--c-s500)" }}>({s.meaning})</span>
              {i < phrase.segmented.length - 1 && <span style={{ color: "var(--c-s300)" }}> + </span>}
            </span>
          ))}
        </div>
      </Card>

      {/* Idiom: literal vs actual */}
      {isIdiom && (
        <Card style={{ padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)", marginBottom: 12, fontFamily: "var(--zh-font), serif" }}>{"\u5B57\u9762\u610F\u4E49 vs \u5B9E\u9645\u610F\u4E49"}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ padding: 12, borderRadius: 10, background: "color-mix(in srgb, var(--c-gold) 7%, transparent)", border: `1px solid ${`color-mix(in srgb, var(--c-gold) 15%, transparent)`}` }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-gold)", marginBottom: 4 }}>{"\u5B57\u9762\u610F\u4E49"}</div>
              <div style={{ fontSize: 13, color: "var(--c-p700)", lineHeight: 1.5 }}>{phrase.literal}</div>
            </div>
            <div style={{ padding: 12, borderRadius: 10, background: "color-mix(in srgb, var(--c-teal) 7%, transparent)", border: `1px solid ${`color-mix(in srgb, var(--c-teal) 15%, transparent)`}` }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-teal)", marginBottom: 4 }}>{"\u5B9E\u9645\u610F\u4E49"}</div>
              <div style={{ fontSize: 13, color: "var(--c-p700)", lineHeight: 1.5 }}>{phrase.actual}</div>
            </div>
          </div>
        </Card>
      )}

      {/* Learner tip */}
      {phrase.tip && (
        <Card style={{ padding: 16, background: "color-mix(in srgb, var(--c-info) 2%, transparent)", border: `1px solid ${`color-mix(in srgb, var(--c-info) 9%, transparent)`}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: `linear-gradient(135deg, ${"var(--c-info)"}, ${"var(--c-teal)"})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={13} strokeWidth={IW} color="#fff" />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-p800)" }}>{"\u5B66\u4E60\u8005\u5EFA\u8BAE"}</span>
          </div>
          <div style={{ fontSize: 13, color: "var(--c-p700)", lineHeight: 1.7 }}>{phrase.tip}</div>
        </Card>
      )}
    </div>
  );
};

/* ────────────────────────────────────────────
   PAGE: MY PROFILE (我的)
   ──────────────────────────────────────────── */
const ProfilePage = ({ userId, user, colorMode, setColorMode, onLogout, onNavigateToWords }) => {
  const [dictDir, setDictDir] = useState("zh-th");
  const [webdavConnected, setWebdavConnected] = useState(false);
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);

  /* ── Stats state ── */
  const [streak, setStreak] = useState(0);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [checkinHistory, setCheckinHistory] = useState([]);
  const [showCheckinHistory, setShowCheckinHistory] = useState(false);

  /* ── Font selection state ── */
  const [showFontPage, setShowFontPage] = useState(false);
  const [zhFont, setZhFont] = useState("Noto Serif SC");
  const [thFont, setThFont] = useState("Sarabun");
  const zhFonts = ["Noto Sans SC", "Noto Serif SC"];
  const thFonts = ["Sarabun", "Noto Sans Thai", "Charm"];

  /* ── Profile editing state ── */
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef(null);

  /* ── WebDAV config state ── */
  const [showWebdavModal, setShowWebdavModal] = useState(false);
  const [webdavConfig, setWebdavConfig] = useState({ serverUrl: "", username: "", password: "" });

  /* ── API management state ── */
  const [showApiMgmt, setShowApiMgmt] = useState(false);
  const [showAddApi, setShowAddApi] = useState(false);
  const [apiKeys, setApiKeys] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState("openai");
  const [customApi, setCustomApi] = useState({ name: "", key: "", baseUrl: "", model: "" });
  const [editingApiId, setEditingApiId] = useState(null);
  const [defaultApiId, setDefaultApiId] = useState("system"); // "system" or api key id

  /* ── Load settings and API keys from Supabase ── */
  useEffect(() => {
    if (!userId || userId === 'anonymous') return;
    getUserSettings(userId).then(s => {
      if (s) {
        if (s.dict_direction) setDictDir(s.dict_direction);
        if (s.color_mode) setColorMode(s.color_mode);
        if (s.reminder_enabled !== undefined) setReminderEnabled(s.reminder_enabled);
        if (s.zh_font) setZhFont(s.zh_font);
        if (s.th_font) setThFont(s.th_font);
      }
    });
    getApiKeys(userId).then(keys => {
      if (keys.length > 0) setApiKeys(keys.map(k => ({
        id: k.id,
        name: k.name || k.provider,
        provider: k.provider,
        key: k.key_masked || '****',
        baseUrl: k.base_url || '',
        model: k.model || '',
      })));
    });
    getDefaultApi(userId).then(id => setDefaultApiId(id || 'system'));
    // Fetch streak and bookmark count
    getStreak(userId).then(setStreak);
    getBookmarks(userId).then(rows => setBookmarkCount((rows || []).length));
    // Fetch check-in history (last 30 days)
    getLearningProgress(userId, 30).then(rows => {
      setCheckinHistory((rows || []).filter(r => r.checked_in).map(r => ({
        date: r.date,
        tasks: r.tasks_completed || [],
      })));
    });
  }, [userId]);

  /* ── Apply font CSS variables when fonts change ── */
  useEffect(() => {
    document.documentElement.style.setProperty('--zh-font', `'${zhFont}'`);
    document.documentElement.style.setProperty('--th-font', `'${thFont}'`);
  }, [zhFont, thFont]);

  /* ── Save settings to Supabase on change ── */
  const prevDictDir = useRef(dictDir);
  useEffect(() => {
    if (prevDictDir.current === dictDir) return;
    prevDictDir.current = dictDir;
    if (userId && userId !== 'anonymous') {
      saveUserSettings(userId, { dict_direction: dictDir });
    }
  }, [dictDir, userId]);

  const prevColorMode = useRef(colorMode);
  useEffect(() => {
    if (prevColorMode.current === colorMode) return;
    prevColorMode.current = colorMode;
    if (userId && userId !== 'anonymous') {
      saveUserSettings(userId, { color_mode: colorMode });
    }
  }, [colorMode, userId]);

  const prevZhFont = useRef(zhFont);
  const prevThFont = useRef(thFont);
  useEffect(() => {
    if (prevZhFont.current === zhFont && prevThFont.current === thFont) return;
    prevZhFont.current = zhFont;
    prevThFont.current = thFont;
    if (userId && userId !== 'anonymous') {
      saveUserSettings(userId, { zh_font: zhFont, th_font: thFont });
    }
  }, [zhFont, thFont, userId]);

  const prevReminder = useRef(reminderEnabled);
  useEffect(() => {
    if (prevReminder.current === reminderEnabled) return;
    prevReminder.current = reminderEnabled;
    if (userId && userId !== 'anonymous') {
      saveUserSettings(userId, { reminder_enabled: reminderEnabled });
    }
  }, [reminderEnabled, userId]);

  const apiTemplates = [
    { id: "openai", name: "OpenAI", color: "var(--c-p700)", baseUrl: "https://api.openai.com/v1", model: "gpt-4o" },
    { id: "deepseek", name: "DeepSeek", color: "var(--c-teal)", baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat" },
    { id: "kimi", name: "Kimi", color: "var(--c-info)", baseUrl: "https://api.moonshot.cn/v1", model: "moonshot-v1-8k" },
    { id: "doubao", name: "\u8C46\u5305", color: "var(--c-gold)", baseUrl: "https://ark.cn-beijing.volces.com/api/v3", model: "doubao-pro-32k" },
    { id: "zhipu", name: "\u667A\u8C31 (GLM)", color: "var(--c-amber)", baseUrl: "https://open.bigmodel.cn/api/paas/v4", model: "glm-4" },
    { id: "qwen", name: "\u901A\u4E49\u5343\u95EE", color: "var(--c-rose)", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-max" },
    { id: "custom", name: "\u81EA\u5B9A\u4E49", color: "var(--c-s500)", baseUrl: "", model: "" },
  ];

  const SettingRow = ({ icon: Icon, label, desc, children }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: `1px solid ${"var(--c-p100)"}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--c-surfaceAlt)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={16} strokeWidth={IW} color={"var(--c-p500)"} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--c-p800)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
          {desc && <div style={{ fontSize: 11, color: "var(--c-s500)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{desc}</div>}
        </div>
      </div>
      {children}
    </div>
  );

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

  /* ── API Management Sub-View ── */
  if (showApiMgmt) {
    const tpl = apiTemplates.find(t => t.id === selectedProvider) || apiTemplates[0];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 16px 16px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div onClick={() => { setShowApiMgmt(false); setEditingApiId(null); }} style={{
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            width: 32, height: 32, borderRadius: 10, background: "var(--c-p100)", flexShrink: 0,
          }}>
            <ChevronLeft size={18} strokeWidth={IW} color={"var(--c-p700)"} />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--c-p800)", margin: 0, fontFamily: "var(--zh-font), serif" }}>AI API {"\u7BA1\u7406"}</h2>
        </div>

        {/* Default API Selection */}
        <Card style={{ padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)", marginBottom: 12 }}>{"默认使用的 API"}</div>
          <div style={{ fontSize: 12, color: "var(--c-s500)", marginBottom: 12 }}>{"选择 AI 功能默认使用的 API 服务"}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* System API option */}
            <div onClick={() => { setDefaultApiId('system'); setDefaultApi(userId, 'system'); }} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10,
              border: defaultApiId === 'system' ? `1.5px solid ${"var(--c-teal)"}` : `1px solid ${"var(--c-p200)"}`,
              background: defaultApiId === 'system' ? "color-mix(in srgb, var(--c-teal) 8%, transparent)" : "var(--c-surface)",
              cursor: "pointer",
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: "50%",
                border: defaultApiId === 'system' ? `5px solid ${"var(--c-teal)"}` : `1.5px solid ${"var(--c-p300)"}`,
                flexShrink: 0,
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-p800)" }}>{"系统免费 API"}</div>
                <div style={{ fontSize: 11, color: "var(--c-s400)", marginTop: 2 }}>{"由系统提供，无需配置，密钥存储在服务器端"}</div>
              </div>
            </div>
            {/* User API options */}
            {apiKeys.map(ak => {
              const provider = apiTemplates.find(t => t.id === ak.provider);
              const isDefault = defaultApiId === String(ak.id);
              return (
                <div key={ak.id} onClick={() => { setDefaultApiId(String(ak.id)); setDefaultApi(userId, String(ak.id)); }} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10,
                  border: isDefault ? `1.5px solid ${provider?.color || "var(--c-teal)"}` : `1px solid ${"var(--c-p200)"}`,
                  background: isDefault ? `color-mix(in srgb, ${provider?.color || "var(--c-teal)"} 8%, transparent)` : "var(--c-surface)",
                  cursor: "pointer",
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%",
                    border: isDefault ? `5px solid ${provider?.color || "var(--c-teal)"}` : `1.5px solid ${"var(--c-p300)"}`,
                    flexShrink: 0,
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-p800)" }}>{ak.name}</div>
                    <div style={{ fontSize: 11, color: "var(--c-s400)", marginTop: 2, fontFamily: "monospace" }}>{ak.key} · {ak.model}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Existing keys */}
        {apiKeys.length > 0 && (
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "12px 18px", borderBottom: `1px solid ${"var(--c-p100)"}` }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p700)", margin: 0 }}>{"\u5DF2\u6DFB\u52A0\u7684 API"}</h3>
            </div>
            <div style={{ padding: "4px 18px" }}>
              {apiKeys.map(ak => {
                const provider = apiTemplates.find(t => t.id === ak.provider);
                const isEditing = editingApiId === ak.id;
                return (
                  <div key={ak.id} style={{ padding: "12px 0", borderBottom: `1px solid ${"var(--c-p100)"}` }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: `${provider?.color || "var(--c-s500)"}15`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <Key size={14} strokeWidth={IW} color={provider?.color || "var(--c-s500)"} />
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)" }}>{ak.name}</div>
                          <div style={{ fontSize: 11, color: "var(--c-s400)", marginTop: 1, fontFamily: "monospace" }}>{ak.key}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <div onClick={() => {
                          if (isEditing) { setEditingApiId(null); }
                          else { setEditingApiId(ak.id); setSelectedProvider(ak.provider); setCustomApi({ name: ak.name, key: "", baseUrl: ak.baseUrl, model: ak.model }); }
                        }} style={{
                          width: 28, height: 28, borderRadius: 7, background: "var(--c-surfaceAlt)",
                          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                        }}>
                          <Pencil size={12} strokeWidth={IW} color={"var(--c-s500)"} />
                        </div>
                        <div onClick={() => {
                          deleteApiKey(ak.id).catch(e => console.error("[deleteApiKey]", e));
                          setApiKeys(prev => prev.filter(k => k.id !== ak.id));
                        }} style={{
                          width: 28, height: 28, borderRadius: 7, background: "var(--c-surfaceAlt)",
                          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                        }}>
                          <Trash2 size={12} strokeWidth={IW} color={"var(--c-err)"} />
                        </div>
                      </div>
                    </div>
                    {isEditing && (
                      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                        <input value={customApi.key} onChange={e => setCustomApi(p => ({ ...p, key: e.target.value }))} placeholder={"\u65B0\u7684 API Key"} style={{
                          padding: "10px 12px", borderRadius: 8, border: `1px solid ${"var(--c-p200)"}`,
                          background: "var(--c-surface)", fontSize: 13, color: "var(--c-p800)", outline: "none",
                          fontFamily: "monospace", boxSizing: "border-box", width: "100%",
                        }} />
                        <div style={{ display: "flex", gap: 8 }}>
                          <input value={customApi.model} onChange={e => setCustomApi(p => ({ ...p, model: e.target.value }))} placeholder={"\u6A21\u578B"} style={{
                            flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${"var(--c-p200)"}`,
                            background: "var(--c-surface)", fontSize: 12, color: "var(--c-p800)", outline: "none",
                            fontFamily: "var(--zh-font), sans-serif", boxSizing: "border-box",
                          }} />
                          <div onClick={() => {
                            setApiKeys(prev => prev.map(k => k.id === ak.id ? {
                              ...k, key: customApi.key || k.key, model: customApi.model || k.model, baseUrl: customApi.baseUrl || k.baseUrl
                            } : k));
                            setEditingApiId(null);
                            setCustomApi({ name: "", key: "", baseUrl: "", model: "" });
                          }} style={{
                            padding: "8px 16px", borderRadius: 8, background: "var(--c-teal)",
                            color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer",
                            display: "flex", alignItems: "center", whiteSpace: "nowrap",
                          }}>{"\u4FDD\u5B58"}</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Add new API button */}
        <div onClick={() => { setShowAddApi(true); setEditingApiId(null); }} style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          padding: "14px 0", borderRadius: 12,
          border: `1.5px dashed ${"var(--c-p300)"}`, background: "var(--c-surface)",
          cursor: "pointer", fontSize: 14, fontWeight: 500,
          color: "var(--c-p600)", fontFamily: "var(--zh-font), sans-serif",
          transition: "all 0.2s",
        }}>
          <Plus size={16} strokeWidth={IW} color={"var(--c-p500)"} />
          <span>{"\u6DFB\u52A0\u65B0\u7684 API"}</span>
        </div>

        {/* Add API Modal */}
        {showAddApi && (
          <>
            <div onClick={() => { setShowAddApi(false); setCustomApi({ name: "", key: "", baseUrl: "", model: "" }); }} style={{
              position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
              background: "rgba(0,0,0,0.35)", zIndex: 2000,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div onClick={e => e.stopPropagation()} style={{
                width: "90%", maxWidth: 380, maxHeight: "85vh", overflow: "auto",
                background: "var(--c-surface)", borderRadius: 16,
                boxShadow: "0 8px 32px rgba(61,43,31,0.2)",
              }}>
                {/* Modal header */}
                <div style={{
                  padding: "16px 20px", borderBottom: `1px solid ${"var(--c-p100)"}`,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  position: "sticky", top: 0, background: "var(--c-surface)", zIndex: 1, borderRadius: "16px 16px 0 0",
                }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--c-p800)", margin: 0, fontFamily: "var(--zh-font), serif" }}>{"\u6DFB\u52A0 API"}</h3>
                  <div onClick={() => { setShowAddApi(false); setCustomApi({ name: "", key: "", baseUrl: "", model: "" }); }} style={{
                    width: 28, height: 28, borderRadius: "50%", background: "var(--c-surfaceAlt)",
                    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                  }}>
                    <X size={14} strokeWidth={IW} color={"var(--c-s500)"} />
                  </div>
                </div>

                {/* Provider selection */}
                <div style={{ padding: "14px 20px" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-s500)", marginBottom: 10 }}>{"\u9009\u62E9\u670D\u52A1\u63D0\u4F9B\u5546"}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {apiTemplates.map(t => (
                      <div key={t.id} onClick={() => {
                        setSelectedProvider(t.id);
                        setCustomApi(p => ({
                          ...p,
                          name: t.id === "custom" ? p.name : t.name,
                          baseUrl: t.id === "custom" ? p.baseUrl : t.baseUrl,
                          model: t.id === "custom" ? p.model : t.model,
                        }));
                      }} style={{
                        padding: "8px 14px", borderRadius: 10, cursor: "pointer",
                        border: selectedProvider === t.id ? `1.5px solid ${t.color}` : `1px solid ${"var(--c-p200)"}`,
                        background: selectedProvider === t.id ? `${t.color}12` : "var(--c-surface)",
                        fontSize: 13, fontWeight: selectedProvider === t.id ? 600 : 400,
                        color: selectedProvider === t.id ? t.color : "var(--c-s500)",
                        transition: "all 0.15s", whiteSpace: "nowrap",
                      }}>
                        {t.name}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Form fields */}
                <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "var(--c-s500)", marginBottom: 4 }}>{"\u540D\u79F0"}</div>
                    <input value={customApi.name || (tpl.id !== "custom" ? tpl.name : "")} onChange={e => setCustomApi(p => ({ ...p, name: e.target.value }))} placeholder={"\u4F8B\uFF1AMy OpenAI"} style={{
                      width: "100%", padding: "10px 12px", borderRadius: 8,
                      border: `1px solid ${"var(--c-p200)"}`, background: "var(--c-surface)",
                      fontSize: 13, color: "var(--c-p800)", outline: "none",
                      fontFamily: "var(--zh-font), sans-serif", boxSizing: "border-box",
                    }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "var(--c-s500)", marginBottom: 4 }}>API Key</div>
                    <input value={customApi.key} onChange={e => setCustomApi(p => ({ ...p, key: e.target.value }))} placeholder="sk-..." style={{
                      width: "100%", padding: "10px 12px", borderRadius: 8,
                      border: `1px solid ${"var(--c-p200)"}`, background: "var(--c-surface)",
                      fontSize: 13, color: "var(--c-p800)", outline: "none",
                      fontFamily: "monospace", boxSizing: "border-box",
                    }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "var(--c-s500)", marginBottom: 4 }}>Base URL</div>
                    <input value={customApi.baseUrl} onChange={e => setCustomApi(p => ({ ...p, baseUrl: e.target.value }))} placeholder="https://api.example.com/v1" style={{
                      width: "100%", padding: "10px 12px", borderRadius: 8,
                      border: `1px solid ${"var(--c-p200)"}`, background: "var(--c-surface)",
                      fontSize: 13, color: "var(--c-p800)", outline: "none",
                      fontFamily: "monospace", boxSizing: "border-box",
                    }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "var(--c-s500)", marginBottom: 4 }}>{"\u9ED8\u8BA4\u6A21\u578B"}</div>
                    <input value={customApi.model} onChange={e => setCustomApi(p => ({ ...p, model: e.target.value }))} placeholder="gpt-4o" style={{
                      width: "100%", padding: "10px 12px", borderRadius: 8,
                      border: `1px solid ${"var(--c-p200)"}`, background: "var(--c-surface)",
                      fontSize: 13, color: "var(--c-p800)", outline: "none",
                      fontFamily: "monospace", boxSizing: "border-box",
                    }} />
                  </div>

                  {/* Submit */}
                  <div onClick={async () => {
                    const name = customApi.name || (tpl.id !== "custom" ? tpl.name : "\u81EA\u5B9A\u4E49 API");
                    const key = customApi.key;
                    if (!key.trim()) return;
                    const masked = key.length > 8 ? `${key.slice(0, 4)}...${key.slice(-4)}` : "****";
                    const newKey = {
                      id: Date.now(), name, provider: selectedProvider,
                      key: masked, baseUrl: customApi.baseUrl || tpl.baseUrl,
                      model: customApi.model || tpl.model,
                      added: new Date().toISOString().slice(0, 10),
                    };
                    if (userId && userId !== 'anonymous') {
                      try {
                        const saved = await saveApiKey(userId, {
                          name, key, base_url: newKey.baseUrl, model: newKey.model, provider: selectedProvider,
                        });
                        if (saved && saved.id) newKey.id = saved.id;
                      } catch (e) {
                        console.error("[saveApiKey]", e);
                      }
                    }
                    setApiKeys(prev => [...prev, newKey]);
                    setShowAddApi(false);
                    setCustomApi({ name: "", key: "", baseUrl: "", model: "" });
                  }} style={{
                    padding: "13px 0", borderRadius: 12, background: "var(--c-p800)",
                    color: "#fff", fontSize: 14, fontWeight: 600,
                    textAlign: "center", cursor: "pointer", marginTop: 4,
                    fontFamily: "var(--zh-font), sans-serif",
                  }}>{"\u4FDD\u5B58"}</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  /* ── Check-in history sub-page ── */
  if (showCheckinHistory) {
    const taskNames = ["复习旧词", "学习新词", "阅读理解", "造句练习"];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div onClick={() => setShowCheckinHistory(false)} style={{
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            width: 32, height: 32, borderRadius: 10, background: "var(--c-p100)", flexShrink: 0,
          }}>
            <ChevronLeft size={18} strokeWidth={IW} color={"var(--c-p700)"} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--c-p800)", margin: 0, fontFamily: "var(--zh-font), serif" }}>打卡记录</h1>
        </div>
        <Card style={{ padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: "var(--c-gold)" }}>{streak}</div>
          <div style={{ fontSize: 13, color: "var(--c-s500)", marginTop: 4 }}>连续打卡天数</div>
        </Card>
        {checkinHistory.length === 0 ? (
          <div style={{ textAlign: "center", padding: 24, color: "var(--c-s400)", fontSize: 13 }}>
            暂无打卡记录
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {checkinHistory.sort((a, b) => b.date.localeCompare(a.date)).map((entry, i) => (
              <Card key={i} style={{ padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)" }}>{entry.date}</div>
                    <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                      {(entry.tasks || []).map((tIdx, j) => (
                        <Badge key={j} bg={"color-mix(in srgb, var(--c-ok) 15%, transparent)"} fg={"var(--c-ok)"} style={{ fontSize: 10 }}>
                          {taskNames[tIdx] || `任务${tIdx + 1}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", background: "var(--c-ok)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Check size={14} strokeWidth={2} color="#fff" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ── Font selection sub-page ── */
  if (showFontPage) {
    const FontCard = ({ family, label, preview, active, onClick }) => (
      <div onClick={onClick} style={{
        padding: "16px 18px", borderRadius: 14, position: "relative",
        border: active ? "2px solid var(--c-teal)" : `1px solid ${"var(--c-p100)"}`,
        background: active ? "color-mix(in srgb, var(--c-teal) 6%, transparent)" : "var(--c-surface)",
        cursor: "pointer", transition: "all 0.2s",
      }}>
        {active && <div style={{
          position: "absolute", top: 10, right: 10,
          width: 10, height: 10, borderRadius: "50%", background: "var(--c-teal)",
        }} />}
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-p800)", marginBottom: 8 }}>{label}</div>
        <div style={{ fontSize: 20, color: "var(--c-p700)", fontFamily: `'${family}', sans-serif`, lineHeight: 1.4 }}>{preview}</div>
      </div>
    );

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div onClick={() => setShowFontPage(false)} style={{
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            width: 32, height: 32, borderRadius: 10, background: "var(--c-p100)", flexShrink: 0,
          }}>
            <ChevronLeft size={18} strokeWidth={IW} color={"var(--c-p700)"} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--c-p800)", margin: 0, fontFamily: "var(--zh-font), serif" }}>字体设置</h1>
        </div>
        <Card style={{ padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)", marginBottom: 12 }}>中文</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {zhFonts.map(f => (
              <FontCard key={f} family={f} label={f} preview="สวัสดี 你好世界" active={zhFont === f} onClick={() => setZhFont(f)} />
            ))}
          </div>
        </Card>
        <Card style={{ padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-p800)", marginBottom: 12 }}>泰文</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {thFonts.map(f => (
              <FontCard key={f} family={f} label={f} preview="สวัสดีครับ ยินดีที่ได้รู้จัก" active={thFont === f} onClick={() => setThFont(f)} />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 16px 16px" }}>
      {/* Profile card */}
      <Card style={{ padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Avatar with upload */}
          <div onClick={() => fileInputRef.current?.click()} style={{
            width: 56, height: 56, borderRadius: "50%", background: "var(--c-p100)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 700, color: "var(--c-p600)", flexShrink: 0,
            cursor: "pointer", overflow: "hidden", position: "relative",
          }}>
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              (user?.user_metadata?.full_name || user?.email || userId || "U").charAt(0).toUpperCase()
            )}
            {avatarUploading && <div style={{
              position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ width: 20, height: 20, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
            </div>}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file || !user) return;
            setAvatarUploading(true);
            try {
              const { url, error } = await uploadAvatar(userId, file);
              if (url) {
                await updateUserProfile({ avatar_url: url });
              } else {
                console.error("[avatar] upload failed:", error);
              }
            } catch (err) { console.error("[avatar]", err); }
            setAvatarUploading(false);
            e.target.value = "";
          }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
            {/* Nickname with inline edit */}
            {editingNickname ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input value={nicknameInput} onChange={e => setNicknameInput(e.target.value)} autoFocus
                  onKeyDown={async (e) => {
                    if (e.key === "Enter" && nicknameInput.trim()) {
                      try { await updateUserProfile({ full_name: nicknameInput.trim() }); } catch {}
                      setEditingNickname(false);
                    } else if (e.key === "Escape") { setEditingNickname(false); }
                  }}
                  style={{
                    flex: 1, padding: "4px 8px", borderRadius: 8,
                    border: `1px solid ${"var(--c-p200)"}`, background: "var(--c-input)",
                    fontSize: 17, fontWeight: 700, color: "var(--c-p800)",
                    fontFamily: "var(--zh-font), sans-serif", outline: "none",
                  }}
                />
                <div onClick={async () => {
                  if (nicknameInput.trim()) {
                    try { await updateUserProfile({ full_name: nicknameInput.trim() }); } catch {}
                  }
                  setEditingNickname(false);
                }} style={{ cursor: "pointer", padding: 4 }}>
                  <Check size={16} strokeWidth={2} color={"var(--c-teal)"} />
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 17, fontWeight: 700, color: "var(--c-p800)" }}>
                  {user?.user_metadata?.full_name || user?.email || (userId ? (userId.length > 12 ? userId.slice(0, 12) + "..." : userId) : "User")}
                </span>
                <div onClick={() => { setNicknameInput(user?.user_metadata?.full_name || ""); setEditingNickname(true); }}
                  style={{ cursor: "pointer", display: "flex" }}>
                  <Pencil size={13} strokeWidth={IW} color={"var(--c-s400)"} />
                </div>
              </div>
            )}
            {/* Stats horizontal */}
            <div style={{ display: "flex", gap: 16 }}>
              <div onClick={() => setShowCheckinHistory(true)} style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer" }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: "var(--c-gold)" }}>{streak}</span>
                <span style={{ fontSize: 11, color: "var(--c-s500)" }}>{"\u5929\u6253\u5361"}</span>
              </div>
              <div onClick={() => onNavigateToWords?.()} style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer" }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: "var(--c-teal)" }}>{bookmarkCount}</span>
                <span style={{ fontSize: 11, color: "var(--c-s500)" }}>{"\u8BCD\u6C47"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: "var(--c-amber)" }}>{checkinHistory.length}</span>
                <span style={{ fontSize: 11, color: "var(--c-s500)" }}>{"\u5929\u5B66\u4E60"}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Settings */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${"var(--c-p100)"}` }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--c-p800)", margin: 0, fontFamily: "var(--zh-font), serif" }}>{"\u57FA\u7840\u8BBE\u7F6E"}</h2>
        </div>
        <div style={{ padding: "0 18px" }}>
          <SettingRow icon={Globe} label={"\u754C\u9762\u8BED\u8A00"} desc={"\u5E94\u7528\u663E\u793A\u8BED\u8A00"}>
            <select style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${"var(--c-p200)"}`, background: "var(--c-input)", fontSize: 12, color: "var(--c-p700)", outline: "none", fontFamily: "var(--zh-font), sans-serif" }}>
              <option>{"\u4E2D\u6587"}</option><option>{"\u6CF0\u8BED"}</option>
            </select>
          </SettingRow>
          <SettingRow icon={BookOpen} label={"\u8BCD\u5178\u65B9\u5411"} desc={"\u4E2D\u6587\u67E5\u6CF0\u8BED\u91CA\u4E49"}>
            <select value={dictDir} onChange={e => setDictDir(e.target.value)} style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${"var(--c-p200)"}`, background: "var(--c-input)", fontSize: 12, color: "var(--c-p700)", outline: "none", fontFamily: "var(--zh-font), sans-serif" }}>
              <option value="zh-th">{"\u4E2D \u2192 \u6CF0"}</option>
              <option value="th-zh">{"\u6CF0 \u2192 \u4E2D"}</option>
            </select>
          </SettingRow>
          <SettingRow icon={Moon} label={"\u989C\u8272\u6A21\u5F0F"}>
            <div style={{ position: "relative" }}>
              <div onClick={() => setShowColorDropdown(!showColorDropdown)} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "6px 10px", borderRadius: 8,
                border: `1px solid ${"var(--c-p200)"}`, background: "var(--c-input)",
                cursor: "pointer", fontSize: 12, color: "var(--c-p700)",
                fontFamily: "var(--zh-font), sans-serif",
                minWidth: 70,
              }}>
                {colorMode === "light" && <Sun size={13} strokeWidth={1.5} color={"var(--c-p600)"} />}
                {colorMode === "dark" && <Moon size={13} strokeWidth={1.5} color={"var(--c-p600)"} />}
                {colorMode === "system" && <Smartphone size={13} strokeWidth={1.5} color={"var(--c-p600)"} />}
                <span>{colorMode === "light" ? "\u660E\u4EAE" : colorMode === "dark" ? "\u591C\u95F4" : "\u7CFB\u7EDF"}</span>
              </div>
              {showColorDropdown && (
                <>
                  <div onClick={() => setShowColorDropdown(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} />
                  <div style={{
                    position: "absolute", right: 0, top: "100%", marginTop: 4,
                    background: "var(--c-surface)", borderRadius: 10,
                    boxShadow: "0 4px 16px rgba(61,43,31,0.14)",
                    border: `1px solid ${"var(--c-p100)"}`, zIndex: 1000,
                    minWidth: 110, overflow: "hidden",
                  }}>
                    {[
                      { key: "light", icon: Sun, label: "\u660E\u4EAE" },
                      { key: "dark", icon: Moon, label: "\u591C\u95F4" },
                      { key: "system", icon: Smartphone, label: "\u7CFB\u7EDF" },
                    ].map(opt => {
                      const Icon = opt.icon;
                      const active = colorMode === opt.key;
                      return (
                        <div key={opt.key} onClick={() => { setColorMode(opt.key); setShowColorDropdown(false); }} style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "9px 14px", cursor: "pointer",
                          background: active ? "var(--c-p50)" : "transparent",
                          color: active ? "var(--c-p800)" : "var(--c-s500)",
                          fontSize: 12, fontWeight: active ? 600 : 400,
                          borderBottom: `1px solid ${"var(--c-p100)"}`,
                        }}>
                          <Icon size={14} strokeWidth={1.5} color={active ? "var(--c-p700)" : "var(--c-s400)"} />
                          <span>{opt.label}</span>
                          {active && <Check size={12} strokeWidth={2} color={"var(--c-teal)"} style={{ marginLeft: "auto" }} />}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </SettingRow>
          <SettingRow icon={Bell} label={"\u590D\u4E60\u63D0\u9192"} desc={"\u6BCF\u65E5\u5B9A\u65F6\u63D0\u9192"}>
            <Toggle on={reminderEnabled} onToggle={() => setReminderEnabled(!reminderEnabled)} />
          </SettingRow>
          <SettingRow icon={Pencil} label="字体设置" desc={`${zhFont} / ${thFont}`}>
            <div onClick={() => setShowFontPage(true)} style={{
              display: "flex", alignItems: "center", gap: 4, cursor: "pointer",
              fontSize: 12, color: "var(--c-p500)", fontWeight: 500,
            }}>
              <span>选择</span>
              <ChevronRight size={14} strokeWidth={IW} color={"var(--c-s300)"} />
            </div>
          </SettingRow>
        </div>
      </Card>

      {/* WebDAV */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${"var(--c-p100)"}` }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--c-p800)", margin: 0, fontFamily: "var(--zh-font), serif" }}>WebDAV 同步</h2>
        </div>
        <div style={{ padding: "0 18px" }}>
          <SettingRow icon={Cloud} label="服务器" desc={webdavConnected ? `已连接: ${webdavConfig.serverUrl.replace(/https?:\/\//, "").split("/")[0]}` : "未连接"}>
            <Btn variant={webdavConnected ? "secondary" : "primary"} icon={webdavConnected ? Check : Plus} onClick={() => setShowWebdavModal(true)} style={{ padding: "6px 12px", fontSize: 12 }}>
              {webdavConnected ? "已连接" : "连接"}
            </Btn>
          </SettingRow>
          <SettingRow icon={Upload} label="上传笔记" desc="同步到 WebDAV">
            <Btn variant="secondary" icon={Upload} onClick={() => !webdavConnected && setShowWebdavModal(true)} style={{ padding: "6px 12px", fontSize: 12, opacity: webdavConnected ? 1 : 0.5 }}>上传</Btn>
          </SettingRow>
          <SettingRow icon={Download} label="下载备份" desc="从服务器恢复">
            <Btn variant="secondary" icon={Download} onClick={() => !webdavConnected && setShowWebdavModal(true)} style={{ padding: "6px 12px", fontSize: 12, opacity: webdavConnected ? 1 : 0.5 }}>下载</Btn>
          </SettingRow>
        </div>
      </Card>

      {/* WebDAV Config Modal */}
      {showWebdavModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 2000, padding: 20,
        }}>
          <div style={{
            width: "100%", maxWidth: 380, background: "var(--c-surface)",
            borderRadius: 18, padding: "24px 20px",
            boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--c-p800)", margin: 0, fontFamily: "var(--zh-font), serif" }}>WebDAV 配置</h3>
              <div onClick={() => setShowWebdavModal(false)} style={{ cursor: "pointer", padding: 4 }}>
                <X size={18} strokeWidth={IW} color={"var(--c-s400)"} />
              </div>
            </div>
            {[
              { label: "服务器地址", key: "serverUrl", placeholder: "https://dav.jianguoyun.com/dav/", type: "url" },
              { label: "用户名", key: "username", placeholder: "your@email.com", type: "text" },
              { label: "密码", key: "password", placeholder: "应用密码", type: "password" },
            ].map(field => (
              <div key={field.key} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--c-s500)", marginBottom: 4 }}>{field.label}</div>
                <input
                  type={field.type}
                  value={webdavConfig[field.key]}
                  onChange={e => setWebdavConfig(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 10,
                    border: `1px solid ${"var(--c-p200)"}`, background: "var(--c-input)",
                    fontSize: 13, color: "var(--c-p800)", outline: "none",
                    fontFamily: "var(--zh-font), sans-serif", boxSizing: "border-box",
                  }}
                />
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              {webdavConnected && (
                <div onClick={() => { setWebdavConnected(false); setWebdavConfig({ serverUrl: "", username: "", password: "" }); setShowWebdavModal(false); }}
                  style={{
                    flex: 1, padding: "12px 0", borderRadius: 12,
                    border: `1px solid ${"var(--c-errL)"}`, background: "var(--c-surface)",
                    color: "var(--c-err)", fontSize: 13, fontWeight: 500,
                    textAlign: "center", cursor: "pointer",
                  }}>断开</div>
              )}
              <div onClick={() => {
                if (webdavConfig.serverUrl && webdavConfig.username && webdavConfig.password) {
                  setWebdavConnected(true);
                  setShowWebdavModal(false);
                }
              }} style={{
                flex: 1, padding: "12px 0", borderRadius: 12,
                background: "var(--c-p800)", color: "#fff", fontSize: 13, fontWeight: 600,
                textAlign: "center", cursor: "pointer",
                opacity: (webdavConfig.serverUrl && webdavConfig.username && webdavConfig.password) ? 1 : 0.5,
              }}>保存</div>
            </div>
          </div>
        </div>
      )}

      {/* Data management */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${"var(--c-p100)"}` }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--c-p800)", margin: 0, fontFamily: "var(--zh-font), serif" }}>{"\u6570\u636E\u7BA1\u7406"}</h2>
        </div>
        <div style={{ padding: "0 18px" }}>
          <SettingRow icon={HardDrive} label={"\u5B58\u50A8\u7A7A\u95F4"} desc={"\u5DF2\u7528 12.4/50 MB"}>
            <div style={{ width: 80 }}><ProgressBar value={12.4} max={50} color={"var(--c-teal)"} /></div>
          </SettingRow>
          <SettingRow icon={FileText} label={"\u5BFC\u51FA\u6570\u636E"} desc={"\u5BFC\u51FA\u4E3A JSON \u6587\u4EF6"}>
            <Btn variant="secondary" icon={Download} style={{ padding: "6px 12px", fontSize: 12 }}>{"\u5BFC\u51FA"}</Btn>
          </SettingRow>
        </div>
      </Card>

      {/* AI API Management */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${"var(--c-p100)"}` }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--c-p800)", margin: 0, fontFamily: "var(--zh-font), serif" }}>AI {"\u7BA1\u7406"}</h2>
        </div>
        <div style={{ padding: "0 18px" }}>
          <SettingRow icon={Key} label={"API \u7BA1\u7406"} desc={`${apiKeys.length} \u4E2A\u5DF2\u914D\u7F6E`}>
            <div onClick={() => setShowApiMgmt(true)} style={{
              display: "flex", alignItems: "center", gap: 4, cursor: "pointer",
              fontSize: 12, color: "var(--c-p500)", fontWeight: 500,
            }}>
              <span>{"\u7BA1\u7406"}</span>
              <ChevronRight size={14} strokeWidth={IW} color={"var(--c-s300)"} />
            </div>
          </SettingRow>
        </div>
      </Card>

      {/* Logout */}
      <div onClick={onLogout} style={{
        padding: "14px 0", borderRadius: 12, background: "var(--c-surface)",
        border: `1px solid ${"var(--c-errL)"}`, textAlign: "center",
        cursor: "pointer", fontSize: 14, fontWeight: 500,
        color: "var(--c-err)", fontFamily: "var(--zh-font), sans-serif",
        transition: "background 0.2s",
      }}>
        {"\u9000\u51FA\u767B\u5F55"}
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────
   PAGE: LOGIN — Supabase Auth, OAuth + email
   ──────────────────────────────────────────── */
const LoginPage = ({ onLogin }) => {
  const [loginMode, setLoginMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verifyMessage, setVerifyMessage] = useState("");
  const [registerStep, setRegisterStep] = useState("form"); // "form" | "verify"
  const [verifyCode, setVerifyCode] = useState("");

  const isRegister = loginMode === "register";

  const switchMode = () => {
    setLoginMode(isRegister ? "login" : "register");
    setError(""); setVerifyMessage(""); setConfirmPwd("");
    setRegisterStep("form"); setVerifyCode("");
  };

  const handleCredentialLogin = async () => {
    setError(""); setVerifyMessage("");
    if (!email.trim() || !password.trim()) { setError("请填写完整信息"); return; }
    setLoading(true);
    try {
      const { data, error: err } = await signInWithEmail(email, password);
      if (err) {
        if (err.includes("Invalid login") || err.includes("Email not confirmed")) {
          setError("邮箱或密码错误，或邮箱未验证");
        } else {
          setError(err);
        }
      } else {
        onLogin?.();
      }
    } catch (e) {
      setError("登录失败，请重试");
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    setError(""); setVerifyMessage("");
    if (!email.trim() || !password.trim()) { setError("请填写完整信息"); return; }
    if (password !== confirmPwd) { setError("两次输入的密码不一致"); return; }
    if (password.length < 6) { setError("密码至少需要 6 位"); return; }
    setLoading(true);
    try {
      const { data, error: err } = await signUpWithEmail(email, password, username);
      if (err) {
        if (err.includes("already registered")) {
          setError("该邮箱已注册，请直接登录");
        } else {
          setError(err);
        }
      } else if (data?.user && !data?.session) {
        // Email verification required
        setRegisterStep("verify");
        setVerifyMessage("验证码已发送到您的邮箱，请查收并输入");
      } else {
        onLogin?.();
      }
    } catch (e) {
      console.error("[Register]", e);
      setError("注册失败，请重试");
    }
    setLoading(false);
  };

  const handleVerify = async () => {
    setError(""); setVerifyMessage("");
    if (!verifyCode.trim()) { setError("请输入验证码"); return; }
    setLoading(true);
    try {
      const { data, error: err } = await verifyEmailOtp(email, verifyCode.trim());
      if (err) {
        setError(err);
      } else {
        onLogin?.();
      }
    } catch (e) {
      setError("验证失败，请重试");
    }
    setLoading(false);
  };

  const handleOAuth = async (provider) => {
    setError(""); setVerifyMessage("");
    setLoading(true);
    try {
      const { error: err } = await signInWithOAuth(provider);
      if (err) {
        console.error(`[OAuth ${provider}]`, err);
        setError("第三方登录失败，请重试");
      }
      // On success, the browser will redirect to the OAuth provider
    } catch (e) {
      console.error(`[OAuth ${provider}]`, e);
      setError("第三方登录失败，请重试");
    }
    setLoading(false);
  };

  /* ── Brand-colored SVG icons for OAuth providers ── */
  const AppleBrandIcon = ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 384 512" fill="#000">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
    </svg>
  );

  const GitHubBrandIcon = ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#24292F">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
    </svg>
  );

  const GoogleBrandIcon = ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );

  const containerStyle = {
    maxWidth: 430, margin: "0 auto", minHeight: "100vh",
    background: "var(--c-bg)", fontFamily: "var(--zh-font), var(--th-font), sans-serif",
    color: "var(--c-p800)", display: "flex", flexDirection: "column",
  };

  const oauthProviders = [
    { key: "apple", label: "Apple", Icon: AppleBrandIcon },
    { key: "google", label: "Google", Icon: GoogleBrandIcon },
    { key: "github", label: "GitHub", Icon: GitHubBrandIcon },
  ];

  const inputStyle = {
    width: "100%", padding: "14px 16px", borderRadius: 12,
    border: `1px solid ${"var(--c-p200)"}`, background: "var(--c-surface)",
    fontSize: 15, color: "var(--c-p800)", outline: "none",
    fontFamily: "var(--zh-font), sans-serif", boxSizing: "border-box",
    transition: "border-color 0.2s",
  };

  return (
    <div style={containerStyle}>
      <div style={{ height: 44, flexShrink: 0 }} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 28px", gap: 0 }}>
        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Logo size={40} color={"var(--c-p600)"} />
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--c-p900)", marginTop: 10, fontFamily: "var(--zh-font), serif", letterSpacing: 2 }}>
            词笺
          </div>
          <div style={{ fontSize: 13, color: "var(--c-s400)", marginTop: 4 }}>
            中泰双语智能词典
          </div>
        </div>

        {/* ── OAuth circular buttons ── */}
        <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 20 }}>
          {oauthProviders.map(({ key, label, Icon: OIcon }) => (
            <div key={key} onClick={() => handleOAuth(key)} style={{
              width: 56, height: 56, borderRadius: "50%",
              border: `1.5px solid ${key === "google" ? "var(--c-p100)" : "var(--c-p200)"}`,
              background: key === "google" ? "#fff" : "var(--c-surface)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "all 0.2s",
              boxShadow: key === "google" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.12)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = key === "google" ? "0 1px 3px rgba(0,0,0,0.08)" : "none"; }}
            title={`${label} 登录 / 注册`}
            >
              <OIcon size={22} />
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 20px 0" }}>
          <div style={{ flex: 1, height: 1, background: "var(--c-p100)" }} />
          <span style={{ fontSize: 12, color: "var(--c-s300)" }}>或使用邮箱</span>
          <div style={{ flex: 1, height: 1, background: "var(--c-p100)" }} />
        </div>

        {/* ── Verify step (after registration email sent) ── */}
        {isRegister && registerStep === "verify" ? (
          <>
            <div style={{ textAlign: "center", padding: "12px 16px", marginBottom: 16, borderRadius: 10, background: "var(--c-infoL)" }}>
              <div style={{ fontSize: 13, color: "var(--c-info)", fontWeight: 500 }}>
                验证码已发送到 <strong>{email}</strong>
              </div>
              <div style={{ fontSize: 11, color: "var(--c-s400)", marginTop: 4 }}>
                请查收邮箱并输入6位验证码
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={verifyCode}
                onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                placeholder="请输入6位验证码"
                onKeyDown={e => e.key === "Enter" && handleVerify()}
                style={{ ...inputStyle, textAlign: "center", fontSize: 20, letterSpacing: 8, fontWeight: 700 }}
                onFocus={e => e.target.style.borderColor = "var(--c-p400)"}
                onBlur={e => e.target.style.borderColor = "var(--c-p200)"}
                autoFocus
              />
            </div>
            {error && (
              <div style={{
                fontSize: 12, color: "var(--c-err)", textAlign: "center", padding: "8px 12px",
                background: "var(--c-errL)", borderRadius: 8, marginBottom: 4,
              }}>{error}</div>
            )}
            <button
              onClick={handleVerify}
              disabled={loading}
              style={{
                width: "100%", padding: "14px 0", borderRadius: 12, border: "none",
                background: "var(--c-p800)", color: "#fff", fontSize: 15, fontWeight: 600,
                cursor: loading ? "wait" : "pointer", marginTop: 8,
                fontFamily: "var(--zh-font), sans-serif", transition: "background 0.2s",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "验证中..." : "验证并注册"}
            </button>
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <span style={{ fontSize: 12, color: "var(--c-s400)" }}>没有收到？</span>
              <span onClick={() => handleRegister()} style={{
                fontSize: 12, color: "var(--c-p600)", fontWeight: 600, cursor: "pointer", marginLeft: 4,
              }}>重新发送</span>
            </div>
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <span onClick={() => { setRegisterStep("form"); setVerifyCode(""); setError(""); }} style={{
                fontSize: 12, color: "var(--c-s400)", cursor: "pointer",
              }}>返回修改信息</span>
            </div>
          </>
        ) : (
          <>
            {/* Email input */}
            <div style={{ marginBottom: 12 }}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="邮箱地址"
                onKeyDown={e => e.key === "Enter" && !isRegister && handleCredentialLogin()}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = "var(--c-p400)"}
                onBlur={e => e.target.style.borderColor = "var(--c-p200)"}
              />
            </div>

            {/* Username field (register mode only, optional) */}
            {isRegister && (
              <div style={{ marginBottom: 12 }}>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="用户名（可选）"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "var(--c-p400)"}
                  onBlur={e => e.target.style.borderColor = "var(--c-p200)"}
                />
              </div>
            )}

            {/* Password field */}
            <div style={{ marginBottom: 12, position: "relative" }}>
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="密码"
                onKeyDown={e => e.key === "Enter" && !isRegister && handleCredentialLogin()}
                style={{ ...inputStyle, paddingRight: 44 }}
                onFocus={e => e.target.style.borderColor = "var(--c-p400)"}
                onBlur={e => e.target.style.borderColor = "var(--c-p200)"}
              />
              <div onClick={() => setShowPwd(!showPwd)} style={{
                position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                cursor: "pointer", display: "flex", alignItems: "center",
              }}>
                {showPwd
                  ? <EyeOff size={18} strokeWidth={1.5} color={"var(--c-s400)"} />
                  : <Eye size={18} strokeWidth={1.5} color={"var(--c-s400)"} />}
              </div>
            </div>

            {/* Confirm password (register mode only) */}
            {isRegister && (
              <div style={{ marginBottom: 12, position: "relative" }}>
                <input
                  type={showConfirmPwd ? "text" : "password"}
                  value={confirmPwd}
                  onChange={e => setConfirmPwd(e.target.value)}
                  placeholder="确认密码"
                  onKeyDown={e => e.key === "Enter" && handleRegister()}
                  style={{ ...inputStyle, paddingRight: 44 }}
                  onFocus={e => e.target.style.borderColor = "var(--c-p400)"}
                  onBlur={e => e.target.style.borderColor = "var(--c-p200)"}
                />
                <div onClick={() => setShowConfirmPwd(!showConfirmPwd)} style={{
                  position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                  cursor: "pointer", display: "flex", alignItems: "center",
                }}>
                  {showConfirmPwd
                    ? <EyeOff size={18} strokeWidth={1.5} color={"var(--c-s400)"} />
                    : <Eye size={18} strokeWidth={1.5} color={"var(--c-s400)"} />}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{
                fontSize: 12, color: "var(--c-err)", textAlign: "center", padding: "8px 12px",
                background: "var(--c-errL)", borderRadius: 8, marginBottom: 4,
              }}>{error}</div>
            )}

            {/* Verify message */}
            {verifyMessage && (
              <div style={{
                fontSize: 12, color: "var(--c-info)", textAlign: "center", padding: "8px 12px",
                background: "var(--c-infoL)", borderRadius: 8, marginBottom: 4,
              }}>{verifyMessage}</div>
            )}

            {/* Action button */}
            <button
              onClick={isRegister ? handleRegister : handleCredentialLogin}
              disabled={loading}
              style={{
            width: "100%", padding: "14px 0", borderRadius: 12, border: "none",
            background: "var(--c-p800)", color: "#fff", fontSize: 15, fontWeight: 600,
            cursor: loading ? "wait" : "pointer", marginTop: 8,
            fontFamily: "var(--zh-font), sans-serif", transition: "background 0.2s",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading
            ? (isRegister ? "注册中..." : "登录中...")
            : (isRegister ? "创建账号" : "登录")}
        </button>
          </>
        )}

        {/* Mode toggle */}
        <div style={{ textAlign: "center", margin: "16px 0" }}>
          <span style={{ fontSize: 13, color: "var(--c-s400)" }}>
            {isRegister ? "已有账号？" : "还没有账号？"}
          </span>
          <span onClick={switchMode} style={{
            fontSize: 13, color: "var(--c-p600)", fontWeight: 600, cursor: "pointer", marginLeft: 4,
          }}>{isRegister ? "立即登录" : "创建账号"}</span>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: "auto", paddingBottom: 28, paddingTop: 20 }}>
          <span style={{ fontSize: 11, color: "var(--c-s300)" }}>
            {isRegister ? "注册" : "登录"}即表示同意
          </span>
          <span style={{ fontSize: 11, color: "var(--c-p500)", cursor: "pointer" }}> 服务条款</span>
          <span style={{ fontSize: 11, color: "var(--c-s300)" }}> 和 </span>
          <span style={{ fontSize: 11, color: "var(--c-p500)", cursor: "pointer" }}>隐私政策</span>
        </div>
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────
   MAIN APP: Mobile-first with bottom nav
   ──────────────────────────────────────────── */
export default function App() {
  // Supabase Auth session management — AuthProvider wraps the app (see main.jsx)
  const { user: supaUser, session, loading: authLoading, signOut: handleSignOut } = useAuth();
  const userId = supaUser?.id || 'anonymous';
  const isLoggedIn = !!session;

  const [page, setPage] = useState("home");
  const [detailWord, setDetailWord] = useState(null);
  const [unknownWord, setUnknownWord] = useState(null);
  const [generatedWords, setGeneratedWords] = useState({});
  const [selectedSentence, setSelectedSentence] = useState(null);
  const [dbWordData, setDbWordData] = useState({});
  const [detailLoading, setDetailLoading] = useState(false);

  /* ── Navigation history stack (back / forward) ── */
  const [navStack, setNavStack] = useState([]);    // back history: [{type, word}]
  const [navForward, setNavForward] = useState([]); // forward history: [{type, word}]

  const getCurrentView = useCallback(() => {
    if (unknownWord) return { type: 'unknown', word: unknownWord };
    if (detailWord) return { type: 'detail', word: detailWord };
    return null;
  }, [unknownWord, detailWord]);

  const navigateTo = useCallback((entry) => {
    const current = getCurrentView();
    if (current) {
      setNavStack(prev => [...prev, current]);
    }
    setNavForward([]);
    if (entry.type === 'detail') {
      setUnknownWord(null);
      setDetailWord(entry.word);
    } else if (entry.type === 'unknown') {
      setDetailWord(null);
      setUnknownWord(entry.word);
    }
  }, [getCurrentView]);

  const goBack = useCallback(() => {
    if (navStack.length === 0) {
      setDetailWord(null);
      setUnknownWord(null);
      return;
    }
    const current = getCurrentView();
    const prev = navStack[navStack.length - 1];
    setNavStack(s => s.slice(0, -1));
    if (current) setNavForward(f => [...f, current]);
    if (prev.type === 'detail') {
      setUnknownWord(null);
      setDetailWord(prev.word);
    } else if (prev.type === 'unknown') {
      setDetailWord(null);
      setUnknownWord(prev.word);
    }
  }, [navStack, getCurrentView]);

  const goForward = useCallback(() => {
    if (navForward.length === 0) return;
    const current = getCurrentView();
    const next = navForward[navForward.length - 1];
    setNavForward(f => f.slice(0, -1));
    if (current) setNavStack(s => [...s, current]);
    if (next.type === 'detail') {
      setUnknownWord(null);
      setDetailWord(next.word);
    } else if (next.type === 'unknown') {
      setDetailWord(null);
      setUnknownWord(next.word);
    }
  }, [navForward, getCurrentView]);

  const resetNav = useCallback(() => {
    setDetailWord(null);
    setUnknownWord(null);
    setNavStack([]);
    setNavForward([]);
  }, []);

  /* ── Theme (color mode) management ── */
  const [colorMode, setColorMode] = useState(() => {
    return localStorage.getItem('thaidict-color-mode') || 'light';
  });
  useEffect(() => {
    if (colorMode === 'dark') {
      document.documentElement.dataset.theme = 'dark';
    } else if (colorMode === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.dataset.theme = prefersDark ? 'dark' : 'light';
    } else {
      delete document.documentElement.dataset.theme;
    }
    localStorage.setItem('thaidict-color-mode', colorMode);
  }, [colorMode]);

  const handleWordTap = async (word) => {
    if (!word) return;
    // Check cache first (DB or generated)
    if (dbWordData[word] || generatedWords[word]) {
      navigateTo({ type: 'detail', word });
      return;
    }
    // Try Supabase lookup
    if (isSupabaseConfigured) {
      setDetailLoading(true);
      try {
        const row = await getWordByThai(word);
        if (row) {
          const transformed = transformWordData(row);
          setDbWordData(prev => ({ ...prev, [word]: transformed }));
          setDetailLoading(false);
          navigateTo({ type: 'detail', word });
          return;
        }
      } catch (err) {
        console.error("[handleWordTap]", err);
      }
      setDetailLoading(false);
    }
    // Not found → unknown word page
    navigateTo({ type: 'unknown', word });
  };

  const handleGenerated = async (word, zhHint = "") => {
    if (!isSupabaseConfigured) {
      console.error("[handleGenerated] Supabase not configured");
      return;
    }

    try {
      // Get user's default API preference
      let userApi = null;
      if (userId && userId !== 'anonymous') {
        const settings = await getUserSettings(userId);
        if (settings?.default_api_id && settings.default_api_id !== 'system') {
          const keys = await getApiKeys(userId);
          const defaultKey = keys.find(k => k.id === settings.default_api_id || String(k.id) === String(settings.default_api_id));
          if (defaultKey) {
            // Fetch the actual key from user_api_keys table (key_masked won't work)
            userApi = { key: defaultKey.key, base_url: defaultKey.base_url, model: defaultKey.model };
          }
        }
      }

      const prompt = `请为泰语词语"${word}"生成完整的词条数据。${zhHint ? `中文提示：${zhHint}` : ''}`;
      const result = await callAiProxy(prompt, userApi);

      if (result.error) {
        console.error("[handleGenerated] AI error:", result.error);
        // Fallback: still navigate to detail page with empty data
        setUnknownWord(null);
        setDetailWord(word);
        return;
      }

      const aiData = result.data;
      if (aiData && aiData.word) {
        // Transform AI response to match our word detail format
        const genData = {
          word: aiData.word || word,
          romanization: aiData.romanization || "",
          romanization_source: "deepseek",
          sources: ["src_ai_generated"],
          sense_count: (aiData.senses || []).length || 1,
          senses: (aiData.senses || []).map((s, i) => ({
            sense_id: s.sense_id || (i + 1),
            pos: s.pos || "未标注",
            meaning: s.meaning || "",
            register: s.register || "通用",
            examples: Array.isArray(s.examples) ? s.examples : [],
            segmented: Array.isArray(s.segmented) ? s.segmented : null,
            source: "ai_generated",
          })),
          freq_ttc: aiData.freq_ttc || null,
          freq_tnc: aiData.freq_tnc || null,
          freq_phupha: aiData.freq_phupha || null,
          synonyms: Array.isArray(aiData.synonyms) ? aiData.synonyms : [],
          antonyms: Array.isArray(aiData.antonyms) ? aiData.antonyms : [],
          learner_associations: Array.isArray(aiData.learner_associations) ? aiData.learner_associations : [],
          user_sentence_count: aiData.user_sentence_count || 0,
        };
        setGeneratedWords(prev => ({ ...prev, [word]: genData }));
      }
    } catch (err) {
      console.error("[handleGenerated]", err);
    }

    setUnknownWord(null);
    setDetailWord(word);
  };

  const navItems = [
    { key: "home", label: "\u9996\u9875", icon: Logo },
    { key: "words", label: "\u5355\u8BCD\u672C", icon: PalmLeafBook },
    { key: "learn", label: "\u5B66\u4E60", icon: LotusLamp },
    { key: "me", label: "\u6211\u7684", icon: BuddhaHead },
  ];

  const pageTitles = { home: "\u8BCD\u7B3A", words: "\u5355\u8BCD\u672C", learn: "\u5B66\u4E60", me: "\u6211\u7684" };
  const pageIcons = { home: Logo, words: PalmLeafBook, learn: LotusLamp, me: BuddhaHead };
  const PageIcon = pageIcons[page];

  /* ── Loading screen while auth initializes ── */
  if (authLoading) {
    return (
      <div style={{ maxWidth: 430, margin: "0 auto", height: "100vh", background: "var(--c-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <div style={{ width: 32, height: 32, border: `3px solid ${"var(--c-p200)"}`, borderTopColor: "var(--c-teal)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <span style={{ fontSize: 13, color: "var(--c-s500)" }}>{"\u52A0\u8F7D\u4E2D..."}</span>
      </div>
    );
  }

  /* ── Login gate ── */
  if (!isLoggedIn) {
    return <LoginPage onLogin={() => {}} />;
  }

  /* ── Unknown word page takes priority ── */
  if (unknownWord) {
    return (
      <div style={{ maxWidth: 430, margin: "0 auto", height: "100vh", background: "var(--c-bg)", fontFamily: "var(--zh-font), var(--th-font), sans-serif", color: "var(--c-p800)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ height: 44, background: "var(--c-bg)", flexShrink: 0 }} />
        <div style={{ padding: "4px 20px 6px", display: "flex", alignItems: "center", gap: 10 }}>
          <div onClick={goBack} style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 10, background: "var(--c-p100)", flexShrink: 0 }}>
            <ChevronLeft size={18} strokeWidth={IW} color={"var(--c-p700)"} />
          </div>
          {navForward.length > 0 && (
            <div onClick={goForward} style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 10, background: "var(--c-p100)", flexShrink: 0 }}>
              <ChevronRight size={18} strokeWidth={IW} color={"var(--c-p700)"} />
            </div>
          )}
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--c-p800)", margin: 0, fontFamily: "var(--zh-font), serif", flex: 1 }}>{"\u672A\u77E5\u8BCD\u6761"}</h1>
        </div>
        <div style={{ flex: 1, overflow: "auto" }}>
          <UnknownWordPage word={unknownWord} onBack={goBack} onWordTap={handleWordTap} onGenerated={handleGenerated} onNavigateToDetail={(w) => { resetNav(); setDetailWord(w); }} />
        </div>
      </div>
    );
  }

  /* ── Sentence detail page ── */
  if (selectedSentence) {
    const sp = selectedSentence;
    const spSegmented = Array.isArray(sp.segmented) ? sp.segmented : [];
    const isIdiom = sp.category === 'idioms';
    return (
      <div style={{ maxWidth: 430, margin: "0 auto", height: "100vh", background: "var(--c-bg)", fontFamily: "var(--zh-font), var(--th-font), sans-serif", color: "var(--c-p800)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ height: 44, background: "var(--c-bg)", flexShrink: 0 }} />
        <div style={{ padding: "4px 20px 6px", display: "flex", alignItems: "center", gap: 10 }}>
          <div onClick={() => setSelectedSentence(null)} style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 10, background: "var(--c-p100)", flexShrink: 0 }}>
            <ChevronLeft size={18} strokeWidth={IW} color={"var(--c-p700)"} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--c-p800)", margin: 0, fontFamily: "var(--zh-font), serif", flex: 1 }}>{"\u53E5\u5B50\u8BE6\u60C5"}</h1>
        </div>
        <div style={{ flex: 1, overflow: "auto" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 16px 16px" }}>
            {/* Sentence card */}
            <div style={{ background: "linear-gradient(135deg, var(--c-tealL) 0%, var(--c-surface) 100%)", borderRadius: 16, padding: 16, border: `1px solid ${"var(--c-p100)"}` }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--c-p900)", fontFamily: "var(--th-font), serif", lineHeight: 1.6, flex: 1 }}>{sp.text}</div>
                <div onClick={() => speak(sp.text, "th-TH", 0.85)} style={{ cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0, marginTop: 4 }}>
                  <Play size={16} strokeWidth={IW} color={"var(--c-teal)"} fill={"var(--c-teal)"} />
                </div>
              </div>
              {(sp.actual_meaning || sp.literal_meaning) && (
                <div style={{ fontSize: 14, color: "var(--c-p700)", marginTop: 12, lineHeight: 1.6 }}>
                  {sp.actual_meaning || sp.literal_meaning}
                </div>
              )}
            </div>
            {/* Word-by-word analysis */}
            {spSegmented.length > 0 && (
              <Card style={{ padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-p800)", marginBottom: 12 }}>{"\u9010\u8BCD\u5206\u6790"}</div>
                {spSegmented.map((tok, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: i < spSegmented.length - 1 ? `1px solid ${"var(--c-p50)"}` : "none" }}>
                    <div onClick={() => { if (tok.text) handleWordTap(tok.text); }} style={{ fontSize: 16, fontWeight: 600, color: "var(--c-teal)", fontFamily: "var(--th-font), sans-serif", cursor: "pointer" }}>{tok.text}</div>
                    {tok.pos && <Badge bg={"var(--c-p100)"} fg={"var(--c-p700)"} style={{ fontSize: 9 }}>{tok.pos}</Badge>}
                    {tok.meaning && <span style={{ fontSize: 13, color: "var(--c-p700)" }}>{tok.meaning}</span>}
                  </div>
                ))}
              </Card>
            )}
            {/* Literal vs Actual meaning for idioms */}
            {isIdiom && sp.literal_meaning && sp.actual_meaning && (
              <>
                <div style={{ background: "var(--c-goldL)", borderRadius: 12, padding: 14, border: `1px solid ${"color-mix(in srgb, var(--c-gold) 30%, transparent)"}` }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-gold)", marginBottom: 6 }}>{"\u5B57\u9762\u610F\u4E49"}</div>
                  <div style={{ fontSize: 14, color: "var(--c-p800)", lineHeight: 1.6 }}>{sp.literal_meaning}</div>
                </div>
                <div style={{ background: "color-mix(in srgb, var(--c-teal) 8%, transparent)", borderRadius: 12, padding: 14, border: `1px solid ${"color-mix(in srgb, var(--c-teal) 20%, transparent)"}` }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-teal)", marginBottom: 6 }}>{"\u5B9E\u9645\u610F\u4E49"}</div>
                  <div style={{ fontSize: 14, color: "var(--c-p800)", lineHeight: 1.6 }}>{sp.actual_meaning}</div>
                </div>
              </>
            )}
            {/* Learner tip */}
            {sp.learner_tip && (
              <Card style={{ padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <Sparkles size={13} strokeWidth={IW} color={"var(--c-gold)"} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-p800)" }}>{"\u5B66\u4E60\u8005\u5EFA\u8BAE"}</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--c-p700)", lineHeight: 1.6 }}>{sp.learner_tip}</div>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── Word detail page ── */
  if (detailWord) {
    return (
      <div style={{ maxWidth: 430, margin: "0 auto", height: "100vh", background: "var(--c-bg)", fontFamily: "var(--zh-font), var(--th-font), sans-serif", color: "var(--c-p800)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ height: 44, background: "var(--c-bg)", flexShrink: 0 }} />
        <div style={{ padding: "4px 20px 6px", display: "flex", alignItems: "center", gap: 10 }}>
          <div onClick={goBack} style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 10, background: "var(--c-p100)", flexShrink: 0 }}>
            <ChevronLeft size={18} strokeWidth={IW} color={"var(--c-p700)"} />
          </div>
          {navForward.length > 0 && (
            <div onClick={goForward} style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 10, background: "var(--c-p100)", flexShrink: 0 }}>
              <ChevronRight size={18} strokeWidth={IW} color={"var(--c-p700)"} />
            </div>
          )}
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--c-p800)", margin: 0, fontFamily: "var(--zh-font), serif", flex: 1 }}>{"\u8BCD\u6761\u8BE6\u60C5"}</h1>
        </div>
        <div style={{ flex: 1, overflow: "auto" }}>
          <WordDetailPage userId={userId} onBack={goBack} onWordTap={handleWordTap} wordData={dbWordData[detailWord] || generatedWords[detailWord] || null} />
        </div>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: 430, margin: "0 auto", height: "100vh",
      background: "var(--c-bg)", fontFamily: "var(--zh-font), var(--th-font), sans-serif",
      color: "var(--c-p800)", display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Status bar placeholder */}
      <div style={{ height: 44, background: "var(--c-bg)", flexShrink: 0 }} />

      {/* Header */}
      <div style={{
        padding: "4px 20px 7px", display: "flex", alignItems: "center",
        justifyContent: "space-between", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <PageIcon size={26} color={"var(--c-p600)"} />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--c-p800)", margin: 0, fontFamily: "var(--zh-font), serif" }}>
            {pageTitles[page]}
          </h1>
        </div>
      </div>

      {/* Page content */}
      <div style={{ flex: 1, overflow: "auto", position: "relative" }}>
        {/* Loading overlay for word lookup */}
        {detailLoading && (
          <div style={{ position: "absolute", inset: 0, zIndex: 50, background: "rgba(250,247,244,0.85)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
            <div style={{ width: 32, height: 32, border: `3px solid ${"var(--c-p200)"}`, borderTopColor: "var(--c-teal)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <span style={{ fontSize: 13, color: "var(--c-s500)" }}>{"查询词库中..."}</span>
          </div>
        )}
        {page === "home" && <HomePage userId={userId} onNavigate={setPage} onWordTap={handleWordTap} onSelectSentence={setSelectedSentence} />}
        {page === "words" && <WordBookPage userId={userId} onWordTap={handleWordTap} />}
        {page === "learn" && <LearnPage userId={userId} onWordTap={handleWordTap} />}
        {page === "me" && <ProfilePage userId={userId} user={supaUser} colorMode={colorMode} setColorMode={setColorMode} onLogout={handleSignOut} onNavigateToWords={() => { setPage("words"); }} />}
      </div>

      {/* Bottom Navigation Bar */}
      <nav style={{
        display: "flex", background: "var(--c-surface)", borderTop: `1px solid ${"var(--c-p100)"}`,
        paddingBottom: 20, paddingTop: 8, flexShrink: 0,
      }}>
        {navItems.map(item => (
          <div
            key={item.key}
            onClick={() => { resetNav(); setPage(item.key); }}
            style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              gap: 4, cursor: "pointer", transition: "all 0.2s",
            }}
          >
            <item.icon size={22} strokeWidth={IW} color={page === item.key ? "var(--c-p600)" : "var(--c-s300)"} />
            <span style={{
              fontSize: 11, fontWeight: page === item.key ? 600 : 400,
              color: page === item.key ? "var(--c-p700)" : "var(--c-s300)",
            }}>{item.label}</span>
          </div>
        ))}
      </nav>
    </div>
  );
}
