import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import WebView from 'react-native-webview';
import * as Location from 'expo-location';

import { useMapViewModel } from '../viewmodels/useMapViewModel';
import { colors } from '../shared/theme';
import { hasValidCoordinates, MapPlace } from '../models/MapPlace';

type MapPlaceWithDistance = MapPlace & { distance: number | null };

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
    Math.sin(dLatitude / 2) ** 2 +
    Math.cos((latitude1 * Math.PI) / 180) *
    Math.cos((latitude2 * Math.PI) / 180) *
    Math.sin(dLongitude / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
}

function formatDistance(distance: number | null) {
  if (distance === null || !Number.isFinite(distance)) {
    return 'No disponible';
  }

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
  hasLocation,
}: {
  places: MapPlaceWithDistance[];
  center: {
    latitude: number;
    longitude: number;
  };
  hasLocation: boolean;
}) {
  const html = useMemo(() => {
    const markers = JSON.stringify(
      places.map((place) => ({
        lat: Number(place.latitude),
        lng: Number(place.longitude),
        title: String(place.title ?? 'Punto comunitario'),
        category: String(place.category ?? ''),
        source: String(place.source ?? 'place'),
        description: String(place.description ?? ''),
        address: String(place.address ?? ''),
        author: String(place.author ?? ''),
      }))
    );

    // Evita que los datos puedan cerrar prematuramente la etiqueta script.
    const safeMarkers = markers.replace(/</g, '\\u003c');

    return `
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />

          <link
            rel="stylesheet"
            href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          />

          <style>
            html, body, #map {
              height: 100%;
              width: 100%;
              margin: 0;
              padding: 0;
            }

            body {
              font-family: Arial, sans-serif;
            }

            .nexo-user-location {
              background: transparent;
              border: 0;
            }

            .nexo-user-location-dot {
              width: 20px;
              height: 20px;
              box-sizing: border-box;
              background: #2583ff;
              border: 3px solid #fff;
              border-radius: 50%;
              box-shadow: 0 0 0 8px rgba(37, 131, 255, 0.20);
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

            const initialZoom = ${hasLocation ? 14 : places.length > 0 ? 12 : 2};
            const map = L.map('map').setView(center, initialZoom);

            L.tileLayer(
              'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
              {
                attribution: '&copy; OpenStreetMap contributors',
                maxZoom: 19
              }
            ).addTo(map);

            // Marcador azul para la ubicación actual del usuario.
            if (${hasLocation}) {
              const userIcon = L.divIcon({
                className: 'nexo-user-location',
                html: '<div class="nexo-user-location-dot"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
              });

              L.marker(center, {
                icon: userIcon,
                zIndexOffset: 1000
              })
                .addTo(map)
                .bindPopup('Su ubicación actual');
            }

            // Marcadores de los lugares comunitarios.
            const places = ${safeMarkers};

            places.forEach((place) => {
              if (
                !Number.isFinite(place.lat) ||
                !Number.isFinite(place.lng)
              ) {
                return;
              }

              const popup = document.createElement('div');
              const title = document.createElement('strong');

              title.textContent = place.title;
              popup.appendChild(title);

              if (place.description) {
                popup.appendChild(document.createElement('br'));

                const description = document.createElement('span');
                description.textContent = place.description;
                popup.appendChild(description);
              }

                const markerColors = {
                place: '#6D45D9',
                need: '#E05A47',
              };

              const marker = L.circleMarker([place.lat, place.lng], {
                radius: 8,
                color: '#ffffff',
                weight: 2,
                fillColor:
                  markerColors[place.source] || markerColors.place,
                fillOpacity: 1,
              });

              marker.addTo(map).bindPopup(popup);
            });
          </script>
        </body>
      </html>
    `;
  }, [places, center.latitude, center.longitude, hasLocation]);

  if (Platform.OS === 'web') {
    return (
      <iframe
        title="Mapa NEXO"
        srcDoc={html}
        style={{
          width: '100%',
          height: '100%',
          border: 0,
        }}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <WebView
      originWhitelist={['*']}
      source={{ html }}
      javaScriptEnabled
      domStorageEnabled
      style={{
        width: '100%',
        height: '100%',
      }}
    />
  );
}

export function MapView() {
  const vm = useMapViewModel();

  const [location, setLocation] =
    useState<Location.LocationObject | null>(null);

  const [locationError, setLocationError] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [maxDistance, setMaxDistance] = useState(2);
  const [selectedPlace, setSelectedPlace] = useState<MapPlaceWithDistance | null>(null);

  async function getCurrentLocation() {
    setLocationError(false);
    setLocationLoading(true);

    try {
      // 1. Comprobar que el GPS o los servicios de ubicación estén activos.
      const servicesEnabled = await Location.hasServicesEnabledAsync();

      if (!servicesEnabled) {
        setLocationError(true);
        return;
      }

      // 2. Solicitar permiso para acceder a la ubicación.
      const permission =
        await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        setLocationError(true);
        return;
      }

      // 3. Solicitar una ubicación con mayor precisión.
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        mayShowUserSettingsDialog: true,
      });

      // 4. Guardar las coordenadas obtenidas.
      setLocation(currentLocation);
      setSelectedPlace(null);
    } catch (error) {
      console.warn('No se pudo obtener la ubicación actual:', error);

      // 5. Si falla el GPS, intentar usar la última ubicación conocida.
      try {
        const lastLocation = await Location.getLastKnownPositionAsync({
          maxAge: 120000,
          requiredAccuracy: 200,
        });

        if (lastLocation) {
          setLocation(lastLocation);
          setSelectedPlace(null);
          return;
        }
      } catch (fallbackError) {
        console.warn(
          'Tampoco se pudo recuperar la última ubicación:',
          fallbackError
        );
      }

      setLocationError(true);
    } finally {
      setLocationLoading(false);
    }
  }

  const firstValidPlace = vm.places.find((place) =>
    hasValidCoordinates(place.latitude, place.longitude)
  );
  const center = location
    ? { latitude: location.coords.latitude, longitude: location.coords.longitude }
    : firstValidPlace
      ? { latitude: firstValidPlace.latitude, longitude: firstValidPlace.longitude }
      : { latitude: 0, longitude: 0 };

  const placesWithDistance = useMemo<MapPlaceWithDistance[]>(() => {
    return vm.places
      .filter((place) => hasValidCoordinates(place.latitude, place.longitude))
      .map((place) => ({
        ...place,
        distance: location
          ? calculateDistance(
            location.coords.latitude,
            location.coords.longitude,
            place.latitude,
            place.longitude,
          )
          : null,
      }));
  }, [vm.places, location]);


  const filteredPlaces = useMemo(() => {
    return placesWithDistance
      .filter((place) => {
        const categoryMatches =
          selectedCategory === 'all' ||
          place.category === selectedCategory;

        // Si no hay ubicación, no se aplica el filtro de distancia.
        const distanceMatches =
          location === null ||
          (place.distance !== null &&
            place.distance <= maxDistance);

        return categoryMatches && distanceMatches;
      })
      .sort((a, b) => {
        // Sin ubicación, conservamos el orden recibido.
        if (a.distance === null || b.distance === null) {
          return 0;
        }

        return a.distance - b.distance;
      });
  }, [placesWithDistance, selectedCategory, maxDistance, location]);


  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>NEXO · COMUNIDAD</Text>
          <Text style={styles.title}>Mapa comunitario</Text>
          <Text style={styles.subtitle}>
            Encuentra necesidades y lugares registrados por la comunidad.
          </Text>
        </View>

        {/* CATEGORÍAS */}
        <Text style={styles.sectionTitle}>Categoría</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
        >
          {CATEGORIES.map((category) => {
            const active = selectedCategory === category.key;

            return (
              <Pressable
                key={category.key}
                onPress={() => {
                  setSelectedCategory(category.key);
                  setSelectedPlace(null);
                }}
                style={[
                  styles.categoryButton,
                  active && styles.categoryButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    active && styles.categoryTextActive,
                  ]}
                >
                  {category.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* FILTRO DE DISTANCIA */}
        <Text style={styles.sectionTitle}>Buscar lugares en</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
        >
          {DISTANCES.map((distance) => {
            const active = maxDistance === distance;

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
                  active && styles.distanceButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.distanceText,
                    active && styles.distanceTextActive,
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
          <WebMap
            places={filteredPlaces}
            center={center}
            hasLocation={location !== null}
          />
        </View>

        {/* ESTADO DE UBICACIÓN */}
        <View style={styles.locationCard}>
          <View style={styles.locationIcon}>
            <Text style={styles.locationIconText}>📍</Text>
          </View>

          <View style={styles.locationInfo}>
            <Text style={styles.locationTitle}>
              {location
                ? 'Ubicación activada'
                : locationError
                  ? 'Ubicación no disponible'
                  : 'Explora sin activar tu ubicación'}
            </Text>

            <Text style={styles.locationText}>
              {location
                ? 'Las distancias se calculan desde tu ubicación.'
                : locationError
                  ? 'Comprueba los permisos o sigue explorando sin ubicación.'
                  : 'Actívala solo si quieres consultar distancias.'}
            </Text>
          </View>

          <Pressable
            onPress={() => void getCurrentLocation()}
            disabled={locationLoading}
            accessibilityRole="button"
            accessibilityLabel={location ? 'Actualizar ubicación' : 'Activar ubicación'}
            style={styles.refreshButton}
          >
            <Text style={styles.refreshText}>
              {locationLoading ? 'Buscando…' : location ? 'Actualizar' : 'Activar'}
            </Text>
          </Pressable>
        </View>

        {/* RESULTADOS */}
        <View style={styles.resultsHeader}>
          <View>

            <Text style={styles.resultsTitle}>
              {location ? 'Lugares cercanos' : 'Lugares disponibles'}
            </Text>

            <Text style={styles.resultsSubtitle}>
              {location
                ? 'Dentro de ' + (maxDistance < 1 ? `${maxDistance * 1000} m` : `${maxDistance} km`)
                : 'Activa la ubicación para filtrar por distancia'}
            </Text>
            <Text style={styles.resultsCount}>{filteredPlaces.length} resultados</Text>
          </View>

          {vm.loading && (
            <ActivityIndicator color={colors.primary} />
          )}
        </View>

        {vm.error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>
              No se pudieron cargar los lugares
            </Text>

            <Text style={styles.errorText}>{vm.error}</Text>

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
              Pruebe aumentando la distancia o seleccionando otra categoría.
            </Text>
          </View>
        ) : (
          filteredPlaces.map((place) => (
            <Pressable
              key={`${place.source}:${place.id}`}
              onPress={() => setSelectedPlace(place)}
              style={[
                styles.placeCard,
                selectedPlace?.id === place.id && selectedPlace?.source === place.source &&
                styles.placeCardSelected,
              ]}
            >
              <View style={styles.placeIcon}>
                <Text style={styles.placeIconText}>
                  {place.source === 'need'
                    ? '🆘'
                    : place.category === 'service'
                      ? '🏥'
                      : place.category === 'job'
                        ? '💼'
                        : place.category === 'donation'
                          ? '🎁'
                          : '📍'}
                </Text>
              </View>

              <View style={styles.placeInfo}>
                <Text style={styles.placeName}>{place.title}</Text>

                <Text style={styles.placeCategory}>
                  {place.source === 'need' ? 'Necesidad' : getCategoryLabel(place.category)}
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
                <Text style={styles.distanceBadgeText}>
                  {formatDistance(place.distance)}
                </Text>
              </View>
            </Pressable>
          ))
        )}

        {/* DETALLE DEL LUGAR SELECCIONADO */}
        {selectedPlace && (
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <View style={styles.detailTitleContainer}>
                <Text style={styles.detailTitle}>
                  {selectedPlace.title}
                </Text>

                <Text style={styles.detailCategory}>
                  {selectedPlace.source === 'need' ? 'Necesidad' : getCategoryLabel(selectedPlace.category)}
                </Text>
              </View>

              <Pressable
                onPress={() => setSelectedPlace(null)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>

            {selectedPlace.description && (
              <Text style={styles.detailDescription}>
                {selectedPlace.description}
              </Text>
            )}

            <View style={styles.detailDistance}>
              <Text style={styles.detailDistanceLabel}>
                Distancia desde usted
              </Text>

              <Text style={styles.detailDistanceValue}>
                {formatDistance(selectedPlace.distance)}
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 112,
  },
  hero: {
    backgroundColor: '#F2EDFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E4D9FF',
    paddingHorizontal: 20,
    paddingVertical: 22,
    marginBottom: 8,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 9,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 20,
    marginBottom: 11,
  },
  horizontalScroll: {
    marginBottom: 2,
  },
  categoryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 22,
    marginRight: 9,
  },
  categoryButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  distanceButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 22,
    marginRight: 9,
  },
  distanceButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  distanceText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  distanceTextActive: {
    color: '#FFFFFF',
  },
  mapContainer: {
    height: 380,
    marginTop: 20,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#EEF2E8',
    borderWidth: 1,
    borderColor: '#DDD4F7',
    shadowColor: '#35205F',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  map: {
    flex: 1,
  },
  locationCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 15,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    fontSize: 14,
    fontWeight: '800',
  },
  locationText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  refreshButton: {
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  resultsCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6D28D9',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  refreshText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  resultsHeader: {
    marginTop: 22,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultsTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  resultsSubtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  placeCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  placeCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  placeIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
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
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '800',
  },
  placeCategory: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 3,
  },
  placeDescription: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  distanceBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  distanceBadgeText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  detailCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 20,
    padding: 18,
    marginTop: 8,
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
    fontSize: 19,
    fontWeight: '900',
  },
  detailCategory: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 5,
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
    fontSize: 14,
    lineHeight: 21,
    marginTop: 14,
  },
  detailDistance: {
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
  },
  detailDistanceLabel: {
    color: colors.muted,
    fontSize: 12,
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
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 7,
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 20,
    padding: 18,
  },
  errorTitle: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '800',
  },
  errorText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
  },
  retryButton: {
    backgroundColor: colors.danger,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  bottomSpace: {
    height: 36,
  },
});