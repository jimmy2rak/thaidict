-- ===================================================================
-- 学习打卡任务系统
-- user_checkin_tasks: 用户自定义打卡任务
-- user_checkin_completions: 每日任务完成记录
-- ===================================================================

-- ─── 1. 打卡任务表 ───
CREATE TABLE IF NOT EXISTS user_checkin_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL DEFAULT '自定义',
  task_name TEXT NOT NULL,
  schedule_days JSONB DEFAULT '[1,2,3,4,5]'::jsonb,
  duration_minutes INTEGER DEFAULT 15,
  is_custom BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_checkin_tasks_user
  ON user_checkin_tasks (user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_checkin_tasks_sort
  ON user_checkin_tasks (user_id, sort_order);

-- RLS
ALTER TABLE user_checkin_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_checkin_tasks"
  ON user_checkin_tasks FOR ALL
  USING (true)
  WITH CHECK (true);

-- ─── 2. 打卡完成记录表 ───
CREATE TABLE IF NOT EXISTS user_checkin_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES user_checkin_tasks(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, task_id, completed_date)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_checkin_completions_user_date
  ON user_checkin_completions (user_id, completed_date);

CREATE INDEX IF NOT EXISTS idx_checkin_completions_task_date
  ON user_checkin_completions (task_id, completed_date);

-- RLS
ALTER TABLE user_checkin_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_checkin_completions"
  ON user_checkin_completions FOR ALL
  USING (true)
  WITH CHECK (true);

-- ─── 3. 自动更新 updated_at 触发器 ───
CREATE OR REPLACE FUNCTION update_checkin_tasks_modified()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_checkin_tasks_updated ON user_checkin_tasks;
CREATE TRIGGER trg_checkin_tasks_updated
  BEFORE UPDATE ON user_checkin_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_checkin_tasks_modified();
