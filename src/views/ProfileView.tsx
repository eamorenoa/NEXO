import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import * as DocumentPicker from 'expo-document-picker';
import type { DocumentPickerAsset } from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { File } from 'expo-file-system';

import type { User } from '../models/User';
import { colors } from '../shared/theme';
import { ProfileService, type EditableProfile, type Profile } from '../services/ProfileService';
import { ResumeService, type Resume } from '../services/ResumeService';

type ProfileViewProps = {
    user: User;
    token?: string;
    logout: () => void;
};

export function ProfileView({ user, token, logout }: ProfileViewProps) {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [form, setForm] = useState<EditableProfile>({
        name: user.name,
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

    const showMessage = (title: string, message: string) => {
        if (Platform.OS === 'web') {
            window.alert(`${title}\n\n${message}`);
        } else {
            Alert.alert(title, message);
        }
    };

    const loadProfile = useCallback(async () => {
        if (!token) {
            setProfile(null);
            setForm({ name: user.name, bio: '', phone: '', city: '' });
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
            showMessage(
                'Error al cargar el perfil',
                err instanceof Error ? err.message : 'No fue posible cargar sus datos personales.',
            );
        } finally {
            setLoadingProfile(false);
        }
    }, [token, user.name]);

    const loadResumes = useCallback(async () => {
        if (!token) {
            setResumes([]);
            return;
        }

        setLoading(true);
        setError('');
        try {
            setResumes(await ResumeService.list(token));
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'No fue posible cargar las hojas de vida.',
            );
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
            showMessage('Sesión requerida', 'Inicie sesión para actualizar su perfil.');
            return;
        }

        setSavingProfile(true);
        try {
            const result = await ProfileService.update(token, form);
            setProfile(result);
            setForm({
                name: result.name || '',
                bio: result.bio || '',
                phone: result.phone || '',
                city: result.city || '',
            });
            showMessage('Perfil actualizado', 'Sus datos personales se guardaron correctamente.');
        } catch (err) {
            showMessage(
                'Error al guardar',
                err instanceof Error ? err.message : 'No fue posible guardar sus datos.',
            );
        } finally {
            setSavingProfile(false);
        }
    };

    const chooseAvatar = async () => {
        if (!token) {
            showMessage('Sesión requerida', 'Inicie sesión para cambiar su fotografía.');
            return;
        }

        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                showMessage(
                    'Permiso requerido',
                    'Autorice el acceso a sus fotografías para seleccionar una imagen.',
                );
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

            if (
                ![
                    'image/jpeg',
                    'image/png',
                    'image/webp',
                    'image/heic',
                    'image/heif',
                ].includes(originalMimeType)
            ) {
                showMessage(
                    'Formato no válido',
                    'Seleccione una fotografía JPG, PNG, WEBP o HEIC.',
                );
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
                            {
                                compress: quality,
                                format: ImageManipulator.SaveFormat.JPEG,
                            },
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
                    showMessage(
                        'No se pudo comprimir la imagen',
                        'Seleccione otra fotografía e inténtelo nuevamente.',
                    );
                    return;
                }

                uri = bestUri;
                fileName = 'foto-perfil.jpg';
                mimeType = 'image/jpeg';
                file = undefined;
            } else if (asset.fileSize && asset.fileSize > 2 * 1024 * 1024) {
                showMessage(
                    'Imagen demasiado grande',
                    'En la versión web, seleccione una fotografía que no supere los 2 MB.',
                );
                return;
            }

            const updated = await ProfileService.uploadAvatar(token, {
                uri,
                fileName,
                mimeType,
                file,
            });

            setProfile(updated);
            showMessage('Fotografía actualizada', 'Su fotografía de perfil se guardó correctamente.');
        } catch (err) {
            showMessage(
                'No se pudo guardar la fotografía',
                err instanceof Error ? err.message : 'Inténtelo nuevamente.',
            );
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
                showMessage('Fotografía eliminada', 'Se eliminó su fotografía de perfil.');
            } catch (err) {
                showMessage(
                    'Error al eliminar',
                    err instanceof Error ? err.message : 'No fue posible eliminar la fotografía.',
                );
            } finally {
                setRemovingAvatar(false);
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm('¿Desea eliminar su fotografía de perfil?')) {
                void performRemove();
            }
            return;
        }

        Alert.alert('Eliminar fotografía', '¿Desea eliminar su fotografía de perfil?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Eliminar', style: 'destructive', onPress: () => void performRemove() },
        ]);
    };

    const uploadResume = async () => {
        if (!token) {
            showMessage('Sesión requerida', 'Inicie sesión para administrar sus hojas de vida.');
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

                console.log('[NEXO PDF] Resultado del selector:', {
                    name: result.result.name,
                    extension: result.result.extension,
                    uri: result.result.uri,
                    size: result.result.size,
                    exists: result.result.exists,
                });

                asset = result.result;
            }

            setUploading(true);
            setError('');

            await ResumeService.upload(token, asset);
            await loadResumes();
            showMessage('Carga completada', 'La hoja de vida se guardó correctamente.');
        } catch (err) {
            showMessage(
                'No se pudo subir el archivo',
                err instanceof Error ? err.message : 'Inténtelo nuevamente.',
            );
        } finally {
            setUploading(false);
        }
    };

    const downloadResume = async (resume: Resume) => {
        if (!token) return;
        setBusyResumeId(resume.id);
        setError('');
        try {
            await ResumeService.download(token, resume.id, resume.original_name);
        } catch (err) {
            showMessage(
                'Error al descargar',
                err instanceof Error ? err.message : 'No fue posible descargar el PDF.',
            );
        } finally {
            setBusyResumeId(null);
        }
    };

    const deleteResume = (resume: Resume) => {
        if (!token) return;

        const performDelete = async () => {
            setBusyResumeId(resume.id);
            setError('');
            try {
                await ResumeService.remove(token, resume.id);
                await loadResumes();
                showMessage('Documento eliminado', 'La hoja de vida se eliminó correctamente.');
            } catch (err) {
                showMessage(
                    'Error al eliminar',
                    err instanceof Error ? err.message : 'No fue posible eliminar el PDF.',
                );
            } finally {
                setBusyResumeId(null);
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm(`¿Desea eliminar "${resume.original_name}"?`)) {
                void performDelete();
            }
            return;
        }

        Alert.alert('Eliminar hoja de vida', `¿Desea eliminar "${resume.original_name}"?`, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Eliminar', style: 'destructive', onPress: () => void performDelete() },
        ]);
    };

    const displayName = profile?.name || user.name || 'Usuario';

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.title}>Mi perfil</Text>

            <View style={styles.card}>
                <View style={styles.avatar}>
                    {profile?.avatar ? (
                        <Image source={{ uri: profile.avatar }} style={styles.avatarImage} />
                    ) : (
                        <Text style={styles.avatarText}>
                            {displayName.charAt(0).toUpperCase()}
                        </Text>
                    )}
                </View>

                <Text style={styles.name}>{displayName}</Text>
                <Text style={styles.email}>{profile?.email || user.email}</Text>
                <Text style={styles.role}>{profile?.role || user.role || 'citizen'}</Text>

                <View style={styles.avatarActions}>
                    <Pressable
                        onPress={() => void chooseAvatar()}
                        disabled={!token || uploadingAvatar || removingAvatar}
                        style={({ pressed }) => [
                            styles.primaryButton,
                            styles.avatarButton,
                            (!token || uploadingAvatar || removingAvatar) && styles.disabledButton,
                            pressed && styles.pressedButton,
                        ]}
                    >
                        {uploadingAvatar ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.primaryButtonText}>
                                {profile?.avatar ? 'Cambiar fotografía' : 'Añadir fotografía'}
                            </Text>
                        )}
                    </Pressable>

                    {!!profile?.avatar && (
                        <Pressable
                            onPress={removeAvatar}
                            disabled={removingAvatar || uploadingAvatar}
                            style={[styles.deleteButton, styles.avatarButton]}
                        >
                            {removingAvatar ? (
                                <ActivityIndicator />
                            ) : (
                                <Text style={styles.deleteButtonText}>Eliminar foto</Text>
                            )}
                        </Pressable>
                    )}
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.section}>Datos personales</Text>
                {loadingProfile ? (
                    <ActivityIndicator style={styles.loader} />
                ) : (
                    <>
                        <Text style={styles.label}>Nombre completo</Text>
                        <TextInput
                            value={form.name}
                            onChangeText={(value) => changeField('name', value)}
                            placeholder="Su nombre completo"
                            maxLength={120}
                            editable={!!token && !savingProfile}
                            style={styles.input}
                        />

                        <Text style={styles.label}>Correo electrónico</Text>
                        <TextInput
                            value={profile?.email || user.email}
                            editable={false}
                            style={[styles.input, styles.readOnlyInput]}
                            keyboardType="email-address"
                        />

                        <Text style={styles.label}>Teléfono</Text>
                        <TextInput
                            value={form.phone}
                            onChangeText={(value) => changeField('phone', value)}
                            placeholder="Su número de contacto"
                            maxLength={30}
                            keyboardType="phone-pad"
                            editable={!!token && !savingProfile}
                            style={styles.input}
                        />

                        <Text style={styles.label}>Ciudad</Text>
                        <TextInput
                            value={form.city}
                            onChangeText={(value) => changeField('city', value)}
                            placeholder="Ciudad de residencia"
                            maxLength={100}
                            editable={!!token && !savingProfile}
                            style={styles.input}
                        />

                        <Text style={styles.label}>Sobre mí</Text>
                        <TextInput
                            value={form.bio}
                            onChangeText={(value) => changeField('bio', value)}
                            placeholder="Cuéntenos algo sobre usted"
                            maxLength={500}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            editable={!!token && !savingProfile}
                            style={[styles.input, styles.bioInput]}
                        />
                        <Text style={styles.characterCount}>{form.bio.length}/500 caracteres</Text>

                        <Pressable
                            onPress={() => void saveProfile()}
                            disabled={!token || savingProfile || loadingProfile}
                            style={({ pressed }) => [
                                styles.primaryButton,
                                (!token || savingProfile || loadingProfile) && styles.disabledButton,
                                pressed && styles.pressedButton,
                            ]}
                        >
                            {savingProfile ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.primaryButtonText}>Guardar datos personales</Text>
                            )}
                        </Pressable>
                    </>
                )}
            </View>

            <View style={styles.card}>
                <Text style={styles.section}>Mis hojas de vida</Text>
                <Text style={styles.description}>
                    Guarde sus documentos PDF para tenerlos disponibles en NEXO. El límite por archivo es de 5 MB.
                </Text>

                <Pressable
                    onPress={() => void uploadResume()}
                    disabled={!token || uploading}
                    style={({ pressed }) => [
                        styles.primaryButton,
                        (!token || uploading) && styles.disabledButton,
                        pressed && styles.pressedButton,
                    ]}
                >
                    {uploading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.primaryButtonText}>Seleccionar hoja de vida PDF</Text>
                    )}
                </Pressable>

                {loading && <ActivityIndicator style={styles.loader} />}
                {!!error && <Text style={styles.error}>{error}</Text>}

                {!loading && resumes.length === 0 && (
                    <Text style={styles.empty}>Todavía no tiene hojas de vida guardadas.</Text>
                )}

                {resumes.map((resume) => (
                    <View key={resume.id} style={styles.resumeItem}>
                        <View style={styles.resumeInfo}>
                            <Text style={styles.resumeName} numberOfLines={2}>
                                {resume.original_name}
                            </Text>
                            <Text style={styles.resumeMeta}>
                                {(resume.file_size / 1024).toFixed(0)} KB
                            </Text>
                        </View>

                        <View style={styles.actions}>
                            <Pressable
                                disabled={busyResumeId === resume.id}
                                onPress={() => void downloadResume(resume)}
                                style={styles.secondaryButton}
                            >
                                <Text style={styles.secondaryButtonText}>
                                    {busyResumeId === resume.id ? 'Procesando…' : 'Descargar'}
                                </Text>
                            </Pressable>

                            <Pressable
                                disabled={busyResumeId === resume.id}
                                onPress={() => deleteResume(resume)}
                                style={styles.deleteButton}
                            >
                                <Text style={styles.deleteButtonText}>Eliminar</Text>
                            </Pressable>
                        </View>
                    </View>
                ))}

                <Pressable
                    onPress={() => void loadResumes()}
                    disabled={loading}
                    style={styles.refreshButton}
                >
                    <Text style={styles.refreshText}>Actualizar lista</Text>
                </Pressable>
            </View>

            <View style={styles.card}>
                <Text style={styles.section}>Seguridad y confianza</Text>
                <Text style={styles.infoText}>• Ubicación controlada</Text>
                <Text style={styles.infoText}>• Reputación comunitaria</Text>
                <Text style={styles.infoText}>• Reporte y bloqueo de usuarios</Text>
                <Text style={styles.infoText}>• Contactos de emergencia</Text>
            </View>

            <Pressable onPress={logout}>
                <Text style={styles.logout}>Cerrar sesión</Text>
            </Pressable>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.background,
    },
    content: {
        padding: 20,
        paddingBottom: 110,
    },
    title: {
        fontSize: 29,
        fontWeight: '900',
        color: colors.text,
        marginBottom: 18,
    },
    card: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 18,
        padding: 20,
        marginBottom: 12,
    },
    avatar: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: colors.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarText: {
        fontSize: 34,
        fontWeight: '900',
        color: colors.primary,
    },
    avatarActions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
        marginTop: 14,
    },
    avatarButton: {
        marginBottom: 0,
    },
    name: {
        fontSize: 19,
        fontWeight: '900',
        color: colors.text,
        textAlign: 'center',
        marginTop: 10,
    },
    email: {
        fontSize: 12,
        color: colors.muted,
        textAlign: 'center',
        marginTop: 3,
    },
    role: {
        alignSelf: 'center',
        marginTop: 10,
        color: colors.success,
        fontWeight: '900',
    },
    section: {
        fontWeight: '900',
        fontSize: 17,
        color: colors.text,
        marginBottom: 8,
    },
    description: {
        fontSize: 13,
        color: colors.muted,
        lineHeight: 20,
        marginBottom: 14,
    },
    label: {
        color: colors.text,
        fontWeight: '700',
        fontSize: 13,
        marginTop: 10,
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 11,
        color: colors.text,
        backgroundColor: '#fff',
        fontSize: 14,
    },
    readOnlyInput: {
        backgroundColor: '#F3F4F6',
        color: colors.muted,
    },
    bioInput: {
        minHeight: 100,
    },
    characterCount: {
        color: colors.muted,
        fontSize: 11,
        textAlign: 'right',
        marginTop: 4,
        marginBottom: 12,
    },
    primaryButton: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
        marginBottom: 12,
    },
    disabledButton: {
        opacity: 0.55,
    },
    pressedButton: {
        opacity: 0.8,
    },
    primaryButtonText: {
        color: '#fff',
        fontWeight: '800',
        textAlign: 'center',
    },
    loader: {
        marginVertical: 14,
    },
    error: {
        color: colors.danger,
        fontSize: 13,
        marginVertical: 8,
    },
    empty: {
        color: colors.muted,
        fontSize: 13,
        paddingVertical: 12,
    },
    resumeItem: {
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 12,
        marginTop: 8,
    },
    resumeInfo: {
        marginBottom: 10,
    },
    resumeName: {
        color: colors.text,
        fontWeight: '700',
        fontSize: 14,
    },
    resumeMeta: {
        color: colors.muted,
        fontSize: 12,
        marginTop: 4,
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    secondaryButton: {
        borderWidth: 1,
        borderColor: colors.primary,
        borderRadius: 9,
        paddingHorizontal: 12,
        paddingVertical: 9,
    },
    secondaryButtonText: {
        color: colors.primary,
        fontWeight: '700',
        fontSize: 12,
    },
    deleteButton: {
        borderWidth: 1,
        borderColor: colors.danger,
        borderRadius: 9,
        paddingHorizontal: 12,
        paddingVertical: 9,
    },
    deleteButtonText: {
        color: colors.danger,
        fontWeight: '700',
        fontSize: 12,
    },
    refreshButton: {
        alignSelf: 'flex-start',
        paddingVertical: 12,
    },
    refreshText: {
        color: colors.primary,
        fontWeight: '800',
    },
    infoText: {
        color: colors.muted,
        fontSize: 13,
        marginVertical: 4,
    },
    logout: {
        color: colors.danger,
        textAlign: 'center',
        fontWeight: '900',
        padding: 15,
    },
});
