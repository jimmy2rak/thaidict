#!/usr/bin/env python3
"""
泰语词典 - AI 批量导入句子脚本
用法:
  pip install supabase requests
  export SUPABASE_URL="https://zvemahqskgluhirzbcqu.supabase.co"
  export SUPABASE_KEY="your-service-role-key"
  export SYSTEM_AI_API_KEY="your-api-key"
  export SYSTEM_AI_BASE_URL="https://api.openai.com/v1"  # 或 DeepSeek 等
  export SYSTEM_AI_MODEL="gpt-4o"  # 或 deepseek-chat 等
  python import_sentences.py
"""

import os
import re
import json
import time
import requests
from supabase import create_client

# ─── 配置 ───
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]  # service_role key
AI_API_KEY = os.environ["SYSTEM_AI_API_KEY"]
AI_BASE_URL = os.environ.get("SYSTEM_AI_BASE_URL", "https://api.openai.com/v1")
AI_MODEL = os.environ.get("SYSTEM_AI_MODEL", "gpt-4o")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ─── 分类定义 ───
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

SYSTEM_PROMPT = """你是一个泰语-中文词典编纂专家和泰语教学专家。请生成高质量的泰语学习句子数据。
所有泰语文本必须使用正确的泰语 Unicode 字符，确保准确无误。
请严格以 JSON 数组格式返回，不要添加任何额外文本。"""

USER_PROMPT_TEMPLATE = """请生成 10 条{desc}。

要求：
{extra}
- difficulty 从 1（最简单）到 5（最难）
- tags 为相关标签数组（如场景、主题）
- segmented 为逐词分词数组，每个元素包含 text（泰语词）、pos（词性）、meaning（中文释义）

返回 JSON 数组，每项结构如下：
{{
  "text": "泰语句子",
  "literal_meaning": "字面中文翻译",
  "actual_meaning": "实际含义/中文翻译",
  "learner_tip": "学习者建议（文化背景、使用场景、注意事项等）",
  "difficulty": 1-5,
  "tags": ["标签1", "标签2"],
  "segmented": [
    {{"text": "词语", "pos": "词性", "meaning": "中文"}},
    ...
  ]
}}"""


def call_ai(prompt: str) -> str:
    """Call AI API and return response content."""
    resp = requests.post(
        f"{AI_BASE_URL}/chat/completions",
        headers={
            "Authorization": f"Bearer {AI_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": AI_MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.8,
            "max_tokens": 4000,
        },
        timeout=60,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


def parse_json_response(content: str) -> list:
    """Extract JSON array from AI response."""
    # Try code block first
    match = re.search(r"```(?:json)?\s*([\s\S]*?)```", content)
    json_str = match.group(1).strip() if match else content.strip()

    # If no code block, find array boundaries
    if not match:
        start = json_str.find("[")
        end = json_str.rfind("]")
        if start != -1 and end > start:
            json_str = json_str[start : end + 1]

    # Clean trailing commas
    json_str = re.sub(r",\s*([}\]])", r"\1", json_str)
    return json.loads(json_str)


def import_category(category: str, config: dict, target_count: int = 200):
    """Import sentences for a single category."""
    print(f"\n{'='*50}")
    print(f"导入分类: {category} ({config['desc']})")
    print(f"目标数量: {target_count}")
    print(f"{'='*50}")

    batch_size = 10
    total_batches = target_count // batch_size
    imported = 0

    # Get existing texts to avoid duplicates
    existing = supabase.table("sentences").select("text").eq("category", category).execute()
    existing_texts = {r["text"] for r in existing.data} if existing.data else set()
    print(f"已存在 {len(existing_texts)} 条")

    for batch_num in range(1, total_batches + 1):
        prompt = USER_PROMPT_TEMPLATE.format(
            desc=config["desc"],
            extra=config["extra"],
        )
        if batch_num > 1:
            prompt += f"\n\n这是第 {batch_num} 批（共 {total_batches} 批），请生成与之前不同的句子。"

        try:
            content = call_ai(prompt)
            sentences = parse_json_response(content)
        except Exception as e:
            print(f"  [批次 {batch_num}/{total_batches}] AI 调用失败: {e}")
            time.sleep(2)
            continue

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
                print(f"    插入失败: {text[:20]}... -> {e}")

        imported += new_count
        print(f"  [批次 {batch_num}/{total_batches}] 新增 {new_count} 条 (累计: {imported})")

        # Rate limiting
        time.sleep(1)

    print(f"\n{category} 完成！共导入 {imported} 条")
    return imported


def main():
    print("泰语词典 - AI 句子批量导入工具")
    print(f"目标数据库: {SUPABASE_URL}")
    print(f"AI 模型: {AI_MODEL} @ {AI_BASE_URL}")

    total = 0
    for category, config in CATEGORIES.items():
        count = import_category(category, config, target_count=200)
        total += count

    print(f"\n{'='*50}")
    print(f"全部完成！共导入 {total} 条句子")
    print(f"{'='*50}")


if __name__ == "__main__":
    main()
