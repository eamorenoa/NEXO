import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors } from '../shared/theme';

type EmergencyContact = {
  id: string;
  icon: string;
  title: string;
  description: string;
  number: string;
  schedule: string;
  color: string;
  background: string;
};

const contacts: EmergencyContact[] = [
  {
    id: 'mental',
    icon: '💜',
    title: 'Salud mental y apoyo emocional',
    description:
      'Escucha y orientación ante una crisis emocional o cuando necesites hablar con alguien.',
    number: '106',
    schedule: 'Consulta la cobertura de esta línea en tu territorio.',
    color: '#6D28D9',
    background: '#F0EAFE',
  },
  {
    id: 'women',
    icon: '🟣',
    title: 'Violencia contra las mujeres',
    description:
      'Orientación frente a violencia física, psicológica, sexual y otras violencias de género.',
    number: '155',
    schedule: 'Línea nacional de orientación.',
    color: '#7C3AED',
    background: '#F3E8FF',
  },
  {
    id: 'emergency',
    icon: '🚨',
    title: 'Emergencias inmediatas',
    description:
      'Para situaciones de peligro inmediato que requieren atención urgente.',
    number: '123',
    schedule: 'Línea de emergencias en Colombia.',
    color: '#B91C1C',
    background: '#FEE2E2',
  },
  {
    id: 'children',
    icon: '🧒',
    title: 'Protección de menores',
    description:
      'Orientación y protección ante maltrato, violencia sexual u otras amenazas contra niños, niñas y adolescentes.',
    number: '141',
    schedule: 'Línea gratuita nacional del ICBF, disponible las 24 horas.',
    color: '#0369A1',
    background: '#E0F2FE',
  },
  {
    id: 'justice',
    icon: '⚖️',
    title: 'Fiscalía y orientación sobre delitos',
    description:
      'Consulta orientación para denunciar hechos delictivos y conocer las rutas de atención.',
    number: '122',
    schedule: 'Canal de la Fiscalía General de la Nación.',
    color: '#047857',
    background: '#D1FAE5',
  },
];

async function openPhone(number: string) {
  const url = `tel:${number}`;

  try {
    const supported = await Linking.canOpenURL(url);

    if (!supported) {
      Alert.alert(
        'Teléfono no disponible',
        `No se pudo abrir el marcador. Puedes marcar manualmente el ${number}.`,
      );
      return;
    }

    await Linking.openURL(url);
  } catch {
    Alert.alert(
      'No se pudo abrir el teléfono',
      `Puedes marcar manualmente el ${number} desde tu dispositivo.`,
    );
  }
}

function ContactCard({
  contact,
}: {
  contact: EmergencyContact;
}) {
  return (
    <View style={styles.contactCard}>
      <View
        style={[
          styles.contactIcon,
          { backgroundColor: contact.background },
        ]}
      >
        <Text style={styles.iconText}>{contact.icon}</Text>
      </View>

      <Text style={styles.contactTitle}>
        {contact.title}
      </Text>

      <Text style={styles.description}>
        {contact.description}
      </Text>

      <Text
        style={[
          styles.number,
          { color: contact.color },
        ]}
      >
        {contact.number}
      </Text>

      <Text style={styles.schedule}>
        {contact.schedule}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Abrir el teléfono para llamar al ${contact.number}`}
        onPress={() => openPhone(contact.number)}
        style={({ pressed }) => [
          styles.callButton,
          { backgroundColor: contact.color },
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.callButtonText}>
          Abrir teléfono
        </Text>

        <Text style={styles.callArrow}>
          ›
        </Text>
      </Pressable>
    </View>
  );
}

export function EmergencyView({
  onClose,
}: {
  onClose: () => void;
}) {
  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Text style={styles.headerEmoji}>🛡️</Text>
          </View>

          <Text style={styles.eyebrow}>
            NEXO · RED DE APOYO
          </Text>

          <Text style={styles.title}>
            No tienes que afrontarlo a solas
          </Text>

          <Text style={styles.subtitle}>
            Encuentra líneas de orientación, protección y atención.
            Elige la opción que mejor corresponda a tu situación.
          </Text>
        </View>

        <View style={styles.urgentNotice}>
          <Text style={styles.urgentTitle}>
            ¿Estás en peligro inmediato?
          </Text>

          <Text style={styles.urgentDescription}>
            Si tu vida o la de otra persona está en riesgo inmediato
            en Colombia, busca un lugar seguro si puedes y utiliza
            la línea de emergencias 123.
          </Text>

          <Pressable
            onPress={() => openPhone('123')}
            style={({ pressed }) => [
              styles.urgentButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.urgentButtonText}>
              Abrir teléfono · 123
            </Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>
          Líneas de ayuda
        </Text>

        <Text style={styles.sectionDescription}>
          Selecciona una opción para consultar sus datos y abrir
          el marcador de tu dispositivo.
        </Text>

        {contacts.map((contact) => (
          <ContactCard
            key={contact.id}
            contact={contact}
          />
        ))}

        <View style={styles.footerNote}>
          <Text style={styles.footerTitle}>
            Tu privacidad importa
          </Text>

          <Text style={styles.footerText}>
            NEXO no realiza llamadas automáticas ni envía tus datos
            a estas entidades. Al pulsar «Abrir teléfono», se intenta
            abrir el marcador para que tú decidas si deseas llamar.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.backButtonText}>
            Volver a NEXO
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FAF9FE',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 35,
  },
  header: {
    alignItems: 'flex-start',
    paddingTop: 8,
    marginBottom: 23,
  },
  headerIcon: {
    width: 58,
    height: 58,
    borderRadius: 19,
    backgroundColor: '#F0EAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 17,
  },
  headerEmoji: {
    fontSize: 29,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 9,
  },
  title: {
    color: colors.text,
    fontSize: 27,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 9,
  },
  urgentNotice: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 20,
    padding: 17,
    marginBottom: 27,
  },
  urgentTitle: {
    color: '#9F1239',
    fontSize: 16,
    fontWeight: '900',
  },
  urgentDescription: {
    color: '#881337',
    fontSize: 12,
    lineHeight: 19,
    marginTop: 8,
  },
  urgentButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#BE123C',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginTop: 14,
  },
  urgentButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '900',
  },
  sectionDescription: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 15,
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 17,
    marginBottom: 13,
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconText: {
    fontSize: 22,
  },
  contactTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 21,
  },
  description: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 6,
  },
  number: {
    fontSize: 26,
    fontWeight: '900',
    marginTop: 13,
  },
  schedule: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 16,
    marginTop: 4,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginTop: 15,
  },
  callButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  callArrow: {
    color: '#FFFFFF',
    fontSize: 19,
    marginLeft: 7,
    marginTop: -2,
  },
  pressed: {
    opacity: 0.78,
  },
  footerNote: {
    backgroundColor: '#F0EAFE',
    borderRadius: 16,
    padding: 15,
    marginTop: 7,
  },
  footerTitle: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },
  footerText: {
    color: '#4C1D95',
    fontSize: 11,
    lineHeight: 18,
    marginTop: 5,
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 17,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
});
