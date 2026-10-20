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
import * as ImagePicker from 'expo-image-picker';

import type { User } from '../models/User';
import { colors } from '../shared/theme';
import { ProfileService, type EditableProfile, type Profile } from '../services/ProfileService';
import { ResumeService, type Resume } from '../services/ResumeService';

type ProfileViewProps = {
    user: User;
    token?: string;
    logout: () => void;
};

function getRoleLabel(role?: string): string {
    const normalized = (role || '').trim().toLowerCase();

    const labels: Record<string, string> = {
        citizen: 'Ciudadano',
        communityadmin: 'Administrador comunitario',
        institution: 'Institución',
    };

    return labels[normalized] || role || 'Ciudadano';
}

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
    const [editingProfile, setEditingProfile] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [removingAvatar, setRemovingAvatar] = useState(false);

    const [resumes, setResumes] = useState<Resume[]>([]);
    const [loadingResumes, setLoadingResumes] = useState(false);
    const [uploadingResume, setUploadingResume] = useState(false);
    const [busyResumeId, setBusyResumeId] = useState<number | null>(null);
    const [resumeError, setResumeError] = useState('');

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
                'No se pudo cargar el perfil',
                err instanceof Error ? err.message : 'Inténtelo nuevamente.',
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

        setLoadingResumes(true);
        setResumeError('');
        try {
            setResumes(await ResumeService.list(token));
        } catch (err) {
            setResumeError(
                err instanceof Error ? err.message : 'No fue posible cargar las hojas de vida.',
            );
        } finally {
            setLoadingResumes(false);
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
            setEditingProfile(false);
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

    const cancelProfileEdit = () => {
        setForm({
            name: profile?.name || user.name || '',
            bio: profile?.bio || '',
            phone: profile?.phone || '',
            city: profile?.city || '',
        });
        setEditingProfile(false);
    };

    const chooseAvatar = async () => {
        if (!token) {
            showMessage('Sesión requerida', 'Inicie sesión para cambiar su fotografía.');
            return;
        }

        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                showMessage('Permiso requerido', 'Autorice el acceso a sus fotografías para seleccionar una imagen.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (result.canceled || !result.assets[0]) return;

            const asset = result.assets[0];
            if (asset.fileSize && asset.fileSize > 2 * 1024 * 1024) {
                showMessage('Imagen demasiado grande', 'La fotografía no puede superar los 2 MB.');
                return;
            }

            const mimeType = asset.mimeType || 'image/jpeg';
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
                showMessage('Formato no válido', 'Seleccione una imagen JPG, PNG o WEBP.');
                return;
            }

            setUploadingAvatar(true);
            const updated = await ProfileService.uploadAvatar(token, {
                uri: asset.uri,
                fileName: asset.fileName || `foto-perfil.${mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg'}`,
                mimeType,
                file: asset.file,
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
            showMessage('Sesión requerida', 'Inicie sesión para administrar sus hojas de vida.');
            return;
        }

        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
                multiple: false,
            });
            if (result.canceled || !result.assets[0]) return;

            setUploadingResume(true);
            setResumeError('');
            await ResumeService.upload(token, result.assets[0]);
            await loadResumes();
            showMessage('Carga completada', 'La hoja de vida se guardó correctamente.');
        } catch (err) {
            showMessage(
                'No se pudo subir el archivo',
                err instanceof Error ? err.message : 'Inténtelo nuevamente.',
            );
        } finally {
            setUploadingResume(false);
        }
    };

    const downloadResume = async (resume: Resume) => {
        if (!token) return;
        setBusyResumeId(resume.id);
        setResumeError('');
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
            setResumeError('');
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
            if (window.confirm(`¿Desea eliminar "${resume.original_name}"?`)) void performDelete();
            return;
        }

        Alert.alert('Eliminar hoja de vida', `¿Desea eliminar "${resume.original_name}"?`, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Eliminar', style: 'destructive', onPress: () => void performDelete() },
        ]);
    };

    const displayName = profile?.name || user.name || 'Usuario';

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.hero}>
                <View style={styles.heroDecorOne} />
                <View style={styles.heroDecorTwo} />
                <View style={styles.heroTopRow}>
                    <View>
                        <Text style={styles.eyebrow}>ESPACIO PERSONAL</Text>
                        <Text style={styles.title}>¡Hola!</Text>
                        <Text style={styles.heroSubtitle}>Tu perfil en la comunidad NEXO</Text>
                    </View>
                    <View style={styles.heroIcon}>
                        <Text style={styles.heroIconText}>✦</Text>
                    </View>
                </View>
                <View style={styles.heroIllustration}>
                    <View style={styles.illustrationBubble}>
                        <Text style={styles.illustrationEmoji}>☁️</Text>
                    </View>
                    <View style={styles.illustrationPerson}>
                        <Text style={styles.personEmoji}>🧑🏻‍💻</Text>
                    </View>
                    <View style={styles.illustrationSparkle}><Text style={styles.sparkleText}>✦</Text></View>
                    <View style={styles.illustrationDot} />
                </View>
            </View>

            <View style={styles.profileCard}>
                <View style={styles.profileHeader}>
                    <View style={styles.avatarWrap}>
                        {profile?.avatar ? (
                            <Image source={{ uri: profile.avatar }} style={styles.avatarImage} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
                            </View>
                        )}
                        <Pressable
                            onPress={() => void chooseAvatar()}
                            disabled={!token || uploadingAvatar || removingAvatar}
                            style={styles.cameraBadge}
                            accessibilityLabel="Cambiar fotografía"
                        >
                            {uploadingAvatar ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.cameraEmoji}>📷</Text>}
                        </Pressable>
                    </View>
                    <View style={styles.profileIdentity}>
                        <Text style={styles.name}>{displayName}</Text>
                        <Text style={styles.email}>{profile?.email || user.email}</Text>
                        <View style={styles.rolePill}>
                            <Text style={styles.roleText}>{getRoleLabel(profile?.role || user.role)}</Text>
                        </View>
                    </View>
                </View>
                <View style={styles.profileActions}>
                    <Pressable
                        onPress={() => void chooseAvatar()}
                        disabled={!token || uploadingAvatar}
                        style={({ pressed }) => [styles.softButton, pressed && styles.pressed]}
                    >
                        <Text style={styles.softButtonEmoji}>🖼️</Text>
                        <Text style={styles.softButtonText}>Cambiar foto</Text>
                    </Pressable>
                    {profile?.avatar && (
                        <Pressable
                            onPress={removeAvatar}
                            disabled={removingAvatar || uploadingAvatar}
                            style={({ pressed }) => [styles.softDangerButton, pressed && styles.pressed]}
                        >
                            <Text style={styles.softButtonEmoji}>🗑️</Text>
                            <Text style={styles.softDangerText}>Quitar foto</Text>
                        </Pressable>
                    )}
                </View>
            </View>

            <View style={styles.sectionHeading}>
                <View>
                    <Text style={styles.sectionTitle}>Información personal</Text>
                    <Text style={styles.sectionSubtitle}>Cuéntale a la comunidad sobre ti</Text>
                </View>
                <View style={styles.headingIcon}><Text style={styles.headingIconText}>✎</Text></View>
            </View>

            <View style={styles.infoCard}>
                {loadingProfile ? (
                    <ActivityIndicator style={styles.loader} />
                ) : !editingProfile ? (
                    <>
                        <View style={styles.detailRow}>
                            <View style={[styles.fieldIcon, styles.blueIcon]}><Text>👤</Text></View>
                            <View style={styles.detailCopy}>
                                <Text style={styles.detailLabel}>Nombre completo</Text>
                                <Text style={styles.detailValue}>{profile?.name || user.name || 'Sin especificar'}</Text>
                            </View>
                        </View>
                        <View style={styles.detailRow}>
                            <View style={[styles.fieldIcon, styles.purpleIcon]}><Text>✉️</Text></View>
                            <View style={styles.detailCopy}>
                                <Text style={styles.detailLabel}>Correo electrónico</Text>
                                <Text style={styles.detailValue}>{profile?.email || user.email}</Text>
                            </View>
                        </View>
                        <View style={styles.detailRow}>
                            <View style={[styles.fieldIcon, styles.greenIcon]}><Text>📱</Text></View>
                            <View style={styles.detailCopy}>
                                <Text style={styles.detailLabel}>Teléfono</Text>
                                <Text style={styles.detailValue}>{profile?.phone || 'Sin especificar'}</Text>
                            </View>
                        </View>
                        <View style={styles.detailRow}>
                            <View style={[styles.fieldIcon, styles.orangeIcon]}><Text>📍</Text></View>
                            <View style={styles.detailCopy}>
                                <Text style={styles.detailLabel}>Ciudad</Text>
                                <Text style={styles.detailValue}>{profile?.city || 'Sin especificar'}</Text>
                            </View>
                        </View>
                        <View style={[styles.detailRow, styles.bioDetailRow]}>
                            <View style={[styles.fieldIcon, styles.pinkIcon]}><Text>💬</Text></View>
                            <View style={styles.detailCopy}>
                                <Text style={styles.detailLabel}>Sobre mí</Text>
                                <Text style={styles.detailValue}>{profile?.bio || 'Aún no has agregado una descripción.'}</Text>
                            </View>
                        </View>
                        <Pressable
                            onPress={() => setEditingProfile(true)}
                            disabled={!token}
                            style={({ pressed }) => [
                                styles.saveButton,
                                styles.editInfoButton,
                                !token && styles.disabledButton,
                                pressed && styles.pressed,
                            ]}
                        >
                            <Text style={styles.saveButtonText}>✎  Editar información</Text>
                        </Pressable>
                    </>
                ) : (
                    <>
                        <View style={styles.editingNotice}>
                            <Text style={styles.editingNoticeText}>Actualiza tus datos aquí. El correo electrónico no se puede modificar.</Text>
                        </View>
                        <View style={styles.fieldLabelRow}>
                            <View style={[styles.fieldIcon, styles.blueIcon]}><Text>👤</Text></View>
                            <Text style={styles.label}>Nombre completo</Text>
                        </View>
                        <TextInput value={form.name} onChangeText={(value) => changeField('name', value)} placeholder="Tu nombre completo" maxLength={120} editable={!!token && !savingProfile} style={styles.input} />
                        <View style={styles.fieldLabelRow}>
                            <View style={[styles.fieldIcon, styles.purpleIcon]}><Text>✉️</Text></View>
                            <Text style={styles.label}>Correo electrónico</Text>
                        </View>
                        <TextInput value={profile?.email || user.email} editable={false} style={[styles.input, styles.readOnlyInput]} keyboardType="email-address" />
                        <View style={styles.fieldLabelRow}>
                            <View style={[styles.fieldIcon, styles.greenIcon]}><Text>📱</Text></View>
                            <Text style={styles.label}>Teléfono</Text>
                        </View>
                        <TextInput value={form.phone} onChangeText={(value) => changeField('phone', value)} placeholder="Tu número de contacto" maxLength={30} keyboardType="phone-pad" editable={!!token && !savingProfile} style={styles.input} />
                        <View style={styles.fieldLabelRow}>
                            <View style={[styles.fieldIcon, styles.orangeIcon]}><Text>📍</Text></View>
                            <Text style={styles.label}>Ciudad</Text>
                        </View>
                        <TextInput value={form.city} onChangeText={(value) => changeField('city', value)} placeholder="Ciudad donde vives" maxLength={100} editable={!!token && !savingProfile} style={styles.input} />
                        <View style={styles.fieldLabelRow}>
                            <View style={[styles.fieldIcon, styles.pinkIcon]}><Text>💬</Text></View>
                            <Text style={styles.label}>Sobre mí</Text>
                        </View>
                        <TextInput value={form.bio} onChangeText={(value) => changeField('bio', value)} placeholder="Comparte tus intereses, habilidades o cómo puedes aportar a la comunidad..." maxLength={500} multiline numberOfLines={4} textAlignVertical="top" editable={!!token && !savingProfile} style={[styles.input, styles.bioInput]} />
                        <Text style={styles.characterCount}>{form.bio.length}/500 caracteres</Text>
                        <Pressable
                            onPress={() => void saveProfile()}
                            disabled={!token || savingProfile || loadingProfile}
                            style={({ pressed }) => [
                                styles.saveButton,
                                (!token || savingProfile || loadingProfile) && styles.disabledButton,
                                pressed && styles.pressed,
                            ]}
                        >
                            {savingProfile ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>✓  Guardar cambios</Text>}
                        </Pressable>
                        <Pressable onPress={cancelProfileEdit} disabled={savingProfile} style={({ pressed }) => [styles.cancelEditButton, pressed && styles.pressed]}>
                            <Text style={styles.cancelEditText}>Cancelar</Text>
                        </Pressable>
                    </>
                )}
            </View>

            <View style={styles.sectionHeading}>
                <View>
                    <Text style={styles.sectionTitle}>Mis hojas de vida</Text>
                    <Text style={styles.sectionSubtitle}>Tus documentos listos cuando los necesites</Text>
                </View>
                <View style={[styles.headingIcon, styles.pdfHeadingIcon]}><Text style={styles.headingIconText}>▤</Text></View>
            </View>

            <View style={styles.resumeCard}>
                <View style={styles.resumeBanner}>
                    <View style={styles.resumeBannerIcon}><Text style={styles.resumeBannerEmoji}>📁</Text></View>
                    <View style={styles.resumeBannerTextWrap}>
                        <Text style={styles.resumeBannerTitle}>Tu experiencia cuenta</Text>
                        <Text style={styles.resumeBannerText}>Guarda tus hojas de vida en PDF, hasta 5 MB por archivo.</Text>
                    </View>
                </View>

                <Pressable
                    onPress={() => void uploadResume()}
                    disabled={!token || uploadingResume}
                    style={({ pressed }) => [
                        styles.uploadButton,
                        (!token || uploadingResume) && styles.disabledButton,
                        pressed && styles.pressed,
                    ]}
                >
                    {uploadingResume ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.uploadButtonText}>＋  Subir hoja de vida PDF</Text>}
                </Pressable>

                {loadingResumes && <ActivityIndicator style={styles.loader} />}
                {!!resumeError && <Text style={styles.error}>{resumeError}</Text>}

                {!loadingResumes && resumes.length === 0 && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyEmoji}>📄</Text>
                        <Text style={styles.emptyTitle}>Todavía no tienes documentos</Text>
                        <Text style={styles.emptyText}>Sube tu hoja de vida para tenerla disponible en NEXO.</Text>
                    </View>
                )}

                {resumes.map((resume) => (
                    <View key={resume.id} style={styles.resumeItem}>
                        <View style={styles.pdfIcon}><Text style={styles.pdfIconText}>PDF</Text></View>
                        <View style={styles.resumeInfo}>
                            <Text style={styles.resumeName} numberOfLines={2}>{resume.original_name}</Text>
                            <Text style={styles.resumeMeta}>{(resume.file_size / 1024).toFixed(0)} KB · {new Date(resume.created_at).toLocaleDateString()}</Text>
                        </View>
                        <View style={styles.resumeActions}>
                            <Pressable
                                disabled={busyResumeId === resume.id}
                                onPress={() => void downloadResume(resume)}
                                style={styles.iconAction}
                                accessibilityLabel="Descargar hoja de vida"
                            >
                                <Text style={styles.actionEmoji}>⬇️</Text>
                            </Pressable>
                            <Pressable
                                disabled={busyResumeId === resume.id}
                                onPress={() => deleteResume(resume)}
                                style={styles.iconAction}
                                accessibilityLabel="Eliminar hoja de vida"
                            >
                                <Text style={styles.actionEmoji}>⋮</Text>
                            </Pressable>
                        </View>
                    </View>
                ))}

                <Pressable onPress={() => void loadResumes()} disabled={loadingResumes} style={styles.refreshButton}>
                    <Text style={styles.refreshText}>↻  Actualizar documentos</Text>
                </Pressable>
            </View>

            <View style={styles.trustCard}>
                <View style={styles.trustIcon}><Text style={styles.trustEmoji}>🛡️</Text></View>
                <View style={styles.trustCopy}>
                    <Text style={styles.trustTitle}>Seguridad y confianza</Text>
                    <Text style={styles.trustText}>Tu cuenta, tus datos y tu participación en la comunidad NEXO.</Text>
                    <Text style={styles.trustBullet}>• Ubicación controlada</Text>
                    <Text style={styles.trustBullet}>• Reputación comunitaria</Text>
                    <Text style={styles.trustBullet}>• Reporte y bloqueo de usuarios</Text>
                    <Text style={styles.trustBullet}>• Contactos de emergencia</Text>
                </View>
            </View>

            <Pressable onPress={logout} style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}>
                <Text style={styles.logout}>↪  Cerrar sesión</Text>
            </Pressable>
            <Text style={styles.footer}>NEXO · Conectando personas y oportunidades</Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FF',
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 125,
    },
    hero: {
        minHeight: 190,
        borderRadius: 26,
        padding: 20,
        overflow: 'hidden',
        backgroundColor: '#E7E8FF',
        marginBottom: 18,
    },
    heroDecorOne: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        right: -50,
        top: -75,
        backgroundColor: '#D4D8FF',
    },
    heroDecorTwo: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        right: 70,
        bottom: -82,
        backgroundColor: '#D8E8FF',
    },
    heroTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        zIndex: 1,
    },
    eyebrow: {
        color: '#6557C8',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1.6,
        marginBottom: 7,
    },
    title: {
        color: '#20254B',
        fontSize: 29,
        fontWeight: '900',
    },
    heroSubtitle: {
        color: '#555B83',
        fontSize: 12,
        marginTop: 4,
        maxWidth: 215,
    },
    heroIcon: {
        width: 38,
        height: 38,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFFB8',
    },
    heroIconText: {
        color: '#6A5AE0',
        fontSize: 23,
        fontWeight: '900',
    },
    heroIllustration: {
        position: 'absolute',
        right: 20,
        bottom: 4,
        width: 125,
        height: 104,
        alignItems: 'center',
        justifyContent: 'center',
    },
    illustrationBubble: {
        position: 'absolute',
        right: 5,
        top: 0,
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFFFFFA8',
        alignItems: 'center',
        justifyContent: 'center',
    },
    illustrationEmoji: {
        fontSize: 23,
    },
    illustrationPerson: {
        position: 'absolute',
        bottom: 0,
        left: 17,
        width: 77,
        height: 77,
        borderRadius: 30,
        backgroundColor: '#B8B5FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    personEmoji: {
        fontSize: 49,
    },
    illustrationSparkle: {
        position: 'absolute',
        left: 1,
        top: 23,
    },
    sparkleText: {
        color: '#7868E8',
        fontSize: 20,
    },
    illustrationDot: {
        position: 'absolute',
        width: 9,
        height: 9,
        borderRadius: 5,
        right: 0,
        bottom: 14,
        backgroundColor: '#F5A7C8',
    },
    profileCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 23,
        padding: 18,
        marginBottom: 22,
        borderWidth: 1,
        borderColor: '#E9EAF6',
        shadowColor: '#5B5C9A',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.07,
        shadowRadius: 14,
        elevation: 3,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    avatarWrap: {
        width: 116,
        height: 116,
        borderRadius: 35,
        backgroundColor: '#E9E7FF',
        padding: 4,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 31,
    },
    avatarPlaceholder: {
        flex: 1,
        borderRadius: 31,
        backgroundColor: '#DCD9FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 42,
        fontWeight: '900',
        color: '#6153C7',
    },
    cameraBadge: {
        position: 'absolute',
        right: -4,
        bottom: -4,
        width: 35,
        height: 35,
        borderRadius: 13,
        backgroundColor: '#5F55E8',
        borderWidth: 3,
        borderColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cameraEmoji: {
        fontSize: 13,
    },
    profileIdentity: {
        flex: 1,
        paddingTop: 5,
        minWidth: 0,
    },
    name: {
        color: '#222647',
        fontSize: 18,
        fontWeight: '900',
        marginBottom: 4,
    },
    email: {
        color: '#7A7E9B',
        fontSize: 11,
    },
    rolePill: {
        alignSelf: 'flex-start',
        maxWidth: '100%',
        paddingHorizontal: 11,
        paddingVertical: 6,
        backgroundColor: '#E9E8FF',
        borderRadius: 20,
        marginTop: 9,
    },
    roleText: {
        color: '#5D50C8',
        fontSize: 11,
        fontWeight: '800',
    },
    profileActions: {
        flexDirection: 'row',
        gap: 9,
        marginTop: 17,
    },
    softButton: {
        flex: 1,
        minHeight: 42,
        borderRadius: 13,
        backgroundColor: '#F0F0FF',
        flexDirection: 'row',
        gap: 7,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    softButtonEmoji: {
        fontSize: 15,
    },
    softButtonText: {
        color: '#5D50C8',
        fontSize: 12,
        fontWeight: '800',
    },
    softDangerButton: {
        flex: 1,
        minHeight: 42,
        borderRadius: 13,
        backgroundColor: '#FFF0F1',
        flexDirection: 'row',
        gap: 7,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    softDangerText: {
        color: '#C74A61',
        fontSize: 12,
        fontWeight: '800',
    },
    sectionHeading: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 11,
        paddingHorizontal: 2,
    },
    sectionTitle: {
        color: '#25294B',
        fontSize: 17,
        fontWeight: '900',
    },
    sectionSubtitle: {
        color: '#8589A5',
        fontSize: 11,
        marginTop: 4,
    },
    headingIcon: {
        width: 39,
        height: 39,
        borderRadius: 14,
        backgroundColor: '#E9E8FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headingIconText: {
        color: '#6255D2',
        fontSize: 22,
        fontWeight: '900',
    },
    pdfHeadingIcon: {
        backgroundColor: '#E1F3FF',
    },
    infoCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        padding: 17,
        marginBottom: 23,
        borderWidth: 1,
        borderColor: '#E9EAF6',
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F1F8',
    },
    bioDetailRow: {
        borderBottomWidth: 0,
        paddingBottom: 16,
    },
    detailCopy: {
        flex: 1,
        paddingTop: 1,
    },
    detailLabel: {
        color: '#8589A5',
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 5,
    },
    detailValue: {
        color: '#303453',
        fontSize: 13,
        lineHeight: 19,
        fontWeight: '600',
    },
    editInfoButton: {
        marginTop: 8,
    },
    editingNotice: {
        backgroundColor: '#F0EDFF',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
    },
    editingNoticeText: {
        color: '#5D50C8',
        fontSize: 11,
        lineHeight: 16,
    },
    cancelEditButton: {
        alignItems: 'center',
        paddingVertical: 12,
        marginTop: 2,
    },
    cancelEditText: {
        color: '#747895',
        fontSize: 12,
        fontWeight: '800',
    },
    fieldLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        marginTop: 8,
        marginBottom: 7,
    },
    fieldIcon: {
        width: 30,
        height: 30,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    blueIcon: { backgroundColor: '#E5F0FF' },
    purpleIcon: { backgroundColor: '#F0E9FF' },
    greenIcon: { backgroundColor: '#E2F8EE' },
    orangeIcon: { backgroundColor: '#FFF0E1' },
    pinkIcon: { backgroundColor: '#FFE8F1' },
    label: {
        color: '#3B3F60',
        fontSize: 12,
        fontWeight: '800',
    },
    input: {
        borderWidth: 1,
        borderColor: '#E7E9F4',
        borderRadius: 12,
        paddingHorizontal: 13,
        paddingVertical: 12,
        color: '#292D4D',
        backgroundColor: '#FAFBFF',
        fontSize: 13,
    },
    readOnlyInput: {
        backgroundColor: '#F0F1F7',
        color: '#8589A5',
    },
    bioInput: {
        minHeight: 100,
    },
    characterCount: {
        color: '#9296AF',
        fontSize: 10,
        textAlign: 'right',
        marginTop: 5,
        marginBottom: 12,
    },
    saveButton: {
        backgroundColor: '#6257E8',
        borderRadius: 14,
        padding: 15,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 49,
        shadowColor: '#6257E8',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
        elevation: 3,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontWeight: '900',
        fontSize: 13,
    },
    resumeCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        padding: 16,
        marginBottom: 19,
        borderWidth: 1,
        borderColor: '#E9EAF6',
    },
    resumeBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 13,
        borderRadius: 17,
        backgroundColor: '#F0EDFF',
        marginBottom: 14,
        gap: 12,
    },
    resumeBannerIcon: {
        width: 52,
        height: 52,
        borderRadius: 17,
        backgroundColor: '#DDD8FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    resumeBannerEmoji: {
        fontSize: 28,
    },
    resumeBannerTextWrap: {
        flex: 1,
    },
    resumeBannerTitle: {
        color: '#3C347F',
        fontSize: 13,
        fontWeight: '900',
        marginBottom: 4,
    },
    resumeBannerText: {
        color: '#6E6998',
        fontSize: 11,
        lineHeight: 16,
    },
    uploadButton: {
        backgroundColor: '#6257E8',
        borderRadius: 13,
        padding: 14,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 47,
        marginBottom: 8,
    },
    uploadButtonText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '900',
    },
    loader: {
        marginVertical: 14,
    },
    error: {
        color: colors.danger,
        fontSize: 12,
        marginVertical: 8,
    },
    emptyState: {
        alignItems: 'center',
        backgroundColor: '#FAFAFF',
        borderRadius: 15,
        padding: 20,
        marginTop: 8,
    },
    emptyEmoji: {
        fontSize: 29,
        marginBottom: 7,
    },
    emptyTitle: {
        color: '#373B5C',
        fontSize: 12,
        fontWeight: '900',
        textAlign: 'center',
    },
    emptyText: {
        color: '#8589A5',
        fontSize: 11,
        lineHeight: 16,
        textAlign: 'center',
        marginTop: 5,
    },
    resumeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F1F8',
        paddingVertical: 12,
        gap: 10,
    },
    pdfIcon: {
        width: 42,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#FFE9E9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    pdfIconText: {
        color: '#E64E59',
        fontSize: 10,
        fontWeight: '900',
    },
    resumeInfo: {
        flex: 1,
    },
    resumeName: {
        color: '#353957',
        fontWeight: '800',
        fontSize: 12,
    },
    resumeMeta: {
        color: '#9094AC',
        fontSize: 10,
        marginTop: 5,
    },
    resumeActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    iconAction: {
        width: 32,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#F4F4FC',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionEmoji: {
        fontSize: 15,
    },
    refreshButton: {
        alignSelf: 'center',
        paddingVertical: 13,
        paddingHorizontal: 12,
        marginTop: 4,
    },
    refreshText: {
        color: '#6257D2',
        fontWeight: '900',
        fontSize: 12,
    },
    trustCard: {
        flexDirection: 'row',
        gap: 13,
        padding: 17,
        borderRadius: 21,
        backgroundColor: '#E9F7F2',
        borderWidth: 1,
        borderColor: '#D6EEE5',
        marginBottom: 18,
    },
    trustIcon: {
        width: 43,
        height: 43,
        borderRadius: 14,
        backgroundColor: '#D2F0E5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    trustEmoji: {
        fontSize: 22,
    },
    trustCopy: {
        flex: 1,
    },
    trustTitle: {
        color: '#235B4D',
        fontSize: 14,
        fontWeight: '900',
        marginBottom: 5,
    },
    trustText: {
        color: '#4D7A6D',
        fontSize: 11,
        lineHeight: 16,
        marginBottom: 8,
    },
    trustBullet: {
        color: '#386B5C',
        fontSize: 11,
        marginTop: 4,
    },
    logoutButton: {
        alignItems: 'center',
        paddingVertical: 13,
        borderRadius: 14,
        backgroundColor: '#FFF0F2',
        borderWidth: 1,
        borderColor: '#F9DDE2',
    },
    logout: {
        color: '#C34E62',
        textAlign: 'center',
        fontWeight: '900',
        fontSize: 13,
    },
    footer: {
        color: '#A0A4B9',
        fontSize: 10,
        textAlign: 'center',
        marginTop: 15,
        marginBottom: 4,
    },
    disabledButton: {
        opacity: 0.55,
    },
    pressed: {
        opacity: 0.78,
    },
});
