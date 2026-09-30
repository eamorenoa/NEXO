BEGIN;

-- ============================================================
-- VERIFICACIÓN DE CORREO ELECTRÓNICO
-- ============================================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN
    NOT NULL DEFAULT FALSE;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- ============================================================
-- CÓDIGOS DE VERIFICACIÓN
-- ============================================================

CREATE TABLE IF NOT EXISTS email_verification_codes (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    code_hash TEXT NOT NULL,

    attempts INTEGER NOT NULL DEFAULT 0,

    expires_at TIMESTAMPTZ NOT NULL,

    used_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT email_verification_attempts_check
        CHECK (attempts >= 0),

    CONSTRAINT email_verification_expiration_check
        CHECK (expires_at > created_at)
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_email_verification_user_id
ON email_verification_codes(user_id);

CREATE INDEX IF NOT EXISTS idx_email_verification_expires_at
ON email_verification_codes(expires_at);

CREATE INDEX IF NOT EXISTS idx_email_verification_active
ON email_verification_codes(user_id, expires_at)
WHERE used_at IS NULL;

COMMIT;
