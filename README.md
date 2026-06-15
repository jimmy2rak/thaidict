# 词笺 (ThaiDict) — 中泰双语智能词典

面向中国泰语学习者的移动端智能词典应用，集成 AI 词条富化、泰文分词、学习统计等功能。

## 技术栈

- **前端**: React 18 + Vite 6 (ESM)
- **UI**: CSS-in-JS inline style，无外部 UI 库
- **图标**: lucide-react + 4 个泰文化自定义 SVG (黎明寺/贝叶经/莲花灯/佛头)
- **图表**: recharts (AreaChart / BarChart / PieChart)
- **认证**: Supabase Auth — 邮箱密码 + Google / GitHub OAuth
- **后端**: Supabase (PostgreSQL + Row Level Security)
- **AI**: Supabase Edge Function (Deno) — `ai-proxy`，服务端保存 API Key
- **TTS**: Web Speech API (泰语朗读)
- **字体**: Google Fonts — Noto Serif SC / Noto Sans SC / Sarabun / Noto Sans Thai / Charm
- **部署**: Vercel (GitHub 推送自动 CI/CD)

## 快速开始

```bash
npm install
npm run dev    # 本地开发 :3000
npm run build  # 生产构建 → dist/
```

## 环境变量

| 变量 | 说明 | 必填 |
|------|------|------|
| `VITE_SUPABASE_URL` | Supabase 项目 URL | 是 |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名公钥 | 是 |

在 Vercel 项目 Settings → Environment Variables 中配置，或本地创建 `.env.local`。

## 项目结构

```
thaidict/
├── index.html              # 入口 HTML (Google Fonts 预连接)
├── package.json            # 依赖管理
├── vite.config.js          # Vite 构建配置 (port 3000)
├── vercel.json             # Vercel 部署 (SPA rewrite)
├── deploy.sh               # 一键部署脚本 (GitHub + Vercel CLI)
├── public/
│   └── favicon.svg         # 黎明寺图标
├── src/
│   ├── main.jsx            # React 入口 + AuthProvider (Supabase Auth Context)
│   ├── index.css           # 全局样式 + 色彩系统 (亮/暗双主题 CSS 变量)
│   ├── App.jsx             # 主组件 (~4700 行单文件架构)
│   └── lib/
│       └── supabase.js     # Supabase 客户端 + 查询函数 + Auth 辅助函数
├── supabase/
│   ├── 20260614_create_user_data_tables.sql   # 8 张用户数据表 + RLS 策略
│   └── phase5_add_rpcs_and_sentences.sql      # RPC 函数 + 句子库 + 句子收藏
├── scripts/
│   └── import_sentences.py # AI 批量导入句子 (idioms/buddhist/daily)
└── docs/
    └── ARCHIVE.md          # 项目总档 (唯一上下文入口)
```

## 认证方式

| 方式 | 说明 |
|------|------|
| 邮箱 + 密码 | 注册后需邮箱验证码 (OTP) 激活 |
| Google OAuth | 第三方一键登录，新用户自动注册 |
| GitHub OAuth | 第三方一键登录，新用户自动注册 |

OAuth 回调地址已在 Supabase Dashboard 中配置，Supabase JS SDK 自动处理回调 Token 交换。

## Supabase 数据库

### 词典核心表

| 表 | 用途 |
|---|---|
| `dictionary` / `dictionary_full` | 词条主表 (泰语词 + JSONB senses) |
| `system_config` | 系统配置 (AI API Key 等) |
| `user_submissions` | 用户提交的新词 (待 AI 富化) |

### 用户数据表 (8 张)

| 表 | 用途 |
|---|---|
| `user_bookmarks` | 收藏词 |
| `user_recent_words` | 最近查词 + 查询次数 |
| `user_folders` / `user_folder_words` | 自定义词夹 |
| `user_learning_plans` | 学习计划 (JSONB) |
| `user_learning_progress` | 每日进度 + 连续天数 |
| `user_notes` | 学习笔记 |
| `user_settings` | 用户偏好设置 |
| `user_api_keys` | 用户自有 AI API Key |

### 句子系统

| 表 | 用途 |
|---|---|
| `sentences` | 句子库 (idioms / buddhist / daily 三类) |
| `user_sentence_bookmarks` | 句子收藏 |

### RPC 函数

| 函数 | 用途 |
|---|---|
| `search_words(term, limit)` | 通用搜索 |
| `search_words_zh(term, limit)` | 中文模糊搜索 (JSONB senses) |
| `get_random_word()` | 随机已富化词条 (每日一词) |
| `get_random_sentence(cat)` | 随机句子 (可按分类过滤) |

## 页面

- **首页** — 搜索、每日一词、最近查词、每日一句、学习统计
- **单词本** — 最近查词 / 收藏 / 词书 / 文件夹管理
- **词条详情** — 多义项、分段例句、词频、近反义词、关联词、逐词分词
- **未知词** — AI 自动生成词条 (调用 ai-proxy Edge Function)
- **学习** — 学习计划、专项练习、笔记、构词法、统计图表、常用语
- **我的** — 个人信息、基础设置 (主题/方向/语言)、WebDAV 同步、数据管理、API 管理

## 设计规范

- 暖棕色色彩系统 (p900 ~ p50)，含亮 / 暗双主题
- 移动端优先 (max-width 430px)
- 中文标题: Noto Serif SC | 中文正文: Noto Sans SC | 泰文: Sarabun / Noto Sans Thai
- 4px 基准间距，卡片化布局，圆角 12 ~ 16px
- 图标线宽常量 IW = 1.5

## 部署

代码推送到 GitHub `main` 分支 → Vercel 自动构建部署。

```bash
# 手动部署 (首次)
bash deploy.sh
```

## 许可

Private — All rights reserved.
