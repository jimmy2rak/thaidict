#!/usr/bin/env python3
"""
Daily Pick Cron Script for ThaiDict v3（每日推荐定时任务 v3）
============================================================
功能：每天从 dictionary_full 表随机选取一个词条，从 sentences 表随机选取一个句子，
      将词条的 word 文本和句子的 id 写入 daily_picks 表（全局统一，不分用户）。
      配合 crontab 定时任务，每天 UTC 零点自动执行。

v3 变更：
  - 去掉 user_id，全局统一推送（所有用户看到相同的每日一词/一句）
  - 只存 daily_word_id（词条文本）和 daily_sentence_id（句子 ID）
  - 前端通过 ID 关联查询完整数据，避免 JSONB 冗余
  - 不再需要发现用户列表，简化执行流程

使用方法：
  1. 在脚本顶部的配置区填写 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY
  2. python3 scripts/daily_pick_cron.py

依赖安装：
  pip install supabase
"""

import os          # 读取环境变量
import sys         # sys.exit() 异常退出
import logging     # 结构化日志输出
from datetime import date, datetime, timezone, timedelta

# =============================================================================
# 日志配置
# =============================================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("daily_pick_cron")

# =============================================================================
# CST 日期工具（与前端 getTodayCST() 保持一致）
# =============================================================================
CST = timezone(timedelta(hours=8))

def today_cst():
    """返回中国标准时间（UTC+8）当天日期，确保与前端查询一致。"""
    return datetime.now(CST).date()


# =============================================================================
# Supabase 客户端连接
# =============================================================================
def get_supabase_client():
    """
    创建 Supabase 客户端（使用 Service Role Key 认证）。
    Service Role Key 绕过 RLS 策略，拥有数据库全部读写权限。
    该密钥从 Supabase Dashboard → Settings → API → service_role key 获取。
    """
    try:
        from supabase import create_client
    except ImportError:
        log.error("缺少 supabase-py，请运行: pip install supabase")
        sys.exit(1)

    # ========== 请在下方填写你的 Supabase 配置 ==========
    url = ""   # 项目 API URL，例如 "https://xxx.supabase.co"
    key = ""   # Service Role Key，从 Supabase Dashboard 获取
    # ====================================================

    if not url or not key:
        log.error("请在脚本顶部的配置区填写 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)

    return create_client(url, key)


# =============================================================================
# 随机选取词条 —— 调用 RPC get_random_word()
# =============================================================================
# get_random_word() 在 phase5_add_rpcs_and_sentences.sql 中定义：
#   SELECT * FROM dictionary_full
#   WHERE enrichment_status = 'enriched' AND sense_count > 0
#   ORDER BY RANDOM() LIMIT 1;
#
# 返回值：dictionary_full 表的一行完整数据，包含 word, senses, romanization 等

def fetch_random_word_id(client):
    """
    调用 get_random_word() RPC 获取一个随机词条。
    只返回词条的 word 文本（作为 daily_word_id 存储），不返回完整数据。
    
    注意：supabase-py 对 SETOF 返回类型的 RPC，data 可能是列表或单对象，
    这里做兼容处理。
    """
    try:
        resp = client.rpc("get_random_word").execute()
        if hasattr(resp, "data") and resp.data:
            # 兼容处理：data 可能是单对象或列表
            row = resp.data[0] if isinstance(resp.data, list) else resp.data
            word = row.get("word", "")
            if word:
                log.info(f"  已选取词条: {word}")
                return word
        log.warning("get_random_word RPC 未返回数据或词条为空")
        return None
    except Exception as e:
        log.error(f"获取随机词条出错: {e}")
        return None


# =============================================================================
# 随机选取句子 —— 调用 RPC get_random_sentence()
# =============================================================================
# get_random_sentence() 在 phase5_add_rpcs_and_sentences.sql 中定义：
#   SELECT * FROM sentences
#   WHERE (cat IS NULL OR category = cat)
#   ORDER BY RANDOM() LIMIT 1;
#
# 不传分类参数 → 从所有分类中随机选取

def fetch_random_sentence_id(client):
    """
    调用 get_random_sentence() RPC 获取一个随机句子。
    只返回句子的 id（BIGINT），不返回完整数据。
    
    注意：supabase-py 对 SETOF 返回类型的 RPC，data 可能是列表或单对象。
    """
    try:
        resp = client.rpc("get_random_sentence").execute()
        if hasattr(resp, "data") and resp.data:
            # 兼容处理：data 可能是单对象或列表
            row = resp.data[0] if isinstance(resp.data, list) else resp.data
            sid = row.get("id")
            text_preview = (row.get("text", "") or "")[:50]
            cat = row.get("category", "?")
            if sid:
                log.info(f"  已选取句子 [{cat}]: {text_preview}...")
                return sid
        log.warning("get_random_sentence RPC 未返回数据或句子 ID 为空")
        return None
    except Exception as e:
        log.error(f"获取随机句子出错: {e}")
        return None


# =============================================================================
# 写入 daily_picks 表（全局唯一，按日期 upsert）
# =============================================================================
# daily_picks v3 表结构：
#   pick_date DATE UNIQUE  — 每天只有一条
#   daily_word_id TEXT     — 词条文本（dictionary_full.word）
#   daily_sentence_id BIGINT — 句子 ID（sentences.id）
#
# upsert on_conflict="pick_date"：
#   如果今天已有记录 → UPDATE
#   如果今天没有记录 → INSERT

def upsert_daily_pick(client, pick_date, word_id, sentence_id):
    """
    写入（或更新）今天的每日推荐记录。
    参数：
      client:      Supabase 客户端
      pick_date:   日期字符串，如 "2026-06-15"
      word_id:     词条文本（dictionary_full 的 word 字段）
      sentence_id: 句子 ID（sentences 表的 id 主键）
    返回：True（成功）或 False（失败）
    """
    row = {
        "pick_date": pick_date,
        "daily_word_id": word_id,
        "daily_sentence_id": sentence_id,
    }
    try:
        resp = (
            client.table("daily_picks")
            .upsert(row, on_conflict="pick_date")  # 按日期冲突检测
            .execute()
        )
        if hasattr(resp, "error") and resp.error:
            log.error(f"  写入失败: {resp.error}")
            return False
        return True
    except Exception as e:
        log.error(f"  写入异常: {e}")
        return False


# =============================================================================
# 主流程
# =============================================================================
def main():
    """
    脚本主入口：
    1. 连接 Supabase
    2. 随机选取一个词条（获取 word 文本）
    3. 随机选取一个句子（获取 id）
    4. 写入 daily_picks 表（upsert by date）
    """
    log.info("=" * 60)
    log.info("每日推荐 Cron v3 — 启动")
    log.info(f"日期: {today_cst().isoformat()}")

    # 步骤 1：连接数据库（Service Role Key 绕过 RLS）
    client = get_supabase_client()

    today_str = today_cst().isoformat()  # 当天日期，如 "2026-06-15"

    # 步骤 2：随机选取词条，只取 word 文本
    word_id = fetch_random_word_id(client)

    # 步骤 3：随机选取句子，只取 id
    sentence_id = fetch_random_sentence_id(client)

    # 如果两者都获取失败，终止执行
    if not word_id and not sentence_id:
        log.error("词条和句子均获取失败，终止执行。")
        sys.exit(1)

    # 步骤 4：写入 daily_picks 表（全局一条，按日期 upsert）
    ok = upsert_daily_pick(client, today_str, word_id, sentence_id)

    if ok:
        log.info(f"完成: 每日推荐已保存，日期 {today_str}")
        log.info(f"  word_id: {word_id or '(none)'}")
        log.info(f"  sentence_id: {sentence_id or '(none)'}")
    else:
        log.error("保存每日推荐失败。")
        sys.exit(1)

    log.info("=" * 60)


if __name__ == "__main__":
    main()
