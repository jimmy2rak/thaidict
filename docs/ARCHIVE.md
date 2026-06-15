# 词笺 (ThaiDict) — 项目总档 v1

> 更新日期: 2026-06-15
> 本文档为唯一上下文入口，所有代码/配置均引用工作目录路径，不重复粘贴。

---

## 1. 项目概览

| 项 | 值 |
|---|---|
| 名称 | 词笺 (ThaiDict) |
| 定位 | 面向中国泰语学习者的移动端智能词典 |
| Git | `https://github.com/jimmy2rak/thaidict.git` |
| 部署 | Vercel (`thaidict.vercel.app`) |
| Supabase 项目 | `zvemahqskgluhirzbcqu` (`zvemahqskgluhirzbcqu.supabase.co`) |
| Vercel 项目 ID | `prj_t2zKSD36F0s5BwnsQ2T5JGZ60IJI` |
| Vercel Org | `team_bw0bsNyEjqA45HdcuhojWStJ` |

---

## 2. 技术栈

| 层 | 技术 | 备注 |
|---|---|---|
| 前端框架 | React 18 + Vite 6 | ESM 模块 |
| UI | CSS-in-JS inline style | 无外部 UI 库，纯 inline |
| 图标 | lucide-react + 4 个泰文化 SVG | Logo/贝叶经/莲花灯/佛头 |
| 图表 | recharts | AreaChart/BarChart/PieChart |
| 认证 | **Supabase Auth** | 从 Clerk 迁移完成，Clerk 已移除 |
| 后端/DB | Supabase (PostgreSQL + RLS) | 8 张用户表 + 词典表 + 句子表 |
| AI 代理 | Supabase Edge Function (Deno) | `ai-proxy`，服务端保存 API Key |
| 部署 | Vercel (自动 CI/CD) | SPA rewrite 已配置 |
| TTS | Web Speech API | 泰语朗读 |
| 字体 | Google Fonts | Noto Serif SC/Sans SC/Sans Thai/Sarabun/Charm |

---

## 3. 文件结构（路径引用）

```
thaidict/
├── index.html                    # 入口 HTML（Google Fonts 预连接）
├── package.json                  # 依赖：react/supabase-js/lucide/recharts
├── vite.config.js                # Vite 配置，port 3000
├── vercel.json                   # SPA rewrite + build config
├── deploy.sh                     # 一键部署脚本（GitHub + Vercel CLI）
├── .gitignore                    # 忽略 node_modules/dist/.env
├── public/
│   └── favicon.svg               # 黎明寺图标
├── src/
│   ├── main.jsx                  # 入口 + AuthProvider（Supabase Auth Context）
│   ├── index.css                 # 全局样式 + 色彩系统（亮/暗主题变量）
│   ├── App.jsx                   # 主组件 4721 行（单文件架构）
│   └── lib/
│       └── supabase.js           # Supabase 客户端 + 全部查询函数 + Auth 辅助
├── supabase/
│   ├── 20260614_create_user_data_tables.sql   # 8 张用户数据表 + RLS
│   └── phase5_add_rpcs_and_sentences.sql      # RPC 函数 + 句子库 + 句子收藏
├── scripts/
│   └── import_sentences.py       # AI 批量导入句子脚本
└── docs/
    └── ARCHIVE.md                # ← 本文件
```

---

## 4. 认证系统（Supabase Auth）

**状态**: Clerk → Supabase Auth 迁移完成（2026-06-15）。

### 4.1 架构

| 文件 | 职责 |
|---|---|
| `src/main.jsx` | AuthProvider + AuthContext + useAuth() hook |
| `src/lib/supabase.js` | signInWithEmail / signUpWithEmail / signInWithOAuth / signOut / updateUserProfile / uploadAvatar / verifyEmailOtp |
| `src/App.jsx → LoginPage` | 登录 UI（邮箱密码 + OAuth） |
| `src/App.jsx → App()` | `useAuth()` 获取 session/user，控制登录门控 |

### 4.2 OAuth 提供商

| Provider | 状态 | 备注 |
|---|---|---|
| Google | 已配置 | OAuth callback: `zvemahqskgluhirzbcqu.supabase.co/auth/v1/callback` |
| GitHub | 已配置 | 同上 callback |
| Apple | **已移除** | 需 $99/年开发者账号，不划算 |

### 4.3 用户数据映射

| 用途 | Supabase 字段 |
|---|---|
| 用户 ID | `user.id` |
| 头像 | `user.user_metadata.avatar_url` |
| 昵称 | `user.user_metadata.full_name` |
| 邮箱 | `user.email` |

### 4.4 头像上传

需 Supabase Storage bucket `user-assets`（设为 Public）。路径格式: `avatars/{userId}/{timestamp}.{ext}`

---

## 5. 数据库 Schema

### 5.1 词典核心表（Supabase 预置/已有）

| 表 | 用途 |
|---|---|
| `dictionary` / `dictionary_full` | 词典主表（泰语词条 + JSONB senses） |
| `system_config` | 系统配置（AI API Key 等） |
| `user_submissions` | 用户提交待 AI 富化的新词 |

### 5.2 用户数据表（`supabase/20260614_create_user_data_tables.sql`）

| 表 | 用途 |
|---|---|
| `user_bookmarks` | 收藏词 (user_id, word) |
| `user_recent_words` | 最近查词 + 查询次数 |
| `user_folders` | 自定义词夹 |
| `user_folder_words` | 词夹内词条 |
| `user_learning_plans` | 学习计划 (goals + schedule JSONB) |
| `user_learning_progress` | 每日进度 + 连续天数 |
| `user_notes` | 学习笔记 |
| `user_settings` | 用户设置（词典方向/颜色/语言/API偏好） |

### 5.3 句子系统（`supabase/phase5_add_rpcs_and_sentences.sql`）

| 表 | 用途 |
|---|---|
| `sentences` | 句子库（idioms/buddhist/daily 三类） |
| `user_sentence_bookmarks` | 句子收藏 |

### 5.4 RPC 函数

| 函数 | 用途 |
|---|---|
| `search_words(search_term, max_results)` | 通用搜索 |
| `search_words_zh(search_term, max_results)` | 中文模糊搜索（JSONB senses） |
| `get_random_word()` | 随机已富化词条 |
| `get_random_sentence(cat)` | 随机句子（可按分类过滤） |

### 5.5 RLS 策略

当前所有用户表为 `allow_anon_*`（全开放），user_id 过滤由前端代码执行。后续可改为 JWT-based RLS。

---

## 6. 页面/组件架构（App.jsx 4721 行）

### 6.1 页面级组件

| 组件 | 行号 | 功能 |
|---|---|---|
| `HomePage` | ~427 | 搜索/每日一词/最近查词/每日一句/学习统计 |
| `WordBookPage` | ~667 | 词书浏览/收藏管理/文件夹 |
| `WordDetailPage` | ~996 | 词条详情（义项/例句/分词/词频/近反义词） |
| `UnknownWordPage` | ~1590 | 未知词 AI 生成页 |
| `LearnPage` | ~1698 | 学习主页（计划/练习/笔记/构词法/统计/常用语） |
| `ProfilePage` | ~3081 | 个人中心（信息/设置/同步/API管理/退出登录） |
| `LoginPage` | ~3945 | 登录页（邮箱+密码/OTP + Google/GitHub OAuth） |

### 6.2 子页面/嵌套组件

| 组件 | 行号 | 所属 |
|---|---|---|
| `AdjustPlanSection` | ~2011 | LearnPage |
| `NotesDetailSection` | ~2365 | LearnPage |
| `NoteEditorSection` | ~2434 | LearnPage |
| `MorphologySection` | ~2540 | LearnPage |
| `StatsSection` | ~2604 | LearnPage |
| `PhrasesSection` | ~2820 | LearnPage |
| `PhraseDetailSection` | ~2988 | LearnPage |

### 6.3 通用 UI 组件

| 组件 | 行号 |
|---|---|
| `Card` | ~271 |
| `Badge` | ~281 |
| `Btn` | ~289 |
| `SectionTitle` | ~312 |
| `ProgressBar` | ~323 |
| `StatCard` | ~329 |
| `AudioBtn` / `TtsPlay` | ~364 / ~390 |
| `HeatCell` | ~412 |
| `PageHeader` | ~417 |

### 6.4 自定义 SVG 图标

| 组件 | 用途 |
|---|---|
| `Logo` | 黎明寺（首页图标） |
| `PalmLeafBook` | 贝叶经（单词本图标） |
| `LotusLamp` | 莲花灯（学习图标） |
| `BuddhaHead` | 佛头（我的图标） |
| `GoogleBrandIcon` | Google OAuth 按钮 |
| `GitHubBrandIcon` | GitHub OAuth 按钮 |

---

## 7. 路由/导航

无 Router 库，单页面 state 管理。

```
App()
├── authLoading → 加载动画
├── !isLoggedIn → LoginPage
├── unknownWord → UnknownWordPage
├── selectedSentence → 句子详情页
├── detailWord → WordDetailPage
└── 主布局（Header + PageContent + BottomNav）
    ├── home → HomePage
    ├── words → WordBookPage
    ├── learn → LearnPage
    └── me → ProfilePage
```

**导航历史**: navStack（后退栈） + navForward（前进栈），goBack/goForward/navigateTo/resetNav。

---

## 8. AI 系统

### 8.1 Edge Function: `ai-proxy`

- 路径: `supabase/functions/ai-proxy/index.ts`
- 运行时: Deno
- 功能: 代理 AI API 调用，API Key 存服务端
- 优先读 `system_config` 表 (`SYSTEM_AI_API_KEY`, `SYSTEM_AI_BASE_URL`, `SYSTEM_AI_MODEL`)
- 支持用户自有 API Key（`user_api_keys` 表）
- System prompt: 中泰词典编纂专家，输出结构化 JSON

### 8.2 句子导入脚本

- 路径: `scripts/import_sentences.py`
- 分类: idioms / buddhist / daily（各目标 200 条）
- 调用 AI API 批量生成 + 去重 + 入库

---

## 9. 环境变量

| 变量 | 位置 | 必填 |
|---|---|---|
| `VITE_SUPABASE_URL` | Vercel 环境变量 | 是 |
| `VITE_SUPABASE_ANON_KEY` | Vercel 环境变量 | 是 |

Supabase 项目 URL: `https://zvemahqskgluhirzbcqu.supabase.co`

---

## 10. 设计规范

| 项 | 规格 |
|---|---|
| 最大宽度 | 430px（移动端优先） |
| 色彩 | 暖棕色系统（p900~p50），含亮/暗双主题 |
| 中文标题 | Noto Serif SC |
| 中文正文 | Noto Sans SC |
| 泰文 | Sarabun / Noto Sans Thai |
| 装饰泰文 | Charm |
| 间距 | 4px 基准 |
| 圆角 | 卡片 12~16px，按钮 10~12px |
| 布局 | 卡片化，flex column |
| 图标线宽 | 1.5 (IW 常量) |

---

## 11. 构建/部署

```bash
npm install          # 安装依赖
npm run dev          # 本地开发 :3000
npm run build        # 构建到 dist/
```

部署流程: 代码推送到 GitHub → Vercel 自动构建部署。
推送方式: `git push` 不通时（github.com:443 超时），用 GitHub Git Data API（blob→tree→commit→update ref via `api.github.com`）。

---

## 12. Git 历史

```
84cb8e0  feat: Phase 5 — navigation history, search improvements, daily sentence system
332d178  feat: AI proxy reads config from system_config DB table
68979a8  feat: Phase 4 — 6 bugs fixed + 2 new features
e3f7db8  fix: resolve 5 categories of UI/UX bugs
d9949b2  feat: interaction improvements + bug fixes (Phase 2)
4b667af  merge: integrate frontend with Supabase backend + Clerk auth
94e1a8e  feat: connect frontend to Supabase backend
c2660bb  feat: initial Vite + React project
```

远程额外提交（Clerk→Supabase 迁移后）:
```
de66af9  refactor: migrate auth from Clerk to Supabase Auth
0aee261  remove Apple OAuth button (requires paid developer account)
```

---

## 13. 待办/已知问题

| # | 事项 | 状态 |
|---|---|---|
| ~~1~~ | ~~Supabase Storage `user-assets` bucket~~ | 暂不创建，头像功能延后 |
| 2 | RLS 策略从 anon 全开放升级为 JWT-based（按 auth.uid() 过滤） | 待定 |
| 3 | App.jsx 4700+ 行，后续考虑拆分组件 | 低优 |
| ~~4~~ | ~~README.md 更新为 Supabase Auth~~ | 已完成 (2026-06-15) |
| ~~5~~ | ~~OAuth callback 页面确认~~ | Vercel SPA rewrite 已覆盖，无需额外操作 |
| ~~6~~ | ~~邮箱注册验证~~ | 已实现 OTP 验证，用户确认可正常使用 |

---

## 14. 开发约定

- 所有 Supabase 操作通过 Dashboard Web UI，**不用终端/CLI**
- git push 超时时用 GitHub Git Data API 推送
- 代码注释使用中文 + 英文混合
- 无 TypeScript（纯 JSX）
- 无 Router 库（state 管理页面切换）
- 无状态管理库（React useState/useEffect + Context）
- 样式全 inline（CSS 变量定义在 index.css）
