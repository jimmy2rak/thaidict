# 词笺 (ThaiDict) — 项目总档 v3

> 最后更新: 2026-06-15

---

## 1. 项目概览

词笺 (ThaiDict) 是面向中国泰语学习者的移动端智能词典 App，集成 AI 词条富化、泰文分词、学习统计等功能。技术栈为 React 18 + Vite 6（前端）、Supabase PostgreSQL（后端/数据库）、Supabase Auth（认证）、Supabase Edge Function（AI 代理）、Vercel（部署）。当前处于**功能完善阶段**——Phase 5 已完成，认证已迁移至 Supabase Auth，App.jsx 已模块化拆分。新增：社区共建词库（AI 生成词条自动入库 + 搜索集成）、每日推荐持久化（每日一词/句按自然日缓存）、import_sentences.py DeepSeek-V4-Flash 优化版。

| 项 | 值 |
|---|---|
| Git | `https://github.com/jimmy2rak/thaidict.git` |
| 部署 | Vercel (`thaidict.vercel.app`) |
| Supabase 项目 ID | `zvemahqskgluhirzbcqu` |
| Supabase URL | `https://zvemahqskgluhirzbcqu.supabase.co` |
| Vercel 项目 ID | `prj_t2zKSD36F0s5BwnsQ2T5JGZ60IJI` |
| Vercel Org | `team_bw0bsNyEjqA45HdcuhojWStJ` |

---

## 2. 工作文件索引

### 入口与配置

| 文件 | 用途 | 状态 | 路径 |
|---|---|---|---|
| `index.html` | HTML 入口，Google Fonts 预连接 | 已完成 | `index.html` |
| `package.json` | 依赖：react 18, @supabase/supabase-js, lucide-react, recharts | 已完成 | `package.json` |
| `vite.config.js` | Vite 构建配置，port 3000 | 已完成 | `vite.config.js` |
| `vercel.json` | Vercel SPA rewrite + build config | 已完成 | `vercel.json` |
| `deploy.sh` | 一键部署脚本（GitHub + Vercel CLI） | 已完成 | `deploy.sh` |
| `README.md` | 项目文档（已更新为 Supabase Auth） | 已完成 | `README.md` |

### 核心源码 (`src/`)

| 文件 | 行数 | 用途 | 状态 | 路径 |
|---|---|---|---|---|
| `App.jsx` | 200 | 主应用壳：AppProvider 包裹 → 页面路由 → 底部导航 → 句子详情内联视图 | 已完成 | `src/App.jsx` |
| `main.jsx` | 71 | React 入口 + AuthProvider（Supabase Auth Context）+ AppProvider | 已完成 | `src/main.jsx` |
| `index.css` | 158 | 全局样式 + 色彩系统 CSS 变量（亮/暗双主题） | 已完成 | `src/index.css` |
| `supabase.js` | 852 | Supabase 客户端 + 全部查询函数 + Auth 辅助函数 + 数据转换 | 已完成 | `src/lib/supabase.js` |

### 状态管理 (`src/context/`)

| 文件 | 行数 | 用途 | 状态 | 路径 |
|---|---|---|---|---|
| `AppContext.jsx` | 169 | 全局应用状态：导航栈、页面切换、主题、词条缓存、handleWordTap/handleGenerated | 已完成 | `src/context/AppContext.jsx` |

### 页面组件 (`src/pages/`)

| 文件 | 行数 | 用途 | 状态 | 路径 |
|---|---|---|---|---|
| `HomePage.jsx` | 254 | 首页：搜索/每日一词/最近查词/每日一句/学习统计 | 已完成 | `src/pages/HomePage.jsx` |
| `WordBookPage.jsx` | 342 | 单词本：最近查词/收藏/词书浏览/文件夹管理 | 已完成 | `src/pages/WordBookPage.jsx` |
| `WordDetailPage.jsx` | 616 | 词条详情：多义项/例句/分词/词频/近反义词/关联词 | 已完成 | `src/pages/WordDetailPage.jsx` |
| `UnknownWordPage.jsx` | 118 | 未知词 AI 生成页 | 已完成 | `src/pages/UnknownWordPage.jsx` |
| `LearnPage.jsx` | 338 | 学习主页：计划/练习/笔记/构词法/统计/常用语 | 已完成 | `src/pages/LearnPage.jsx` |
| `ProfilePage.jsx` | 886 | 个人中心：信息/设置/同步/API 管理/退出登录 | 已完成 | `src/pages/ProfilePage.jsx` |
| `LoginPage.jsx` | 368 | 登录页：邮箱+密码/OTP + Google/GitHub OAuth | 已完成 | `src/pages/LoginPage.jsx` |

### 子页面组件 (`src/pages/subsections/`)

| 文件 | 行数 | 用途 | 状态 | 路径 |
|---|---|---|---|---|
| `AdjustPlanSection.jsx` | 368 | 调整学习计划 | 已完成 | `src/pages/subsections/AdjustPlanSection.jsx` |
| `NotesDetailSection.jsx` | 77 | 笔记时间线列表 | 已完成 | `src/pages/subsections/NotesDetailSection.jsx` |
| `NoteEditorSection.jsx` | 115 | 笔记编辑器 | 已完成 | `src/pages/subsections/NoteEditorSection.jsx` |
| `MorphologySection.jsx` | 72 | 构词法示例 | 已完成 | `src/pages/subsections/MorphologySection.jsx` |
| `StatsSection.jsx` | 128 | 学习统计图表（recharts） | 已完成 | `src/pages/subsections/StatsSection.jsx` |
| `PhrasesSection.jsx` | 289 | 常用语分类浏览 | 已完成 | `src/pages/subsections/PhrasesSection.jsx` |
| `PhraseDetailSection.jsx` | 98 | 常用语详情 | 已完成 | `src/pages/subsections/PhraseDetailSection.jsx` |

### 公共组件 / 图标 / 数据 / 工具

| 文件 | 行数 | 用途 | 状态 | 路径 |
|---|---|---|---|---|
| `UIComponents.jsx` | 146 | Card/Badge/Btn/SectionTitle/ProgressBar/StatCard/AudioBtn/TtsPlay/HeatCell/PageHeader | 已完成 | `src/components/UIComponents.jsx` |
| `CulturalIcons.jsx` | 57 | 泰文化 SVG 图标：Logo(黎明寺)/PalmLeafBook(贝叶经)/LotusLamp(莲花灯)/BuddhaHead(佛头) + IW 常量 | 已完成 | `src/icons/CulturalIcons.jsx` |
| `BrandIcons.jsx` | 14 | OAuth 品牌图标：GoogleBrandIcon/GitHubBrandIcon | 已完成 | `src/icons/BrandIcons.jsx` |
| `mockData.js` | 152 | 13 个模拟数据常量（dailyWord/recentWords/wordDetail/wordBooks/exercises 等） | 已完成 | `src/data/mockData.js` |
| `tts.js` | 18 | Web Speech API 泰语朗读工具 (speak/stopSpeak) | 已完成 | `src/utils/tts.js` |

### SQL 迁移脚本 (`supabase/`)

| 文件 | 用途 | 状态 | 路径 |
|---|---|---|---|
| `20260614_create_user_data_tables.sql` | 8 张用户数据表 + RLS（旧 anon 策略） | 已执行 | `supabase/20260614_create_user_data_tables.sql` |
| `phase5_add_rpcs_and_sentences.sql` | RPC 函数 + 句子库 + 句子收藏表 | 已执行 | `supabase/phase5_add_rpcs_and_sentences.sql` |
| `rls_upgrade_uuid.sql` | RLS 安全升级：user_id TEXT→UUID + JWT-based 策略 (auth.uid()) | **待用户手动执行** | `supabase/rls_upgrade_uuid.sql` |
| `community_words_and_daily_picks.sql` | 社区共建词库 (community_words) + 每日推荐持久化 (daily_picks) + search_community_words RPC | **待用户手动执行** | `supabase/community_words_and_daily_picks.sql` |

### Edge Function (`supabase/functions/`)

| 文件 | 用途 | 状态 | 路径 |
|---|---|---|---|
| `ai-proxy/index.ts` | AI API 代理（Deno），服务端保存 API Key，读 system_config 表 | 已部署 | `supabase/functions/ai-proxy/index.ts` |

### 脚本 (`scripts/`)

| 文件 | 用途 | 状态 | 路径 |
|---|---|---|---|
| `import_sentences.py` | AI 批量导入句子（DeepSeek-V4-Flash 优化版：BATCH_SIZE=100/MAX_TOKENS=128000、栈式 JSON 截断修复含零括号回退、finish_reason=length 检测+即时减半重试、指数退避重试） | 已完成 | `scripts/import_sentences.py` |

---

## 3. MCP 与外部服务连接

| MCP 服务 | 用途 | 连接状态 |
|---|---|---|
| **supabase** | 数据库管理：list_tables, execute_sql, apply_migration, list_edge_functions, deploy_edge_function, get_logs 等 | 已连接 |
| **vercel** | 部署管理：list_projects, list_deployments, get_deployment, get_runtime_logs 等 | 已连接 |

**注意**：Supabase 可通过 MCP 直接执行 SQL（`mcp__supabase__execute_sql`），但用户偏好所有 Supabase 操作通过 Dashboard Web UI 执行，不用终端/CLI/MCP。

---

## 4. 关键决策记录

| # | 决策 | 原因 |
|---|---|---|
| 1 | 认证从 Clerk 迁移至 Supabase Auth | Clerk OAuth 配置复杂且新用户注册不通，Supabase Auth 更简洁且与后端统一 |
| 2 | 移除 Apple OAuth | Apple Sign In 需 $99/年开发者账号，性价比低 |
| 3 | OAuth 仅保留 Google + GitHub | 覆盖主流登录方式，已在 Supabase Dashboard 配置完成 |
| 4 | 单文件架构拆分为模块化 | App.jsx 4721 行难以维护，拆为 19 个文件 + AppContext 管理共享状态 |
| 5 | 用 AppContext 替代 props drilling | 页面组件通过 useAppContext() 获取导航/主题/查词等共享状态，无需层层传 props |
| 6 | RLS 从 anon 全开放升级为 JWT-based | 旧策略允许任何人读写所有数据，新策略用 auth.uid() 确保用户只能访问自己的数据 |
| 7 | user_id 列从 TEXT 改为 UUID | Supabase Auth 的 auth.uid() 返回 UUID 类型，需与 user_id 列类型匹配 |
| 8 | 所有 Supabase 操作通过 Dashboard | 用户明确要求不用终端/CLI，包括 SQL 执行、表管理、用户管理 |
| 9 | git push 超时时用 GitHub Git Data API | github.com:443 不通但 api.github.com 可达，通过 API 推送 (blob→tree→commit→update ref) |
| 10 | 样式全 inline CSS-in-JS | 项目约定，无外部 UI 库，CSS 变量定义在 index.css 实现主题切换 |
| 11 | 无 Router 库 | state 管理页面切换 + 导航历史栈（navStack/navForward） |
| 12 | 头像 Storage bucket 暂不创建 | 头像功能优先级低，延后处理 |

---

## 5. 当前待办清单

| # | 任务 | 优先级 | 状态 | 备注 |
|---|---|---|---|---|
| 1 | 执行 RLS 升级 SQL (`supabase/rls_upgrade_uuid.sql`) | 高 | **待用户手动执行** | 需在 Supabase Dashboard SQL Editor 中运行，会清空旧 Clerk 数据 |
| 2 | 执行社区词库+每日推荐 SQL (`supabase/community_words_and_daily_picks.sql`) | 高 | **待用户手动执行** | 创建 community_words 和 daily_picks 两张表 + search_community_words RPC |
| 3 | 部署更新后的前端到 Vercel | 中 | 未开始 | community_words/daily_picks 前端代码已完成，SQL 执行后可部署 |
| 4 | 云端运行 import_sentences.py | 中 | 未开始 | 使用 DeepSeek-V4-Flash API，BATCH_SIZE=100/MAX_TOKENS=128000，预计 6 次 API 调用完成 600 句 |
| 5 | supabase.js 函数移除手动 userId 参数 | 低 | 未开始 | RLS 执行后可移除 `.eq('user_id', userId)` 过滤，改由 RLS 自动处理 |
| 6 | Supabase Storage 创建 `user-assets` bucket (Public) | 低 | 延后 | 头像上传依赖此，当前不急需 |
| 7 | 构建产物 code-split 优化 | 低 | 未开始 | 当前 740KB 单 chunk，可用 dynamic import 拆分 |

---

## 6. 已完成工作摘要

**2026-06-15 (续)**
- **社区共建词库** — 新建 community_words 表 + search_community_words RPC，AI 生成词条自动入库并集成到搜索/查词流程
- **每日推荐持久化** — 新建 daily_picks 表 (user_id + pick_date UNIQUE)，每日一词/一句按自然日缓存，刷新页面不变，仅点击刷新按钮才换
- **import_sentences.py 重写** — 4 轮迭代修复，最终 DeepSeek-V4-Flash 优化版：默认 BATCH_SIZE=100 / MAX_TOKENS=128000 / BATCH_DELAY=2 / MAX_RETRIES=3，6 次 API 调用可完成 600 句导入。关键修复：栈式 bracket 闭合 JSON 截断修复（替代计数法，正确顺序 `]}` 非 `}]`）、零括号回退（截断位置无 `}` 时从开头闭合）、finish_reason=length 检测 + 即时减半重试（不浪费当前批次）、多层正则剥离悬挂 key
- Caveman skill 安装 (JuliusBrussee/caveman)

**2026-06-15**
- 项目总档 v2 重写（本文档）
- **App.jsx 模块化拆分完成** — 4721 行拆为 19 个文件，AppContext 管理全局状态，所有页面通过 useAppContext() 获取共享数据
- **RLS 升级 SQL 生成** — user_id TEXT→UUID 迁移 + JWT-based 策略 (auth.uid())
- **README 全文更新** — 移除 Clerk 引用，补充认证方式/数据库表/RPC 函数/部署说明
- 待办5/6 确认无需操作：OAuth callback 已被 Vercel SPA rewrite 覆盖，邮箱 OTP 已实现
- 移除 Apple OAuth 按钮并推送
- 认证从 Clerk 完整迁移至 Supabase Auth（AuthProvider, user_metadata, OAuth Google+GitHub）
- Phase 5 完成：导航历史栈、搜索优化、每日一句系统
- Phase 4 完成：6 个 bug 修复 + 2 个新功能
- AI 代理从环境变量改为读 system_config 数据库表
- Supabase Dashboard 配置：Google OAuth + GitHub OAuth
- 句子数据库 + AI 批量导入脚本

**更早**
- 项目初始化（Vite + React）→ Supabase 后端连接 → Clerk 认证集成 → UI 多轮迭代 → Phase 2-5 功能开发

---

## 7. 新对话启动指令

> **复制以下文字作为新对话的第一条消息：**
>
> 请先阅读项目总档 `docs/ARCHIVE.md`，这是词笺 (ThaiDict) 中泰词典 App 的跨对话记忆文档。读完后按文档中的"工作文件索引"确认所有文件存在，然后告诉我你已了解项目当前状态，等待我的下一步指令。

---

## 附录 A: 数据库表清单

### 词典核心表（Supabase 已有）
- `dictionary` / `dictionary_full` — 词条主表（泰语词 + JSONB senses）
- `system_config` — 系统配置（AI API Key 等）
- `user_submissions` — 用户提交的新词（待 AI 富化）

### 用户数据表（8 张，SQL: `20260614_create_user_data_tables.sql`）
- `user_bookmarks` — 收藏词 (user_id, word)
- `user_recent_words` — 最近查词 + 查询次数
- `user_folders` / `user_folder_words` — 自定义词夹（一对多）
- `user_learning_plans` — 学习计划 (goals + schedule JSONB)
- `user_learning_progress` — 每日进度 + 连续天数
- `user_notes` — 学习笔记
- `user_settings` — 用户偏好（词典方向/颜色/语言/API 偏好）
- `user_api_keys` — 用户自有 AI API Key

### 句子系统（SQL: `phase5_add_rpcs_and_sentences.sql`）
- `sentences` — 句子库（idioms / buddhist / daily 三类）
- `user_sentence_bookmarks` — 句子收藏

### 社区共建 + 每日推荐（SQL: `community_words_and_daily_picks.sql`）
- `community_words` — 用户 AI 生成的共建词条（word + senses JSONB + submitted_by）
- `daily_picks` — 每日一词/一句持久化（user_id + pick_date + JSONB data）

### RPC 函数
- `search_words(term, limit)` — 通用搜索
- `search_words_zh(term, limit)` — 中文模糊搜索（JSONB senses）
- `get_random_word()` — 随机已富化词条
- `get_random_sentence(cat)` — 随机句子（可按分类过滤）
- `search_community_words(search_term, max_results)` — 搜索社区共建词库

## 附录 B: 环境变量

| 变量 | 位置 | 必填 |
|---|---|---|
| `VITE_SUPABASE_URL` | Vercel Environment Variables | 是 |
| `VITE_SUPABASE_ANON_KEY` | Vercel Environment Variables | 是 |

## 附录 C: 认证系统

- **AuthProvider** (`src/main.jsx`): 管理 Supabase Auth session，提供 `{user, session, loading, signOut}`
- **AppProvider** (`src/context/AppContext.jsx`): 依赖 AuthProvider，管理导航/主题/查词等应用状态
- **OAuth 提供商**: Google + GitHub，callback 地址为 `{project}.supabase.co/auth/v1/callback`
- **用户数据映射**: `user.id` (UUID), `user.user_metadata.avatar_url`, `user.user_metadata.full_name`
- **Auth 辅助函数** (`src/lib/supabase.js`): signInWithEmail / signUpWithEmail / signInWithOAuth / signOut / updateUserProfile / uploadAvatar / verifyEmailOtp

## 附录 D: 设计规范

- 最大宽度 430px（移动端优先）
- 暖棕色色彩系统 (p900~p50)，亮/暗双主题通过 `[data-theme="dark"]` 切换
- 中文标题: Noto Serif SC (`--zh-font`)，中文正文: Noto Sans SC，泰文: Sarabun (`--th-font`) / Noto Sans Thai
- 4px 基准间距，卡片化布局，圆角 12~16px
- 图标线宽常量 `IW = 1.5`
- 所有颜色通过 CSS 变量 `var(--c-xxx)` 引用，自动跟随主题切换

## 附录 E: 开发约定

- 所有 Supabase 操作通过 Dashboard Web UI，**不用终端/CLI**
- git push 超时时用 GitHub Git Data API 推送 (blob→tree→commit→update ref via `api.github.com`)
- 代码注释中文 + 英文混合
- 纯 JSX（无 TypeScript）
- 无 Router 库（state 管理页面切换）
- 无状态管理库（React useState/useEffect + Context）
- 样式全 inline（CSS 变量定义在 `src/index.css`）
- 更新待办相关条目时，同步更新整个 README 文件确保全文一致性
