import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  CommunityPostType,
} from '../models/CommunityPost';
import { useCommunityViewModel } from '../viewmodels/useCommunityViewModel';
import { Card } from '../components/Card';
import { colors } from '../shared/theme';

const POST_TYPES: { value: CommunityPostType; label: string }[] = [
  { value: 'need', label: 'Necesidad' },
  { value: 'offer', label: 'Oferta' },
  { value: 'donation', label: 'Donación' },
  { value: 'sale', label: 'Venta' },
  { value: 'promotion', label: 'Promoción' },
  { value: 'service', label: 'Servicio' },
  { value: 'job', label: 'Empleo' },
  { value: 'activity', label: 'Actividad' },
  { value: 'exchange', label: 'Préstamo / intercambio' },
];

const POST_TYPE_LABELS: Record<CommunityPostType, string> = {
  need: 'Necesidad',
  offer: 'Oferta',
  donation: 'Donación',
  sale: 'Venta',
  promotion: 'Promoción',
  service: 'Servicio',
  job: 'Empleo',
  activity: 'Actividad',
  exchange: 'Préstamo / intercambio',
};

export function CommunityView({ token }: { token?: string }) {
  const vm = useCommunityViewModel(token);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Comunidad</Text>

      <Text style={styles.description}>
        Comparta necesidades, oportunidades y propuestas con su comunidad.
      </Text>

      <Card>
        <Text style={styles.sectionTitle}>Crear publicación</Text>

        <Text style={styles.label}>Tipo de publicación</Text>

        <View style={styles.typeList}>
          {POST_TYPES.map((type) => {
            const selected = vm.postType === type.value;

            return (
              <Pressable
                key={type.value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => vm.setPostType(type.value)}
                style={[
                  styles.typeOption,
                  selected && styles.typeOptionSelected,
                ]}
              >
                <Text
                  style={[
                    styles.typeOptionText,
                    selected && styles.typeOptionTextSelected,
                  ]}
                >
                  {type.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Título (opcional)</Text>
        <TextInput
          value={vm.title}
          onChangeText={vm.setTitle}
          placeholder="Ej. Busco voluntarios para una jornada"
          maxLength={150}
          style={styles.input}
        />

        <Text style={styles.label}>Categoría (opcional)</Text>
        <TextInput
          value={vm.category}
          onChangeText={vm.setCategory}
          placeholder="Ej. Educación, alimentos, transporte"
          maxLength={60}
          style={styles.input}
        />

        <Text style={styles.label}>Descripción</Text>
        <TextInput
          value={vm.body}
          onChangeText={vm.setBody}
          placeholder="Cuente a la comunidad en qué consiste su publicación..."
          multiline
          maxLength={2000}
          style={[styles.input, styles.bodyInput]}
        />

        <Text style={styles.counter}>
          {vm.body.length}/2000 caracteres
        </Text>

        {vm.error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {vm.error}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={vm.loading}
          onPress={() => void vm.create()}
          style={[
            styles.button,
            vm.loading && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.buttonText}>
            {vm.loading ? 'Procesando...' : 'Publicar'}
          </Text>
        </Pressable>
      </Card>

      <View style={styles.feedHeader}>
        <Text style={styles.sectionTitle}>Publicaciones recientes</Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => void vm.reload()}
          disabled={vm.loading}
        >
          <Text style={styles.reloadText}>Actualizar</Text>
        </Pressable>
      </View>

      {!token ? (
        <Text style={styles.emptyText}>
          Inicie sesión para consultar y crear publicaciones comunitarias.
        </Text>
      ) : vm.items.length === 0 && !vm.loading ? (
        <Text style={styles.emptyText}>
          Todavía no hay publicaciones para mostrar.
        </Text>
      ) : null}

      {vm.items.map((post) => (
        <Card key={post.id}>
          <View style={styles.postHeader}>
            <Text style={styles.badge}>
              {POST_TYPE_LABELS[post.post_type] ?? 'Publicación'}
            </Text>

            {post.category ? (
              <Text style={styles.category}>{post.category}</Text>
            ) : null}
          </View>

          <Text style={styles.author}>
            {post.author || 'Vecino'}
          </Text>

          {post.title ? (
            <Text style={styles.postTitle}>{post.title}</Text>
          ) : null}

          <Text style={styles.postBody}>{post.body}</Text>

          {post.created_at ? (
            <Text style={styles.date}>
              {new Date(post.created_at).toLocaleString()}
            </Text>
          ) : null}
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
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
    marginBottom: 8,
  },
  description: {
    color: colors.text,
    lineHeight: 21,
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: colors.text,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 7,
  },
  typeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  typeOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeOptionText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  typeOptionTextSelected: {
    color: '#fff',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 13,
    color: colors.text,
  },
  bodyInput: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  counter: {
    textAlign: 'right',
    color: colors.text,
    fontSize: 12,
    marginTop: 5,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '900',
  },
  error: {
    color: '#B42318',
    marginTop: 10,
    lineHeight: 20,
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 12,
  },
  reloadText: {
    color: colors.primary,
    fontWeight: '700',
  },
  emptyText: {
    color: colors.text,
    marginVertical: 14,
    lineHeight: 21,
  },
  postHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  badge: {
    color: colors.primary,
    backgroundColor: '#EAF2FF',
    overflow: 'hidden',
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 9,
    fontSize: 12,
    fontWeight: '800',
  },
  category: {
    color: colors.text,
    fontSize: 12,
  },
  author: {
    fontWeight: '900',
    color: colors.primary,
  },
  postTitle: {
    marginTop: 8,
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  postBody: {
    marginTop: 7,
    color: colors.text,
    lineHeight: 21,
  },
  date: {
    marginTop: 12,
    fontSize: 11,
    color: colors.text,
    opacity: 0.7,
  },
});
