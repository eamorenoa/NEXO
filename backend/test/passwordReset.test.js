import test from 'node:test';
import assert from 'node:assert/strict';
import { completePasswordReset, validatePassword } from '../src/services/passwordReset.js';

class FakePool {
  constructor({ user = { id: 7 }, resetCode = null, failOn = null } = {}) {
    this.user = user;
    this.resetCode = resetCode ?? {
      id: 9,
      code_hash: 'hash-123456',
      attempts: 0,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    };
    this.failOn = failOn;
    this.calls = [];
    this.connected = false;
    this.released = false;
  }

  async connect() {
    this.connected = true;
    const pool = this;
    return {
      async query(sql, params = []) {
        const normalized = sql.replace(/\s+/g, ' ').trim();
        pool.calls.push({ sql: normalized, params });
        if (pool.failOn && normalized.includes(pool.failOn)) {
          throw new Error('simulated database failure');
        }
        if (normalized === 'SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1 FOR UPDATE') {
          return { rows: pool.user ? [pool.user] : [] };
        }
        if (normalized.includes('FROM password_reset_codes') && normalized.includes('SELECT')) {
          return { rows: pool.resetCode ? [pool.resetCode] : [] };
        }
        return { rows: [] };
      },
      release() { pool.released = true; },
    };
  }
}

const validInput = (pool, overrides = {}) => ({
  pool,
  email: ' USER@EXAMPLE.COM ',
  code: '123456',
  newPassword: 'A-secure-password-123',
  hashPassword: async (password) => `bcrypt:${password}`,
  hashVerificationCode: (code) => `hash-${code}`,
  maxAttempts: 5,
  ...overrides,
});

test('validates minimum password length', () => {
  assert.equal(validatePassword('1234567').code, 'INVALID_PASSWORD');
  assert.equal(validatePassword('12345678'), null);
});

test('enforces the character limit before the bcrypt byte limit', () => {
  assert.match(validatePassword('a'.repeat(129)).message, /128 caracteres/);
  assert.match(validatePassword('a'.repeat(128)).message, /bytes UTF-8/);
});

test('rejects passwords exceeding bcrypt UTF-8 byte limit', () => {
  assert.equal(validatePassword('a'.repeat(73)).code, 'INVALID_PASSWORD');
  assert.equal(validatePassword('á'.repeat(37)).code, 'INVALID_PASSWORD');
});

test('rejects invalid password before connecting to database', async () => {
  const pool = new FakePool();
  const result = await completePasswordReset(validInput(pool, { newPassword: 'short' }));
  assert.equal(result.status, 400);
  assert.equal(result.body.code, 'INVALID_PASSWORD');
  assert.equal(pool.connected, false);
});

test('successful reset atomically updates password, consumes codes and revokes refresh tokens', async () => {
  const pool = new FakePool();
  const result = await completePasswordReset(validInput(pool));
  assert.equal(result.status, 200);
  assert.equal(pool.calls[0].sql, 'BEGIN');
  assert.ok(pool.calls.some((call) => call.sql.includes('UPDATE users SET password_hash')));
  assert.ok(pool.calls.some((call) => call.sql.includes('UPDATE password_reset_codes SET used_at = NOW() WHERE user_id')));
  assert.ok(pool.calls.some((call) => call.sql.includes('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id')));
  assert.equal(pool.calls.at(-1).sql, 'COMMIT');
  assert.equal(pool.released, true);
});

test('incorrect code increments attempts and does not change password or revoke sessions', async () => {
  const pool = new FakePool();
  const result = await completePasswordReset(validInput(pool, { code: '654321' }));
  assert.equal(result.status, 400);
  assert.equal(result.body.code, 'INVALID_RESET_CODE');
  assert.ok(pool.calls.some((call) => call.sql.includes('attempts = attempts + 1')));
  assert.ok(!pool.calls.some((call) => call.sql.includes('UPDATE users SET password_hash')));
  assert.ok(!pool.calls.some((call) => call.sql.includes('UPDATE refresh_tokens')));
  assert.equal(pool.calls.at(-1).sql, 'COMMIT');
});

test('database failure rolls back and releases connection', async () => {
  const pool = new FakePool({ failOn: 'UPDATE refresh_tokens' });
  await assert.rejects(() => completePasswordReset(validInput(pool)), /simulated database failure/);
  assert.ok(pool.calls.some((call) => call.sql === 'ROLLBACK'));
  assert.equal(pool.released, true);
});


test('expired reset code is consumed without changing password or sessions', async () => {
  const pool = new FakePool({ resetCode: {
    id: 9,
    code_hash: 'hash-123456',
    attempts: 0,
    expires_at: new Date(Date.now() - 60_000).toISOString(),
  } });
  const result = await completePasswordReset(validInput(pool));
  assert.equal(result.status, 400);
  assert.equal(result.body.code, 'RESET_CODE_EXPIRED');
  assert.ok(pool.calls.some((call) => call.sql.includes('UPDATE password_reset_codes SET used_at = NOW() WHERE id')));
  assert.ok(!pool.calls.some((call) => call.sql.includes('UPDATE users SET password_hash')));
  assert.ok(!pool.calls.some((call) => call.sql.includes('UPDATE refresh_tokens')));
  assert.equal(pool.calls.at(-1).sql, 'COMMIT');
});

test('reset code at the attempt limit is consumed', async () => {
  const pool = new FakePool({ resetCode: {
    id: 9,
    code_hash: 'hash-123456',
    attempts: 5,
    expires_at: new Date(Date.now() + 60_000).toISOString(),
  } });
  const result = await completePasswordReset(validInput(pool));
  assert.equal(result.status, 429);
  assert.equal(result.body.code, 'TOO_MANY_RESET_ATTEMPTS');
  assert.ok(pool.calls.some((call) => call.sql.includes('UPDATE password_reset_codes SET used_at = NOW() WHERE id')));
  assert.ok(!pool.calls.some((call) => call.sql.includes('UPDATE users SET password_hash')));
});

test('unknown account does not update password or revoke tokens', async () => {
  const pool = new FakePool({ user: null });
  const result = await completePasswordReset(validInput(pool));
  assert.equal(result.status, 400);
  assert.equal(result.body.code, 'INVALID_RESET_CODE');
  assert.ok(!pool.calls.some((call) => call.sql.includes('UPDATE users SET password_hash')));
  assert.ok(!pool.calls.some((call) => call.sql.includes('UPDATE refresh_tokens')));
  assert.equal(pool.calls.at(-1).sql, 'ROLLBACK');
});
