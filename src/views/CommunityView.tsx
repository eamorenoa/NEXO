import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useMemo, useState } from 'react';

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
  const [searchText, setSearchText] = useState('');
  const [selectedType, setSelectedType] = useState<CommunityPostType | 'all'>('all');

  const filteredItems = useMemo(() => {
    const query = searchText.trim().toLocaleLowerCase();

    return vm.items.filter((post) => {
      const matchesSearch =
        !query ||
        [
          post.title,
          post.body,
          post.author,
          post.category,
        ].some((value) =>
          value?.toLocaleLowerCase().includes(query),
        );

      const matchesType =
        selectedType === 'all' || post.post_type === selectedType;

      return matchesSearch && matchesType;
    });
  }, [vm.items, searchText, selectedType]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.hero}>
        <View style={styles.heroEyebrow}>
          <Text style={styles.heroEyebrowText}>RED COMUNITARIA</Text>
        </View>
        <Text style={styles.title}>Comunidad</Text>
        <Text style={styles.description}>
          Un espacio para compartir oportunidades, ofrecer ayuda y conectar con las personas de tu entorno.
        </Text>
        <View style={styles.heroFooter}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{vm.items.length}</Text>
            <Text style={styles.heroStatLabel}>publicaciones</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{POST_TYPES.length}</Text>
            <Text style={styles.heroStatLabel}>categorías</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionCard}>
      <Card>
        <View style={styles.sectionHeadingRow}>
          <View style={styles.sectionIcon}>
            <Text style={styles.sectionIconText}>{vm.editingId !== null ? '✎' : '+'}</Text>
          </View>
          <View style={styles.sectionHeadingCopy}>
            <Text style={styles.sectionTitle}>
          {vm.editingId !== null ? 'Editar publicación' : 'Crear una publicación'}
            </Text>
            <Text style={styles.sectionHint}>
              {vm.editingId !== null ? 'Actualiza la información de tu publicación.' : 'Comparte algo útil con tu comunidad.'}
            </Text>
          </View>
        </View>

        <Text style={styles.label}>Tipo de publicación</Text>

        <View style={styles.typeList}>
          {POST_TYPES.map((type) => {
            const selected = vm.postType === type.value;

            return (
              <Pressable
                key={type.value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  vm.setPostType(type.value);

                  if (type.value === 'job') {
                    if (!['Oferta laboral', 'Busco empleo'].includes(vm.category)) {
                      vm.setCategory('Oferta laboral');
                    }
                  } else {
                    vm.setCategory('');
                  }
                }}
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
          placeholder={
            vm.postType === 'job'
              ? vm.category === 'Busco empleo'
                ? 'Ej. Busco empleo de auxiliar administrativo'
                : 'Ej. Vacante para auxiliar administrativo'
              : 'Ej. Busco voluntarios para una jornada'
          }
          maxLength={150}
          style={styles.input}
        />

        {vm.postType === 'job' ? (
          <View>
            <Text style={styles.label}>Tipo de publicación laboral</Text>

            <View style={styles.typeList}>
              {[
                { value: 'Oferta laboral', label: 'Ofrezco empleo' },
                { value: 'Busco empleo', label: 'Busco empleo' },
              ].map((option) => {
                const selected = vm.category === option.value;

                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => vm.setCategory(option.value)}
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
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : (
          <View>
            <Text style={styles.label}>Categoría (opcional)</Text>

            <TextInput
              value={vm.category}
              onChangeText={vm.setCategory}
              placeholder="Ej. Educación, alimentos, transporte"
              maxLength={60}
              style={styles.input}
            />
          </View>
        )}

        <Text style={styles.label}>Descripción</Text>
        <TextInput
          value={vm.body}
          onChangeText={vm.setBody}
          placeholder={
            vm.postType === 'job'
              ? vm.category === 'Busco empleo'
                ? 'Describa su perfil, experiencia, habilidades y disponibilidad.'
                : 'Describa las funciones, requisitos, horario y condiciones de la vacante.'
              : 'Cuente a la comunidad en qué consiste su publicación...'
          }
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
          onPress={() => void vm.save()}
          style={[
            styles.button,
            vm.loading && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.buttonText}>
            {vm.loading
              ? 'Procesando...'
              : vm.editingId !== null
                ? 'Guardar cambios'
                : 'Publicar'}
          </Text>
        </Pressable>

        {vm.editingId !== null ? (
          <Pressable
            accessibilityRole="button"
            disabled={vm.loading}
            onPress={vm.cancelEdit}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelButtonText}>Cancelar edición</Text>
          </Pressable>
        ) : null}

      </Card>
      </View>

      <View style={styles.sectionCard}>
      <Card>
        <View style={styles.sectionHeadingRow}>
          <View style={styles.sectionIcon}>
            <Text style={styles.sectionIconText}>⌕</Text>
          </View>
          <View style={styles.sectionHeadingCopy}>
            <Text style={styles.sectionTitle}>Encuentra publicaciones</Text>
            <Text style={styles.sectionHint}>Busca por palabra o explora por categoría.</Text>
          </View>
        </View>

        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Buscar por título, descripción, autor o categoría..."
          accessibilityLabel="Buscar publicaciones"
          autoCapitalize="none"
          returnKeyType="search"
          style={styles.input}
        />

        <Text style={styles.label}>Filtrar por tipo</Text>

        <View style={styles.typeList}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: selectedType === 'all' }}
            onPress={() => setSelectedType('all')}
            style={[
              styles.typeOption,
              selectedType === 'all' && styles.typeOptionSelected,
            ]}
          >
            <Text
              style={[
                styles.typeOptionText,
                selectedType === 'all' && styles.typeOptionTextSelected,
              ]}
            >
              Todos
            </Text>
          </Pressable>

          {POST_TYPES.map((type) => {
            const selected = selectedType === type.value;

            return (
              <Pressable
                key={type.value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setSelectedType(type.value)}
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

        <Text style={styles.emptyText}>
          {filteredItems.length} publicación(es) encontrada(s)
        </Text>

        {searchText.trim() !== '' || selectedType !== 'all' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setSearchText('');
              setSelectedType('all');
            }}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelButtonText}>
              Limpiar búsqueda y filtros
            </Text>
          </Pressable>
        ) : null}
      </Card>
      </View>

      <View style={styles.feedHeader}>
        <View style={styles.feedHeadingCopy}>
          <Text style={styles.feedEyebrow}>LO QUE PASA CERCA</Text>
          <Text style={styles.sectionTitle}>Publicaciones recientes</Text>
          <Text style={styles.sectionHint}>Información compartida por la comunidad</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => void vm.reload()}
          disabled={vm.loading}
        >
          <Text style={styles.reloadText}>
            {vm.loading ? 'Actualizando...' : 'Actualizar'}
          </Text>
        </Pressable>
      </View>

      {!token ? (
        <Text style={styles.emptyText}>
          Inicie sesión para consultar y crear publicaciones comunitarias.
        </Text>
      ) : vm.loading && vm.items.length === 0 ? (
        <Text style={styles.emptyText}>
          Cargando publicaciones...
        </Text>
      ) : vm.items.length === 0 ? (
        <Text style={styles.emptyText}>
          Todavía no hay publicaciones para mostrar.
        </Text>
      ) : filteredItems.length === 0 ? (
        <Text style={styles.emptyText}>
          No se encontraron publicaciones con esos criterios.
          Pruebe con otra palabra o limpie los filtros.
        </Text>
      ) : null}
      {filteredItems.map((post) => (
        <View key={post.id} style={styles.postShell}><Card>
          <View style={styles.postHeader}>
            <Text style={styles.badge}>
              {POST_TYPE_LABELS[post.post_type] ?? 'Publicación'}
            </Text>

            {post.category ? (
              <Text style={styles.category}>{post.category}</Text>
            ) : null}
          </View>

          <View style={styles.postMetaRow}>
            <View style={styles.authorAvatar}>
              <Text style={styles.authorAvatarText}>{(post.author || 'V').trim().charAt(0).toLocaleUpperCase()}</Text>
            </View>
            <View style={styles.authorMeta}>
              <Text style={styles.author}>{post.author || 'Vecino'}</Text>
              {post.created_at ? (
                <Text style={styles.date}>{new Date(post.created_at).toLocaleString()}</Text>
              ) : null}
            </View>
          </View>

          {post.title ? (
            <Text style={styles.postTitle}>{post.title}</Text>
          ) : null}

          <Text style={styles.postBody}>{post.body}</Text>


          {post.is_owner ? (
            <View style={styles.actionRow}>
              <Pressable
                accessibilityRole="button"
                disabled={vm.loading}
                onPress={() => vm.beginEdit(post)}
                style={styles.editButton}
              >
                <Text style={styles.actionText}>Editar</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                disabled={vm.loading}
                onPress={() => {
                  const confirmDelete = () => void vm.remove(post.id);

                  if (Platform.OS === 'web') {
                    if (typeof globalThis.confirm === 'function' &&
                      globalThis.confirm('¿Está seguro de que desea eliminar esta publicación?')) {
                      confirmDelete();
                    }
                    return;
                  }

                  Alert.alert(
                    'Eliminar publicación',
                    '¿Está seguro de que desea eliminar esta publicación?',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Eliminar',
                        style: 'destructive',
                        onPress: confirmDelete,
                      },
                    ],
                  );
                }}
                style={styles.deleteButton}
              >
                <Text style={styles.deleteButtonText}>Eliminar</Text>
              </Pressable>
            </View>
          ) : null}

        </Card></View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 130, width: '100%', maxWidth: 920, alignSelf: 'center' },
  hero: { backgroundColor: colors.primaryDark, borderRadius: 24, padding: 22, marginBottom: 18, overflow: 'hidden' },
  heroEyebrow: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: 'rgba(255,255,255,0.14)', marginBottom: 12 },
  heroEyebrowText: { color: '#E9DFFF', fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '900', color: '#FFFFFF', marginBottom: 8 },
  description: { color: '#EDE9FE', fontSize: 14, lineHeight: 21, marginBottom: 20, maxWidth: 620 },
  heroFooter: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.18)', paddingTop: 14, gap: 18 },
  heroStat: { minWidth: 86 },
  heroStatValue: { color: '#FFFFFF', fontSize: 19, fontWeight: '900' },
  heroStatLabel: { color: '#DDD6FE', fontSize: 11, marginTop: 2 },
  heroDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },
  sectionCard: { marginBottom: 4 },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  sectionIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  sectionIconText: { color: colors.primary, fontSize: 23, fontWeight: '800' },
  sectionHeadingCopy: { flex: 1 },
  sectionTitle: { fontSize: 19, fontWeight: '900', color: colors.text },
  sectionHint: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  label: { fontSize: 13, fontWeight: '800', color: colors.text, marginTop: 15, marginBottom: 7 },
  typeList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeOption: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingVertical: 9, paddingHorizontal: 12, backgroundColor: '#FFFFFF', maxWidth: '100%', flexShrink: 1 },
  typeOptionSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  typeOptionText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  typeOptionTextSelected: { color: colors.primary, fontWeight: '900' },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontSize: 14 },
  bodyInput: { minHeight: 118, textAlignVertical: 'top' },
  counter: { textAlign: 'right', color: colors.muted, fontSize: 11, marginTop: 6 },
  button: { backgroundColor: colors.primary, borderRadius: 14, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 15, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.16, shadowRadius: 8, elevation: 2 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  error: { color: '#B42318', backgroundColor: '#FFF1F0', borderRadius: 10, padding: 10, marginTop: 10, lineHeight: 20 },
  feedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginTop: 22, marginBottom: 12 },
  feedHeadingCopy: { flex: 1, minWidth: 190 },
  feedEyebrow: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginBottom: 5 },
  reloadText: { color: colors.primary, fontWeight: '800', fontSize: 13, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.primarySoft, overflow: 'hidden' },
  emptyText: { color: colors.muted, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 18, marginVertical: 8, lineHeight: 21, textAlign: 'center' },
  postShell: { marginBottom: 4 },
  postHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 12 },
  badge: { color: colors.primary, backgroundColor: colors.primarySoft, overflow: 'hidden', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10, fontSize: 11, fontWeight: '900' },
  category: { color: colors.muted, fontSize: 12, fontWeight: '700', backgroundColor: '#F7F6FB', borderRadius: 10, paddingVertical: 5, paddingHorizontal: 8 },
  postMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  authorAvatar: { width: 36, height: 36, borderRadius: 13, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  authorAvatarText: { color: colors.primary, fontSize: 15, fontWeight: '900' },
  authorMeta: { flex: 1 },
  author: { fontWeight: '800', color: colors.text, fontSize: 13 },
  postTitle: { marginTop: 4, fontSize: 18, lineHeight: 24, fontWeight: '900', color: colors.text },
  postBody: { marginTop: 8, color: '#4B4860', lineHeight: 22, fontSize: 14 },
  date: { marginTop: 3, fontSize: 11, color: colors.muted },
  cancelButton: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, minHeight: 42, alignItems: 'center', justifyContent: 'center', marginTop: 8, backgroundColor: '#FFFFFF' },
  cancelButtonText: { color: colors.text, fontWeight: '700', fontSize: 13 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 15, borderTopWidth: 1, borderTopColor: '#F0EDF7', paddingTop: 12 },
  editButton: { borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF', borderRadius: 11, minHeight: 38, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  deleteButton: { borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FFF7F7', borderRadius: 11, minHeight: 38, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: colors.primary, fontWeight: '800', fontSize: 12 },
  deleteButtonText: { color: '#B42318', fontWeight: '800', fontSize: 12 },
});
