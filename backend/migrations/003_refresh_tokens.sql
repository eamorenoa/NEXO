BEGIN;

-- =========================================================
-- 003 - REFRESH TOKENS
-- NEXO
-- =========================================================

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    token_hash TEXT NOT NULL UNIQUE,

    device_name VARCHAR(120),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    expires_at TIMESTAMPTZ NOT NULL,

    last_used_at TIMESTAMPTZ,

    revoked_at TIMESTAMPTZ,

    CONSTRAINT refresh_tokens_expiration_check
        CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
ON refresh_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at
ON refresh_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_active
ON refresh_tokens(user_id, expires_at)
WHERE revoked_at IS NULL;

COMMIT;
