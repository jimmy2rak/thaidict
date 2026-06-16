-- Migration: Add sentence folder support — RE-RUN SAFE VERSION
-- Only executes parts that haven't been applied yet

-- 1. Add folder_type column (IF NOT EXISTS — safe to re-run)
ALTER TABLE user_folders ADD COLUMN IF NOT EXISTS folder_type TEXT DEFAULT 'word';

-- 2. Create sentence-folder junction table (IF NOT EXISTS — safe)
CREATE TABLE IF NOT EXISTS user_folder_sentences (
  id BIGSERIAL PRIMARY KEY,
  folder_id BIGINT REFERENCES user_folders(id) ON DELETE CASCADE,
  sentence_id BIGINT REFERENCES sentences(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(folder_id, sentence_id)
);

-- 3. Enable RLS (safe — no error if already enabled)
ALTER TABLE user_folder_sentences ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies — use IF NOT EXISTS to avoid "already exists" error
-- (Drop and re-create is safest for Supabase SQL Editor)
DO $$ BEGIN
  -- Drop existing policies if they exist, then recreate
  DROP POLICY IF EXISTS "anon_select_folder_sentences" ON user_folder_sentences;
  DROP POLICY IF EXISTS "anon_insert_folder_sentences" ON user_folder_sentences;
  DROP POLICY IF EXISTS "anon_update_folder_sentences" ON user_folder_sentences;
  DROP POLICY IF EXISTS "anon_delete_folder_sentences" ON user_folder_sentences;
END $$;

CREATE POLICY "anon_select_folder_sentences" ON user_folder_sentences
  FOR SELECT USING (true);

CREATE POLICY "anon_insert_folder_sentences" ON user_folder_sentences
  FOR INSERT WITH CHECK (true);

CREATE POLICY "anon_update_folder_sentences" ON user_folder_sentences
  FOR UPDATE USING (true);

CREATE POLICY "anon_delete_folder_sentences" ON user_folder_sentences
  FOR DELETE USING (true);

-- 5. Create RPC function (CREATE OR REPLACE — safe to re-run)
CREATE OR REPLACE FUNCTION create_default_folders(p_user_id TEXT)
RETURNS void AS $$
BEGIN
  INSERT INTO user_folders (user_id, name, color, folder_type)
  VALUES (p_user_id, '我的单词', '#5B8C7E', 'word')
  ON CONFLICT DO NOTHING;

  INSERT INTO user_folders (user_id, name, color, folder_type)
  VALUES (p_user_id, '我的句子', '#C4993D', 'sentence')
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;
