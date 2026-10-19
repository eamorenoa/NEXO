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
            <Pressable onPress={onBack}>
                <Text style={s.back}>‹ Volver</Text>
            </Pressable>

            <Text style={s.title}>NEXO AI</Text>

            <Text style={s.sub}>
                Su asistente comunitario para encontrar orientación sobre empleo,
                necesidades, donaciones, servicios y oportunidades.
            </Text>

            <Card>
                <Text style={s.sectionTitle}>¿En qué podemos ayudarle?</Text>

                <Text style={s.helper}>
                    Cuéntenos qué necesita y le ofreceremos una orientación práctica.
                </Text>

                <TextInput
                    multiline
                    value={vm.message}
                    onChangeText={vm.setMessage}
                    editable={!vm.loading}
                    maxLength={4000}
                    placeholder="Ej. Necesito encontrar empleo de medio tiempo en mi comunidad..."
                    placeholderTextColor={colors.muted}
                    style={s.input}
                />

                <Text style={s.counter}>
                    {vm.message.length}/4000 caracteres
                </Text>

                <Pressable
                    onPress={vm.ask}
                    disabled={vm.loading}
                    style={[s.button, vm.loading && s.buttonDisabled]}
                >
                    <Text style={s.btn}>
                        {vm.loading ? 'Preparando orientación…' : 'Consultar a NEXO AI'}
                    </Text>
                </Pressable>
            </Card>

            {vm.loading && (
                <Card>
                    <Text style={s.loading}>
                        Estamos preparando una respuesta para su consulta.
                    </Text>
                </Card>
            )}

            {vm.response && (
                <Card>
                    <View style={s.responseHeader}>
                        <Text style={s.responseTitle}>Respuesta de NEXO AI</Text>

                        <Text style={s.badge}>
                            {vm.response.category || 'Orientación'}
                        </Text>
                    </View>

                    <Text style={s.answer}>{vm.response.answer}</Text>
                </Card>
            )}

            {!!vm.error && (
                <Card>
                    <Text style={s.error}>{vm.error}</Text>
                </Card>
            )}
        </ScrollView>
    );
}

const s = StyleSheet.create({
    content: {
        padding: 20,
        paddingBottom: 120,
        gap: 12,
    },
    back: {
        color: colors.primary,
        fontWeight: '900',
        marginBottom: 5,
    },
    title: {
        fontSize: 29,
        fontWeight: '900',
        color: colors.text,
    },
    sub: {
        color: colors.muted,
        lineHeight: 21,
        marginBottom: 5,
    },
    sectionTitle: {
        color: colors.text,
        fontSize: 17,
        fontWeight: '900',
        marginBottom: 6,
    },
    helper: {
        color: colors.muted,
        lineHeight: 20,
        marginBottom: 12,
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        minHeight: 130,
        padding: 14,
        textAlignVertical: 'top',
        color: colors.text,
    },
    counter: {
        fontSize: 11,
        color: colors.muted,
        textAlign: 'right',
        marginTop: 5,
    },
    button: {
        backgroundColor: colors.primary,
        minHeight: 50,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
    },
    buttonDisabled: {
        opacity: 0.65,
    },
    btn: {
        color: '#fff',
        fontWeight: '900',
    },
    loading: {
        color: colors.muted,
        lineHeight: 21,
    },
    responseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    responseTitle: {
        color: colors.text,
        fontWeight: '900',
        fontSize: 16,
    },
    badge: {
        color: colors.primary,
        fontWeight: '900',
        textTransform: 'capitalize',
    },
    answer: {
        fontSize: 15,
        lineHeight: 23,
        color: colors.text,
    },
    error: {
        color: colors.danger,
        lineHeight: 21,
    },
});