-- ========================================
-- User Data Tables for ThaiDict (word-book)
-- Migration: create_user_data_tables
-- Date: 2026-06-14
-- ========================================

-- 1. user_bookmarks - saved/bookmarked words
CREATE TABLE IF NOT EXISTS user_bookmarks (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  word TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, word)
);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON user_bookmarks(user_id);

-- 2. user_recent_words - recently looked-up words
CREATE TABLE IF NOT EXISTS user_recent_words (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  word TEXT NOT NULL,
  looked_up_at TIMESTAMPTZ DEFAULT NOW(),
  lookup_count INT DEFAULT 1,
  UNIQUE(user_id, word)
);
CREATE INDEX IF NOT EXISTS idx_recent_user ON user_recent_words(user_id);
CREATE INDEX IF NOT EXISTS idx_recent_user_time ON user_recent_words(user_id, looked_up_at DESC);

-- 3. user_folders - custom word folders
CREATE TABLE IF NOT EXISTS user_folders (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#5B8C7E',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_folders_user ON user_folders(user_id);

-- 4. user_folder_words - words in folders (join table)
CREATE TABLE IF NOT EXISTS user_folder_words (
  id BIGSERIAL PRIMARY KEY,
  folder_id BIGINT NOT NULL REFERENCES user_folders(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(folder_id, word)
);
CREATE INDEX IF NOT EXISTS idx_folder_words_folder ON user_folder_words(folder_id);

-- 5. user_learning_plans - learning plan settings
CREATE TABLE IF NOT EXISTS user_learning_plans (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  goals JSONB DEFAULT '{"words": 30, "grammar": 20, "reading": 5}',
  schedule JSONB DEFAULT '{"times": {"words": "30", "grammar": "30", "reading": "30"}, "active_days": [true, true, false, true, true, false, true]}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. user_learning_progress - daily learning progress/streaks
CREATE TABLE IF NOT EXISTS user_learning_progress (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  words_learned INT DEFAULT 0,
  words_reviewed INT DEFAULT 0,
  grammar_completed INT DEFAULT 0,
  reading_completed INT DEFAULT 0,
  study_minutes INT DEFAULT 0,
  streak_days INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);
CREATE INDEX IF NOT EXISTS idx_progress_user_date ON user_learning_progress(user_id, date DESC);

-- 7. user_notes - learning notes
CREATE TABLE IF NOT EXISTS user_notes (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  color TEXT DEFAULT '#5B7E9E',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notes_user ON user_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_date ON user_notes(user_id, created_at DESC);

-- 8. user_settings - app settings
CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY,
  dict_direction TEXT DEFAULT 'zh-th',
  color_mode TEXT DEFAULT 'light',
  language TEXT DEFAULT 'zh',
  reminder_enabled BOOLEAN DEFAULT true,
  playback_speed TEXT DEFAULT '1.0x',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- Enable RLS on all new tables
-- ========================================
ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_recent_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_folder_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_learning_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- ========================================
-- RLS Policies (anon access, filtered by user_id in app code)
-- Clerk-JWT-based RLS to be added in a future iteration
-- ========================================
CREATE POLICY "allow_anon_select_bookmarks" ON user_bookmarks FOR SELECT USING (true);
CREATE POLICY "allow_anon_insert_bookmarks" ON user_bookmarks FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_anon_update_bookmarks" ON user_bookmarks FOR UPDATE USING (true);
CREATE POLICY "allow_anon_delete_bookmarks" ON user_bookmarks FOR DELETE USING (true);

CREATE POLICY "allow_anon_select_recent" ON user_recent_words FOR SELECT USING (true);
CREATE POLICY "allow_anon_insert_recent" ON user_recent_words FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_anon_update_recent" ON user_recent_words FOR UPDATE USING (true);
CREATE POLICY "allow_anon_delete_recent" ON user_recent_words FOR DELETE USING (true);

CREATE POLICY "allow_anon_select_folders" ON user_folders FOR SELECT USING (true);
CREATE POLICY "allow_anon_insert_folders" ON user_folders FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_anon_update_folders" ON user_folders FOR UPDATE USING (true);
CREATE POLICY "allow_anon_delete_folders" ON user_folders FOR DELETE USING (true);

CREATE POLICY "allow_anon_select_folder_words" ON user_folder_words FOR SELECT USING (true);
CREATE POLICY "allow_anon_insert_folder_words" ON user_folder_words FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_anon_update_folder_words" ON user_folder_words FOR UPDATE USING (true);
CREATE POLICY "allow_anon_delete_folder_words" ON user_folder_words FOR DELETE USING (true);

CREATE POLICY "allow_anon_select_plans" ON user_learning_plans FOR SELECT USING (true);
CREATE POLICY "allow_anon_insert_plans" ON user_learning_plans FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_anon_update_plans" ON user_learning_plans FOR UPDATE USING (true);

CREATE POLICY "allow_anon_select_progress" ON user_learning_progress FOR SELECT USING (true);
CREATE POLICY "allow_anon_insert_progress" ON user_learning_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_anon_update_progress" ON user_learning_progress FOR UPDATE USING (true);

CREATE POLICY "allow_anon_select_notes" ON user_notes FOR SELECT USING (true);
CREATE POLICY "allow_anon_insert_notes" ON user_notes FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_anon_update_notes" ON user_notes FOR UPDATE USING (true);
CREATE POLICY "allow_anon_delete_notes" ON user_notes FOR DELETE USING (true);

CREATE POLICY "allow_anon_select_settings" ON user_settings FOR SELECT USING (true);
CREATE POLICY "allow_anon_insert_settings" ON user_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_anon_update_settings" ON user_settings FOR UPDATE USING (true);
