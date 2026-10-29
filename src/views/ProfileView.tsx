import { useCallback } from 'react';
import {
    Alert,
    ActivityIndicator,
    Image,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import type { User } from '../models/User';
import { colors } from '../shared/theme';
import { useProfileViewModel } from '../viewmodels/useProfileViewModel';

type ProfileViewProps = {
    user: User;
    token?: string;
    logout: () => void;
};

export function ProfileView({ user, token, logout }: ProfileViewProps) {
    const showMessage = useCallback((title: string, message: string) => {
        if (Platform.OS === 'web') {
            window.alert(`${title}\n\n${message}`);
        } else {
            Alert.alert(title, message);
        }
    }, []);

    const vm = useProfileViewModel({ user, token, notify: showMessage });
    const {
        profile, form, loadingProfile, savingProfile, uploadingAvatar, removingAvatar,
        resumes, loading, uploading, busyResumeId, error,
        loadResumes, changeField, saveProfile, chooseAvatar, removeAvatar,
        uploadResume, downloadResume, deleteResume,
    } = vm;

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
                <Text style={styles.role}>{profile?.role || user.role || 'ciudadano'}</Text>

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
                                disabled={busyResumeId === Number(resume.id)}
                                onPress={() => void downloadResume(resume)}
                                style={styles.secondaryButton}
                            >
                                <Text style={styles.secondaryButtonText}>
                                    {busyResumeId === resume.id ? 'Procesando…' : 'Descargar'}
                                </Text>
                            </Pressable>

                            <Pressable
                                disabled={busyResumeId === Number(resume.id)}
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
