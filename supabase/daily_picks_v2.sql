-- ===================================================================
-- 每日推荐表 v2：全局统一推送（不分用户），只存 ID 引用
-- 替换旧版 community_words_and_daily_picks.sql 中的 daily_picks 定义
-- 
-- 设计原则：
--   1. 不区分用户 —— 所有用户看到相同的每日一词/一句
--   2. 只存 ID —— daily_word_id 指向 dictionary_full.word（自然键）
--                    daily_sentence_id 指向 sentences.id（主键）
--   3. 详情通过 JOIN 查询获取，避免数据冗余
-- ===================================================================

-- 删除旧表（如果存在）
DROP TABLE IF EXISTS daily_picks CASCADE;

-- 创建新版 daily_picks 表
CREATE TABLE IF NOT EXISTS daily_picks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,          -- 主键
  pick_date DATE NOT NULL DEFAULT CURRENT_DATE,           -- 日期（每天一条）
  daily_word_id TEXT,                                      -- 词条引用：dictionary_full.word 或 community_words.word
  daily_sentence_id BIGINT,                                -- 句子引用：sentences.id
  created_at TIMESTAMPTZ DEFAULT now(),                   -- 创建时间
  updated_at TIMESTAMPTZ DEFAULT now(),                   -- 更新时间
  UNIQUE(pick_date)                                        -- 每天全局只有一条推荐
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_daily_picks_date
  ON daily_picks (pick_date);

-- RLS：所有人可读（全局公开推荐）
ALTER TABLE daily_picks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_can_read_daily_picks"
  ON daily_picks FOR SELECT
  USING (true);

-- 只有 service_role（定时任务）可以写入/更新
CREATE POLICY "service_can_manage_daily_picks"
  ON daily_picks FOR ALL
  USING (true)
  WITH CHECK (true);
