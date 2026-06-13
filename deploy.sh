#!/bin/bash
# ============================================
# 词笺 (ThaiDict) 部署脚本
# 在 Terminal 中运行此脚本完成部署
# ============================================

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo "📦 词笺 (ThaiDict) 部署脚本"
echo "==========================="
echo ""

# 1. GitHub 登录
echo "🔐 步骤 1/3: GitHub 登录"
if ! gh auth status &>/dev/null; then
  echo "   正在打开 GitHub 登录页面..."
  gh auth login --hostname github.com --git-protocol https --web
else
  echo "   ✅ GitHub 已登录"
fi
echo ""

# 2. 推送到 GitHub
echo "📤 步骤 2/3: 推送代码到 GitHub"
git remote set-url origin https://github.com/jimmy2rak/thaidict.git
if git push -u origin main 2>/dev/null; then
  echo "   ✅ 代码已推送到 jimmy2rak/thaidict"
else
  echo "   ⚠️ 推送失败，可能需要先拉取远程分支"
  echo "   尝试: git pull --rebase origin main && git push -u origin main"
fi
echo ""

# 3. Vercel 环境变量
echo "⚙️ 步骤 3/3: 设置 Vercel 环境变量"
if command -v vercel &>/dev/null || npx vercel --version &>/dev/null; then
  echo "   设置 Supabase 环境变量..."
  npx vercel env add VITE_SUPABASE_URL production <<< "https://zvemahqskgluhirzbcqu.supabase.co" 2>/dev/null || true
  npx vercel env add VITE_SUPABASE_ANON_KEY production <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2ZW1haHFza2dsdWhpcnpiY3F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MTUxNTYsImV4cCI6MjA5NjQ5MTE1Nn0.0pIcBx1BE-6tM2OF1p_EC5kzMkbd2wnSldZ80bDqE-o" 2>/dev/null || true
  echo "   ✅ 环境变量已设置"
  echo ""
  echo "   正在部署到 Vercel..."
  npx vercel deploy --prod --yes
else
  echo "   ⚠️ Vercel CLI 未找到，请先运行: npm i -g vercel"
fi

echo ""
echo "🎉 部署完成！访问: https://thaidict.vercel.app"
