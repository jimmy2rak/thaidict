-- ========================================
-- RLS 安全升级: TEXT → UUID + JWT-based RLS
-- 在 Supabase Dashboard → SQL Editor 中运行
-- 日期: 2026-06-15
-- ========================================
-- ⚠️ 注意: 此脚本会删除所有现有用户数据（Clerk 旧 ID 无法转为 UUID）
-- 如果你已有重要数据，请先备份！

BEGIN;

-- ========== 1. 清除旧数据 (Clerk TEXT IDs) ==========
TRUNCATE user_bookmarks, user_recent_words, user_folder_words, user_folders,
           user_learning_plans, user_learning_progress, user_notes,
           user_settings, user_sentence_bookmarks;

-- 如果存在 user_api_keys 表也清除
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_api_keys') THEN
    EXECUTE 'TRUNCATE user_api_keys';
  END IF;
END $$;

-- ========== 2. user_id 列 TEXT → UUID ==========
ALTER TABLE user_bookmarks ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE user_recent_words ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE user_folders ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE user_learning_plans ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE user_learning_progress ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE user_notes ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE user_settings ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE user_sentence_bookmarks ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

-- user_api_keys (如果存在)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_api_keys' AND column_name = 'user_id') THEN
    EXECUTE 'ALTER TABLE user_api_keys ALTER COLUMN user_id TYPE UUID USING user_id::uuid';
  END IF;
END $$;

-- ========== 3. 删除旧 anon RLS 策略 ==========

-- user_bookmarks
DROP POLICY IF EXISTS "allow_anon_select_bookmarks" ON user_bookmarks;
DROP POLICY IF EXISTS "allow_anon_insert_bookmarks" ON user_bookmarks;
DROP POLICY IF EXISTS "allow_anon_update_bookmarks" ON user_bookmarks;
DROP POLICY IF EXISTS "allow_anon_delete_bookmarks" ON user_bookmarks;

-- user_recent_words
DROP POLICY IF EXISTS "allow_anon_select_recent" ON user_recent_words;
DROP POLICY IF EXISTS "allow_anon_insert_recent" ON user_recent_words;
DROP POLICY IF EXISTS "allow_anon_update_recent" ON user_recent_words;
DROP POLICY IF EXISTS "allow_anon_delete_recent" ON user_recent_words;

-- user_folders
DROP POLICY IF EXISTS "allow_anon_select_folders" ON user_folders;
DROP POLICY IF EXISTS "allow_anon_insert_folders" ON user_folders;
DROP POLICY IF EXISTS "allow_anon_update_folders" ON user_folders;
DROP POLICY IF EXISTS "allow_anon_delete_folders" ON user_folders;

-- user_folder_words
DROP POLICY IF EXISTS "allow_anon_select_folder_words" ON user_folder_words;
DROP POLICY IF EXISTS "allow_anon_insert_folder_words" ON user_folder_words;
DROP POLICY IF EXISTS "allow_anon_update_folder_words" ON user_folder_words;
DROP POLICY IF EXISTS "allow_anon_delete_folder_words" ON user_folder_words;

-- user_learning_plans
DROP POLICY IF EXISTS "allow_anon_select_plans" ON user_learning_plans;
DROP POLICY IF EXISTS "allow_anon_insert_plans" ON user_learning_plans;
DROP POLICY IF EXISTS "allow_anon_update_plans" ON user_learning_plans;

-- user_learning_progress
DROP POLICY IF EXISTS "allow_anon_select_progress" ON user_learning_progress;
DROP POLICY IF EXISTS "allow_anon_insert_progress" ON user_learning_progress;
DROP POLICY IF EXISTS "allow_anon_update_progress" ON user_learning_progress;

-- user_notes
DROP POLICY IF EXISTS "allow_anon_select_notes" ON user_notes;
DROP POLICY IF EXISTS "allow_anon_insert_notes" ON user_notes;
DROP POLICY IF EXISTS "allow_anon_update_notes" ON user_notes;
DROP POLICY IF EXISTS "allow_anon_delete_notes" ON user_notes;

-- user_settings
DROP POLICY IF EXISTS "allow_anon_select_settings" ON user_settings;
DROP POLICY IF EXISTS "allow_anon_insert_settings" ON user_settings;
DROP POLICY IF EXISTS "allow_anon_update_settings" ON user_settings;

-- user_sentence_bookmarks
DROP POLICY IF EXISTS "allow_select_sentence_bm" ON user_sentence_bookmarks;
DROP POLICY IF EXISTS "allow_insert_sentence_bm" ON user_sentence_bookmarks;
DROP POLICY IF EXISTS "allow_delete_sentence_bm" ON user_sentence_bookmarks;

-- user_api_keys
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_api_keys') THEN
    EXECUTE 'DROP POLICY IF EXISTS "allow_anon_select_api_keys" ON user_api_keys';
    EXECUTE 'DROP POLICY IF EXISTS "allow_anon_insert_api_keys" ON user_api_keys';
    EXECUTE 'DROP POLICY IF EXISTS "allow_anon_delete_api_keys" ON user_api_keys';
  END IF;
END $$;

-- ========== 4. 创建 JWT-based RLS 策略 ==========

-- ── user_bookmarks ──
CREATE POLICY "user_select_bookmarks" ON user_bookmarks
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_insert_bookmarks" ON user_bookmarks
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_delete_bookmarks" ON user_bookmarks
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ── user_recent_words ──
CREATE POLICY "user_select_recent" ON user_recent_words
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_insert_recent" ON user_recent_words
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_update_recent" ON user_recent_words
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- ── user_folders ──
CREATE POLICY "user_select_folders" ON user_folders
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_insert_folders" ON user_folders
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_update_folders" ON user_folders
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_delete_folders" ON user_folders
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ── user_folder_words (通过 folder 归属验证) ──
CREATE POLICY "user_select_folder_words" ON user_folder_words
  FOR SELECT TO authenticated
  USING (folder_id IN (SELECT id FROM user_folders WHERE user_id = auth.uid()));
CREATE POLICY "user_insert_folder_words" ON user_folder_words
  FOR INSERT TO authenticated
  WITH CHECK (folder_id IN (SELECT id FROM user_folders WHERE user_id = auth.uid()));
CREATE POLICY "user_delete_folder_words" ON user_folder_words
  FOR DELETE TO authenticated
  USING (folder_id IN (SELECT id FROM user_folders WHERE user_id = auth.uid()));

-- ── user_learning_plans ──
CREATE POLICY "user_select_plans" ON user_learning_plans
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_insert_plans" ON user_learning_plans
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_update_plans" ON user_learning_plans
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- ── user_learning_progress ──
CREATE POLICY "user_select_progress" ON user_learning_progress
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_insert_progress" ON user_learning_progress
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_update_progress" ON user_learning_progress
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- ── user_notes ──
CREATE POLICY "user_select_notes" ON user_notes
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_insert_notes" ON user_notes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_update_notes" ON user_notes
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_delete_notes" ON user_notes
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ── user_settings ──
CREATE POLICY "user_select_settings" ON user_settings
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_insert_settings" ON user_settings
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_update_settings" ON user_settings
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- ── user_sentence_bookmarks ──
CREATE POLICY "user_select_sentence_bm" ON user_sentence_bookmarks
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_insert_sentence_bm" ON user_sentence_bookmarks
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_delete_sentence_bm" ON user_sentence_bookmarks
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ── user_api_keys (如果存在) ──
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_api_keys') THEN
    EXECUTE 'ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY';
    EXECUTE 'CREATE POLICY "user_select_api_keys" ON user_api_keys FOR SELECT TO authenticated USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "user_insert_api_keys" ON user_api_keys FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "user_delete_api_keys" ON user_api_keys FOR DELETE TO authenticated USING (user_id = auth.uid())';
  END IF;
END $$;

-- ========== 5. 公共表保持开放读取 ==========
-- dictionary_full: anon 可读 (公开词典数据)
-- sentences: anon 可读 (公开句子数据)
-- system_config: service_role only (已有)
-- user_submissions: 需要单独的 policy

COMMIT;
