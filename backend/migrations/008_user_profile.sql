BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS bio VARCHAR(500),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(30),
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS avatar_data BYTEA,
  ADD COLUMN IF NOT EXISTS avatar_mime_type VARCHAR(30);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_avatar_mime_type_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_avatar_mime_type_check
      CHECK (avatar_mime_type IS NULL OR avatar_mime_type IN ('image/jpeg', 'image/png', 'image/webp'));
  END IF;
END
$$;

COMMIT;
