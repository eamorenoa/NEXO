import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import NativeMapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';

import { useMapViewModel } from '../viewmodels/useMapViewModel';
import { colors } from '../shared/theme';

const DEFAULT_LOCATION = {
  latitude: 4.711,
  longitude: -74.0721,
};

const DISTANCES = [0.5, 1, 2, 5, 10];

const CATEGORIES = [
  { key: 'all', label: 'Todo' },
  { key: 'help', label: 'Ayuda' },
  { key: 'service', label: 'Servicios' },
  { key: 'job', label: 'Empleo' },
  { key: 'donation', label: 'Donaciones' },
  { key: 'report', label: 'Reportes' },
];

function calculateDistance(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number
) {
  const earthRadius = 6371;

  const dLatitude = ((latitude2 - latitude1) * Math.PI) / 180;
  const dLongitude = ((longitude2 - longitude1) * Math.PI) / 180;

  const a =
    Math.sin(dLatitude / 2) * Math.sin(dLatitude / 2) +
    Math.cos((latitude1 * Math.PI) / 180) *
      Math.cos((latitude2 * Math.PI) / 180) *
      Math.sin(dLongitude / 2) *
      Math.sin(dLongitude / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
}

function formatDistance(distance: number) {
  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  }

  return `${distance.toFixed(1)} km`;
}

function getCategoryLabel(type: string) {
  switch (type) {
    case 'help':
      return 'Ayuda';

    case 'service':
      return 'Servicios';

    case 'job':
      return 'Empleo';

    case 'donation':
      return 'Donaciones';

    case 'report':
      return 'Reportes';

    default:
      return 'Lugar';
  }
}

function WebMap({
  places,
  center,
}: {
  places: any[];
  center: {
    latitude: number;
    longitude: number;
  };
}) {
  const html = useMemo(() => {
    const markers = JSON.stringify(
      places.map((place) => ({
        lat: place.latitude,
        lng: place.longitude,
        name: place.name,
        description: place.description || '',
      }))
    );

    return `
      <!doctype html>

      <html>
        <head>
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1"
          />

          <link
            rel="stylesheet"
            href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          />

          <style>
            html,
            body,
            #map {
              height: 100%;
              margin: 0;
              padding: 0;
            }

            body {
              font-family: Arial, sans-serif;
            }
          </style>
        </head>

        <body>
          <div id="map"></div>

          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

          <script>
            const center = [
              ${center.latitude},
              ${center.longitude}
            ];

            const map = L.map('map').setView(center, 14);

            L.tileLayer(
              'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
              {
                attribution: '© OpenStreetMap'
              }
            ).addTo(map);

            const places = ${markers};

            places.forEach(place => {
              L.marker([
                place.lat,
                place.lng
              ])
                .addTo(map)
                .bindPopup(
                  '<b>' +
                  place.name +
                  '</b><br>' +
                  place.description
                );
            });
          </script>
        </body>
      </html>
    `;
  }, [places, center]);

  return (
    <iframe
      title="Mapa NEXO"
      srcDoc={html}
      style={{
        width: '100%',
        height: '100%',
        border: 0,
      }}
    />
  );
}

export function MapView() {
  const vm = useMapViewModel();

  const mapRef = useRef<NativeMapView>(null);

  const [location, setLocation] =
    useState<Location.LocationObject | null>(null);

  const [locationError, setLocationError] =
    useState(false);

  const [selectedCategory, setSelectedCategory] =
    useState('all');

  const [maxDistance, setMaxDistance] =
    useState(2);

  const [selectedPlace, setSelectedPlace] =
    useState<any | null>(null);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  async function getCurrentLocation() {
    try {
      const permission =
        await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        setLocationError(true);
        return;
      }

      const current =
        await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

      setLocation(current);

      const region: Region = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };

      mapRef.current?.animateToRegion(region, 1000);
    } catch (error) {
      console.log(
        'Error obteniendo ubicación:',
        error
      );

      setLocationError(true);
    }
  }

  const center = location
    ? {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      }
    : DEFAULT_LOCATION;

  const placesWithDistance = useMemo(() => {
    return vm.places.map((place: any) => {
      const distance = calculateDistance(
        center.latitude,
        center.longitude,
        Number(place.latitude),
        Number(place.longitude)
      );

      return {
        ...place,
        distance,
      };
    });
  }, [vm.places, center.latitude, center.longitude]);

  const filteredPlaces = useMemo(() => {
    return placesWithDistance
      .filter((place: any) => {
        const categoryMatches =
          selectedCategory === 'all' ||
          place.type === selectedCategory;

        const distanceMatches =
          place.distance <= maxDistance;

        return (
          categoryMatches &&
          distanceMatches
        );
      })
      .sort(
        (a: any, b: any) =>
          a.distance - b.distance
      );
  }, [
    placesWithDistance,
    selectedCategory,
    maxDistance,
  ]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>
          Mapa comunitario
        </Text>

        <Text style={styles.subtitle}>
          Encuentre ayuda, servicios y oportunidades
          cerca de usted.
        </Text>

        {/* CATEGORÍAS */}

        <Text style={styles.sectionTitle}>
          Categoría
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
        >
          {CATEGORIES.map((category) => {
            const active =
              selectedCategory === category.key;

            return (
              <Pressable
                key={category.key}
                onPress={() => {
                  setSelectedCategory(
                    category.key
                  );

                  setSelectedPlace(null);
                }}
                style={[
                  styles.categoryButton,
                  active &&
                    styles.categoryButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    active &&
                      styles.categoryTextActive,
                  ]}
                >
                  {category.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* DISTANCIA */}

        <Text style={styles.sectionTitle}>
          Buscar lugares en
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
        >
          {DISTANCES.map((distance) => {
            const active =
              maxDistance === distance;

            const label =
              distance < 1
                ? `${distance * 1000} m`
                : `${distance} km`;

            return (
              <Pressable
                key={distance}
                onPress={() => {
                  setMaxDistance(distance);
                  setSelectedPlace(null);
                }}
                style={[
                  styles.distanceButton,
                  active &&
                    styles.distanceButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.distanceText,
                    active &&
                      styles.distanceTextActive,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* MAPA */}

        <View style={styles.mapContainer}>
          {Platform.OS === 'web' ? (
            <WebMap
              places={filteredPlaces}
              center={center}
            />
          ) : (
            <NativeMapView
              ref={mapRef}
              style={styles.map}
              initialRegion={{
                ...center,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}
              showsUserLocation
              showsMyLocationButton
              onPress={() =>
                setSelectedPlace(null)
              }
            >
              {location && (
                <Marker
                  coordinate={center}
                  title="Usted está aquí"
                  description="Su ubicación actual"
                />
              )}

              {filteredPlaces.map(
                (place: any) => (
                  <Marker
                    key={String(place.id)}
                    coordinate={{
                      latitude:
                        Number(place.latitude),
                      longitude:
                        Number(place.longitude),
                    }}
                    title={place.name}
                    description={
                      place.description ||
                      getCategoryLabel(
                        place.type
                      )
                    }
                    onPress={() =>
                      setSelectedPlace(place)
                    }
                  />
                )
              )}
            </NativeMapView>
          )}
        </View>

        {/* ESTADO DE UBICACIÓN */}

        <View style={styles.locationCard}>
          <View style={styles.locationIcon}>
            <Text style={styles.locationIconText}>
              📍
            </Text>
          </View>

          <View style={styles.locationInfo}>
            <Text style={styles.locationTitle}>
              {location
                ? 'Ubicación encontrada'
                : locationError
                  ? 'Ubicación no disponible'
                  : 'Buscando su ubicación...'}
            </Text>

            <Text style={styles.locationText}>
              {location
                ? `${location.coords.latitude.toFixed(
                    5
                  )}, ${location.coords.longitude.toFixed(
                    5
                  )}`
                : locationError
                  ? 'Revise el permiso de ubicación.'
                  : 'Espere un momento...'}
            </Text>
          </View>

          <Pressable
            onPress={getCurrentLocation}
            style={styles.refreshButton}
          >
            <Text style={styles.refreshText}>
              Actualizar
            </Text>
          </Pressable>
        </View>

        {/* RESULTADOS */}

        <View style={styles.resultsHeader}>
          <View>
            <Text style={styles.resultsTitle}>
              Lugares cercanos
            </Text>

            <Text style={styles.resultsSubtitle}>
              Hasta {maxDistance < 1
                ? `${maxDistance * 1000} metros`
                : `${maxDistance} km`}
            </Text>
          </View>

          {vm.loading && (
            <ActivityIndicator
              color={colors.primary}
            />
          )}
        </View>

        {vm.error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>
              No se pudieron cargar los lugares
            </Text>

            <Text style={styles.errorText}>
              {vm.error}
            </Text>

            <Pressable
              onPress={vm.reload}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>
                Intentar nuevamente
              </Text>
            </Pressable>
          </View>
        ) : filteredPlaces.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              No encontramos lugares cercanos
            </Text>

            <Text style={styles.emptyText}>
              Pruebe aumentando la distancia o
              seleccionando otra categoría.
            </Text>
          </View>
        ) : (
          filteredPlaces.map((place: any) => (
            <Pressable
              key={String(place.id)}
              onPress={() =>
                setSelectedPlace(place)
              }
              style={[
                styles.placeCard,
                selectedPlace?.id === place.id &&
                  styles.placeCardSelected,
              ]}
            >
              <View style={styles.placeIcon}>
                <Text style={styles.placeIconText}>
                  {place.type === 'help'
                    ? '🆘'
                    : place.type === 'service'
                      ? '🏥'
                      : place.type === 'job'
                        ? '💼'
                        : place.type ===
                            'donation'
                          ? '🎁'
                          : place.type ===
                              'report'
                            ? '📢'
                            : '📍'}
                </Text>
              </View>

              <View style={styles.placeInfo}>
                <Text style={styles.placeName}>
                  {place.name}
                </Text>

                <Text
                  style={styles.placeCategory}
                >
                  {getCategoryLabel(
                    place.type
                  )}
                </Text>

                {place.description && (
                  <Text
                    style={styles.placeDescription}
                    numberOfLines={2}
                  >
                    {place.description}
                  </Text>
                )}
              </View>

              <View style={styles.distanceBadge}>
                <Text
                  style={styles.distanceBadgeText}
                >
                  {formatDistance(
                    place.distance
                  )}
                </Text>
              </View>
            </Pressable>
          ))
        )}

        {/* DETALLE */}

        {selectedPlace && (
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <View style={styles.detailTitleContainer}>
                <Text style={styles.detailTitle}>
                  {selectedPlace.name}
                </Text>

                <Text style={styles.detailCategory}>
                  {getCategoryLabel(
                    selectedPlace.type
                  )}
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  setSelectedPlace(null)
                }
                style={styles.closeButton}
              >
                <Text
                  style={styles.closeButtonText}
                >
                  ×
                </Text>
              </Pressable>
            </View>

            {selectedPlace.description && (
              <Text
                style={styles.detailDescription}
              >
                {selectedPlace.description}
              </Text>
            )}

            <View style={styles.detailDistance}>
              <Text
                style={styles.detailDistanceLabel}
              >
                Distancia desde usted
              </Text>

              <Text
                style={styles.detailDistanceValue}
              >
                {formatDistance(
                  selectedPlace.distance
                )}
              </Text>
            </View>

            <View style={styles.coordinates}>
              <Text style={styles.coordinatesLabel}>
                Coordenadas
              </Text>

              <Text style={styles.coordinatesText}>
                {Number(
                  selectedPlace.latitude
                ).toFixed(5)}
                {', '}
                {Number(
                  selectedPlace.longitude
                ).toFixed(5)}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scroll: {
    flex: 1,
  },

  content: {
    padding: 18,
    paddingBottom: 100,
  },

  title: {
    color: colors.text,
    fontSize: 27,
    fontWeight: '900',
  },

  subtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 18,
    marginBottom: 9,
  },

  horizontalScroll: {
    marginBottom: 2,
  },

  categoryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    marginRight: 8,
  },

  categoryButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  categoryText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },

  categoryTextActive: {
    color: '#FFFFFF',
  },

  distanceButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 20,
    marginRight: 8,
  },

  distanceButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  distanceText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },

  distanceTextActive: {
    color: '#FFFFFF',
  },

  mapContainer: {
    height: 390,
    marginTop: 16,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#EEF2E8',
    borderWidth: 1,
    borderColor: colors.border,
  },

  map: {
    flex: 1,
  },

  locationCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 17,
    padding: 13,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  locationIconText: {
    fontSize: 19,
  },

  locationInfo: {
    flex: 1,
  },

  locationTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },

  locationText: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 3,
  },

  refreshButton: {
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 8,
  },

  refreshText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },

  resultsHeader: {
    marginTop: 18,
    marginBottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  resultsTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },

  resultsSubtitle: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },

  placeCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 17,
    padding: 12,
    marginBottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
  },

  placeCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },

  placeIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  placeIconText: {
    fontSize: 20,
  },

  placeInfo: {
    flex: 1,
    paddingRight: 8,
  },

  placeName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },

  placeCategory: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 3,
  },

  placeDescription: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },

  distanceBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  distanceBadgeText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '800',
  },

  detailCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 18,
    padding: 15,
    marginTop: 5,
  },

  detailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  detailTitleContainer: {
    flex: 1,
    paddingRight: 10,
  },

  detailTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },

  detailCategory: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
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

  detailDescription: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },

  detailDistance: {
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    padding: 11,
    marginTop: 12,
  },

  detailDistanceLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
  },

  detailDistanceValue: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 2,
  },

  coordinates: {
    backgroundColor: '#F7F8FA',
    borderRadius: 12,
    padding: 10,
    marginTop: 9,
  },

  coordinatesLabel: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '800',
  },

  coordinatesText: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 3,
  },

  emptyCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 17,
    padding: 18,
    alignItems: 'center',
  },

  emptyTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },

  emptyText: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 5,
  },

  errorCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 17,
    padding: 16,
  },

  errorTitle: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '800',
  },

  errorText: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 5,
  },

  retryButton: {
    backgroundColor: colors.danger,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    marginTop: 10,
  },

  retryText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  bottomSpace: {
    height: 30,
  },
});