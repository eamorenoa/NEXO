import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';

import { colors } from '../shared/theme';

const resources = [
  {
    id: '1',
    title: 'Centro de Salud',
    category: 'Salud',
    description: 'Atención y orientación para la comunidad.',
    latitude: 4.7115,
    longitude: -74.0725,
  },
  {
    id: '2',
    title: 'Punto de Donaciones',
    category: 'Donaciones',
    description: 'Reciba o entregue donaciones para la comunidad.',
    latitude: 4.713,
    longitude: -74.0705,
  },
  {
    id: '3',
    title: 'Oportunidad de Empleo',
    category: 'Empleo',
    description: 'Información sobre oportunidades laborales.',
    latitude: 4.7095,
    longitude: -74.0735,
  },
  {
    id: '4',
    title: 'Centro de Ayuda',
    category: 'Ayuda',
    description: 'Espacio de apoyo y orientación comunitaria.',
    latitude: 4.7105,
    longitude: -74.0695,
  },
];

const categories = [
  'Todo',
  'Ayuda',
  'Donaciones',
  'Empleo',
  'Salud',
];

export function MapScreen() {
  const mapRef = useRef<MapView | null>(null);

  const [location, setLocation] =
    useState<Location.LocationObject | null>(null);

  const [locationError, setLocationError] =
    useState(false);

  const [selectedCategory, setSelectedCategory] =
    useState('Todo');

  const [selectedResource, setSelectedResource] =
    useState<(typeof resources)[number] | null>(null);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  async function getCurrentLocation() {
    try {
      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setLocationError(true);
        return;
      }

      const currentLocation =
        await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

      setLocation(currentLocation);

      const region: Region = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setTimeout(() => {
        mapRef.current?.animateToRegion(region, 1000);
      }, 500);
    } catch (error) {
      console.log(
        'Error obteniendo ubicación:',
        error
      );

      setLocationError(true);
    }
  }

  const filteredResources =
    selectedCategory === 'Todo'
      ? resources
      : resources.filter(
          (resource) =>
            resource.category === selectedCategory
        );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      {/* TÍTULO */}

      <Text style={styles.title}>
        Mapa del barrio
      </Text>

      <Text style={styles.subtitle}>
        Encuentra ayuda, recursos y oportunidades cercanas.
      </Text>

      {/* FILTROS */}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filters}
      >
        {categories.map((category) => (
          <Pressable
            key={category}
            onPress={() => {
              setSelectedCategory(category);
              setSelectedResource(null);
            }}
            style={[
              styles.filter,
              selectedCategory === category &&
                styles.filterActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                selectedCategory === category &&
                  styles.filterTextActive,
              ]}
            >
              {category}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* MAPA */}

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: 4.711,
            longitude: -74.0721,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
          showsUserLocation={true}
          showsMyLocationButton={true}
          showsCompass={true}
          zoomControlEnabled={true}
        >
          {/* UBICACIÓN DEL USUARIO */}

          {location && (
            <Marker
              coordinate={{
                latitude:
                  location.coords.latitude,
                longitude:
                  location.coords.longitude,
              }}
              title="Usted está aquí"
              description="Ubicación actual"
            />
          )}

          {/* MARCADORES DE RECURSOS */}

          {filteredResources.map((resource) => (
            <Marker
              key={resource.id}
              coordinate={{
                latitude: resource.latitude,
                longitude: resource.longitude,
              }}
              title={resource.title}
              description={resource.description}
              onPress={() =>
                setSelectedResource(resource)
              }
            />
          ))}
        </MapView>
      </View>

      {/* TARJETA DEL RECURSO SELECCIONADO */}

      {selectedResource && (
        <View style={styles.resourceCard}>
          <View style={styles.resourceHeader}>
            <View style={styles.resourceTitleContainer}>
              <Text style={styles.resourceTitle}>
                {selectedResource.title}
              </Text>

              <Text style={styles.resourceCategory}>
                {selectedResource.category}
              </Text>
            </View>

            <Pressable
              onPress={() =>
                setSelectedResource(null)
              }
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>
                ×
              </Text>
            </Pressable>
          </View>

          <Text style={styles.resourceDescription}>
            {selectedResource.description}
          </Text>

          <View style={styles.resourceLocation}>
            <Text style={styles.resourceLocationLabel}>
              Ubicación
            </Text>

            <Text style={styles.resourceLocationText}>
              {selectedResource.latitude.toFixed(5)}
              {', '}
              {selectedResource.longitude.toFixed(5)}
            </Text>
          </View>

          <Pressable style={styles.infoButton}>
            <Text style={styles.infoButtonText}>
              Ver información
            </Text>
          </Pressable>
        </View>
      )}

      {/* INFORMACIÓN DE UBICACIÓN */}

      <View style={styles.location}>
        <View style={styles.locationInfo}>
          <Text style={styles.locationTitle}>
            {location
              ? 'Ubicación encontrada'
              : locationError
                ? 'No se pudo obtener la ubicación'
                : 'Buscando su ubicación...'}
          </Text>

          <Text style={styles.locationText}>
            {location
              ? `${location.coords.latitude.toFixed(
                  5
                )}, ${location.coords.longitude.toFixed(5)}`
              : locationError
                ? 'Revise el permiso de ubicación del teléfono.'
                : 'Espere un momento...'}
          </Text>
        </View>
      </View>
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
    paddingBottom: 30,
  },

  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
  },

  subtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },

  filters: {
    marginTop: 18,
    marginBottom: 12,
  },

  filter: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },

  filterActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  filterText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },

  filterTextActive: {
    color: '#FFFFFF',
  },

  mapContainer: {
    height: 390,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#EEF2E8',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
  },

  map: {
    flex: 1,
  },

  resourceCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 16,
    marginTop: 12,
  },

  resourceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  resourceTitleContainer: {
    flex: 1,
    paddingRight: 10,
  },

  resourceTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },

  resourceCategory: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },

  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F3F5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeButtonText: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 26,
  },

  resourceDescription: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },

  resourceLocation: {
    backgroundColor: '#F7F8FA',
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
  },

  resourceLocationLabel: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },

  resourceLocationText: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 3,
  },

  infoButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 12,
  },

  infoButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  location: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 17,
    padding: 14,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  locationInfo: {
    flex: 1,
  },

  locationTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 13,
  },

  locationText: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 3,
  },
});