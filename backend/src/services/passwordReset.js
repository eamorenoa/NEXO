const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
// bcrypt only considers the first 72 UTF-8 bytes of a password.
const MAX_BCRYPT_PASSWORD_BYTES = 72;

export function validatePassword(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return {
      code: 'INVALID_PASSWORD',
      message: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    };
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    return {
      code: 'INVALID_PASSWORD',
      message: `La contraseña no puede superar ${MAX_PASSWORD_LENGTH} caracteres.`,
    };
  }

  if (Buffer.byteLength(password, 'utf8') > MAX_BCRYPT_PASSWORD_BYTES) {
    return {
      code: 'INVALID_PASSWORD',
      message: `La contraseña no puede superar ${MAX_BCRYPT_PASSWORD_BYTES} bytes UTF-8 por compatibilidad con bcrypt.`,
    };
  }

  return null;
}

function response(status, message, code) {
  return { status, body: { ok: false, message, code } };
}

/**
 * Completes password reset atomically: consumes the reset code, updates the
 * password hash, and revokes every active refresh token for that user.
 * Dependencies are injected to keep this flow testable without a real DB.
 */
export async function completePasswordReset({
  pool,
  email,
  code,
  newPassword,
  hashPassword,
  hashVerificationCode,
  maxAttempts = 5,
}) {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const normalizedCode = typeof code === 'string' ? code.trim() : '';
  const password = typeof newPassword === 'string' ? newPassword : '';

  if (!normalizedEmail || !/^\d{6}$/.test(normalizedCode)) {
    return response(
      400,
      'Correo, código y nueva contraseña son obligatorios.',
      'INVALID_RESET_DATA',
    );
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return response(400, passwordError.message, passwordError.code);
  }

  const client = await pool.connect();
  let transactionStarted = false;

  const finish = async (result, commit = false) => {
    if (transactionStarted) {
      await client.query(commit ? 'COMMIT' : 'ROLLBACK');
      transactionStarted = false;
    }
    return result;
  };

  try {
    await client.query('BEGIN');
    transactionStarted = true;

    // Lock the user row so concurrent reset attempts for the same account serialize.
    const { rows: userRows } = await client.query(
      `SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1 FOR UPDATE`,
      [normalizedEmail],
    );
    const user = userRows[0];

    if (!user) {
      return await finish(
        response(400, 'Código de recuperación no válido.', 'INVALID_RESET_CODE'),
      );
    }

    const { rows: codeRows } = await client.query(
      `
        SELECT id, code_hash, attempts, expires_at
        FROM password_reset_codes
        WHERE user_id = $1 AND used_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE
      `,
      [user.id],
    );
    const resetCode = codeRows[0];

    if (!resetCode) {
      return await finish(
        response(400, 'No existe un código de recuperación activo.', 'NO_ACTIVE_RESET_CODE'),
      );
    }

    if (new Date(resetCode.expires_at).getTime() <= Date.now()) {
      await client.query(
        'UPDATE password_reset_codes SET used_at = NOW() WHERE id = $1',
        [resetCode.id],
      );
      return await finish(
        response(400, 'El código de recuperación ha expirado.', 'RESET_CODE_EXPIRED'),
        true,
      );
    }

    if (resetCode.attempts >= maxAttempts) {
      await client.query(
        'UPDATE password_reset_codes SET used_at = NOW() WHERE id = $1',
        [resetCode.id],
      );
      return await finish(
        response(
          429,
          'Se superó el número máximo de intentos. Solicite un nuevo código.',
          'TOO_MANY_RESET_ATTEMPTS',
        ),
        true,
      );
    }

    const submittedHash = hashVerificationCode(normalizedCode);
    if (submittedHash !== resetCode.code_hash) {
      await client.query(
        'UPDATE password_reset_codes SET attempts = attempts + 1 WHERE id = $1',
        [resetCode.id],
      );
      return await finish(
        response(400, 'Código de recuperación incorrecto.', 'INVALID_RESET_CODE'),
        true,
      );
    }

    const passwordHash = await hashPassword(password);

    await client.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [passwordHash, user.id],
    );

    // Consume any active reset code for this user, not only the selected row.
    await client.query(
      'UPDATE password_reset_codes SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
      [user.id],
    );

    // Revoke refresh sessions atomically with the password update.
    await client.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
      [user.id],
    );

    return await finish({
      status: 200,
      body: { ok: true, message: 'Contraseña actualizada correctamente.' },
    }, true);
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Preserve the original database or hashing error.
      }
      transactionStarted = false;
    }
    throw error;
  } finally {
    client.release();
  }
}
