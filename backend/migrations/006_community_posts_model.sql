BEGIN;

-- Modelo inicial de publicaciones comunitarias de NEXO.
-- Conserva las columnas y los registros existentes.

ALTER TABLE community_posts
    ADD COLUMN IF NOT EXISTS post_type VARCHAR(30)
        NOT NULL DEFAULT 'activity',
    ADD COLUMN IF NOT EXISTS title VARCHAR(150),
    ADD COLUMN IF NOT EXISTS category VARCHAR(60),
    ADD COLUMN IF NOT EXISTS status VARCHAR(20)
        NOT NULL DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW();

-- Restricción para los tipos de publicación.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'community_posts_type_check'
          AND conrelid = 'community_posts'::regclass
    ) THEN
        ALTER TABLE community_posts
            ADD CONSTRAINT community_posts_type_check
            CHECK (
                post_type IN (
                    'need',
                    'offer',
                    'donation',
                    'sale',
                    'promotion',
                    'service',
                    'job',
                    'activity',
                    'exchange'
                )
            );
    END IF;
END
$$;

-- Restricción para los estados de publicación.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'community_posts_status_check'
          AND conrelid = 'community_posts'::regclass
    ) THEN
        ALTER TABLE community_posts
            ADD CONSTRAINT community_posts_status_check
            CHECK (
                status IN (
                    'active',
                    'paused',
                    'closed',
                    'removed'
                )
            );
    END IF;
END
$$;

-- Índices para consultas por tipo, estado y fecha.
CREATE INDEX IF NOT EXISTS idx_community_posts_type_created
    ON community_posts(post_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_posts_status_created
    ON community_posts(status, created_at DESC);

COMMIT;
