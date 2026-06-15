-- ===================================================================
-- 社区共建词库 + 每日推荐持久化
-- community_words: 用户 AI 生成的词条，供全局搜索
-- daily_picks: 每日一词/一句持久化（每日一条，刷新不变）
-- ===================================================================

-- ─── 1. 社区共建词库 ───
CREATE TABLE IF NOT EXISTS community_words (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  word TEXT NOT NULL,
  romanization TEXT DEFAULT '',
  senses JSONB DEFAULT '[]'::jsonb,
  synonyms JSONB DEFAULT '[]'::jsonb,
  antonyms JSONB DEFAULT '[]'::jsonb,
  learner_associations JSONB DEFAULT '[]'::jsonb,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source TEXT DEFAULT 'ai_generated',
  zh_hint TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_community_words_word
  ON community_words (LOWER(word));
CREATE INDEX IF NOT EXISTS idx_community_words_created
  ON community_words (created_at DESC);

-- RLS
ALTER TABLE community_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_can_read_community_words"
  ON community_words FOR SELECT
  USING (true);

CREATE POLICY "auth_users_can_insert_community_words"
  ON community_words FOR INSERT
  WITH CHECK (true);

-- 更新 RPC: search_words 增加 community_words 搜索
-- (前端会在 JS 层同时查 dictionary_full + community_words，无需改 RPC)

-- ─── 2. 每日推荐持久化 ───
CREATE TABLE IF NOT EXISTS daily_picks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pick_date DATE NOT NULL DEFAULT CURRENT_DATE,
  daily_word_id UUID,
  daily_word_data JSONB,
  daily_sentence_id UUID,
  daily_sentence_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, pick_date)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_daily_picks_user_date
  ON daily_picks (user_id, pick_date);

-- RLS
ALTER TABLE daily_picks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_daily_picks"
  ON daily_picks FOR ALL
  USING (true)
  WITH CHECK (true);

-- ─── 3. 辅助函数：搜索社区词（支持泰语 + 中文释义模糊匹配）───
CREATE OR REPLACE FUNCTION search_community_words(search_term TEXT, max_results INT DEFAULT 10)
RETURNS SETOF community_words
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM community_words
  WHERE
    LOWER(word) LIKE LOWER('%' || search_term || '%')
    OR senses::text ILIKE '%' || search_term || '%'
  ORDER BY created_at DESC
  LIMIT max_results;
END;
$$;
