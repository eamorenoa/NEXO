import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { User } from '../models/User';
import { CommunityPost } from '../models/CommunityPost';
import { useHomeViewModel } from '../viewmodels/useHomeViewModel';
import { Card } from '../components/Card';
import { colors } from '../shared/theme';

type HomeViewProps = {
  user: User;
  token: string;
  go: (screen: string) => void;
  onEmergency: () => void;
  onAI: () => void;
};

export function HomeView({
  user,
  token,
  go,
  onEmergency,
  onAI,
}: HomeViewProps) {
  const vm = useHomeViewModel(token);

  const activePosts = vm.posts.filter(
    (post) => post.status !== 'removed',
  );

  const recentPosts = activePosts.slice(0, 4);

  const firstName = user.name.trim().split(' ')[0] || 'Usuario';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={vm.loading}
          onRefresh={vm.reload}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>TU COMUNIDAD, MÁS CERCA</Text>

        <Text style={styles.greeting}>
          Hola, {firstName}
        </Text>

        <Text style={styles.subtitle}>
          ¿Qué necesitas hoy?
        </Text>
      </View>

      <Text style={styles.sectionTitle}>
        Accesos rápidos
      </Text>

      <View style={styles.grid}>
        <Action
          icon="🤝"
          title="Pedir ayuda"
          description="Crea una solicitud"
          onPress={() => go('needs')}
        />

        <Action
          icon="🤖"
          title="NEXO AI"
          description="Ayuda a tu comunidad"
          onPress={() => go('ai')}
        />

        <Action
          icon="♧"
          title="Comunidad"
          description="Ver publicaciones"
          onPress={() => go('community')}
        />

        <Action
          icon="⌖"
          title="Ver mapa"
          description="Explorar lugares"
          onPress={() => go('map')}
        />
      </View>

      <Pressable
        onPress={onEmergency}
        style={({ pressed }) => [
          styles.emergency,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.emergencyIcon}>
          <Text style={styles.emergencyEmoji}>!</Text>
        </View>

        <View style={styles.emergencyContent}>
          <Text style={styles.emergencyTitle}>
            Modo emergencia
          </Text>

          <Text style={styles.emergencyDescription}>
            Accede rápidamente a las opciones de emergencia.
          </Text>
        </View>

        <Text style={styles.arrow}>›</Text>
      </Pressable>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Resumen de actividad
        </Text>

        <Pressable onPress={vm.reload} accessibilityRole="button">
          <Text style={styles.refreshText}>Actualizar</Text>
        </Pressable>
      </View>

      {vm.loading && vm.needs.length === 0 && vm.posts.length === 0 ? (
        <Card>
          <View style={styles.loading}>
            <ActivityIndicator
              size="small"
              color={colors.primary}
            />

            <Text style={styles.mutedText}>
              Consultando la actividad...
            </Text>
          </View>
        </Card>
      ) : vm.error && vm.needs.length === 0 && vm.posts.length === 0 ? (
        <Card>
          <Text style={styles.emptyTitle}>
            No pudimos cargar la información
          </Text>

          <Text style={styles.mutedText}>
            Comprueba tu conexión e inténtalo de nuevo.
          </Text>

          <Pressable
            onPress={vm.reload}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>
              Reintentar
            </Text>
          </Pressable>
        </Card>
      ) : (
        <>
          {vm.error && (
            <Text style={styles.warningText}>
              No se pudo actualizar toda la información. Se muestran los últimos datos disponibles.
            </Text>
          )}

          <View style={styles.statsGrid}>
            <StatCard
              icon="🤝"
              label="Necesidades"
              value={vm.needs.length}
              onPress={() => go('needs')}
            />

            <StatCard
              icon="♧"
              label="Publicaciones"
              value={activePosts.length}
              onPress={() => go('community')}
            />
          </View>

          <Text style={styles.note}>
            Cantidades de los registros recibidos en esta consulta.
          </Text>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Publicaciones recientes
            </Text>

            <Pressable onPress={() => go('community')}>
              <Text style={styles.refreshText}>Ver comunidad ›</Text>
            </Pressable>
          </View>

          {recentPosts.length > 0 ? (
            recentPosts.map((post) => (
              <RecentPost
                key={String(post.id)}
                post={post}
                onPress={() => go('community')}
              />
            ))
          ) : (
            <Card>
              <Text style={styles.emptyTitle}>
                Todavía no hay publicaciones
              </Text>

              <Text style={styles.mutedText}>
                Cuando haya actividad en la comunidad, aparecerá aquí.
              </Text>

              <Pressable
                onPress={() => go('community')}
                style={styles.outlineButton}
              >
                <Text style={styles.outlineButtonText}>
                  Explorar comunidad
                </Text>
              </Pressable>
            </Card>
          )}
        </>
      )}

      <Pressable
        onPress={onAI}
        style={({ pressed }) => [
          styles.aiCard,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.aiIcon}>
          <Text style={styles.aiEmoji}>✦</Text>
        </View>

        <View style={styles.aiContent}>
          <Text style={styles.aiTitle}>
            Habla con NEXO AI
          </Text>

          <Text style={styles.aiDescription}>
            Encuentra orientación para tu situación.
          </Text>
        </View>

        <Text style={styles.aiArrow}>›</Text>
      </Pressable>
    </ScrollView>
  );
}

function Action({
  icon,
  title,
  description,
  onPress,
}: {
  icon: string;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.actionIcon}>
        <Text style={styles.actionEmoji}>{icon}</Text>
      </View>

      <Text style={styles.actionTitle}>
        {title}
      </Text>

      <Text style={styles.actionDescription}>
        {description}
      </Text>
    </Pressable>
  );
}

function StatCard({
  icon,
  label,
  value,
  onPress,
}: {
  icon: string;
  label: string;
  value: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.statCard,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.statIcon}>{icon}</Text>

      <Text style={styles.statValue}>
        {value}
      </Text>

      <Text style={styles.statLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

function RecentPost({
  post,
  onPress,
}: {
  post: CommunityPost;
  onPress: () => void;
}) {
  const title = post.title?.trim() || post.body.trim();
  const excerpt =
    post.title && post.body.trim()
      ? post.body.trim()
      : '';

  const status = post.status || 'active';

  return (
    <Pressable onPress={onPress}>
      <Card>
        <View style={styles.postHeader}>
          <Text style={styles.postType}>
            {formatPostType(post.post_type)}
          </Text>

          <View
            style={[
              styles.statusBadge,
              status === 'closed' && styles.closedBadge,
              status === 'paused' && styles.pausedBadge,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                status === 'closed' && styles.closedText,
                status === 'paused' && styles.pausedText,
              ]}
            >
              {formatStatus(status)}
            </Text>
          </View>
        </View>

        <Text style={styles.postTitle} numberOfLines={2}>
          {title}
        </Text>

        {excerpt ? (
          <Text style={styles.postExcerpt} numberOfLines={2}>
            {excerpt}
          </Text>
        ) : null}

        <Text style={styles.postFooter}>
          {post.author || 'Comunidad'}
          {post.created_at
            ? ` · ${formatDate(post.created_at)}`
            : ''}
        </Text>
      </Card>
    </Pressable>
  );
}

function formatPostType(type: CommunityPost['post_type']): string {
  const labels: Record<CommunityPost['post_type'], string> = {
    need: 'Necesidad',
    offer: 'Oferta',
    donation: 'Donación',
    sale: 'Venta',
    promotion: 'Promoción',
    service: 'Servicio',
    job: 'Empleo',
    activity: 'Actividad',
    exchange: 'Intercambio',
  };

  return labels[type] || 'Publicación';
}

function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    active: 'Activa',
    paused: 'Pausada',
    closed: 'Cerrada',
    removed: 'Retirada',
  };

  return labels[status] || status;
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
  });
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  header: {
    backgroundColor: colors.primaryDark,
    borderRadius: 26,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 24,
    marginTop: 4,
    marginBottom: 27,
    overflow: 'hidden',
  },
  eyebrow: {
    color: '#DDD6FE',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
    marginBottom: 12,
  },
  greeting: {
    color: '#FFFFFF',
    fontSize: 29,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  subtitle: {
    color: '#E9E5FF',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    maxWidth: 280,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    marginTop: 15,
    marginBottom: 22,
  },
  action: {
    width: '48%',
    minHeight: 148,
    padding: 16,
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 0,
    elevation: 1,
    shadowColor: '#24164B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  actionIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },
  actionEmoji: {
    fontSize: 21,
    color: colors.primary,
  },
  actionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  actionDescription: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },
  pressed: {
    opacity: 0.78,
  },
  emergency: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F4',
    borderWidth: 1,
    borderColor: '#FAD9D5',
    borderRadius: 20,
    padding: 15,
    marginBottom: 27,
  },
  emergencyIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emergencyEmoji: {
    fontSize: 23,
    color: '#B91C1C',
    fontWeight: '900',
  },
  emergencyContent: {
    flex: 1,
  },
  emergencyTitle: {
    color: '#991B1B',
    fontSize: 14,
    fontWeight: '900',
  },
  emergencyDescription: {
    color: '#7F1D1D',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  arrow: {
    color: '#991B1B',
    fontSize: 26,
    marginLeft: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 13,
  },
  refreshText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 9,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    padding: 18,
    elevation: 1,
    shadowColor: '#24164B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  statIcon: {
    fontSize: 20,
    marginBottom: 12,
  },
  statValue: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
  },
  statLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  note: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 15,
    marginBottom: 27,
  },
  warningText: {
    color: '#92400E',
    fontSize: 12,
    marginBottom: 12,
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  mutedText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginTop: 14,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  outlineButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 14,
  },
  outlineButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  postType: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  statusBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  closedBadge: {
    backgroundColor: '#F3F4F6',
  },
  pausedBadge: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    color: '#166534',
    fontSize: 10,
    fontWeight: '800',
  },
  closedText: {
    color: '#4B5563',
  },
  pausedText: {
    color: '#92400E',
  },
  postTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  postExcerpt: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  postFooter: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 12,
  },
  aiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: 20,
    padding: 17,
    marginTop: 13,
  },
  aiIcon: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: '#6D28D9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  aiEmoji: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '900',
  },
  aiContent: {
    flex: 1,
  },
  aiTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  aiDescription: {
    color: '#E9D5FF',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },
  aiArrow: {
    color: '#FFFFFF',
    fontSize: 27,
    marginLeft: 8,
  },
});
