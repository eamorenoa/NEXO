import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import { useNeedsViewModel } from '../viewmodels/useNeedsViewModel';
import { Card } from '../components/Card';
import { colors } from '../shared/theme';
import { LocationPicker } from '../components/LocationPicker';

export function NeedsView({
    token,
    onBack,
}: {
    token?: string;
    onBack: () => void;
}) {
    const vm = useNeedsViewModel(token);

    return (
        <ScrollView
            style={{ backgroundColor: colors.background }}
            contentContainerStyle={s.content}
            keyboardShouldPersistTaps="handled"
        >
            <Pressable onPress={onBack}>
                <Text style={s.back}>‹ Inicio</Text>
            </Pressable>

            <Text style={s.title}>¿Qué necesita?</Text>

            <Text style={s.sub}>
                Describa su necesidad. NEXO AI la clasifica automáticamente.
                Puede añadir una ubicación para que otras personas la encuentren
                en el mapa.
            </Text>

            <Text style={s.label}>Descripción de la necesidad</Text>

            <TextInput
                multiline
                value={vm.description}
                onChangeText={vm.setDescription}
                editable={!vm.loading}
                maxLength={1000}
                placeholder="Ej. Necesito una persona que me ayude a llevar unas cajas..."
                accessibilityLabel="Descripción de la necesidad"
                style={s.input}
            />

            <LocationPicker
                value={{
                    address: vm.address,
                    latitude: vm.latitude.trim() === '' ? null : Number(vm.latitude),
                    longitude: vm.longitude.trim() === '' ? null : Number(vm.longitude),
                }}
                onChange={(location) => {
                    vm.setAddress(location.address);
                    vm.setLatitude(
                        location.latitude === null ? '' : String(location.latitude),
                    );
                    vm.setLongitude(
                        location.longitude === null ? '' : String(location.longitude),
                    );
                }}
                disabled={vm.loading}
            />

            <Pressable
                onPress={vm.editingId !== null ? vm.saveEditing : vm.create}
                disabled={vm.loading}
                style={[
                    s.button,
                    vm.loading && s.buttonDisabled,
                ]}
            >
                <Text style={s.buttonText}>
                    {vm.loading
                        ? 'Procesando…'
                        : vm.editingId !== null
                            ? 'Guardar cambios'
                            : 'Publicar necesidad'}
                </Text>
            </Pressable>

            {vm.editingId !== null && (
                <Pressable
                    onPress={vm.cancelEditing}
                    disabled={vm.loading}
                    style={s.cancelButton}
                >
                    <Text style={s.cancelText}>Cancelar edición</Text>
                </Pressable>
            )}

            {!!vm.success && (
                <Text style={s.success}>{vm.success}</Text>
            )}

            {!!vm.error && (
                <Text style={s.error}>{vm.error}</Text>
            )}

            <Text style={s.section}>Solicitudes recientes</Text>

            {vm.items.map(item => (
                <Card key={item.id}>
                    <View style={s.cardHeader}>
                        <Text style={s.badge}>
                            {item.ai_category || item.category}
                        </Text>

                        <Text style={s.status}>{item.status}</Text>
                    </View>

                    <Text style={s.desc}>{item.description}</Text>

                    {!!item.address && (
                        <Text style={s.address}>
                            Ubicación: {item.address}
                        </Text>
                    )}

                    {item.latitude != null && item.longitude != null && (
                        <Text style={s.coordinates}>
                            Coordenadas: {Number(item.latitude).toFixed(5)},{' '}
                            {Number(item.longitude).toFixed(5)}
                        </Text>
                    )}

                    <Text style={s.meta}>
                        {item.author || 'Usuario'} ·{' '}
                        {item.created_at
                            ? new Date(item.created_at).toLocaleDateString()
                            : 'Fecha no disponible'}
                    </Text>

                    {item.is_owner && (
                        <View style={s.actions}>
                            <Pressable
                                onPress={() => vm.startEditing(item)}
                                disabled={vm.loading}
                                style={s.editButton}
                            >
                                <Text style={s.editText}>Editar</Text>
                            </Pressable>

                            <Pressable
                                onPress={() => vm.remove(item)}
                                disabled={vm.loading}
                                style={s.deleteButton}
                            >
                                <Text style={s.deleteText}>Eliminar</Text>
                            </Pressable>
                        </View>
                    )}
                </Card>
            ))}

            {!vm.loading && vm.items.length === 0 && (
                <Text style={s.empty}>
                    Todavía no hay solicitudes para mostrar.
                </Text>
            )}
        </ScrollView>
    );
}

const s = StyleSheet.create({
    content: {
        padding: 20,
        paddingBottom: 110,
    },
    back: {
        color: colors.primary,
        fontWeight: '900',
        marginBottom: 14,
    },
    title: {
        fontSize: 29,
        fontWeight: '900',
        color: colors.text,
    },
    sub: {
        color: colors.muted,
        fontSize: 13,
        lineHeight: 19,
        marginTop: 5,
        marginBottom: 15,
    },
    label: {
        color: colors.text,
        fontSize: 13,
        fontWeight: '800',
        marginBottom: 6,
    },
    input: {
        minHeight: 130,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 18,
        backgroundColor: '#fff',
        padding: 15,
        textAlignVertical: 'top',
        fontSize: 14,
    },
    locationLabel: {
        color: colors.text,
        fontSize: 13,
        fontWeight: '800',
        marginTop: 12,
        marginBottom: 5,
    },
    locationInput: {
        minHeight: 46,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        fontSize: 14,
        color: colors.text,
    },
    locationHelp: {
        color: colors.muted,
        fontSize: 12,
        lineHeight: 18,
        marginTop: 8,
        marginBottom: 5,
    },
    button: {
        backgroundColor: colors.primary,
        minHeight: 50,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#fff',
        fontWeight: '900',
    },
    cancelButton: {
        alignItems: 'center',
        padding: 12,
    },
    cancelText: {
        color: colors.muted,
        fontWeight: '800',
    },
    success: {
        color: colors.success,
        fontWeight: '800',
        marginTop: 10,
    },
    error: {
        color: colors.danger,
        fontSize: 12,
        marginTop: 10,
    },
    section: {
        fontSize: 17,
        fontWeight: '900',
        color: colors.text,
        marginVertical: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
    },
    badge: {
        alignSelf: 'flex-start',
        backgroundColor: colors.primarySoft,
        color: colors.primary,
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 10,
        fontSize: 10,
        fontWeight: '900',
    },
    status: {
        color: colors.muted,
        fontSize: 11,
        fontWeight: '800',
    },
    desc: {
        fontSize: 14,
        color: colors.text,
        fontWeight: '700',
        marginTop: 9,
    },
    address: {
        color: colors.text,
        fontSize: 12,
        marginTop: 8,
    },
    coordinates: {
        color: colors.muted,
        fontSize: 11,
        marginTop: 4,
    },
    meta: {
        fontSize: 10,
        color: colors.muted,
        marginTop: 8,
    },
    actions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 14,
    },
    editButton: {
        borderWidth: 1,
        borderColor: colors.primary,
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 9,
    },
    editText: {
        color: colors.primary,
        fontWeight: '900',
    },
    deleteButton: {
        borderWidth: 1,
        borderColor: colors.danger,
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 9,
    },
    deleteText: {
        color: colors.danger,
        fontWeight: '900',
    },
    empty: {
        color: colors.muted,
        textAlign: 'center',
        marginTop: 20,
    },
});