CREATE TABLE IF NOT EXISTS password_reset_codes (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    code_hash TEXT NOT NULL,

    attempts INTEGER NOT NULL DEFAULT 0,

    expires_at TIMESTAMPTZ NOT NULL,

    used_at TIMESTAMPTZ NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_codes_user_id
    ON password_reset_codes(user_id);

CREATE INDEX IF NOT EXISTS idx_password_reset_codes_expires_at
    ON password_reset_codes(expires_at);