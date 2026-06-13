# 词笺 (ThaiDict) — 中泰双语智能词典

面向中国泰语学习者的移动端智能词典应用，集成 AI 富化、泰文分词、学习统计等功能。

## 技术栈

- **前端**: React 18 + Vite 6
- **UI**: CSS-in-JS inline style (无外部 UI 库)
- **图标**: lucide-react + 4 个泰文化自定义 SVG (黎明寺/贝叶经/莲花灯/佛头)
- **图表**: recharts (AreaChart, BarChart, PieChart)
- **认证**: Clerk (@clerk/clerk-react)
- **后端**: Supabase (PostgreSQL + RLS)
- **部署**: Vercel

## 快速开始

```bash
# 安装依赖
npm install

# 配置环境变量
# 编辑 .env.local 填入 Supabase URL/Key 和 Clerk Key

# 本地开发
npm run dev

# 构建
npm run build
```

## 环境变量

| 变量 | 说明 | 必填 |
|------|------|------|
| `VITE_SUPABASE_URL` | Supabase 项目 URL | 是 |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名 Key | 是 |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk 公钥 (留空则为演示模式) | 否 |

## 项目结构

```
thaidict/
├── index.html           # 入口 HTML (含 Google Fonts)
├── package.json         # 依赖管理
├── vite.config.js       # Vite 构建配置
├── vercel.json          # Vercel 部署配置
├── .env.local           # 环境变量 (不提交)
├── public/
│   └── favicon.svg      # 黎明寺图标
└── src/
    ├── main.jsx         # React 入口 (含 ClerkProvider)
    ├── index.css        # 全局样式 (reset + 字体)
    ├── App.jsx          # 主组件 (~3100行单文件架构)
    └── lib/
        └── supabase.js  # Supabase 客户端 + 查询工具
```

## 页面

- **首页** — 搜索、每日一词、最近查词、学习统计
- **单词本** — 最近查词/收藏/词书/文件夹管理
- **词条详情** — 多义项、分段例句、词频、近反义词、关联词
- **学习** — 学习计划、专项练习、笔记、构词法、统计图表、常用语
- **我的** — 个人信息、基础设置、WebDAV同步、数据管理、API管理

## 设计规范

- 暖棕色色彩系统 (p900~p50)
- 移动端优先 (max-width 430px)
- Noto Serif SC (标题) + Noto Sans SC (正文) + Noto Sans Thai (泰文)
- 4px 基准间距，卡片化布局

## 许可

Private — All rights reserved.
