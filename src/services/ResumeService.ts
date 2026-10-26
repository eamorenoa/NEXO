import type { DocumentPickerAsset } from 'expo-document-picker';
import { File, Paths, UploadType } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';
import { Platform } from 'react-native';

import { API_URL } from '../config/env';

export interface Resume {
    id: number;
    original_name: string;
    mime_type: string;
    file_size: number;
    created_at: string;
    updated_at?: string;
}

interface ResumeListResponse {
    resumes: Resume[];
}

interface ResumeUploadResponse {
    message: string;
    resume: Resume;
}

async function getErrorMessage(response: Response): Promise<string> {
    const body = await response.json().catch(() => ({}));
    return body.message || 'No fue posible completar la operación.';
}

async function list(token: string): Promise<Resume[]> {
    const response = await expoFetch(`${API_URL}/resumes`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error(await getErrorMessage(response));
    }

    const data = (await response.json()) as ResumeListResponse;
    return data.resumes;
}

async function upload(
    token: string,
    asset: DocumentPickerAsset | File,
): Promise<Resume> {
    const selectedName = typeof asset.name === 'string' ? asset.name.trim() : '';

    console.log('[NEXO PDF] Nombre recibido:', JSON.stringify(selectedName));
    console.log('[NEXO PDF] Tamaño recibido:', asset.size);
    console.log(
        '[NEXO PDF] Tipo de archivo:',
        'mimeType' in asset ? asset.mimeType : 'No disponible',
    );

    // En web sí disponemos del nombre real y exigimos la extensión PDF.
    if (Platform.OS === 'web' && !selectedName.toLowerCase().endsWith('.pdf')) {
        throw new Error('Seleccione un archivo PDF.');
    }

    // File.pickFileAsync en Android puede devolver un identificador como
    // "document:21709" en vez del nombre original. El selector ya está
    // limitado a application/pdf; para enviar el multipart usamos un nombre válido.
    const fileName = selectedName.toLowerCase().endsWith('.pdf')
        ? selectedName
        : 'hoja-de-vida.pdf';

    if (!asset.size || asset.size <= 0) {
        throw new Error('El archivo está vacío o no se pudo determinar su tamaño.');
    }

    if (asset.size > 5 * 1024 * 1024) {
        throw new Error('El PDF no puede superar los 5 MB.');
    }

    // En web se utiliza el archivo real entregado por el selector del navegador.
    if (Platform.OS === 'web') {
        if (!('file' in asset) || !asset.file) {
            throw new Error('No se pudo leer el PDF seleccionado. Selecciónelo nuevamente.');
        }

        const formData = new FormData();
        formData.append('resume', asset.file, fileName);

        const response = await fetch(`${API_URL}/resumes`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        });

        if (!response.ok) {
            throw new Error(await getErrorMessage(response));
        }

        const data = (await response.json()) as ResumeUploadResponse;
        return data.resume;
    }

    // En Android se conserva la carga nativa de expo-file-system.
    if (!(asset instanceof File)) {
        throw new Error(
            'No se obtuvo un archivo compatible con la carga nativa. Seleccione el PDF nuevamente.',
        );
    }

    const response = await asset.upload(`${API_URL}/resumes`, {
        httpMethod: 'POST',
        uploadType: UploadType.MULTIPART,
        fieldName: 'resume',
        mimeType: 'application/pdf',
        parameters: {
            originalName: fileName,
        },
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (response.status < 200 || response.status >= 300) {
        let message = 'No fue posible subir la hoja de vida.';

        try {
            const body = JSON.parse(response.body);
            message = body.message || message;
        } catch {
            // La respuesta del servidor no contiene JSON válido.
        }

        throw new Error(message);
    }

    const data = JSON.parse(response.body) as ResumeUploadResponse;
    return data.resume;
}

async function download(
    token: string,
    id: number,
    fileName: string,
): Promise<void> {
    const response = await expoFetch(
        `${API_URL}/resumes/${id}/download`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        },
    );

    if (!response.ok) {
        throw new Error(await getErrorMessage(response));
    }

    if (Platform.OS === 'web') {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        try {
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName || 'hoja-de-vida.pdf';
            document.body.appendChild(link);
            link.click();
            link.remove();
        } finally {
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        }

        return;
    }

    const safeName = (fileName || 'hoja-de-vida.pdf')
        .replace(/[^a-zA-Z0-9._-]/g, '_');

    const destination = new File(
        Paths.document,
        `${Date.now()}-${safeName}`,
    );

    const bytes = new Uint8Array(await response.arrayBuffer());
    destination.write(bytes);

    if (!destination.exists || destination.size <= 0) {
        throw new Error('No se pudo guardar el PDF en el dispositivo.');
    }

    const Sharing = await import('expo-sharing');

    if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(destination.uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Hoja de vida',
        });
    } else {
        throw new Error(
            'No está disponible la opción para compartir el PDF en este dispositivo.',
        );
    }
}

async function remove(token: string, id: number): Promise<void> {
    const response = await expoFetch(`${API_URL}/resumes/${id}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error(await getErrorMessage(response));
    }
}

export const ResumeService = {
    list,
    upload,
    download,
    remove,
};
