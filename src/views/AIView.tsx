import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    Pressable,
    View,
} from 'react-native';

import { useAIViewModel } from '../viewmodels/useAIViewModel';
import { colors } from '../shared/theme';
import { Card } from '../components/Card';

export function AIView({
    token,
    onBack,
}: {
    token?: string;
    onBack: () => void;
}) {
    const vm = useAIViewModel(token);

    return (
        <ScrollView
            style={{ backgroundColor: colors.background }}
            contentContainerStyle={s.content}
            keyboardShouldPersistTaps="handled"
        >
            <Pressable
                onPress={onBack}
                accessibilityRole="button"
                accessibilityLabel="Volver a la pantalla anterior"
                style={s.backButton}
            >
                <Text style={s.back}>‹  Volver</Text>
            </Pressable>

            <View style={s.hero}>
                <View style={s.heroIcon}>
                    <Text style={s.heroIconText}>✦</Text>
                </View>
                <Text style={s.eyebrow}>ASISTENCIA COMUNITARIA</Text>
                <Text style={s.title}>NEXO AI</Text>
                <Text style={s.sub}>
                    Orientación práctica para conectar con empleo, necesidades,
                    donaciones y servicios de tu comunidad.
                </Text>
                <View style={s.trustNote}>
                    <Text style={s.trustNoteText}>
                        La orientación no sustituye los servicios profesionales ni de emergencia.
                    </Text>
                </View>
            </View>

            <Card>
                <Text style={s.sectionEyebrow}>TU CONSULTA</Text>
                <Text style={s.sectionTitle}>¿En qué podemos ayudarte?</Text>

                <Text style={s.helper}>
                    Cuéntenos qué necesita y le ofreceremos una orientación práctica.
                </Text>

                <TextInput
                    multiline
                    value={vm.message}
                    onChangeText={vm.setMessage}
                    editable={!vm.loading}
                    maxLength={4000}
                    placeholder="Cuéntanos qué necesitas. Por ejemplo: busco empleo de medio tiempo..."
                    placeholderTextColor={colors.muted}
                    style={s.input}
                    accessibilityLabel="Escribe tu consulta para NEXO AI"
                    textAlignVertical="top"
                />

                <Text style={s.counter}>
                    {vm.message.length}/4000 caracteres
                </Text>

                <Pressable
                    onPress={vm.ask}
                    disabled={vm.loading || !vm.message.trim()}
                    accessibilityRole="button"
                    accessibilityLabel="Consultar a NEXO AI"
                    style={[
                        s.button,
                        (vm.loading || !vm.message.trim()) && s.buttonDisabled,
                    ]}
                >
                    <Text style={s.btn}>
                        {vm.loading ? 'Preparando orientación…' : 'Consultar a NEXO AI  →'}
                    </Text>
                </Pressable>
            </Card>

            {vm.loading && (
                <Card>
                    <View style={s.loadingRow}>
                        <View style={s.loadingDot} />
                        <View style={s.loadingCopy}>
                            <Text style={s.loadingTitle}>NEXO está preparando tu orientación</Text>
                            <Text style={s.loading}>
                                Estamos revisando tu consulta. Esto puede tardar unos momentos.
                            </Text>
                        </View>
                    </View>
                </Card>
            )}

            {vm.response && (
                <Card>
                    <View style={s.answerAccent} />
                    <View style={s.responseHeader}>
                        <View style={s.responseTitleWrap}>
                            <Text style={s.responseEyebrow}>TU ORIENTACIÓN</Text>
                            <Text style={s.responseTitle}>Respuesta de NEXO AI</Text>
                        </View>

                        <Text style={s.badge}>
                            {vm.response.category || 'Orientación'}
                        </Text>
                    </View>

                    <Text style={s.answer}>{vm.response.answer}</Text>
                </Card>
            )}

            {!!vm.error && (
                <Card>
                    <View style={s.errorHeader}>
                        <Text style={s.errorSymbol}>!</Text>
                        <Text style={s.errorTitle}>No pudimos completar la consulta</Text>
                    </View>
                    <Text style={s.error}>{vm.error}</Text>
                </Card>
            )}
        </ScrollView>
    );
}

const s = StyleSheet.create({
    content: {
        paddingHorizontal: 18,
        paddingTop: 16,
        paddingBottom: 124,
        gap: 14,
    },
    backButton: {
        alignSelf: 'flex-start',
        paddingVertical: 7,
        paddingHorizontal: 4,
    },
    back: {
        color: colors.primary,
        fontWeight: '800',
        fontSize: 14,
    },
    hero: {
        backgroundColor: '#F2EDFF',
        borderWidth: 1,
        borderColor: '#E4D9FF',
        borderRadius: 24,
        padding: 22,
        overflow: 'hidden',
    },
    heroIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 17,
    },
    heroIconText: {
        color: '#FFFFFF',
        fontSize: 27,
        fontWeight: '800',
    },
    eyebrow: {
        color: colors.primary,
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1.5,
        marginBottom: 7,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        letterSpacing: -0.5,
        color: colors.text,
    },
    sub: {
        color: colors.muted,
        lineHeight: 22,
        fontSize: 14,
        marginTop: 7,
        marginBottom: 4,
    },
    trustNote: {
        alignSelf: 'flex-start',
        backgroundColor: '#FFFFFFB8',
        borderRadius: 11,
        paddingHorizontal: 11,
        paddingVertical: 8,
        marginTop: 12,
    },
    trustNoteText: {
        color: colors.muted,
        fontSize: 11,
        lineHeight: 16,
    },
    sectionEyebrow: {
        color: colors.primary,
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1.2,
        marginBottom: 7,
    },
    sectionTitle: {
        color: colors.text,
        fontSize: 20,
        fontWeight: '900',
        marginBottom: 7,
    },
    helper: {
        color: colors.muted,
        lineHeight: 21,
        fontSize: 14,
        marginBottom: 14,
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 17,
        minHeight: 145,
        padding: 16,
        textAlignVertical: 'top',
        color: colors.text,
        fontSize: 15,
        lineHeight: 22,
    },
    counter: {
        fontSize: 12,
        color: colors.muted,
        textAlign: 'right',
        marginTop: 5,
    },
    button: {
        backgroundColor: colors.primary,
        minHeight: 54,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 14,
        paddingHorizontal: 14,
    },
    buttonDisabled: {
        opacity: 0.65,
    },
    btn: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 14,
    },
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        paddingVertical: 4,
    },
    loadingDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.primary,
        marginTop: 5,
    },
    loadingCopy: {
        flex: 1,
    },
    loadingTitle: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '800',
        marginBottom: 5,
    },
    loading: {
        color: colors.muted,
        lineHeight: 21,
        fontSize: 13,
    },
    answerAccent: {
        height: 4,
        width: 46,
        borderRadius: 2,
        backgroundColor: colors.primary,
        marginBottom: 15,
    },
    responseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    responseTitleWrap: {
        flex: 1,
    },
    responseEyebrow: {
        color: colors.primary,
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1.1,
        marginBottom: 4,
    },
    responseTitle: {
        color: colors.text,
        fontWeight: '900',
        fontSize: 18,
    },
    badge: {
        color: colors.primary,
        backgroundColor: '#F2EDFF',
        borderRadius: 12,
        overflow: 'hidden',
        paddingHorizontal: 11,
        paddingVertical: 7,
        fontSize: 12,
        fontWeight: '900',
        textTransform: 'capitalize',
    },
    answer: {
        fontSize: 15,
        lineHeight: 25,
        color: colors.text,
    },
    errorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        marginBottom: 7,
    },
    errorSymbol: {
        width: 26,
        height: 26,
        borderRadius: 13,
        textAlign: 'center',
        textAlignVertical: 'center',
        overflow: 'hidden',
        backgroundColor: '#FEE2E2',
        color: colors.danger,
        fontWeight: '900',
        fontSize: 16,
    },
    errorTitle: {
        flex: 1,
        color: colors.danger,
        fontWeight: '900',
        fontSize: 14,
    },
    error: {
        color: colors.danger,
        lineHeight: 21,
        fontSize: 13,
    },
});