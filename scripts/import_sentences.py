#!/usr/bin/env python3
"""
泰语词典 - AI 批量导入句子脚本 (DeepSeek-V4-Flash 优化版)

针对 DeepSeek-V4-Flash (1M context / 384K output) 优化：
  - BATCH_SIZE=100 — 每批 100 条，600 条仅需 6 次请求
  - MAX_TOKENS=128000 — 充分利用 384K 输出上限
  - 请求失败时自动缩小到 50% 重试，不浪费当前批

云端首次运行:
  pip install supabase requests
  export SUPABASE_URL="https://zvemahqskgluhirzbcqu.supabase.co"
  export SUPABASE_KEY="<service_role_key>"
  export SYSTEM_AI_API_KEY="<deepseek_key>"
  export SYSTEM_AI_BASE_URL="https://api.deepseek.com/v1"
  export SYSTEM_AI_MODEL="deepseek-chat"       # DeepSeek-V4
  python scripts/import_sentences.py

用法:
  python import_sentences.py                    # 全部分类 (600条 ≈ 6次请求)
  python import_sentences.py -c daily           # 只导入日常用语
  python import_sentences.py -t 100             # 每分类 100 条
  python import_sentences.py --resume           # 断点续传

可选环境变量:
  BATCH_SIZE=80   BATCH_DELAY=2   MAX_TOKENS=128000   MAX_RETRIES=3
"""

import os, re, sys, json, time, random, argparse, logging
from pathlib import Path
from datetime import datetime, timezone, timedelta

CST = timezone(timedelta(hours=8))

import requests
from supabase import create_client

# ─── 日志 ───
LOG_DIR = Path(__file__).parent / "logs"
LOG_DIR.mkdir(exist_ok=True)
LOG_FILE = LOG_DIR / f"import_{datetime.now(CST).strftime('%Y%m%d_%H%M%S')}.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger(__name__)

# ─── 配置 ───
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
AI_API_KEY  = os.environ.get("SYSTEM_AI_API_KEY", "")
AI_BASE_URL = os.environ.get("SYSTEM_AI_BASE_URL", "https://api.deepseek.com/v1")
AI_MODEL    = os.environ.get("SYSTEM_AI_MODEL", "deepseek-chat")

BATCH_SIZE  = int(os.environ.get("BATCH_SIZE", "100"))    # 每批 100 条 → 600 条仅 6 次请求
BATCH_DELAY = int(os.environ.get("BATCH_DELAY", "2"))     # 请求少，间隔可短
MAX_RETRIES = int(os.environ.get("MAX_RETRIES", "3"))
MAX_TOKENS  = int(os.environ.get("MAX_TOKENS", "128000")) # DeepSeek-V4-Flash 支持 384K 输出

PROGRESS_FILE = Path(__file__).parent / ".import_progress.json"

_missing = [k for k, v in [("SUPABASE_URL", SUPABASE_URL), ("SUPABASE_KEY", SUPABASE_KEY),
             ("SYSTEM_AI_API_KEY", AI_API_KEY)] if not v]
if _missing:
    log.error(f"缺少环境变量: {', '.join(_missing)}")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ─── 分类 ───
CATEGORIES = {
    "idioms": {
        "desc": "Thai idioms (สำนวนสุภาษิต)",
        "extra": "每个俗语必须包含 literal_meaning（字面意思）和 actual_meaning（实际含义/引申义）。",
    },
    "buddhist": {
        "desc": "Thai Buddhist phrases and teachings (พุทธสุภาษิต)",
        "extra": "包含巴利语来源的佛教用语，需提供字面意思和佛法含义。",
    },
    "daily": {
        "desc": "Common daily Thai conversation sentences (ประโยค日常)",
        "extra": "日常生活常用句子，包括问候、购物、交通、餐饮等场景。",
    },
}

SYSTEM_PROMPT = (
    "你是一个泰语-中文词典编纂专家。生成高质量泰语学习句子数据。"
    "泰语使用正确 Unicode 字符。严格返回 JSON 数组，无额外文本。"
)

# ─── 进度 ───
def load_progress() -> dict:
    if PROGRESS_FILE.exists():
        try: return json.loads(PROGRESS_FILE.read_text("utf-8"))
        except: pass
    return {}

def save_progress(p: dict):
    PROGRESS_FILE.write_text(json.dumps(p, ensure_ascii=False, indent=2), "utf-8")

# ─── Prompt ───
def build_prompt(desc: str, extra: str, count: int) -> str:
    return (
        f"生成 {count} 条{desc}。\n\n"
        f"要求：\n{extra}\n"
        "- difficulty 1-5\n"
        "- tags 标签数组\n"
        "- segmented 逐词分词数组\n"
        "- 多样化，不重复\n\n"
        "JSON 数组格式：\n"
        '[{"text":"泰语","literal_meaning":"字面中文","actual_meaning":"实际中文",'
        '"learner_tip":"学习建议","difficulty":2,"tags":["标签"],'
        '"segmented":[{"text":"词","pos":"词性","meaning":"中文"}]}]'
    )

# ─── AI 调用 ───
def call_ai(prompt: str, max_tokens: int = MAX_TOKENS) -> tuple:
    """返回 (content, finish_reason)。finish_reason='length' 表示被截断。"""
    url = f"{AI_BASE_URL}/chat/completions"
    headers = {"Authorization": f"Bearer {AI_API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": AI_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.8,
        "max_tokens": max_tokens,
    }

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=180)

            if resp.status_code == 429:
                wait = max(int(resp.headers.get("Retry-After", 0)), 2 ** attempt + random.uniform(0, 1))
                log.warning(f"限流 429 → 等 {wait:.0f}s ({attempt}/{MAX_RETRIES})")
                time.sleep(wait); continue

            if resp.status_code >= 500:
                wait = 2 ** attempt + random.uniform(0, 1)
                log.warning(f"服务端 {resp.status_code} → 等 {wait:.0f}s ({attempt}/{MAX_RETRIES})")
                time.sleep(wait); continue

            resp.raise_for_status()
            data = resp.json()
            choice = data["choices"][0]
            return choice["message"]["content"], choice.get("finish_reason", "stop")

        except requests.exceptions.Timeout:
            wait = 2 ** attempt
            log.warning(f"超时 → 等 {wait:.0f}s ({attempt}/{MAX_RETRIES})")
            time.sleep(wait)
        except requests.exceptions.RequestException as e:
            if attempt >= MAX_RETRIES: raise
            wait = 2 ** attempt
            log.warning(f"异常 {e} → 等 {wait:.0f}s ({attempt}/{MAX_RETRIES})")
            time.sleep(wait)

    raise RuntimeError(f"AI 调用失败，重试 {MAX_RETRIES} 次")

# ─── JSON 解析 (截断安全) ───

def strip_markdown_fence(content: str) -> str:
    """剥离 markdown code fence，包括完整和不完整的情况。"""
    s = content.strip()
    # 去掉开头的 ```json 或 ```
    s = re.sub(r"^```(?:json|JSON)?\s*\n?", "", s)
    # 去掉结尾的 ```
    s = re.sub(r"\n?```\s*$", "", s)
    return s.strip()

def extract_json_array(s: str) -> str:
    """从文本中提取 JSON 数组部分。"""
    start = s.find("[")
    if start == -1:
        return s
    # 找最外层的 ] —— 从后往前
    end = s.rfind("]")
    if end > start:
        return s[start:end + 1]
    # 没有闭合的 ]，返回从 [ 到末尾
    return s[start:]

def repair_truncated_json(s: str) -> list:
    """修复被截断的 JSON 数组。

    策略：逐个找完整的顶层 {} 对象，用 try-parse 验证。
    对于最后一个不完整的对象，尝试补齐括号 + 修复 dangling key。
    """
    # 先清理 trailing comma
    s = re.sub(r",\s*([}\]])", r"\1", s)

    # 尝试直接解析
    try:
        result = json.loads(s)
        return result if isinstance(result, list) else [result]
    except json.JSONDecodeError:
        pass

    items = []
    i = 0
    # 跳过开头的 [
    if i < len(s) and s[i] == "[":
        i += 1

    while i < len(s):
        # 找下一个 {
        obj_start = s.find("{", i)
        if obj_start == -1:
            break

        # 用括号计数找到匹配的 }（考虑嵌套）
        depth = 0
        j = obj_start
        while j < len(s):
            if s[j] == "{":
                depth += 1
            elif s[j] == "}":
                depth -= 1
                if depth == 0:
                    break
            j += 1

        if depth == 0:
            # 找到完整的 {} 对象
            candidate = s[obj_start:j + 1]
            try:
                obj = json.loads(candidate)
                if isinstance(obj, dict) and "text" in obj:
                    items.append(obj)
            except json.JSONDecodeError:
                pass
            i = j + 1
        else:
            # 最后一个对象被截断了 — 尝试修复
            fragment = s[obj_start:]
            repaired = _repair_partial_object(fragment)
            if repaired:
                items.append(repaired)
            break

    if items:
        log.warning(f"截断修复: 提取 {len(items)} 条完整对象")
        return items
    return []


def _repair_partial_object(fragment: str) -> dict | None:
    """尝试修复一个被截断的 JSON 对象。

    核心策略：从末尾反复剥离不完整片段（dangling key / 截断字符串 / 截断数字），
    直到剩余部分可以补齐括号并成功解析。
    """
    s = fragment

    # 反复剥离末尾不完整片段（最多 10 轮）
    for _ in range(10):
        # 去 dangling key: 末尾的 ,"key": 或 "key": (无值)
        s2 = re.sub(r',?\s*"[^"]*"\s*:\s*$', '', s)
        # 去截断字符串值: ,"key": "partial text (无闭合引号)
        s2 = re.sub(r',\s*"[^"]*"\s*:\s*"[^"]*$', '', s2)
        # 去截断数字: ,"key": 12
        s2 = re.sub(r',\s*"[^"]*"\s*:\s*\d*$', '', s2)
        # 去 trailing comma
        s2 = re.sub(r',\s*$', '', s2)

        if s2 == s:
            break  # 没有更多可剥离的
        s = s2

    # 尝试从后往前找 } 直到能解析
    positions = [i for i, c in enumerate(s) if c == "}"]
    if not positions:
        # 没有完整的 } — 整个对象都被截断了
        # 尝试从顶部直接闭合所有括号
        stack = []
        for c in s:
            if c in "{[":
                stack.append(c)
            elif c in "}]":
                if stack: stack.pop()
        suffix = ""
        for bracket in reversed(stack):
            suffix += "]" if bracket == "[" else "}"
        candidate = s + suffix
        candidate = re.sub(r",\s*([}\]])", r"\1", candidate)
        try:
            obj = json.loads(candidate)
            if isinstance(obj, dict) and "text" in obj:
                log.warning(f"零闭合括号截断修复成功: {obj['text']}")
                return obj
        except json.JSONDecodeError:
            pass

    for pos in reversed(positions):
        candidate = s[:pos + 1]
        # 用栈追踪未闭合的括号，确保闭合顺序正确
        stack = []
        for c in candidate:
            if c in "{[":
                stack.append(c)
            elif c in "}]":
                if stack:
                    stack.pop()
        # 按栈的逆序生成正确的闭合后缀
        suffix = ""
        for bracket in reversed(stack):
            suffix += "]" if bracket == "[" else "}"
        if not suffix:
            continue
        candidate += suffix
        candidate = re.sub(r",\s*([}\]])", r"\1", candidate)
        try:
            obj = json.loads(candidate)
            if isinstance(obj, dict) and "text" in obj:
                return obj
        except json.JSONDecodeError:
            continue

    return None


def parse_response(content: str) -> list:
    """完整解析流程：剥 fence → 提取数组 → 解析 → 截断修复。"""
    # 1) 剥 markdown fence
    s = strip_markdown_fence(content)

    # 2) 提取 JSON 数组
    s = extract_json_array(s)

    # 3) 清理 trailing comma
    s = re.sub(r",\s*([}\]])", r"\1", s)

    # 4) 正常解析
    try:
        result = json.loads(s)
        if isinstance(result, list):
            return result
        return [result] if isinstance(result, dict) else []
    except json.JSONDecodeError:
        pass

    # 5) 截断修复
    result = repair_truncated_json(s)
    if result:
        return result

    log.error(f"JSON 解析彻底失败，原始长度 {len(content)}，前 500 字符:\n{content[:500]}")
    return []

# ─── 单分类导入 ───

def import_category(category: str, config: dict, target_count: int,
                    progress: dict, resume: bool) -> int:
    log.info(f"{'='*50}")
    log.info(f"分类: {category} ({config['desc']})")
    log.info(f"目标: {target_count}  每批: {BATCH_SIZE}  间隔: {BATCH_DELAY}s  tokens: {MAX_TOKENS}")
    log.info(f"{'='*50}")

    cat_progress = progress.get(category, {})
    start_batch = 1
    imported = 0
    if resume and cat_progress.get("status") != "done":
        imported = cat_progress.get("imported", 0)
        start_batch = cat_progress.get("next_batch", 1)
        if start_batch > 1:
            log.info(f"恢复: 批次 {start_batch}，已导入 {imported} 条")

    total_batches = (target_count + BATCH_SIZE - 1) // BATCH_SIZE

    existing = supabase.table("sentences").select("text").eq("category", category).execute()
    existing_texts = {r["text"] for r in existing.data} if existing.data else set()
    log.info(f"已存在 {len(existing_texts)} 条")

    consecutive_fails = 0
    current_batch_size = BATCH_SIZE  # 可动态缩小

    for batch_num in range(start_batch, total_batches + 1):
        if imported >= target_count:
            log.info(f"已达目标 {target_count}")
            break

        remaining = target_count - imported
        batch_count = min(current_batch_size, remaining)
        prompt = build_prompt(config["desc"], config["extra"], batch_count)

        try:
            content, finish_reason = call_ai(prompt)
            sentences = parse_response(content)

            # 截断修复：如果空结果且被截断，立即缩小批次重试（不浪费当前批次）
            if (finish_reason == "length" or not sentences) and batch_count > 1:
                new_size = max(1, batch_count // 2)
                log.warning(f"截断或空结果 (reason={finish_reason}, count={batch_count})"
                            f" → 立即缩小到 {new_size} 条重试")
                current_batch_size = new_size
                # 重新设置批次计数器，重试本批
                prompt = build_prompt(config["desc"], config["extra"], new_size)
                content2, finish_reason2 = call_ai(prompt)
                sentences = parse_response(content2)
                batch_count = new_size
                if not sentences:
                    log.warning(f"缩小后仍空结果 → 跳过本批")
                    continue
            elif not sentences:
                log.warning(f"空结果 (finish_reason={finish_reason}) → 跳过本批")
                continue

            # 成功，逐步恢复批次大小
            if current_batch_size < BATCH_SIZE and finish_reason != "length" and sentences:
                current_batch_size = min(BATCH_SIZE, current_batch_size + 1)

        except Exception as e:
            log.error(f"[批次 {batch_num}/{total_batches}] AI 失败: {e}")
            consecutive_fails += 1
            if consecutive_fails >= 3:
                log.warning(f"连续失败 {consecutive_fails} 批，冷却 60s...")
                time.sleep(60)
                consecutive_fails = 0
            progress[category] = {"imported": imported, "next_batch": batch_num, "status": "running"}
            save_progress(progress)
            continue

        consecutive_fails = 0
        new_count = 0

        for s in sentences:
            text = s.get("text", "").strip()
            if not text or text in existing_texts:
                continue
            row = {
                "text": text,
                "category": category,
                "literal_meaning": s.get("literal_meaning", ""),
                "actual_meaning": s.get("actual_meaning", ""),
                "learner_tip": s.get("learner_tip", ""),
                "difficulty": min(5, max(1, s.get("difficulty", 1))),
                "tags": s.get("tags", []),
                "segmented": json.dumps(s.get("segmented", []), ensure_ascii=False),
            }
            try:
                supabase.table("sentences").insert(row).execute()
                existing_texts.add(text)
                new_count += 1
            except Exception as e:
                log.warning(f"  插入失败: {text[:30]}... → {e}")

        imported += new_count
        log.info(f"[{batch_num}/{total_batches}] +{new_count} 条 (累计 {imported}/{target_count}) "
                 f"[batch_size={current_batch_size}]")

        progress[category] = {"imported": imported, "next_batch": batch_num + 1, "status": "running"}
        save_progress(progress)

        if batch_num < total_batches:
            time.sleep(BATCH_DELAY)

    progress[category] = {"imported": imported, "next_batch": total_batches + 1, "status": "done"}
    save_progress(progress)
    log.info(f"{category} 完成: {imported} 条")
    return imported

# ─── 主入口 ───

def main():
    parser = argparse.ArgumentParser(description="泰语词典 AI 句子批量导入")
    parser.add_argument("-c", "--category", choices=list(CATEGORIES.keys()), help="只导入指定分类")
    parser.add_argument("-t", "--target", type=int, default=200, help="每分类目标数 (默认 200)")
    parser.add_argument("-r", "--resume", action="store_true", help="从上次中断处继续")
    args = parser.parse_args()

    log.info("泰语词典 - AI 句子批量导入 v3")
    log.info(f"DB: {SUPABASE_URL}")
    log.info(f"AI: {AI_MODEL} @ {AI_BASE_URL}")
    log.info(f"参数: batch={BATCH_SIZE} delay={BATCH_DELAY}s tokens={MAX_TOKENS} retries={MAX_RETRIES}")
    log.info(f"日志: {LOG_FILE}")

    cats = {args.category: CATEGORIES[args.category]} if args.category else CATEGORIES
    progress = load_progress() if args.resume else {}

    total = sum(import_category(c, cfg, args.target, progress, args.resume) for c, cfg in cats.items())

    log.info(f"{'='*50}")
    log.info(f"全部完成: {total} 条")
    log.info(f"{'='*50}")


if __name__ == "__main__":
    main()
