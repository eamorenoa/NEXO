BEGIN;

-- Ubicación opcional para las necesidades existentes.
ALTER TABLE needs
    ADD COLUMN IF NOT EXISTS address VARCHAR(250),
    ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7),
    ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);

-- Información adicional para las publicaciones comunitarias.
ALTER TABLE community_posts
    ADD COLUMN IF NOT EXISTS address VARCHAR(250),
    ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7),
    ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);

-- Facilita consultar publicaciones con ubicación.
CREATE INDEX IF NOT EXISTS idx_needs_location
    ON needs(latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_community_posts_location
    ON community_posts(latitude, longitude);

COMMIT;
