import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const RESUMES_DIR = process.env.RESUMES_DIR || '/app/private-resumes';

fs.mkdirSync(RESUMES_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, callback) => {
        callback(null, RESUMES_DIR);
    },
    filename: (_req, _file, callback) => {
        callback(null, `${crypto.randomUUID()}.pdf`);
    },
});

const upload = multer({
    storage,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1,
    },
    fileFilter: (_req, file, callback) => {
        const extensionIsPdf = /\.pdf$/i.test(file.originalname);
        const mimeIsPdf = file.mimetype === 'application/pdf';

        if (!extensionIsPdf || !mimeIsPdf) {
            const error = new Error('Solo se permiten archivos PDF.');
            error.status = 400;
            error.code = 'INVALID_FILE_TYPE';
            return callback(error);
        }

        callback(null, true);
    },
});

function safeOriginalName(name) {
    const baseName = path.basename(String(name || 'hoja-de-vida.pdf'));
    const cleaned = baseName
        .replace(/[^\p{L}\p{N}._ -]/gu, '_')
        .slice(0, 255);

    return cleaned || 'hoja-de-vida.pdf';
}

async function isPdf(filePath) {
    const handle = await fs.promises.open(filePath, 'r');

    try {
        const buffer = Buffer.alloc(5);
        const { bytesRead } = await handle.read(buffer, 0, 5, 0);

        return bytesRead === 5 && buffer.toString('ascii') === '%PDF-';
    } finally {
        await handle.close();
    }
}

async function removeFile(filePath) {
    if (!filePath) return;

    try {
        await fs.promises.unlink(filePath);
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error('No fue posible eliminar un archivo de hoja de vida.');
        }
    }
}

export function createResumeRouter({ pool, auth }) {
    const router = express.Router();

    router.use(auth);

    // Consultar únicamente las hojas de vida del usuario autenticado.
    router.get('/', async (req, res, next) => {
        try {
            const { rows } = await pool.query(
                `SELECT id, original_name, mime_type, file_size, created_at, updated_at
                 FROM resumes
                 WHERE user_id = $1
                 ORDER BY created_at DESC`,
                [req.user.id]
            );

            res.json({ resumes: rows });
        } catch (error) {
            next(error);
        }
    });

    // Subir una hoja de vida en PDF.
    router.post('/', (req, res, next) => {
        upload.single('resume')(req, res, async (uploadError) => {
            if (uploadError) {
                if (uploadError.code === 'LIMIT_FILE_SIZE') {
                    return res.status(413).json({
                        message: 'El PDF no puede superar los 5 MB.',
                        code: 'FILE_TOO_LARGE',
                    });
                }

                return res.status(uploadError.status || 400).json({
                    message: uploadError.message || 'No se pudo recibir el archivo.',
                    code: uploadError.code || 'UPLOAD_ERROR',
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    message: 'Seleccione un archivo PDF.',
                    code: 'FILE_REQUIRED',
                });
            }

            const filePath = path.join(RESUMES_DIR, req.file.filename);

            try {
                if (!(await isPdf(filePath))) {
                    await removeFile(filePath);

                    return res.status(400).json({
                        message: 'El archivo no tiene una cabecera PDF válida.',
                        code: 'INVALID_PDF',
                    });
                }

                const { rows } = await pool.query(
                    `INSERT INTO resumes
                        (user_id, original_name, stored_name, mime_type, file_size)
                     VALUES ($1, $2, $3, 'application/pdf', $4)
                     RETURNING id, original_name, mime_type, file_size, created_at`,
                    [
                        req.user.id,
                        safeOriginalName(req.file.originalname),
                        req.file.filename,
                        req.file.size,
                    ]
                );

                return res.status(201).json({
                    message: 'Hoja de vida guardada correctamente.',
                    resume: rows[0],
                });
            } catch (error) {
                await removeFile(filePath);
                return next(error);
            }
        });
    });

    // Descargar una hoja de vida propia.
    router.get('/:id/download', async (req, res, next) => {
        try {
            const id = String(req.params.id || '');

            if (!/^\d+$/.test(id)) {
                return res.status(400).json({
                    message: 'Identificador inválido.',
                    code: 'INVALID_RESUME_ID',
                });
            }

            const { rows } = await pool.query(
                `SELECT original_name, stored_name
                 FROM resumes
                 WHERE id = $1 AND user_id = $2`,
                [id, req.user.id]
            );

            if (!rows.length) {
                return res.status(404).json({
                    message: 'Hoja de vida no encontrada.',
                    code: 'RESUME_NOT_FOUND',
                });
            }

            const resume = rows[0];
            const filePath = path.join(RESUMES_DIR, resume.stored_name);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="hoja-de-vida.pdf"; filename*=UTF-8''${encodeURIComponent(resume.original_name)}`
            );
            res.setHeader('X-Content-Type-Options', 'nosniff');

            const stream = fs.createReadStream(filePath);
            stream.on('error', (error) => {
                if (!res.headersSent) {
                    res.status(error.code === 'ENOENT' ? 404 : 500).json({
                        message: 'No fue posible leer la hoja de vida.',
                    });
                } else {
                    res.destroy(error);
                }
            });

            await pipeline(stream, res);
        } catch (error) {
            if (!res.headersSent) next(error);
            else res.destroy(error);
        }
    });

    // Eliminar una hoja de vida propia.
    router.delete('/:id', async (req, res, next) => {
        try {
            const id = String(req.params.id || '');

            if (!/^\d+$/.test(id)) {
                return res.status(400).json({
                    message: 'Identificador inválido.',
                    code: 'INVALID_RESUME_ID',
                });
            }

            const { rows } = await pool.query(
                `DELETE FROM resumes
                 WHERE id = $1 AND user_id = $2
                 RETURNING stored_name`,
                [id, req.user.id]
            );

            if (!rows.length) {
                return res.status(404).json({
                    message: 'Hoja de vida no encontrada.',
                    code: 'RESUME_NOT_FOUND',
                });
            }

            await removeFile(path.join(RESUMES_DIR, rows[0].stored_name));

            return res.json({
                message: 'Hoja de vida eliminada correctamente.',
            });
        } catch (error) {
            next(error);
        }
    });

    return router;
}
