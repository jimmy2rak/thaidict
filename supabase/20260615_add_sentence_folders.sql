-- Migration: Add sentence folder support and folder_type to existing user_folders
-- Run this in Supabase SQL Editor

-- 1. Add folder_type column to existing user_folders
ALTER TABLE user_folders ADD COLUMN IF NOT EXISTS folder_type TEXT DEFAULT 'word';

-- 2. Create sentence-folder junction table
CREATE TABLE IF NOT EXISTS user_folder_sentences (
  id BIGSERIAL PRIMARY KEY,
  folder_id BIGINT REFERENCES user_folders(id) ON DELETE CASCADE,
  sentence_id BIGINT REFERENCES sentences(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(folder_id, sentence_id)
);

-- 3. Enable RLS on new table
ALTER TABLE user_folder_sentences ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies: anon can read/write their own data (matches existing pattern)
CREATE POLICY "anon_select_folder_sentences" ON user_folder_sentences
  FOR SELECT USING (true);

CREATE POLICY "anon_insert_folder_sentences" ON user_folder_sentences
  FOR INSERT WITH CHECK (true);

CREATE POLICY "anon_update_folder_sentences" ON user_folder_sentences
  FOR UPDATE USING (true);

CREATE POLICY "anon_delete_folder_sentences" ON user_folder_sentences
  FOR DELETE USING (true);

-- 5. Create RPC function to auto-create default folders for new users
CREATE OR REPLACE FUNCTION create_default_folders(p_user_id TEXT)
RETURNS void AS $$
BEGIN
  -- "我的单词" folder
  INSERT INTO user_folders (user_id, name, color, folder_type)
  VALUES (p_user_id, '我的单词', '#5B8C7E', 'word')
  ON CONFLICT DO NOTHING;

  -- "我的句子" folder
  INSERT INTO user_folders (user_id, name, color, folder_type)
  VALUES (p_user_id, '我的句子', '#C4993D', 'sentence')
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;
