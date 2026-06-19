-- Add last_folder_id to user_settings for remembering the last used bookmark folder
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS last_folder_id BIGINT;
