import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import crypto from 'node:crypto';

import { classifyNeed } from './services/classifyNeed.js';
import { askAI, classifyWithAI } from './services/ai.js';
import {
    sendVerificationEmail,
    sendPasswordResetEmail,
} from './services/email.js';

const { Pool } = pg;

const app = express();

const PORT = Number(process.env.PORT || 3000);
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET;

const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_DAYS = 30;
const VERIFICATION_CODE_MINUTES = 10;
const VERIFICATION_MAX_ATTEMPTS = 5;
const VERIFICATION_RESEND_SECONDS = 60;

const PASSWORD_RESET_CODE_MINUTES = 10;
const PASSWORD_RESET_MAX_ATTEMPTS = 5;
const PASSWORD_RESET_RESEND_SECONDS = 60;

const loginRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        ok: false,
        message:
            'Demasiados intentos de inicio de sesión. Espere unos minutos antes de volver a intentarlo.',
        code: 'LOGIN_RATE_LIMITED',
    },
});

const recoveryRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        ok: false,
        message:
            'Demasiadas solicitudes de recuperación. Espere unos minutos antes de volver a intentarlo.',
        code: 'RECOVERY_RATE_LIMITED',
    },
});

const verificationRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        ok: false,
        message:
            'Demasiadas solicitudes de verificación. Espere unos minutos antes de volver a intentarlo.',
        code: 'VERIFICATION_RATE_LIMITED',
    },
});

if (!DATABASE_URL) {
    console.error('ERROR: DATABASE_URL no está configurada.');
    process.exit(1);
}

if (!JWT_SECRET || JWT_SECRET.length < 32) {
    console.error(
        'ERROR: JWT_SECRET debe estar configurado y tener al menos 32 caracteres.'
    );
    process.exit(1);
}

const pool = new Pool({
    connectionString: DATABASE_URL,
});

/*
|--------------------------------------------------------------------------
| CONFIGURACIÓN GENERAL
|--------------------------------------------------------------------------
*/

app.use(
    cors({
        origin: true,
        credentials: true,
    })
);

app.use(
    express.json({
        limit: '100kb',
    })
);

/*
|--------------------------------------------------------------------------
| FUNCIONES DE TOKENS
|--------------------------------------------------------------------------
*/

function createAccessToken(user) {
    return jwt.sign(
        {
            id: String(user.id),
            name: user.name,
            email: user.email,
            role: user.role,
        },
        JWT_SECRET,
        {
            expiresIn: ACCESS_TOKEN_EXPIRES_IN,
            issuer: 'nexo-api',
            audience: 'nexo-mobile',
        }
    );
}

function generateRefreshToken() {
    return crypto.randomBytes(64).toString('base64url');
}

function hashRefreshToken(token) {
    return crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
}

function getRefreshExpirationDate() {
    const expiresAt = new Date();

    expiresAt.setDate(
        expiresAt.getDate() + REFRESH_TOKEN_DAYS
    );

    return expiresAt;
}

function generateVerificationCode() {
    return String(
        crypto.randomInt(100000, 1000000)
    );
}

function hashVerificationCode(code) {
    return crypto
        .createHash('sha256')
        .update(code)
        .digest('hex');
}

function getVerificationExpirationDate() {
    const expiresAt = new Date();

    expiresAt.setMinutes(
        expiresAt.getMinutes() +
        VERIFICATION_CODE_MINUTES
    );

    return expiresAt;
}

async function createEmailVerificationCode(userId) {
    /*
     * Invalida códigos anteriores que todavía
     * estén activos.
     */
    await pool.query(
        `
        UPDATE email_verification_codes
        SET used_at = NOW()
        WHERE user_id = $1
          AND used_at IS NULL
        `,
        [userId]
    );

    const code =
        generateVerificationCode();

    const codeHash =
        hashVerificationCode(code);

    const expiresAt =
        getVerificationExpirationDate();

    await pool.query(
        `
        INSERT INTO email_verification_codes (
            user_id,
            code_hash,
            expires_at
        )
        VALUES ($1, $2, $3)
        `,
        [
            userId,
            codeHash,
            expiresAt,
        ]
    );

    return code;
}

function getPasswordResetExpirationDate() {
    const expiresAt = new Date();

    expiresAt.setMinutes(
        expiresAt.getMinutes() +
        PASSWORD_RESET_CODE_MINUTES
    );

    return expiresAt;
}


async function createPasswordResetCode(userId) {

    // Invalida códigos anteriores activos
    await pool.query(
        `
        UPDATE password_reset_codes
        SET used_at = NOW()
        WHERE user_id = $1
          AND used_at IS NULL
        `,
        [userId]
    );


    const code =
        generateVerificationCode();


    const codeHash =
        hashVerificationCode(code);


    const expiresAt =
        getPasswordResetExpirationDate();


    await pool.query(
        `
        INSERT INTO password_reset_codes (
            user_id,
            code_hash,
            expires_at
        )
        VALUES ($1, $2, $3)
        `,
        [
            userId,
            codeHash,
            expiresAt
        ]
    );


    return code;
}

async function createRefreshSession(userId, deviceName = null) {
    const refreshToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(refreshToken);
    const expiresAt = getRefreshExpirationDate();

    await pool.query(
        `
        INSERT INTO refresh_tokens (
            user_id,
            token_hash,
            device_name,
            expires_at
        )
        VALUES ($1, $2, $3, $4)
        `,
        [
            userId,
            tokenHash,
            deviceName,
            expiresAt,
        ]
    );

    return refreshToken;
}

function normalizeBearerToken(header) {
    if (!header) {
        return null;
    }

    if (!header.startsWith('Bearer ')) {
        return null;
    }

    return header.substring(7).trim();
}

/*
|--------------------------------------------------------------------------
| AUTENTICACIÓN
|--------------------------------------------------------------------------
*/

const auth = async (req, res, next) => {
    try {
        const token = normalizeBearerToken(
            req.headers.authorization
        );

        if (!token) {
            return res.status(401).json({
                message: 'Token requerido',
                code: 'TOKEN_REQUIRED',
            });
        }

        const decoded = jwt.verify(
            token,
            JWT_SECRET,
            {
                issuer: 'nexo-api',
                audience: 'nexo-mobile',
            }
        );

        const userId = Number(decoded.id);

        if (!Number.isInteger(userId)) {
            return res.status(401).json({
                message: 'Token no válido',
                code: 'INVALID_TOKEN',
            });
        }

        const { rows } = await pool.query(
            `
            SELECT
                id,
                name,
                email,
                role,
                active
            FROM users
            WHERE id = $1
            LIMIT 1
            `,
            [userId]
        );

        const user = rows[0];

        if (!user) {
            return res.status(401).json({
                message: 'Usuario no encontrado',
                code: 'USER_NOT_FOUND',
            });
        }

        if (!user.active) {
            return res.status(403).json({
                message: 'La cuenta está desactivada',
                code: 'USER_INACTIVE',
            });
        }

        req.user = {
            id: String(user.id),
            name: user.name,
            email: user.email,
            role: user.role,
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                message: 'El token ha expirado',
                code: 'TOKEN_EXPIRED',
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                message: 'Sesión no válida',
                code: 'INVALID_TOKEN',
            });
        }

        next(error);
    }
};

/*
|--------------------------------------------------------------------------
| AUTORIZACIÓN POR PERMISOS
|--------------------------------------------------------------------------
*/

function requirePermission(permissionCode) {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    message: 'Autenticación requerida',
                    code: 'AUTH_REQUIRED',
                });
            }

            const { rows } = await pool.query(
                `
                SELECT EXISTS (
                    SELECT 1
                    FROM role_permissions rp
                    INNER JOIN roles r
                        ON r.id = rp.role_id
                    INNER JOIN permissions p
                        ON p.id = rp.permission_id
                    WHERE r.name = $1
                      AND p.code = $2
                ) AS allowed
                `,
                [
                    req.user.role,
                    permissionCode,
                ]
            );

            if (!rows[0]?.allowed) {
                return res.status(403).json({
                    message:
                        'No tiene permisos para realizar esta acción',
                    code: 'FORBIDDEN',
                    permission: permissionCode,
                });
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

/*
|--------------------------------------------------------------------------
| HEALTH
|--------------------------------------------------------------------------
*/

app.get('/api/health', async (_req, res) => {
    try {
        await pool.query('SELECT 1');

        res.json({
            ok: true,
            service: 'NEXO API',
            database: 'up',
            ai: Boolean(process.env.OPENAI_API_KEY),
        });
    } catch {
        res.status(503).json({
            ok: false,
            service: 'NEXO API',
            database: 'down',
        });
    }
});




/*
|-------------------------------------------------------------------------
| EDPOINTS DE AUTENTICACIÓN
|-------------------------------------------------------------------------
*/
app.post(
    '/api/auth/forgot-password',
    recoveryRateLimit,
    async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || typeof email !== 'string') {
            return res.status(400).json({
                ok: false,
                message: 'El correo electrónico es obligatorio.',
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const result = await pool.query(
            `
            SELECT id, email, name
            FROM users
            WHERE LOWER(email) = $1
            LIMIT 1
            `,
            [normalizedEmail]
        );

        if (result.rowCount === 0) {
            return res.json({
                ok: true,
                message:
                    'Si el correo está registrado, recibirá un código de recuperación.',
            });
        }

        const user = result.rows[0];

        const code = await createPasswordResetCode(user.id);

        await sendPasswordResetEmail(
            user.email,
            user.name,
            code
        );

        return res.json({
            ok: true,
            message:
                'Si el correo está registrado, recibirá un código de recuperación.',
        });
    } catch (error) {
        console.error(
            'Error en forgot-password:',
            error
        );

        return res.status(500).json({
            ok: false,
            message:
                'No fue posible procesar la solicitud.',
        });
    }
});

/*
|--------------------------------------------------------------------------
| EDPOINTS DE RECUPERACION DE CONTRASEÑA
|-------------------------------------------------------------------------
*/
app.post(
    '/api/auth/reset-password',
    recoveryRateLimit,
    async (req, res, next) => {
    try {
        const email = String(
            req.body.email || ''
        )
            .trim()
            .toLowerCase();

        const code = String(
            req.body.code || ''
        ).trim();

        const newPassword = String(
            req.body.newPassword || ''
        );

        if (
            !email ||
            !/^\d{6}$/.test(code) ||
            !newPassword
        ) {
            return res.status(400).json({
                message:
                    'Correo, código y nueva contraseña son obligatorios.',
                code: 'INVALID_RESET_DATA',
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                message:
                    'La nueva contraseña debe tener al menos 8 caracteres.',
                code: 'INVALID_PASSWORD',
            });
        }

        const { rows: userRows } =
            await pool.query(
                `
                SELECT id
                FROM users
                WHERE LOWER(email) = LOWER($1)
                LIMIT 1
                `,
                [email]
            );

        const user = userRows[0];

        if (!user) {
            return res.status(400).json({
                message:
                    'Código de recuperación no válido.',
                code: 'INVALID_RESET_CODE',
            });
        }

        const { rows: codeRows } =
            await pool.query(
                `
                SELECT
                    id,
                    code_hash,
                    attempts,
                    expires_at
                FROM password_reset_codes
                WHERE user_id = $1
                  AND used_at IS NULL
                ORDER BY created_at DESC
                LIMIT 1
                `,
                [user.id]
            );

        const resetCode = codeRows[0];

        if (!resetCode) {
            return res.status(400).json({
                message:
                    'No existe un código de recuperación activo.',
                code: 'NO_ACTIVE_RESET_CODE',
            });
        }

        if (
            new Date(
                resetCode.expires_at
            ).getTime() <= Date.now()
        ) {
            await pool.query(
                `
                UPDATE password_reset_codes
                SET used_at = NOW()
                WHERE id = $1
                `,
                [resetCode.id]
            );

            return res.status(400).json({
                message:
                    'El código de recuperación ha expirado.',
                code: 'RESET_CODE_EXPIRED',
            });
        }

        if (
            resetCode.attempts >=
            PASSWORD_RESET_MAX_ATTEMPTS
        ) {
            await pool.query(
                `
                UPDATE password_reset_codes
                SET used_at = NOW()
                WHERE id = $1
                `,
                [resetCode.id]
            );

            return res.status(429).json({
                message:
                    'Se superó el número máximo de intentos. Solicite un nuevo código.',
                code: 'TOO_MANY_RESET_ATTEMPTS',
            });
        }

        const submittedHash =
            hashVerificationCode(code);

        if (
            submittedHash !==
            resetCode.code_hash
        ) {
            await pool.query(
                `
                UPDATE password_reset_codes
                SET attempts = attempts + 1
                WHERE id = $1
                `,
                [resetCode.id]
            );

            return res.status(400).json({
                message:
                    'Código de recuperación incorrecto.',
                code: 'INVALID_RESET_CODE',
            });
        }

        const passwordHash =
            await bcrypt.hash(
                newPassword,
                12
            );

        await pool.query(
            `
            UPDATE users
            SET password_hash = $1
            WHERE id = $2
            `,
            [
                passwordHash,
                user.id,
            ]
        );

        await pool.query(
            `
            UPDATE password_reset_codes
            SET used_at = NOW()
            WHERE id = $1
            `,
            [resetCode.id]
        );

        return res.json({
            ok: true,
            message:
                'Contraseña actualizada correctamente.',
        });
    } catch (error) {
        next(error);
    }
});
/*
|--------------------------------------------------------------------------
| AUTH - REGISTER
|--------------------------------------------------------------------------
*/

app.post('/api/auth/register', async (req, res, next) => {
    try {
        const name = String(
            req.body.name || ''
        ).trim();

        const email = String(
            req.body.email || ''
        )
            .trim()
            .toLowerCase();

        const password = String(
            req.body.password || ''
        );

        if (name.length < 3) {
            return res.status(400).json({
                message:
                    'El nombre debe tener al menos 3 caracteres',
                code: 'INVALID_NAME',
            });
        }

        if (
            !email.includes('@') ||
            email.length > 150
        ) {
            return res.status(400).json({
                message:
                    'Correo electrónico inválido',
                code: 'INVALID_EMAIL',
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message:
                    'La contraseña debe tener al menos 8 caracteres',
                code: 'INVALID_PASSWORD',
            });
        }

        const hash = await bcrypt.hash(
            password,
            12
        );

        const { rows } = await pool.query(
            `
            INSERT INTO users (
                name,
                email,
                password_hash,
                role
            )
            VALUES ($1, $2, $3, 'citizen')
            RETURNING id, name, email, role
            `,
            [
                name,
                email,
                hash,
            ]
        );

        const user = rows[0];

        const verificationCode =
            await createEmailVerificationCode(
                user.id
            );

        let emailSent = false;

        try {
            await sendVerificationEmail({
                to: user.email,
                name: user.name,
                code: verificationCode,
            });

            emailSent = true;
        } catch (emailError) {
            console.error(
                'No se pudo enviar el correo de verificación:',
                emailError
            );
        }

        res.status(201).json({
            message:
                'Cuenta creada. Verifique su correo electrónico.',
            verificationRequired: true,
            emailSent,
            user: {
                id: String(user.id),
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({
                message:
                    'El correo ya está registrado',
                code: 'EMAIL_ALREADY_EXISTS',
            });
        }

        next(error);
    }
});

/*
|--------------------------------------------------------------------------
| AUTH - VERIFY EMAIL
|--------------------------------------------------------------------------
*/

app.post(
    '/api/auth/verify-email',
    verificationRateLimit,
    async (req, res, next) => {
        try {
            const email = String(
                req.body.email || ''
            )
                .trim()
                .toLowerCase();

            const code = String(
                req.body.code || ''
            ).trim();

            if (!email || !/^\d{6}$/.test(code)) {
                return res.status(400).json({
                    message:
                        'Correo y código de 6 dígitos son obligatorios.',
                    code: 'INVALID_VERIFICATION_DATA',
                });
            }

            const { rows: userRows } =
                await pool.query(
                    `
                    SELECT
                        id,
                        name,
                        email,
                        email_verified
                    FROM users
                    WHERE LOWER(email) = LOWER($1)
                    LIMIT 1
                    `,
                    [email]
                );

            const user = userRows[0];

            if (!user) {
                return res.status(400).json({
                    message:
                        'Código de verificación no válido.',
                    code: 'INVALID_VERIFICATION_CODE',
                });
            }

            if (user.email_verified) {
                return res.json({
                    ok: true,
                    message:
                        'El correo ya está verificado.',
                    alreadyVerified: true,
                });
            }

            const { rows: codeRows } =
                await pool.query(
                    `
                    SELECT
                        id,
                        code_hash,
                        attempts,
                        expires_at
                    FROM email_verification_codes
                    WHERE user_id = $1
                      AND used_at IS NULL
                    ORDER BY created_at DESC
                    LIMIT 1
                    `,
                    [user.id]
                );

            const verification =
                codeRows[0];

            if (!verification) {
                return res.status(400).json({
                    message:
                        'No existe un código de verificación activo.',
                    code: 'NO_ACTIVE_CODE',
                });
            }

            if (
                new Date(
                    verification.expires_at
                ).getTime() <= Date.now()
            ) {
                await pool.query(
                    `
                    UPDATE email_verification_codes
                    SET used_at = NOW()
                    WHERE id = $1
                    `,
                    [verification.id]
                );

                return res.status(400).json({
                    message:
                        'El código de verificación ha expirado.',
                    code: 'VERIFICATION_CODE_EXPIRED',
                });
            }

            if (
                verification.attempts >=
                VERIFICATION_MAX_ATTEMPTS
            ) {
                await pool.query(
                    `
                    UPDATE email_verification_codes
                    SET used_at = NOW()
                    WHERE id = $1
                    `,
                    [verification.id]
                );

                return res.status(429).json({
                    message:
                        'Se superó el número máximo de intentos. Solicite un nuevo código.',
                    code: 'TOO_MANY_ATTEMPTS',
                });
            }

            const submittedHash =
                hashVerificationCode(code);

            if (
                submittedHash !==
                verification.code_hash
            ) {
                await pool.query(
                    `
                    UPDATE email_verification_codes
                    SET attempts = attempts + 1
                    WHERE id = $1
                    `,
                    [verification.id]
                );

                return res.status(400).json({
                    message:
                        'Código de verificación incorrecto.',
                    code: 'INVALID_VERIFICATION_CODE',
                });
            }

            await pool.query(
                `
                UPDATE users
                SET
                    email_verified = TRUE,
                    email_verified_at = NOW()
                WHERE id = $1
                `,
                [user.id]
            );

            await pool.query(
                `
                UPDATE email_verification_codes
                SET
                    used_at = NOW()
                WHERE id = $1
                `,
                [verification.id]
            );

            res.json({
                ok: true,
                message:
                    'Correo electrónico verificado correctamente.',
            });
        } catch (error) {
            next(error);
        }
    }
);

/*
|--------------------------------------------------------------------------
| AUTH - RESEND VERIFICATION
|--------------------------------------------------------------------------
*/

app.post(
    '/api/auth/resend-verification',
    verificationRateLimit,
    async (req, res, next) => {
        try {
            const email = String(
                req.body.email || ''
            )
                .trim()
                .toLowerCase();

            if (!email) {
                return res.status(400).json({
                    message:
                        'El correo es obligatorio.',
                    code: 'EMAIL_REQUIRED',
                });
            }

            const { rows } =
                await pool.query(
                    `
                    SELECT
                        id,
                        name,
                        email,
                        email_verified
                    FROM users
                    WHERE LOWER(email) = LOWER($1)
                    LIMIT 1
                    `,
                    [email]
                );

            const user = rows[0];

            /*
             * Respuesta genérica para no revelar
             * si el correo existe.
             */
            if (!user || user.email_verified) {
                return res.json({
                    ok: true,
                    message:
                        'Si la cuenta requiere verificación, se enviará un nuevo código.',
                });
            }

            const { rows: recentRows } =
                await pool.query(
                    `
                    SELECT created_at
                    FROM email_verification_codes
                    WHERE user_id = $1
                    ORDER BY created_at DESC
                    LIMIT 1
                    `,
                    [user.id]
                );

            const recentCode =
                recentRows[0];

            if (
                recentCode &&
                Date.now() -
                new Date(
                    recentCode.created_at
                ).getTime() <
                VERIFICATION_RESEND_SECONDS *
                1000
            ) {
                return res.status(429).json({
                    message:
                        'Espere un momento antes de solicitar otro código.',
                    code: 'RESEND_TOO_SOON',
                });
            }

            const verificationCode =
                await createEmailVerificationCode(
                    user.id
                );

            await sendVerificationEmail({
                to: user.email,
                name: user.name,
                code: verificationCode,
            });

            res.json({
                ok: true,
                message:
                    'Si la cuenta requiere verificación, se envió un nuevo código.',
            });
        } catch (error) {
            next(error);
        }
    }
);

/*
|--------------------------------------------------------------------------
| AUTH - LOGIN
|--------------------------------------------------------------------------
*/

app.post(
    '/api/auth/login',
    loginRateLimit,
    async (req, res, next) => {
    try {
        const email = String(
            req.body.email || ''
        )
            .trim()
            .toLowerCase();

        const password = String(
            req.body.password || ''
        );

        if (!email || !password) {
            return res.status(400).json({
                message:
                    'Correo y contraseña son obligatorios',
                code: 'MISSING_CREDENTIALS',
            });
        }

        const { rows } = await pool.query(
            `
            SELECT
                id,
                name,
                email,
                password_hash,
                role,
                active,
                email_verified
            FROM users
            WHERE LOWER(email) = LOWER($1)
            LIMIT 1
            `,
            [email]
        );

        const user = rows[0];

        if (!user) {
            return res.status(401).json({
                message:
                    'Credenciales incorrectas',
                code: 'INVALID_CREDENTIALS',
            });
        }

        const passwordValid =
            await bcrypt.compare(
                password,
                user.password_hash
            );

        if (!passwordValid) {
            return res.status(401).json({
                message:
                    'Credenciales incorrectas',
                code: 'INVALID_CREDENTIALS',
            });
        }

        if (!user.active) {
            return res.status(403).json({
                message:
                    'La cuenta está desactivada',
                code: 'USER_INACTIVE',
            });
        }

        if (!user.email_verified) {
            return res.status(403).json({
                message:
                    'Debe verificar su correo electrónico antes de iniciar sesión.',
                code: 'EMAIL_NOT_VERIFIED',
                requiresVerification: true,
                email: user.email,
            });
        }

        const payload = {
            id: String(user.id),
            name: user.name,
            email: user.email,
            role: user.role,
        };

        const accessToken =
            createAccessToken(payload);

        const deviceName = String(
            req.body.deviceName ||
            'NEXO Mobile'
        ).slice(0, 120);

        const refreshToken =
            await createRefreshSession(
                user.id,
                deviceName
            );

        res.json({
            accessToken,
            refreshToken,
            expiresIn: 900,
            user: payload,
        });
    } catch (error) {
        next(error);
    }
});

/*
|--------------------------------------------------------------------------
| AUTH - REFRESH
|--------------------------------------------------------------------------
*/

app.post('/api/auth/refresh', async (req, res, next) => {
    const client = await pool.connect();

    try {
        const refreshToken = String(
            req.body.refreshToken || ''
        ).trim();

        if (!refreshToken) {
            return res.status(400).json({
                message:
                    'Refresh token requerido',
                code: 'REFRESH_TOKEN_REQUIRED',
            });
        }

        const tokenHash =
            hashRefreshToken(refreshToken);

        await client.query('BEGIN');

        const { rows } = await client.query(
            `
            SELECT
                rt.id AS refresh_token_id,
                rt.user_id,
                rt.device_name,
                rt.expires_at,
                rt.revoked_at,
                u.id,
                u.name,
                u.email,
                u.role,
                u.active
            FROM refresh_tokens rt
            INNER JOIN users u
                ON u.id = rt.user_id
            WHERE rt.token_hash = $1
            FOR UPDATE
            `,
            [tokenHash]
        );

        const session = rows[0];

        if (!session) {
            await client.query('ROLLBACK');

            return res.status(401).json({
                message:
                    'Refresh token no válido',
                code: 'INVALID_REFRESH_TOKEN',
            });
        }

        if (session.revoked_at) {
            await client.query('ROLLBACK');

            return res.status(401).json({
                message:
                    'La sesión fue revocada',
                code: 'REFRESH_TOKEN_REVOKED',
            });
        }

        if (
            new Date(session.expires_at).getTime() <=
            Date.now()
        ) {
            await client.query(
                `
                UPDATE refresh_tokens
                SET revoked_at = NOW()
                WHERE id = $1
                `,
                [session.refresh_token_id]
            );

            await client.query('COMMIT');

            return res.status(401).json({
                message:
                    'La sesión ha expirado',
                code: 'REFRESH_TOKEN_EXPIRED',
            });
        }

        if (!session.active) {
            await client.query(
                `
                UPDATE refresh_tokens
                SET revoked_at = NOW()
                WHERE id = $1
                `,
                [session.refresh_token_id]
            );

            await client.query('COMMIT');

            return res.status(403).json({
                message:
                    'La cuenta está desactivada',
                code: 'USER_INACTIVE',
            });
        }

        /*
         * Rotación del refresh token.
         */

        await client.query(
            `
            UPDATE refresh_tokens
            SET
                revoked_at = NOW(),
                last_used_at = NOW()
            WHERE id = $1
            `,
            [session.refresh_token_id]
        );

        const newRefreshToken =
            generateRefreshToken();

        const newTokenHash =
            hashRefreshToken(
                newRefreshToken
            );

        const expiresAt =
            getRefreshExpirationDate();

        await client.query(
            `
            INSERT INTO refresh_tokens (
                user_id,
                token_hash,
                device_name,
                expires_at
            )
            VALUES ($1, $2, $3, $4)
            `,
            [
                session.user_id,
                newTokenHash,
                session.device_name,
                expiresAt,
            ]
        );

        const user = {
            id: String(session.user_id),
            name: session.name,
            email: session.email,
            role: session.role,
        };

        const accessToken =
            createAccessToken(user);

        await client.query('COMMIT');

        res.json({
            accessToken,
            refreshToken:
                newRefreshToken,
            expiresIn: 900,
        });
    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch {
            // Ignorar error secundario.
        }

        next(error);
    } finally {
        client.release();
    }
});

/*
|--------------------------------------------------------------------------
| AUTH - LOGOUT
|--------------------------------------------------------------------------
*/

app.post('/api/auth/logout', async (req, res, next) => {
    try {
        const refreshToken = String(
            req.body.refreshToken || ''
        ).trim();

        if (!refreshToken) {
            return res.status(400).json({
                message:
                    'Refresh token requerido',
                code: 'REFRESH_TOKEN_REQUIRED',
            });
        }

        const tokenHash =
            hashRefreshToken(refreshToken);

        await pool.query(
            `
            UPDATE refresh_tokens
            SET revoked_at =
                COALESCE(revoked_at, NOW())
            WHERE token_hash = $1
            `,
            [tokenHash]
        );

        res.json({
            ok: true,
            message:
                'Sesión cerrada correctamente',
        });
    } catch (error) {
        next(error);
    }
});

/*
|--------------------------------------------------------------------------
| AUTH - ME
|--------------------------------------------------------------------------
*/

app.get('/api/auth/me', auth, async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            `
            SELECT
                u.id,
                u.name,
                u.email,
                u.role,
                u.active,
                u.created_at,
                COALESCE(
                    json_agg(
                        DISTINCT p.code
                    ) FILTER (
                        WHERE p.code IS NOT NULL
                    ),
                    '[]'
                ) AS permissions
            FROM users u
            LEFT JOIN roles r
                ON r.name = u.role
            LEFT JOIN role_permissions rp
                ON rp.role_id = r.id
            LEFT JOIN permissions p
                ON p.id = rp.permission_id
            WHERE u.id = $1
            GROUP BY
                u.id,
                u.name,
                u.email,
                u.role,
                u.active,
                u.created_at
            `,
            [req.user.id]
        );

        const user = rows[0];

        if (!user) {
            return res.status(404).json({
                message:
                    'Usuario no encontrado',
                code: 'USER_NOT_FOUND',
            });
        }

        res.json({
            user: {
                id: String(user.id),
                name: user.name,
                email: user.email,
                role: user.role,
                active: user.active,
                createdAt: user.created_at,
            },
            permissions: user.permissions,
        });
    } catch (error) {
        next(error);
    }
});

/*
|--------------------------------------------------------------------------
| NEEDS
|--------------------------------------------------------------------------
*/

app.get(
    '/api/needs',
    auth,
    requirePermission('needs.read'),
    async (req, res, next) => {
        try {
            const { rows } = await pool.query(`
                SELECT
                    n.id,
                    n.description,
                    n.category,
                    n.status,
                    n.ai_category,
                    n.ai_confidence,
                    n.created_at,
                    u.name AS author
                FROM needs n
                JOIN users u
                    ON u.id = n.user_id
                ORDER BY n.created_at DESC
                LIMIT 50
            `);

            res.json(rows);
        } catch (error) {
            next(error);
        }
    }
);

app.post(
    '/api/needs',
    auth,
    requirePermission('needs.create'),
    async (req, res, next) => {
        try {
            const description = String(
                req.body.description || ''
            ).trim();

            if (description.length < 5) {
                return res.status(400).json({
                    message:
                        'Describe mejor la necesidad',
                    code: 'INVALID_DESCRIPTION',
                });
            }

            let ai =
                classifyNeed(description);

            try {
                ai =
                    await classifyWithAI(
                        description
                    );
            } catch {
                // Clasificación local.
            }

            const category = String(
                req.body.category ||
                ai.category
            ).trim();

            const { rows } =
                await pool.query(
                    `
                    INSERT INTO needs (
                        user_id,
                        description,
                        category,
                        ai_category,
                        ai_confidence
                    )
                    VALUES (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5
                    )
                    RETURNING
                        id,
                        description,
                        category,
                        status,
                        ai_category,
                        ai_confidence,
                        created_at
                    `,
                    [
                        req.user.id,
                        description,
                        category,
                        ai.category,
                        ai.confidence,
                    ]
                );

            res.status(201).json(rows[0]);
        } catch (error) {
            next(error);
        }
    }
);

/*
|--------------------------------------------------------------------------
| COMMUNITY
|--------------------------------------------------------------------------
*/

app.get(
    '/api/community',
    auth,
    requirePermission('community.read'),
    async (req, res, next) => {
        try {
            const { rows } =
                await pool.query(`
                    SELECT
                        p.id,
                        p.body,
                        p.created_at,
                        u.name AS author
                    FROM community_posts p
                    JOIN users u
                        ON u.id = p.user_id
                    ORDER BY
                        p.created_at DESC
                    LIMIT 50
                `);

            res.json(rows);
        } catch (error) {
            next(error);
        }
    }
);

app.post(
    '/api/community',
    auth,
    requirePermission('community.create'),
    async (req, res, next) => {
        try {
            const body = String(
                req.body.body || ''
            ).trim();

            if (body.length < 3) {
                return res.status(400).json({
                    message:
                        'La publicación es demasiado corta',
                    code: 'INVALID_BODY',
                });
            }

            const { rows } =
                await pool.query(
                    `
                    INSERT INTO community_posts (
                        user_id,
                        body
                    )
                    VALUES ($1, $2)
                    RETURNING
                        id,
                        body,
                        created_at
                    `,
                    [
                        req.user.id,
                        body,
                    ]
                );

            res.status(201).json(rows[0]);
        } catch (error) {
            next(error);
        }
    }
);

/*
|--------------------------------------------------------------------------
| MAP
|--------------------------------------------------------------------------
*/

app.get(
    '/api/map/places',
    async (_req, res, next) => {
        try {
            const { rows } =
                await pool.query(`
                    SELECT
                        id,
                        name,
                        type,
                        latitude,
                        longitude,
                        description
                    FROM map_places
                    ORDER BY id
                `);

            res.json(
                rows.map((place) => ({
                    ...place,
                    latitude:
                        Number(place.latitude),
                    longitude:
                        Number(place.longitude),
                }))
            );
        } catch (error) {
            next(error);
        }
    }
);

/*
|--------------------------------------------------------------------------
| AI
|--------------------------------------------------------------------------
*/

app.post(
    '/api/ai/assistant',
    auth,
    async (req, res, next) => {
        try {
            const message = String(
                req.body.message || ''
            ).trim();

            if (message.length < 3) {
                return res.status(400).json({
                    message:
                        'Escribe una consulta',
                    code: 'INVALID_MESSAGE',
                });
            }

            res.json(
                await askAI(message)
            );
        } catch (error) {
            next(error);
        }
    }
);

/*
|--------------------------------------------------------------------------
| STATISTICS
|--------------------------------------------------------------------------
*/

app.get(
    '/api/stats',
    auth,
    requirePermission('stats.read'),
    async (_req, res, next) => {
        try {
            const [
                needs,
                posts,
                users,
                categories,
            ] = await Promise.all([
                pool.query(
                    `
                    SELECT
                        COUNT(*)::int AS total
                    FROM needs
                    `
                ),

                pool.query(
                    `
                    SELECT
                        COUNT(*)::int AS total
                    FROM community_posts
                    `
                ),

                pool.query(
                    `
                    SELECT
                        COUNT(*)::int AS total
                    FROM users
                    WHERE active = true
                    `
                ),

                pool.query(`
                    SELECT
                        category,
                        COUNT(*)::int AS total
                    FROM needs
                    GROUP BY category
                    ORDER BY total DESC
                `),
            ]);

            res.json({
                needs:
                    needs.rows[0].total,

                posts:
                    posts.rows[0].total,

                users:
                    users.rows[0].total,

                categories:
                    categories.rows,
            });
        } catch (error) {
            next(error);
        }
    }
);

/*
|--------------------------------------------------------------------------
| ERROR HANDLER
|--------------------------------------------------------------------------
*/

app.use(
    (error, _req, res, _next) => {
        console.error(error);

        res.status(500).json({
            message:
                'Error interno del servidor',
            code:
                'INTERNAL_SERVER_ERROR',
        });
    }
);

/*
|--------------------------------------------------------------------------
| SERVER
|--------------------------------------------------------------------------
*/

app.listen(
    PORT,
    () => {
        console.log(
            `NEXO API en http://localhost:${PORT}`
        );
    }
);