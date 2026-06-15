#!/usr/bin/env python3
"""
Deepnote 每日推荐自动化脚本
=============================
专为 Deepnote 定时调度设计：
  - 每天自动运行一次，选取随机词条+句子写入 daily_picks
  - 可选启用 MiniCPM AI 智能推荐
  - 机器无需 24 小时在线，调度时自动启动

在 Deepnote 中的设置方法见文末 "Deepnote 设置指南"。
"""

import os
import sys
import json
import logging
from datetime import date, datetime

# =============================================================================
# 日志配置（Deepnote 中输出到 stdout，可在 notebook cell 中直接查看）
# =============================================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("deepnote_daily_pick")

# =============================================================================
# 依赖检查与安装（Deepnote 首次运行时会自动安装）
# =============================================================================
def ensure_dependencies():
    """检查并安装必要的 Python 包。"""
    deps = {
        "supabase": "supabase",
        "requests": "requests",
    }
    import importlib
    import subprocess

    for module_name, pip_name in deps.items():
        try:
            importlib.import_module(module_name)
        except ImportError:
            log.info(f"Installing {pip_name}...")
            subprocess.check_call(
                [sys.executable, "-m", "pip", "install", pip_name, "-q"]
            )
            log.info(f"  {pip_name} installed ✓")

# 在最开始就检查依赖
ensure_dependencies()

# 现在安全导入
from supabase import create_client
import requests


# =============================================================================
# 配置（从 Deepnote 环境变量中读取）
# =============================================================================
# 在 Deepnote 项目设置 → Environment Variables 中添加以下变量：
#   SUPABASE_URL              - Supabase 项目 URL（必填）
#   SUPABASE_SERVICE_ROLE_KEY - Service Role Key（必填，绕过 RLS）
#   USE_AI_PICK               - 是否启用 AI 推荐（可选，默认 "false"）
#   AI_API_KEY                - AI API 密钥（可选，默认使用免费密钥）

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
USE_AI = os.environ.get("USE_AI_PICK", "false").lower() == "true"

# MiniCPM 免费 API（如果启用 AI 模式）
AI_API_BASE = "https://api.modelbest.cn/v1"
AI_API_KEY = os.environ.get(
    "AI_API_KEY",
    "sk-pQ8L2zF3XmR5kY9wV4jB7hN1tC6vM0xG3aD5sH2bJ9lK4cZ8"
)
AI_MODEL = "MiniCPM-V-4.6-Thinking"


# =============================================================================
# Supabase 客户端
# =============================================================================
def get_client():
    """创建 Supabase 客户端。"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        log.error("❌ 缺少环境变量！请在 Deepnote 项目设置中添加 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)
    return create_client(SUPABASE_URL, SUPABASE_KEY)


# =============================================================================
# 从 RPC 获取随机词条/句子（兼容 SETOF 返回格式）
# =============================================================================
def _unwrap_rpc_row(resp):
    """兼容 supabase-py 返回的列表/单对象格式。"""
    if hasattr(resp, "data") and resp.data:
        return resp.data[0] if isinstance(resp.data, list) else resp.data
    return None


def fetch_random_word_id(client):
    """获取随机词条的 word 文本。"""
    try:
        row = _unwrap_rpc_row(client.rpc("get_random_word").execute())
        word = row.get("word", "") if row else ""
        if word:
            log.info(f"  📖 word: {word}")
            return word
    except Exception as e:
        log.error(f"RPC get_random_word 失败: {e}")
    return None


def fetch_random_sentence_id(client):
    """获取随机句子的 id。"""
    try:
        row = _unwrap_rpc_row(client.rpc("get_random_sentence").execute())
        sid = row.get("id") if row else None
        if sid:
            text = (row.get("text", "") or "")[:40]
            cat = row.get("category", "?")
            log.info(f"  📝 sentence [{cat}]: {text}...")
            return sid
    except Exception as e:
        log.error(f"RPC get_random_sentence 失败: {e}")
    return None


# =============================================================================
# AI 智能推荐（可选）
# =============================================================================
def ai_pick(client):
    """
    从候选池中让 AI 选出最佳每日一词/句。
    返回 {"word_id": str, "sentence_id": int, "reason": str} 或 None。
    """
    log.info("🤖 启用 AI 智能推荐模式...")

    # 获取候选词条（20条）
    try:
        resp = client.table("dictionary_full") \
            .select("word, senses, romanization") \
            .eq("enrichment_status", "enriched") \
            .gt("sense_count", 0) \
            .limit(60).execute()
        import random
        rows = resp.data or []
        random.shuffle(rows)
        words = []
        for r in rows[:20]:
            senses = r.get("senses", [])
            if isinstance(senses, str):
                senses = json.loads(senses)
            s0 = senses[0] if senses else {}
            words.append({
                "word": r.get("word", ""),
                "romanization": r.get("romanization", ""),
                "meaning": s0.get("meaning", "") if isinstance(s0, dict) else "",
                "pos": s0.get("pos", "") if isinstance(s0, dict) else "",
            })
    except Exception as e:
        log.error(f"获取候选词条失败: {e}")
        return None

    # 获取候选句子（10条）
    try:
        resp = client.table("sentences") \
            .select("id, text, category, literal_meaning, actual_meaning") \
            .limit(30).execute()
        rows = resp.data or []
        random.shuffle(rows)
        sentences = []
        for r in rows[:10]:
            sentences.append({
                "id": r.get("id"),
                "text": r.get("text", ""),
                "category": r.get("category", "daily"),
                "literal_meaning": r.get("literal_meaning", ""),
                "actual_meaning": r.get("actual_meaning", ""),
            })
    except Exception as e:
        log.error(f"获取候选句子失败: {e}")
        return None

    if len(words) < 3 or len(sentences) < 3:
        log.warning("候选不足，降级到随机模式")
        return None

    # 构建 prompt
    words_text = "\n".join(
        f"  {i}. {w['word']} [{w.get('romanization','')}] — {w.get('pos','')} {w.get('meaning','')}"
        for i, w in enumerate(words, 1)
    )
    sents_text = "\n".join(
        f"  {i}. [{s['id']}] [{s['category']}] {s['text']}"
        for i, s in enumerate(sentences, 1)
    )

    system = (
        "你是泰语学习 App 的每日内容推荐助手。从候选词条和句子中各选一个作为今日推荐。"
        "标准：①实用高频 ②有文化趣味 ③难度适中 ④词句主题呼应。"
        "严格返回 JSON：{\"word_id\":\"词条word\",\"sentence_id\":句子id,\"reason\":\"理由\"}"
    )
    user = (
        f"今天是 {date.today().strftime('%Y年%m月%d日')}，请推荐：\n\n"
        f"【候选词条 {len(words)}个】\n{words_text}\n\n"
        f"【候选句子 {len(sentences)}个】\n{sents_text}\n\n"
        f"返回 JSON。"
    )

    try:
        resp = requests.post(
            f"{AI_API_BASE}/chat/completions",
            headers={"Authorization": f"Bearer {AI_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": AI_MODEL,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "temperature": 0.7,
                "max_tokens": 500,
            },
            timeout=60,
        )
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"]
        # 提取 JSON
        a, b = content.find("{"), content.rfind("}") + 1
        if a == -1 or b == 0:
            log.warning(f"AI 返回非 JSON: {content[:100]}")
            return None
        pick = json.loads(content[a:b])
        log.info(f"  AI 推荐: word={pick.get('word_id')}, sentence={pick.get('sentence_id')}")
        log.info(f"  理由: {pick.get('reason', '')}")
        return pick
    except Exception as e:
        log.warning(f"AI API 失败: {e}，降级到随机模式")
        return None


# =============================================================================
# 写入 daily_picks 表
# =============================================================================
def save_daily_pick(client, word_id, sentence_id):
    """Upsert 今日推荐（按 pick_date 去重）。"""
    row = {
        "pick_date": date.today().isoformat(),
        "daily_word_id": word_id,
        "daily_sentence_id": sentence_id,
    }
    try:
        resp = client.table("daily_picks").upsert(row, on_conflict="pick_date").execute()
        if hasattr(resp, "error") and resp.error:
            log.error(f"  Upsert 失败: {resp.error}")
            return False
        return True
    except Exception as e:
        log.error(f"  Upsert 异常: {e}")
        return False


# =============================================================================
# 主流程
# =============================================================================
def main():
    log.info("=" * 50)
    log.info(f"🚀 Deepnote Daily Pick — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    log.info(f"   AI 模式: {'✅ 启用' if USE_AI else '❌ 随机'}")

    client = get_client()
    today = date.today().isoformat()

    # 检查今天是否已有推荐（避免重复执行）
    try:
        existing = client.table("daily_picks").select("id").eq("pick_date", today).execute()
        if existing.data and len(existing.data) > 0:
            log.info(f"⏭️  {today} 已有推荐记录，跳过")
            log.info("=" * 50)
            return
    except Exception:
        pass  # 表可能不存在，继续执行

    pick = None
    if USE_AI:
        pick = ai_pick(client)

    # AI 失败或不启用 → 随机选取
    if not pick:
        log.info("🎲 使用随机选取模式...")
        word_id = fetch_random_word_id(client)
        sentence_id = fetch_random_sentence_id(client)
        if not word_id and not sentence_id:
            log.error("❌ 未能获取任何推荐内容")
            sys.exit(1)
        pick = {"word_id": word_id, "sentence_id": sentence_id, "reason": "随机选取"}

    ok = save_daily_pick(client, pick["word_id"], pick["sentence_id"])
    if ok:
        log.info(f"✅ 已保存 {today} 每日推荐")
        log.info(f"   word_id: {pick['word_id']}")
        log.info(f"   sentence_id: {pick['sentence_id']}")
    else:
        log.error("❌ 保存失败")
        sys.exit(1)

    log.info("=" * 50)


if __name__ == "__main__":
    main()


# =============================================================================
# Deepnote 设置指南
# =============================================================================
#
# 第一步：在 Deepnote 中创建项目
#   1. 打开 deepnote.com，创建新项目
#   2. 新建一个 notebook（如 daily_pick.ipynb）
#   3. 把本脚本的全部内容粘贴到一个 cell 中
#
# 第二步：设置环境变量（Deepnote 左侧栏 → Integrations → Environment Variables）
#   添加以下变量：
#     SUPABASE_URL              = https://xxxxxxxxxx.supabase.co
#     SUPABASE_SERVICE_ROLE_KEY = eyJxxxxxxxxxxxxxxxxxxxxxx
#     USE_AI_PICK               = true    （可选，启用 AI 推荐）
#
# 第三步：先手动运行一次，确认无误
#   点击 cell 左侧的 ▶ 运行按钮，观察输出日志
#
# 第四步：设置定时调度（Deepnote 顶部 → Schedule → New Schedule）
#   - Schedule name: 每日推荐
#   - Run: 选择 Daily
#   - At: 00:00 UTC（北京时间早上 8 点）
#   - Environment: 选择当前项目
#   - 保存即可
#
# Deepnote 会在设定时间自动：
#   1. 启动机器（如果已休眠）
#   2. 从上到下执行 notebook 所有 cell
#   3. 执行完毕后机器自动休眠
#
# 你不需要保持机器 24 小时在线。调度功能会在时间到了自动唤醒机器。
#
# ⚠️ 注意事项：
#   - Deepnote 免费版每月有 750 小时机器时间限制，每天跑一次完全够用
#   - 如果 24 小时内没有任何活动（包括调度），机器会休眠，但下次调度会自动唤醒
#   - 要查看历史执行记录：顶部 Schedule → 点击调度名称 → Run History
