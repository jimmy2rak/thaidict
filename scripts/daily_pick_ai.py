#!/usr/bin/env python3
"""
Daily Pick AI Script for ThaiDict（AI 智能每日推荐）
=====================================================
使用 MiniCPM-V-4.6-Thinking 大模型，从候选词条和句子中智能选取
最适合当日学习的一词一句，将 ID 写入 daily_picks 表。

与 daily_pick_cron.py 的区别：
  - cron 版：纯随机选取（ORDER BY RANDOM()）
  - AI 版：从候选池中智能筛选，考虑教育价值和趣味性

使用方法：
  1. 在脚本顶部的配置区填写 SUPABASE_URL 和 SUPABASE_KEY
  2. python3 scripts/daily_pick_ai.py

依赖安装：
  pip install supabase requests
"""

import os
import sys
import json
import logging
import requests  # HTTP 请求库，用于调用 MiniCPM API
from datetime import date, datetime, timezone, timedelta

# =============================================================================
# 日志配置
# =============================================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("daily_pick_ai")

# =============================================================================
# CST 日期工具（与前端 getTodayCST() 保持一致）
# =============================================================================
CST = timezone(timedelta(hours=8))

def today_cst():
    """返回中国标准时间（UTC+8）当天日期，确保与前端查询一致。"""
    return datetime.now(CST).date()


# =============================================================================
# 配置常量
# =============================================================================

# ========== 请在下方填写你的 Supabase 配置 ==========
SUPABASE_URL = ""   # 项目 API URL，例如 "https://xxx.supabase.co"
SUPABASE_KEY = ""   # Service Role Key，从 Supabase Dashboard 获取
# ====================================================

# MiniCPM API 配置（OpenAI 兼容格式）
AI_API_BASE = "https://api.modelbest.cn/v1"                # API 基础 URL
AI_API_KEY = "sk-pQ8L2zF3XmR5kY9wV4jB7hN1tC6vM0xG3aD5sH2bJ9lK4cZ8"  # API 密钥
AI_MODEL = "MiniCPM-V-4.6-Thinking"                        # 模型 ID
AI_MAX_TOKENS = 800                                         # 最大输出 token 数
AI_TEMPERATURE = 0.7                                        # 生成温度（0=确定，1=随机）
CANDIDATE_WORDS = 20                                        # 候选词条数
CANDIDATE_SENTENCES = 10                                    # 候选句子数


# =============================================================================
# Supabase 客户端连接
# =============================================================================

def get_supabase_client():
    """创建 Supabase 客户端（Service Role Key 认证，绕过 RLS）。"""
    try:
        from supabase import create_client
    except ImportError:
        log.error("缺少 supabase-py，请运行: pip install supabase")
        sys.exit(1)

    if not SUPABASE_URL or not SUPABASE_KEY:
        log.error("请在脚本顶部的配置区填写 SUPABASE_URL 和 SUPABASE_KEY")
        sys.exit(1)

    return create_client(SUPABASE_URL, SUPABASE_KEY)


# =============================================================================
# 从数据库获取候选词条池
# =============================================================================

def fetch_candidate_words(client, limit=CANDIDATE_WORDS):
    """
    从 dictionary_full 表中随机获取 N 个已富化的词条作为候选。
    返回列表，每个元素为 {word, meaning, pos} 的简化格式（供 AI 选择用）。
    """
    try:
        resp = (
            client.table("dictionary_full")
            .select("word, senses, romanization")
            .eq("enrichment_status", "enriched")
            .gt("sense_count", 0)
            .limit(limit * 3)  # 多取一些，以便随机打乱
            .execute()
        )
        if not hasattr(resp, "data") or not resp.data:
            log.warning("dictionary_full 中未找到已充实的词条")
            return []

        # 随机打乱并截取 limit 条
        import random
        random.shuffle(resp.data)
        rows = resp.data[:limit]

        candidates = []
        for row in rows:
            word = row.get("word", "")
            senses = row.get("senses", [])
            # 解析 JSONB senses 字段（HTTP 传输后可能是字符串）
            if isinstance(senses, str):
                try:
                    senses = json.loads(senses)
                except json.JSONDecodeError:
                    senses = []
            first_sense = senses[0] if senses else {}
            meaning = first_sense.get("meaning", "") if isinstance(first_sense, dict) else str(first_sense)
            pos = first_sense.get("pos", "") if isinstance(first_sense, dict) else ""
            romanization = row.get("romanization", "")

            if word:
                candidates.append({
                    "word": word,
                    "romanization": romanization,
                    "meaning": meaning,
                    "pos": pos,
                })

        log.info(f"获取到 {len(candidates)} 个候选词条")
        return candidates
    except Exception as e:
        log.error(f"获取候选词条出错: {e}")
        return []


# =============================================================================
# 从数据库获取候选句子池
# =============================================================================

def fetch_candidate_sentences(client, limit=CANDIDATE_SENTENCES):
    """
    从 sentences 表中随机获取 N 个句子作为候选。
    返回列表，每个元素为 {id, text, category, literal_meaning, actual_meaning}。
    """
    try:
        resp = (
            client.table("sentences")
            .select("id, text, category, literal_meaning, actual_meaning")
            .limit(limit * 3)
            .execute()
        )
        if not hasattr(resp, "data") or not resp.data:
            log.warning("sentences 表中未找到句子")
            return []

        import random
        random.shuffle(resp.data)
        rows = resp.data[:limit]

        candidates = []
        for row in rows:
            candidates.append({
                "id": row.get("id"),
                "text": row.get("text", ""),
                "category": row.get("category", "daily"),
                "literal_meaning": row.get("literal_meaning", ""),
                "actual_meaning": row.get("actual_meaning", ""),
            })

        log.info(f"获取到 {len(candidates)} 个候选句子")
        return candidates
    except Exception as e:
        log.error(f"获取候选句子出错: {e}")
        return []


# =============================================================================
# 调用 MiniCPM API 进行智能选择
# =============================================================================

def ask_ai_to_pick(candidate_words, candidate_sentences):
    """
    将候选词条和句子列表发送给 MiniCPM 大模型，让 AI 从中选取
    最适合今日学习的一词一句。

    AI 的选词偏好：
      - 实用性强（日常高频词优先）
      - 有文化内涵或趣味性
      - 难度适中（不太生僻也不太基础）
      - 词条和句子之间能形成主题呼应更佳

    返回：{"word_id": "...", "sentence_id": 123} 或 None
    """

    # --- 构建候选词条文本（供 AI 阅读）---
    words_text = ""
    for i, w in enumerate(candidate_words, 1):
        words_text += (
            f"  {i}. {w['word']}"
            f"{' [' + w['romanization'] + ']' if w.get('romanization') else ''}"
            f" — {w.get('pos', '')} {w.get('meaning', '')}\n"
        )

    # --- 构建候选句子文本 ---
    sentences_text = ""
    for i, s in enumerate(candidate_sentences, 1):
        cat_label = {"idioms": "俗语", "buddhist": "佛教用语", "daily": "日常用语"}.get(s["category"], s["category"])
        extra = ""
        if s.get("literal_meaning"):
            extra += f" [字面: {s['literal_meaning']}]"
        if s.get("actual_meaning"):
            extra += f" [实际: {s['actual_meaning']}]"
        sentences_text += f"  {i}. [{s['id']}] [{cat_label}] {s['text']}{extra}\n"

    # --- 系统提示词（定义 AI 角色和选词标准）---
    system_prompt = """你是一个泰语学习应用的每日内容推荐助手。你的任务是从候选词条和句子中各选出一个，作为今日推荐给泰语学习者。

选词标准：
1. 优先选择日常高频、实用性强的词条
2. 考虑文化内涵和趣味性（如俗语、佛教相关词汇）
3. 难度适中，适合中级学习者（不要太基础如"你好"，也不要太生僻）
4. 尽量让选出的词条和句子之间有主题呼应（如都是关于食物、旅行、情感等）
5. 避免选择过于简单或过于晦涩的内容

你必须严格按照以下 JSON 格式返回结果（不要包含任何其他文字）：
{"word_id": "选中的词条word文本", "sentence_id": 选中的句子id数字, "reason": "简短推荐理由（中文，20字以内）"}"""

    # --- 用户消息（候选列表 + 指令）---
    user_prompt = f"""今天是 {today_cst().strftime('%Y年%m月%d日')}，请从以下候选内容中各选一个作为今日推荐：

【候选词条】（共{len(candidate_words)}个）
{words_text}

【候选句子】（共{len(candidate_sentences)}个）
{sentences_text}

请选出最适合今日推荐的一词一句，返回 JSON。"""

    # --- 调用 MiniCPM API（OpenAI 兼容格式）---
    headers = {
        "Authorization": f"Bearer {AI_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": AI_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": AI_TEMPERATURE,
        "max_tokens": AI_MAX_TOKENS,
    }

    try:
        log.info(f"正在调用 {AI_MODEL} API 选取每日一词一句...")
        resp = requests.post(
            f"{AI_API_BASE}/chat/completions",
            headers=headers,
            json=payload,
            timeout=60,  # 60 秒超时
        )
        resp.raise_for_status()  # HTTP 错误时抛出异常

        result = resp.json()
        content = result["choices"][0]["message"]["content"]

        log.info(f"AI 响应: {content[:200]}...")

        # --- 解析 AI 返回的 JSON ---
        # AI 可能在 JSON 前后加了说明文字，需要提取出 JSON 部分
        json_start = content.find("{")
        json_end = content.rfind("}") + 1
        if json_start == -1 or json_end == 0:
            log.error(f"AI 未返回有效 JSON: {content}")
            return None

        json_str = content[json_start:json_end]
        pick = json.loads(json_str)

        word_id = pick.get("word_id")
        sentence_id = pick.get("sentence_id")
        reason = pick.get("reason", "")

        if not word_id or not sentence_id:
            log.error(f"AI 返回的选取结果不完整: {pick}")
            return None

        log.info(f"AI 选取结果: 词条={word_id}, 句子 ID={sentence_id}, 原因={reason}")
        return {"word_id": word_id, "sentence_id": sentence_id, "reason": reason}

    except requests.exceptions.Timeout:
        log.error("AI API 请求超时（60秒）")
        return None
    except requests.exceptions.RequestException as e:
        log.error(f"AI API 请求失败: {e}")
        return None
    except (json.JSONDecodeError, KeyError, IndexError) as e:
        log.error(f"解析 AI 响应失败: {e}")
        return None


# =============================================================================
# 写入 daily_picks 表
# =============================================================================

def upsert_daily_pick(client, pick_date, word_id, sentence_id):
    """
    写入（或更新）今日的每日推荐记录。
    daily_picks v3 表：UNIQUE(pick_date)，只有一条全局记录。
    """
    row = {
        "pick_date": pick_date,
        "daily_word_id": word_id,        # 词条文本（dictionary_full.word）
        "daily_sentence_id": sentence_id, # 句子 ID（sentences.id）
    }
    try:
        resp = (
            client.table("daily_picks")
            .upsert(row, on_conflict="pick_date")
            .execute()
        )
        if hasattr(resp, "error") and resp.error:
            log.error(f"写入失败: {resp.error}")
            return False
        return True
    except Exception as e:
        log.error(f"写入异常: {e}")
        return False


# =============================================================================
# 降级方案：纯随机选取（AI 不可用时的兜底）
# =============================================================================

def fallback_random_pick(client):
    """
    当 AI API 不可用时，退回到纯随机选取（与 daily_pick_cron.py 逻辑一致）。
    """
    log.warning("AI API 不可用，降级为随机选取...")

    try:
        # 随机词条（兼容 SETOF 返回：data 可能是列表或单对象）
        resp = client.rpc("get_random_word").execute()
        row = None
        if hasattr(resp, "data") and resp.data:
            row = resp.data[0] if isinstance(resp.data, list) else resp.data
        word_id = row.get("word", "") if row else None

        # 随机句子
        resp = client.rpc("get_random_sentence").execute()
        row = None
        if hasattr(resp, "data") and resp.data:
            row = resp.data[0] if isinstance(resp.data, list) else resp.data
        sentence_id = row.get("id") if row else None

        if word_id:
            log.info(f"  兜底词条: {word_id}")
        if sentence_id:
            log.info(f"  兜底句子 ID: {sentence_id}")

        return {"word_id": word_id, "sentence_id": sentence_id, "reason": "随机选取（AI 不可用）"}
    except Exception as e:
        log.error(f"随机选取兜底也失败了: {e}")
        return None


# =============================================================================
# 主流程
# =============================================================================

def main():
    """
    脚本主入口：
    1. 连接 Supabase
    2. 获取候选词条和句子池
    3. 调用 MiniCPM AI 智能选取（失败则降级到随机选取）
    4. 写入 daily_picks 表
    """
    log.info("=" * 60)
    log.info("每日推荐 AI — 启动")
    log.info(f"日期: {today_cst().isoformat()}")
    log.info(f"模型: {AI_MODEL}")

    # 步骤 1：连接数据库
    client = get_supabase_client()
    today_str = today_cst().isoformat()

    # 步骤 2：获取候选池
    candidate_words = fetch_candidate_words(client)
    candidate_sentences = fetch_candidate_sentences(client)

    if not candidate_words or not candidate_sentences:
        log.error("候选内容不足，终止执行。")
        sys.exit(1)

    # 步骤 3：AI 智能选取（失败时降级到随机选取）
    pick = None
    if candidate_words and candidate_sentences:
        pick = ask_ai_to_pick(candidate_words, candidate_sentences)

    if not pick:
        pick = fallback_random_pick(client)

    if not pick or (not pick.get("word_id") and not pick.get("sentence_id")):
        log.error("未能选取每日推荐内容，终止执行。")
        sys.exit(1)

    # 步骤 4：写入 daily_picks 表
    ok = upsert_daily_pick(
        client,
        today_str,
        pick.get("word_id"),
        pick.get("sentence_id"),
    )

    if ok:
        log.info(f"完成: 每日推荐已保存，日期 {today_str}")
        log.info(f"  word_id: {pick.get('word_id') or '(none)'}")
        log.info(f"  sentence_id: {pick.get('sentence_id') or '(none)'}")
        log.info(f"  reason: {pick.get('reason', '(none)')}")
    else:
        log.error("保存每日推荐失败。")
        sys.exit(1)

    log.info("=" * 60)


if __name__ == "__main__":
    main()
