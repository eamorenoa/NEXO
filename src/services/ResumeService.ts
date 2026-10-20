import { API_URL } from '../config/env';
import type { DocumentPickerAsset } from 'expo-document-picker';

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
    const response = await fetch(`${API_URL}/resumes`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
        throw new Error(await getErrorMessage(response));
    }

    const data = (await response.json()) as ResumeListResponse;
    return data.resumes;
}

async function upload(
    token: string,
    asset: DocumentPickerAsset,
): Promise<Resume> {
    if (!asset.name.toLowerCase().endsWith('.pdf')) {
        throw new Error('Seleccione un archivo PDF.');
    }

    if (!asset.size || asset.size <= 0) {
        throw new Error('El archivo está vacío o no se pudo determinar su tamaño.');
    }

    if (asset.size > 5 * 1024 * 1024) {
        throw new Error('El PDF no puede superar los 5 MB.');
    }

    const formData = new FormData();

    if (asset.file) {
        // En web, Expo proporciona el objeto File.
        formData.append('resume', asset.file, asset.name);
    } else {
        // En plataformas nativas, se utiliza la URI del documento.
        formData.append(
            'resume',
            {
                uri: asset.uri,
                name: asset.name,
                type: asset.mimeType || 'application/pdf',
            } as unknown as Blob,
        );
    }

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

async function download(
    token: string,
    id: number,
    fileName: string,
): Promise<void> {
    const response = await fetch(`${API_URL}/resumes/${id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
        throw new Error(await getErrorMessage(response));
    }

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
}

async function remove(token: string, id: number): Promise<void> {
    const response = await fetch(`${API_URL}/resumes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
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