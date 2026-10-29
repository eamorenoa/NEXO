import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import type { DocumentPickerAsset } from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { File } from 'expo-file-system';

import type { User } from '../models/User';
import { ProfileService, type EditableProfile, type Profile } from '../services/ProfileService';
import { ResumeService, type Resume } from '../services/ResumeService';

type Notify = (title: string, message: string) => void;

type UseProfileViewModelOptions = {
  user: User;
  token?: string;
  notify: Notify;
};

function getValidResumeId(id: unknown): number | null {
  // PostgreSQL/JSON puede entregar identificadores como números o cadenas numéricas.
  if (typeof id !== 'number' && !(typeof id === 'string' && /^\d+$/.test(id))) {
    return null;
  }

  const normalizedId = Number(id);
  return Number.isSafeInteger(normalizedId) && normalizedId > 0
    ? normalizedId
    : null;
}

export function useProfileViewModel({ user, token, notify }: UseProfileViewModelOptions) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<EditableProfile>({
    name: user.name || '',
    bio: '',
    phone: '',
    city: '',
  });
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyResumeId, setBusyResumeId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const loadProfile = useCallback(async () => {
    if (!token) {
      setProfile(null);
      setForm({ name: user.name || '', bio: '', phone: '', city: '' });
      return;
    }

    setLoadingProfile(true);
    try {
      const result = await ProfileService.get(token);
      setProfile(result);
      setForm({
        name: result.name || '',
        bio: result.bio || '',
        phone: result.phone || '',
        city: result.city || '',
      });
    } catch (err) {
      notify('Error al cargar el perfil', err instanceof Error
        ? err.message : 'No fue posible cargar sus datos personales.');
    } finally {
      setLoadingProfile(false);
    }
  }, [token, user.name, notify]);

  const loadResumes = useCallback(async () => {
    if (!token) {
      setResumes([]);
      setError('');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await ResumeService.list(token);
      setResumes(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar las hojas de vida.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    void loadResumes();
  }, [loadResumes]);

  const changeField = (field: keyof EditableProfile, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const saveProfile = async () => {
    if (!token) {
      notify('Sesión requerida', 'Inicie sesión para actualizar su perfil.');
      return;
    }

    const cleanForm: EditableProfile = {
      name: form.name.trim(),
      bio: form.bio.trim(),
      phone: form.phone.trim(),
      city: form.city.trim(),
    };
    if (cleanForm.name.length < 3 || cleanForm.name.length > 120) {
      notify('Datos no válidos', 'El nombre debe tener entre 3 y 120 caracteres.');
      return;
    }
    if (cleanForm.bio.length > 500 || cleanForm.phone.length > 30 || cleanForm.city.length > 100) {
      notify('Datos no válidos', 'Revise la longitud de los campos antes de guardar.');
      return;
    }

    setSavingProfile(true);
    try {
      const result = await ProfileService.update(token, cleanForm);
      setProfile(result);
      setForm({
        name: result.name || '',
        bio: result.bio || '',
        phone: result.phone || '',
        city: result.city || '',
      });
      notify('Perfil actualizado', 'Sus datos personales se guardaron correctamente.');
    } catch (err) {
      notify('Error al guardar', err instanceof Error
        ? err.message : 'No fue posible guardar sus datos.');
    } finally {
      setSavingProfile(false);
    }
  };

  const chooseAvatar = async () => {
    if (!token) {
      notify('Sesión requerida', 'Inicie sesión para cambiar su fotografía.');
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        notify('Permiso requerido', 'Autorice el acceso a sus fotografías para seleccionar una imagen.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      const originalMimeType = asset.mimeType || 'image/jpeg';
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(originalMimeType)) {
        notify('Formato no válido', 'Seleccione una fotografía JPG, PNG, WEBP o HEIC.');
        return;
      }

      setUploadingAvatar(true);
      let uri = asset.uri;
      let fileName = asset.fileName || 'foto-perfil.jpg';
      let mimeType = originalMimeType;
      let file = asset.file;

      if (Platform.OS !== 'web') {
        const widths = [1600, 1200, 1000, 800, 600, 400];
        const qualities = [0.75, 0.6, 0.45, 0.3];
        let bestUri = '';
        let bestSize = Number.POSITIVE_INFINITY;
        let acceptable = false;

        for (const width of widths) {
          for (const quality of qualities) {
            const compressed = await ImageManipulator.manipulateAsync(
              asset.uri,
              [{ resize: { width } }],
              { compress: quality, format: ImageManipulator.SaveFormat.JPEG },
            );
            const compressedFile = new File(compressed.uri);
            if (!compressedFile.exists || compressedFile.size <= 0) continue;

            if (compressedFile.size < bestSize) {
              bestUri = compressed.uri;
              bestSize = compressedFile.size;
            }
            if (compressedFile.size < 1.8 * 1024 * 1024) {
              bestUri = compressed.uri;
              bestSize = compressedFile.size;
              acceptable = true;
              break;
            }
          }
          if (acceptable) break;
        }

        if (!bestUri || bestSize >= 2 * 1024 * 1024) {
          notify('No se pudo comprimir la imagen', 'Seleccione otra fotografía e inténtelo nuevamente.');
          return;
        }
        uri = bestUri;
        fileName = 'foto-perfil.jpg';
        mimeType = 'image/jpeg';
        file = undefined;
      } else if (asset.fileSize && asset.fileSize > 2 * 1024 * 1024) {
        notify('Imagen demasiado grande', 'En la versión web, seleccione una fotografía que no supere los 2 MB.');
        return;
      }

      const updated = await ProfileService.uploadAvatar(token, {
        uri, fileName, mimeType, file,
      });
      setProfile(updated);
      notify('Fotografía actualizada', 'Su fotografía de perfil se guardó correctamente.');
    } catch (err) {
      notify('No se pudo guardar la fotografía', err instanceof Error ? err.message : 'Inténtelo nuevamente.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const removeAvatar = () => {
    if (!token || !profile?.avatar) return;

    const performRemove = async () => {
      setRemovingAvatar(true);
      try {
        const updated = await ProfileService.removeAvatar(token);
        setProfile(updated);
        notify('Fotografía eliminada', 'Se eliminó su fotografía de perfil.');
      } catch (err) {
        notify('Error al eliminar', err instanceof Error ? err.message : 'No fue posible eliminar la fotografía.');
      } finally {
        setRemovingAvatar(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('¿Desea eliminar su fotografía de perfil?')) void performRemove();
      return;
    }
    Alert.alert('Eliminar fotografía', '¿Desea eliminar su fotografía de perfil?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => void performRemove() },
    ]);
  };

  const uploadResume = async () => {
    if (!token) {
      notify('Sesión requerida', 'Inicie sesión para administrar sus hojas de vida.');
      return;
    }

    try {
      let asset: DocumentPickerAsset | File;
      if (Platform.OS === 'web') {
        const result = await DocumentPicker.getDocumentAsync({
          type: 'application/pdf',
          multiple: false,
        });
        if (result.canceled) return;
        const selectedAsset = result.assets[0];
        if (!selectedAsset) return;
        asset = selectedAsset;
      } else {
        const result = await File.pickFileAsync({
          mimeTypes: ['application/pdf'],
          multipleFiles: false,
        });
        if (result.canceled) return;
        asset = result.result;
      }

      setUploading(true);
      setError('');
      await ResumeService.upload(token, asset);
      await loadResumes();
      notify('Carga completada', 'La hoja de vida se guardó correctamente.');
    } catch (err) {
      notify('No se pudo subir el archivo', err instanceof Error ? err.message : 'Inténtelo nuevamente.');
    } finally {
      setUploading(false);
    }
  };

  const downloadResume = async (resume: Resume) => {
    if (!token) {
      notify('Sesión requerida', 'Inicie sesión para descargar una hoja de vida.');
      return;
    }

    const resumeId = getValidResumeId(resume.id);
    if (resumeId === null) {
      notify('Documento no válido', 'No se pudo identificar la hoja de vida. Actualice la lista e inténtelo nuevamente.');
      return;
    }

    setBusyResumeId(resumeId);
    setError('');
    try {
      await ResumeService.download(token, resumeId, resume.original_name);
    } catch (err) {
      notify('Error al descargar', err instanceof Error ? err.message : 'No fue posible descargar el PDF.');
    } finally {
      setBusyResumeId(null);
    }
  };

  const deleteResume = (resume: Resume) => {
    if (!token) {
      notify('Sesión requerida', 'Inicie sesión para eliminar una hoja de vida.');
      return;
    }

    const resumeId = getValidResumeId(resume.id);
    if (resumeId === null) {
      notify('Documento no válido', 'No se pudo identificar la hoja de vida. Actualice la lista e inténtelo nuevamente.');
      return;
    }

    const performDelete = async () => {
      setBusyResumeId(resumeId);
      setError('');
      try {
        await ResumeService.remove(token, resumeId);
        await loadResumes();
        notify('Documento eliminado', 'La hoja de vida se eliminó correctamente.');
      } catch (err) {
        notify('Error al eliminar', err instanceof Error ? err.message : 'No fue posible eliminar el PDF.');
      } finally {
        setBusyResumeId(null);
      }
    };

    const safeName = resume.original_name || 'esta hoja de vida';
    if (Platform.OS === 'web') {
      if (window.confirm(`¿Desea eliminar "${safeName}"?`)) void performDelete();
      return;
    }
    Alert.alert('Eliminar hoja de vida', `¿Desea eliminar "${safeName}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => void performDelete() },
    ]);
  };

  return {
    profile, form, loadingProfile, savingProfile, uploadingAvatar, removingAvatar,
    resumes, loading, uploading, busyResumeId, error,
    loadProfile, loadResumes, changeField, saveProfile, chooseAvatar, removeAvatar,
    uploadResume, downloadResume, deleteResume,
  };
}
