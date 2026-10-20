import express from 'express';
import multer from 'multer';

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
]);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_AVATAR_SIZE,
        files: 1,
    },
    fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
            const error = new Error(
                'Seleccione una imagen JPG, PNG o WEBP.'
            );

            error.status = 400;
            error.code = 'INVALID_AVATAR_TYPE';

            return callback(error);
        }

        callback(null, true);
    },
});

function validateImage(buffer, mimeType) {
    if (mimeType === 'image/jpeg') {
        return (
            buffer.length >= 3 &&
            buffer[0] === 0xff &&
            buffer[1] === 0xd8 &&
            buffer[2] === 0xff
        );
    }

    if (mimeType === 'image/png') {
        return (
            buffer.length >= 8 &&
            buffer.subarray(0, 8).equals(
                Buffer.from([
                    0x89, 0x50, 0x4e, 0x47,
                    0x0d, 0x0a, 0x1a, 0x0a,
                ])
            )
        );
    }

    if (mimeType === 'image/webp') {
        return (
            buffer.length >= 12 &&
            buffer.toString('ascii', 0, 4) === 'RIFF' &&
            buffer.toString('ascii', 8, 12) === 'WEBP'
        );
    }

    return false;
}

function serializeProfile(row) {
    return {
        id: String(row.id),
        name: row.name,
        email: row.email,
        role: row.role,
        bio: row.bio || '',
        phone: row.phone || '',
        city: row.city || '',
        avatar: row.avatar_data && row.avatar_mime_type
            ? `data:${row.avatar_mime_type};base64,${Buffer.from(
                row.avatar_data
            ).toString('base64')}`
            : null,
    };
}

function validateProfile(body) {
    const name = String(body.name ?? '').trim();
    const bio = String(body.bio ?? '').trim();
    const phone = String(body.phone ?? '').trim();
    const city = String(body.city ?? '').trim();

    if (name.length < 2 || name.length > 120) {
        return {
            error: 'El nombre debe tener entre 2 y 120 caracteres.',
        };
    }

    if (bio.length > 500) {
        return {
            error: 'La descripción no puede superar los 500 caracteres.',
        };
    }

    if (phone.length > 30) {
        return {
            error: 'El teléfono no puede superar los 30 caracteres.',
        };
    }

    if (city.length > 100) {
        return {
            error: 'La ciudad no puede superar los 100 caracteres.',
        };
    }

    return {
        value: { name, bio, phone, city },
    };
}

export function createProfileRouter({ pool, auth }) {
    const router = express.Router();

    // Todas las rutas requieren autenticación.
    router.use(auth);

    // Consultar el perfil del usuario autenticado.
    router.get('/', async (req, res, next) => {
        try {
            const { rows } = await pool.query(
                `
                SELECT
                    id,
                    name,
                    email,
                    role,
                    bio,
                    phone,
                    city,
                    avatar_data,
                    avatar_mime_type
                FROM users
                WHERE id = $1
                LIMIT 1
                `,
                [req.user.id]
            );

            if (!rows.length) {
                return res.status(404).json({
                    message: 'Perfil no encontrado.',
                    code: 'PROFILE_NOT_FOUND',
                });
            }

            return res.json({
                profile: serializeProfile(rows[0]),
            });
        } catch (error) {
            return next(error);
        }
    });

    // Actualizar los datos editables.
    router.patch('/', async (req, res, next) => {
        try {
            const result = validateProfile(req.body || {});

            if (result.error) {
                return res.status(400).json({
                    message: result.error,
                    code: 'INVALID_PROFILE',
                });
            }

            const { name, bio, phone, city } = result.value;

            const { rows } = await pool.query(
                `
                UPDATE users
                SET
                    name = $1,
                    bio = $2,
                    phone = $3,
                    city = $4
                WHERE id = $5
                RETURNING
                    id,
                    name,
                    email,
                    role,
                    bio,
                    phone,
                    city,
                    avatar_data,
                    avatar_mime_type
                `,
                [name, bio, phone, city, req.user.id]
            );

            if (!rows.length) {
                return res.status(404).json({
                    message: 'Perfil no encontrado.',
                    code: 'PROFILE_NOT_FOUND',
                });
            }

            return res.json({
                message: 'Perfil actualizado correctamente.',
                profile: serializeProfile(rows[0]),
            });
        } catch (error) {
            return next(error);
        }
    });

    // Guardar la fotografía en PostgreSQL.
    router.post('/avatar', (req, res, next) => {
        upload.single('avatar')(req, res, async (uploadError) => {
            if (uploadError) {
                const tooLarge =
                    uploadError.code === 'LIMIT_FILE_SIZE';

                return res.status(tooLarge ? 413 : 400).json({
                    message: tooLarge
                        ? 'La fotografía no puede superar los 2 MB.'
                        : uploadError.message ||
                          'No se pudo recibir la fotografía.',
                    code: tooLarge
                        ? 'AVATAR_TOO_LARGE'
                        : uploadError.code || 'AVATAR_UPLOAD_ERROR',
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    message: 'Seleccione una fotografía.',
                    code: 'AVATAR_REQUIRED',
                });
            }

            if (!validateImage(req.file.buffer, req.file.mimetype)) {
                return res.status(400).json({
                    message: 'El contenido del archivo no es una imagen válida.',
                    code: 'INVALID_AVATAR_CONTENT',
                });
            }

            try {
                const { rows } = await pool.query(
                    `
                    UPDATE users
                    SET
                        avatar_data = $1,
                        avatar_mime_type = $2
                    WHERE id = $3
                    RETURNING
                        id,
                        name,
                        email,
                        role,
                        bio,
                        phone,
                        city,
                        avatar_data,
                        avatar_mime_type
                    `,
                    [
                        req.file.buffer,
                        req.file.mimetype,
                        req.user.id,
                    ]
                );

                if (!rows.length) {
                    return res.status(404).json({
                        message: 'Perfil no encontrado.',
                        code: 'PROFILE_NOT_FOUND',
                    });
                }

                return res.json({
                    message: 'Fotografía actualizada correctamente.',
                    profile: serializeProfile(rows[0]),
                });
            } catch (error) {
                return next(error);
            }
        });
    });

    // Eliminar la fotografía del usuario autenticado.
    router.delete('/avatar', async (req, res, next) => {
        try {
            const { rows } = await pool.query(
                `
                UPDATE users
                SET
                    avatar_data = NULL,
                    avatar_mime_type = NULL
                WHERE id = $1
                RETURNING
                    id,
                    name,
                    email,
                    role,
                    bio,
                    phone,
                    city,
                    avatar_data,
                    avatar_mime_type
                `,
                [req.user.id]
            );

            if (!rows.length) {
                return res.status(404).json({
                    message: 'Perfil no encontrado.',
                    code: 'PROFILE_NOT_FOUND',
                });
            }

            return res.json({
                message: 'Fotografía eliminada correctamente.',
                profile: serializeProfile(rows[0]),
            });
        } catch (error) {
            return next(error);
        }
    });

    return router;
}
