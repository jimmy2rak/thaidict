<div align="center">

<!-- Banner -->
<img src="public/banner.png" alt="词笺 Banner" width="100%" />

# 词笺 ThaiDict

**面向中国泰语学习者的智能双语词典**

[![License: MIT](https://img.shields.io/badge/License-MIT-5B8C7E.svg?style=flat-square)](#)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](#)
[![Node Version](https://img.shields.io/badge/Node-%3E%3D18-5B8C7E.svg?style=flat-square)](#)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg?style=flat-square)](#)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3FCF8E.svg?style=flat-square)](#)
[![Deploy](https://img.shields.io/badge/Deploy-Vercel-000000.svg?style=flat-square)](https://thaidict.vercel.app)

[在线体验](https://thaidict.vercel.app) · [报告问题](https://github.com/jimmy2rak/thaidict/issues) · [功能建议](https://github.com/jimmy2rak/thaidict/issues)

</div>

---

## 目录

- [功能特性](#功能特性)
- [快速开始](#快速开始)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [数据库](#数据库)
- [页面一览](#页面一览)
- [设计规范](#设计规范)
- [部署](#部署)
- [Roadmap](#roadmap)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

---

## 功能特性

<table>
  <tr>
    <td width="50%">

### 🔍 智能查词
- 8000+ 泰语词条数据库
- 中泰双向搜索（精确 + 模糊 + RPC）
- 泰文自动分词（最长匹配 + 音节启发式回退）
- 词条详情：多义项、例句分词、词频、近反义词

    </td>
    <td width="50%">

### 🤖 AI 词条生成
- 未知词一键 AI 富化
- 结构化 JSON 输出（词性、释义、例句）
- 多 Provider 支持（OpenAI / DeepSeek / Kimi / 豆包…）
- 服务端密钥代理，前端零暴露

    </td>
  </tr>
  <tr>
    <td>

### 📚 学习系统
- 打卡任务管理（自定义类型/时间/时长）
- 学习计划 + 每日进度追踪
- 连续打卡天数 + 月度热力图
- 学习笔记（Markdown 编辑器）

    </td>
    <td>

### 🌐 多端同步
- WebDAV 同步（坚果云等）
- Supabase 云端数据持久化
- PWA 支持（可添加到主屏幕）
- 响应式移动端优先设计

    </td>
  </tr>
  <tr>
    <td>

### 🎨 精致体验
- 暖棕色双主题（亮/暗/跟随系统）
- 中泰双语字体（Noto Serif SC + Sarabun）
- 泰语 TTS 朗读（Web Speech API）
- 4 个泰国文化定制图标

    </td>
    <td>

### 📧 智能提醒
- 每日学习邮件提醒
- 与打卡任务联动
- 可自定义提醒时间（CST）
- 现代极简邮件模板

    </td>
  </tr>
</table>

---

## 快速开始

```bash
# 1. 克隆项目
git clone https://github.com/jimmy2rak/thaidict.git
cd thaidict

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入你的 Supabase 凭证

# 4. 启动开发服务器
npm run dev
```

打开 http://localhost:3000 即可体验。

### 环境变量

| 变量 | 说明 | 必填 |
|------|------|:----:|
| `VITE_SUPABASE_URL` | Supabase 项目 URL | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名公钥 | ✅ |

---

## 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| **框架** | React 18 + Vite 6 | 前端 UI + 构建 |
| **样式** | CSS-in-JS (inline) | 零依赖样式方案 |
| **图标** | lucide-react + 自定义 SVG | 通用图标 + 泰文化图标 |
| **图表** | recharts | 学习统计可视化 |
| **认证** | Supabase Auth | 邮箱密码 / OAuth |
| **数据库** | Supabase PostgreSQL | 数据存储 + RLS |
| **函数** | Supabase Edge Functions | AI 代理 + 邮件发送 |
| **邮件** | Brevo (SMTP) | OTP 验证 + 学习提醒 |
| **字体** | Google Fonts | 中泰双语排版 |
| **部署** | Vercel | 自动 CI/CD |

---

## 项目结构

```
thaidict/
├── src/
│   ├── main.jsx                 # 入口 + AuthProvider
│   ├── App.jsx                  # 主壳层（导航 + Overlay）
│   ├── index.css                # 全局样式 + 主题变量
│   ├── context/
│   │   └── AppContext.jsx       # 全局状态中枢
│   ├── lib/
│   │   └── supabase.js          # 数据访问层（60+ 函数）
│   ├── utils/
│   │   ├── thaiSegment.js       # 泰语分词引擎
│   │   └── tts.js               # TTS 朗读控制
│   ├── components/
│   │   ├── UIComponents.jsx     # 共用组件库
│   │   └── SentenceDetail.jsx   # 句子详情 Overlay
│   ├── pages/
│   │   ├── HomePage.jsx         # 首页
│   │   ├── WordBookPage.jsx     # 单词本
│   │   ├── LearnPage.jsx        # 学习中心
│   │   ├── ProfilePage.jsx      # 个人中心
│   │   ├── WordDetailPage.jsx   # 词条详情
│   │   ├── UnknownWordPage.jsx  # AI 生成词条
│   │   ├── LoginPage.jsx        # 登录/注册
│   │   └── subsections/         # 二级页面模块
│   └── icons/
│       ├── CulturalIcons.jsx    # 泰文化 SVG
│       └── BrandIcons.jsx       # OAuth 品牌图标
├── supabase/
│   ├── functions/               # Edge Functions
│   │   ├── ai-proxy/            # AI 代理
│   │   ├── send-otp/            # OTP 邮件
│   │   ├── verify-otp/          # OTP 验证
│   │   └── send-reminder/       # 学习提醒
│   └── *.sql                    # 数据库迁移
├── scripts/                     # Python 辅助脚本
└── public/                      # 静态资源
```

---

## 数据库

### 核心表

| 表 | 说明 |
|---|---|
| `dictionary_full` | 主词典（8000+ 词条，JSONB 义项） |
| `sentences` | 例句库（成语 / 佛学 / 日常） |
| `community_words` | AI 生成词条（用户共建） |
| `daily_picks` | 每日推荐（全局按日期） |

### 用户表

| 表 | 说明 |
|---|---|
| `user_bookmarks` | 收藏词 |
| `user_recent_words` | 最近查词 |
| `user_folders` | 自定义文件夹 |
| `user_checkin_tasks` | 打卡任务 |
| `user_checkin_completions` | 打卡完成记录 |
| `user_learning_progress` | 每日学习进度 |
| `user_notes` | 学习笔记 |
| `user_settings` | 用户设置 |
| `user_api_keys` | 用户 AI API 密钥 |

---

## 页面一览

| 页面 | 功能 |
|------|------|
| **首页** | 搜索、每日一词、每日一句、最近查词、打卡统计 |
| **单词本** | 最近查词 / 收藏 / 句子 / 文件夹管理 |
| **学习** | 打卡任务、专项练习、笔记、常用语、学习统计 |
| **我的** | 个人信息、设置、WebDAV、API 管理、复习提醒 |
| **词条详情** | 多义项、分段例句、词频、近反义词、学习者联想 |
| **未知词条** | AI 自动生成词条 |

---

## 设计规范

- **色彩**: 暖棕色系 (`#5B8C7E` 青绿主色 + `#C4993D` 金色强调)
- **布局**: 移动端优先，`max-width: 430px`
- **字体**: Noto Serif SC（标题）· Noto Sans SC（正文）· Sarabun（泰文）
- **间距**: 4px 基准网格，圆角 12-16px
- **图标**: 线宽 `IW = 1.5`

---

## 部署

### 自动部署

推送到 `main` 分支即自动触发 Vercel 构建部署。

```bash
git push origin main
```

### 手动部署

```bash
# 首次部署
bash deploy.sh

# 或手动操作
npm run build
vercel deploy --prod
```

---

## Roadmap

- [ ] **间隔重复算法 (SRS)** — 基于 SM-2 算法的智能复习调度，根据遗忘曲线自动安排复习时间
- [ ] **语音识别练习** — 集成 Web Speech Recognition API，支持泰语口语跟读评分
- [ ] **社区词库共建** — 用户可提交词条释义和例句，经审核后加入公共词典

---

## 贡献指南

欢迎贡献！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

---

## 许可证

[MIT](LICENSE) © [jimmy2rak](https://github.com/jimmy2rak)

<div align="center">

**用 ❤️ 为泰语学习者打造**

</div>
