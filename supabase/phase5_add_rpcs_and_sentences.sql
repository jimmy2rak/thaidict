-- Phase 5: 新增 RPC 函数 + 句子数据库
-- 在 Supabase Dashboard → SQL Editor 中运行此文件

-- ========== 1. 搜索 RPC 函数 ==========

-- 中文模糊搜索：在 senses JSONB 数组中搜索 meaning 字段
CREATE OR REPLACE FUNCTION search_words_zh(search_term TEXT, max_results INT DEFAULT 20)
RETURNS SETOF dictionary_full
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT df.*
  FROM dictionary_full df
  WHERE EXISTS (
    SELECT 1
    FROM jsonb_array_elements(df.senses) AS sense
    WHERE sense->>'meaning' ILIKE '%' || search_term || '%'
  )
  ORDER BY df.sense_count DESC NULLS LAST
  LIMIT max_results;
END;
$$;

GRANT EXECUTE ON FUNCTION search_words_zh(TEXT, INT) TO anon;
GRANT EXECUTE ON FUNCTION search_words_zh(TEXT, INT) TO authenticated;

-- 随机获取一个已富化的词条（用于每日一词）
CREATE OR REPLACE FUNCTION get_random_word()
RETURNS SETOF dictionary_full
LANGUAGE sql STABLE AS $$
  SELECT * FROM dictionary_full
  WHERE enrichment_status = 'enriched' AND sense_count > 0
  ORDER BY RANDOM()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_random_word() TO anon;
GRANT EXECUTE ON FUNCTION get_random_word() TO authenticated;

-- ========== 2. 句子数据库 ==========

CREATE TABLE IF NOT EXISTS sentences (
  id BIGSERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('idioms', 'buddhist', 'daily')),
  literal_meaning TEXT DEFAULT '',
  actual_meaning TEXT DEFAULT '',
  learner_tip TEXT DEFAULT '',
  source TEXT DEFAULT '',
  difficulty INT DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  tags TEXT[] DEFAULT '{}',
  segmented JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sentences_category ON sentences(category);
CREATE INDEX IF NOT EXISTS idx_sentences_difficulty ON sentences(difficulty);

ALTER TABLE sentences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_anon_select_sentences" ON sentences FOR SELECT USING (true);
CREATE POLICY "allow_anon_insert_sentences" ON sentences FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_anon_update_sentences" ON sentences FOR UPDATE USING (true);

-- ========== 3. 句子收藏表 ==========

CREATE TABLE IF NOT EXISTS user_sentence_bookmarks (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  sentence_id BIGINT NOT NULL REFERENCES sentences(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, sentence_id)
);

CREATE INDEX IF NOT EXISTS idx_sentence_bm_user ON user_sentence_bookmarks(user_id);

ALTER TABLE user_sentence_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_select_sentence_bm" ON user_sentence_bookmarks FOR SELECT USING (true);
CREATE POLICY "allow_insert_sentence_bm" ON user_sentence_bookmarks FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_delete_sentence_bm" ON user_sentence_bookmarks FOR DELETE USING (true);

-- ========== 4. 随机句子 RPC ==========

CREATE OR REPLACE FUNCTION get_random_sentence(cat TEXT DEFAULT NULL)
RETURNS SETOF sentences
LANGUAGE sql STABLE AS $$
  SELECT * FROM sentences
  WHERE (cat IS NULL OR category = cat)
  ORDER BY RANDOM()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_random_sentence(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_random_sentence(TEXT) TO authenticated;
