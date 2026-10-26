import { API_URL } from '../config/env';
import type { User } from '../models/User';
import { File } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';

export type EditableProfile = {
    name: string;
    bio: string;
    phone: string;
    city: string;
};

export type Profile = User & {
    bio: string;
    phone: string;
    city: string;
    avatar: string | null;
};

async function parseResponse<T>(response: Response): Promise<T> {
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data.message || 'No fue posible completar la operación.'
        );
    }

    return data as T;
}

async function get(token: string): Promise<Profile> {
    const response = await fetch(`${API_URL}/profile`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    const data = await parseResponse<{ profile: Profile }>(response);
    return data.profile;
}

async function update(
    token: string,
    profile: EditableProfile,
): Promise<Profile> {
    const response = await fetch(`${API_URL}/profile`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
    });

    const data = await parseResponse<{ profile: Profile }>(response);
    return data.profile;
}


async function uploadAvatar(
    token: string,
    asset: {
        uri: string;
        fileName?: string | null;
        mimeType?: string | null;
        file?: globalThis.File;
    },
): Promise<Profile> {
    const mimeType = asset.mimeType || 'image/jpeg';

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
        throw new Error('Seleccione una imagen JPG, PNG o WEBP.');
    }

    const form = new FormData();

    if (asset.file) {
        // Navegador: adjuntar directamente el archivo seleccionado.
        form.append(
            'avatar',
            asset.file,
            asset.fileName || 'foto-perfil.jpg',
        );
    } else {
        // Android/iOS: obtener el archivo local mediante Expo.
        const localFile = new File(asset.uri);

        if (!localFile.exists) {
            throw new Error('No se encontró la fotografía seleccionada.');
        }

        form.append(
            'avatar',
            localFile,
            asset.fileName || 'foto-perfil.jpg',
        );
    }

    const response = await expoFetch(`${API_URL}/profile/avatar`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: form,
    });

    const data = await parseResponse<{ profile: Profile }>(response);

    return data.profile;
}


async function removeAvatar(token: string): Promise<Profile> {
    const response = await fetch(`${API_URL}/profile/avatar`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    const data = await parseResponse<{ profile: Profile }>(response);
    return data.profile;
}

export const ProfileService = {
    get,
    update,
    uploadAvatar,
    removeAvatar,
};
