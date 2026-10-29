import {
    ActivityIndicator,
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
import { Need } from '../models/Need';

const CATEGORY_LABELS: Record<string, string> = {
    help: 'Ayuda',
    share: 'Compartir',
    job: 'Empleo',
    report: 'Reporte comunitario',
    donation: 'Donación',
    accessibility: 'Accesibilidad',
};

function formatCategory(category?: string) {
    if (!category) return 'Sin categoría';
    return CATEGORY_LABELS[category.toLowerCase()] ?? category;
}

function getStatusColor(status?: string) {
    const normalized = status?.trim().toLowerCase();
    if (normalized === 'open' || normalized === 'opened' || normalized === 'active') return colors.success;
    if (normalized === 'closed' || normalized === 'resolved') return colors.muted;
    if (normalized === 'pending' || normalized === 'in_progress') return colors.warning;
    return colors.muted;
}

function formatStatus(status?: string) {
    const normalized = status?.trim().toLowerCase();
    if (!normalized) return 'Estado no disponible';
    const labels: Record<string, string> = {
        open: 'Abierta',
        opened: 'Abierta',
        active: 'Activa',
        closed: 'Cerrada',
        resolved: 'Resuelta',
        pending: 'Pendiente',
        in_progress: 'En proceso',
    };
    return labels[normalized] ?? status;
}

function formatDate(value?: string) {
    if (!value) return 'Fecha no disponible';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
    return date.toLocaleDateString();
}

function NeedCard({
    item,
    loading,
    onEdit,
    onDelete,
}: {
    item: Need;
    loading: boolean;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const category = formatCategory(item.ai_category || item.category);

    return (
        <View style={s.needCard}>
            <View style={s.cardHeader}>
                <View style={s.categoryBadge}>
                    <Text style={s.categoryText}>{category}</Text>
                </View>
                <View style={s.statusBadge}>
                    <View style={[s.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                    <Text style={s.statusText}>{formatStatus(item.status)}</Text>
                </View>
            </View>

            <Text style={s.cardDescription}>{item.description}</Text>

            {!!item.address && (
                <View style={s.detailRow}>
                    <Text style={s.detailIcon}>⌖</Text>
                    <Text style={s.detailText}>{item.address}</Text>
                </View>
            )}

            {item.latitude != null && item.longitude != null && (
                <View style={s.detailRow}>
                    <Text style={s.detailIcon}>◎</Text>
                    <Text style={s.detailText}>
                        {Number(item.latitude).toFixed(4)}, {Number(item.longitude).toFixed(4)}
                    </Text>
                </View>
            )}

            <View style={s.cardFooter}>
                <View style={s.authorMark}>
                    <Text style={s.authorMarkText}>
                        {(item.author || 'U').trim().slice(0, 1).toUpperCase()}
                    </Text>
                </View>
                <View style={s.metaCopy}>
                    <Text style={s.authorText} numberOfLines={1}>
                        {item.author || 'Autor no disponible'}
                    </Text>
                    <Text style={s.dateText}>{formatDate(item.created_at)}</Text>
                </View>
            </View>

            {item.is_owner && (
                <View style={s.actions}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Editar mi solicitud"
                        onPress={onEdit}
                        disabled={loading}
                        style={({ pressed }) => [s.editButton, pressed && s.pressed, loading && s.disabled]}
                    >
                        <Text style={s.editText}>✎  Editar</Text>
                    </Pressable>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Eliminar mi solicitud"
                        onPress={onDelete}
                        disabled={loading}
                        style={({ pressed }) => [s.deleteButton, pressed && s.pressed, loading && s.disabled]}
                    >
                        <Text style={s.deleteText}>⌫  Eliminar</Text>
                    </Pressable>
                </View>
            )}
        </View>
    );
}

export function NeedsView({
    token,
    onBack,
}: {
    token?: string;
    onBack: () => void;
}) {
    const vm = useNeedsViewModel(token);
    const isEditing = vm.editingId !== null;

    return (
        <ScrollView
            style={s.screen}
            contentContainerStyle={s.content}
            keyboardShouldPersistTaps="handled"
        >
            <Pressable
                accessibilityRole="button"
                onPress={onBack}
                hitSlop={8}
                style={({ pressed }) => [s.backButton, pressed && s.pressed]}
            >
                <Text style={s.backArrow}>‹</Text>
                <Text style={s.backText}>Volver al inicio</Text>
            </Pressable>

            <View style={s.hero}>
                <View style={s.heroEyebrow}>
                    <Text style={s.heroEyebrowText}>RED DE APOYO COMUNITARIO</Text>
                </View>
                <Text style={s.title}>Las necesidades nos conectan</Text>
                <Text style={s.subtitle}>
                    Comparte lo que necesitas o encuentra solicitudes de tu comunidad. Cada publicación puede acercar a alguien a una solución.
                </Text>
                <View style={s.heroFooter}>
                    <View style={s.heroMark}><Text style={s.heroMarkText}>N</Text></View>
                    <Text style={s.heroFooterText}>Ayuda cercana, comunidad más fuerte</Text>
                </View>
            </View>

            <View style={s.formHeading}>
                <View style={s.sectionIcon}><Text style={s.sectionIconText}>{isEditing ? '✎' : '+'}</Text></View>
                <View style={s.formHeadingCopy}>
                    <Text style={s.sectionTitle}>{isEditing ? 'Editar solicitud' : 'Publica una necesidad'}</Text>
                    <Text style={s.sectionSubtitle}>Describe lo que necesitas con claridad.</Text>
                </View>
            </View>

            <Card>
                <Text style={s.label}>Descripción de la necesidad</Text>
                <TextInput
                    multiline
                    value={vm.description}
                    onChangeText={vm.setDescription}
                    editable={!vm.loading}
                    maxLength={1000}
                    placeholder="Ej. Necesito ayuda para trasladar unas cajas..."
                    placeholderTextColor="#9691A7"
                    accessibilityLabel="Descripción de la necesidad"
                    style={s.input}
                    textAlignVertical="top"
                />
                <Text style={s.helperText}>Entre 5 y 1000 caracteres · {vm.description.length}/1000</Text>

                <View style={s.locationHeading}>
                    <Text style={s.label}>Ubicación (opcional)</Text>
                    <View style={s.optionalBadge}><Text style={s.optionalText}>OPCIONAL</Text></View>
                </View>
                <Text style={s.locationIntro}>
                    Añádela si quieres que otras personas puedan encontrar tu solicitud en el mapa.
                </Text>

                <LocationPicker
                    value={{
                        address: vm.address,
                        latitude: vm.latitude.trim() === '' ? null : Number(vm.latitude),
                        longitude: vm.longitude.trim() === '' ? null : Number(vm.longitude),
                    }}
                    onChange={(location) => {
                        vm.setAddress(location.address);
                        vm.setLatitude(location.latitude === null ? '' : String(location.latitude));
                        vm.setLongitude(location.longitude === null ? '' : String(location.longitude));
                    }}
                    disabled={vm.loading}
                />

                <Pressable
                    accessibilityRole="button"
                    onPress={isEditing ? vm.saveEditing : vm.create}
                    disabled={vm.loading}
                    style={({ pressed }) => [s.submitButton, pressed && s.pressed, vm.loading && s.disabled]}
                >
                    {vm.loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={s.submitButtonText}>{isEditing ? 'Guardar cambios' : 'Publicar necesidad  →'}</Text>
                    )}
                </Pressable>

                {isEditing && (
                    <Pressable
                        accessibilityRole="button"
                        onPress={vm.cancelEditing}
                        disabled={vm.loading}
                        style={s.cancelButton}
                    >
                        <Text style={s.cancelText}>Cancelar edición</Text>
                    </Pressable>
                )}

                {!!vm.success && (
                    <View accessibilityRole="summary" style={s.successBox}>
                        <Text style={s.successText}>{vm.success}</Text>
                    </View>
                )}
                {!!vm.error && (
                    <View accessibilityRole="alert" style={s.errorBox}>
                        <Text style={s.errorText}>{vm.error}</Text>
                    </View>
                )}
            </Card>

            <View style={s.listHeading}>
                <View>
                    <Text style={s.sectionTitle}>Necesidades de la comunidad</Text>
                    <Text style={s.sectionSubtitle}>Solicitudes recibidas desde la plataforma</Text>
                </View>
                <View style={s.countBadge}>
                    <Text style={s.countText}>{vm.items.length}</Text>
                </View>
            </View>

            {vm.loading && vm.items.length === 0 ? (
                <View style={s.loadingBox}>
                    <ActivityIndicator color={colors.primary} size="large" />
                    <Text style={s.loadingText}>Cargando solicitudes…</Text>
                </View>
            ) : vm.items.length > 0 ? (
                vm.items.map(item => (
                    <NeedCard
                        key={item.id}
                        item={item}
                        loading={vm.loading}
                        onEdit={() => vm.startEditing(item)}
                        onDelete={() => vm.remove(item)}
                    />
                ))
            ) : (
                <View style={s.emptyBox}>
                    <View style={s.emptyMark}><Text style={s.emptyMarkText}>＋</Text></View>
                    <Text style={s.emptyTitle}>Aún no hay solicitudes</Text>
                    <Text style={s.emptyText}>
                        Cuando haya necesidades disponibles, aparecerán aquí. Puedes ser la primera persona en compartir una.
                    </Text>
                </View>
            )}

            {vm.loading && vm.items.length > 0 && (
                <View style={s.refreshingRow}>
                    <ActivityIndicator color={colors.primary} size="small" />
                    <Text style={s.loadingText}>Actualizando…</Text>
                </View>
            )}
        </ScrollView>
    );
}

const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 112 },
    backButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', paddingVertical: 8, marginBottom: 12 },
    backArrow: { color: colors.primary, fontSize: 27, lineHeight: 28, marginRight: 7 },
    backText: { color: colors.primary, fontSize: 13, fontWeight: '800' },
    hero: { backgroundColor: colors.primaryDark, borderRadius: 25, padding: 22, marginBottom: 24, overflow: 'hidden' },
    heroEyebrow: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, marginBottom: 14 },
    heroEyebrowText: { color: '#EEE8FF', fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
    title: { color: '#FFFFFF', fontSize: 28, lineHeight: 34, fontWeight: '900', letterSpacing: -0.5 },
    subtitle: { color: '#E4DDF8', fontSize: 13, lineHeight: 20, marginTop: 10 },
    heroFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 20, paddingTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.18)' },
    heroMark: { width: 28, height: 28, borderRadius: 10, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginRight: 9 },
    heroMarkText: { color: colors.primaryDark, fontSize: 15, fontWeight: '900' },
    heroFooterText: { color: '#F2EEFF', fontSize: 11, fontWeight: '700' },
    formHeading: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingHorizontal: 2 },
    sectionIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
    sectionIconText: { color: colors.primary, fontSize: 24, fontWeight: '700' },
    formHeadingCopy: { flex: 1 },
    sectionTitle: { color: colors.text, fontSize: 18, lineHeight: 24, fontWeight: '900' },
    sectionSubtitle: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 2 },
    label: { color: colors.text, fontSize: 13, fontWeight: '800', marginBottom: 8 },
    input: { minHeight: 125, borderWidth: 1, borderColor: colors.border, borderRadius: 15, backgroundColor: '#FCFBFF', padding: 14, fontSize: 14, lineHeight: 21, color: colors.text },
    helperText: { color: colors.muted, fontSize: 10, marginTop: 7, marginBottom: 18, textAlign: 'right' },
    locationHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
    optionalBadge: { backgroundColor: '#F3F0F9', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 4, marginBottom: 8 },
    optionalText: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
    locationIntro: { color: colors.muted, fontSize: 12, lineHeight: 18, marginBottom: 8 },
    submitButton: { backgroundColor: colors.primary, minHeight: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 18, paddingHorizontal: 16 },
    submitButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
    cancelButton: { alignItems: 'center', paddingVertical: 13 },
    cancelText: { color: colors.muted, fontWeight: '800', fontSize: 13 },
    successBox: { backgroundColor: '#ECFDF3', borderColor: '#BBF7D0', borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 12 },
    successText: { color: '#166534', fontSize: 12, lineHeight: 18, fontWeight: '700' },
    errorBox: { backgroundColor: '#FFF1F2', borderColor: '#FECDD3', borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 12 },
    errorText: { color: '#9F1239', fontSize: 12, lineHeight: 18, fontWeight: '700' },
    listHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 14, paddingHorizontal: 2 },
    countBadge: { minWidth: 34, height: 34, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
    countText: { color: colors.primary, fontSize: 13, fontWeight: '900' },
    needCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E9E5F5',
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
        borderRadius: 18,
        padding: 17,
        marginBottom: 13,
        shadowColor: '#30205C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.045,
        shadowRadius: 12,
        elevation: 2,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    categoryBadge: { alignSelf: 'flex-start', backgroundColor: colors.primarySoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9, maxWidth: '68%' },
    categoryText: { color: colors.primary, fontSize: 10, fontWeight: '900' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F8', borderRadius: 9, paddingHorizontal: 8, paddingVertical: 6 },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success, marginRight: 6 },
    statusText: { color: colors.muted, fontSize: 10, fontWeight: '800' },
    cardDescription: { fontSize: 15, lineHeight: 23, color: colors.text, fontWeight: '700', marginTop: 14, letterSpacing: -0.15 },
    detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 9 },
    detailIcon: { width: 18, color: colors.primary, fontSize: 14, fontWeight: '900' },
    detailText: { flex: 1, color: colors.muted, fontSize: 11, lineHeight: 17 },
    cardFooter: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F0EDF6', marginTop: 15, paddingTop: 12 },
    authorMark: { width: 31, height: 31, borderRadius: 11, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 9 },
    authorMarkText: { color: colors.primary, fontSize: 12, fontWeight: '900' },
    metaCopy: { flex: 1, minWidth: 0 },
    authorText: { color: colors.text, fontSize: 11, lineHeight: 15, fontWeight: '800' },
    dateText: { color: colors.muted, fontSize: 10, lineHeight: 14, marginTop: 1 },
    actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
    editButton: { minHeight: 35, paddingHorizontal: 13, borderWidth: 1, borderColor: '#DDD2FE', backgroundColor: '#FAF8FF', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    editText: { color: colors.primary, fontSize: 11, fontWeight: '900' },
    deleteButton: { minHeight: 35, paddingHorizontal: 13, borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FFF8F8', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    deleteText: { color: colors.danger, fontSize: 11, fontWeight: '900' },
    pressed: { opacity: 0.78 },
    disabled: { opacity: 0.55 },
    loadingBox: { backgroundColor: colors.card, borderRadius: 18, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    loadingText: { color: colors.muted, fontSize: 12, marginTop: 9 },
    emptyBox: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 25, alignItems: 'center' },
    emptyMark: { width: 50, height: 50, borderRadius: 17, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
    emptyMarkText: { color: colors.primary, fontSize: 30, lineHeight: 34, fontWeight: '500' },
    emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '900', textAlign: 'center' },
    emptyText: { color: colors.muted, fontSize: 12, lineHeight: 19, textAlign: 'center', marginTop: 7 },
    refreshingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12 },
});
