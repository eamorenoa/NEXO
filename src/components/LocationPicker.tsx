import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import WebView from 'react-native-webview';
import * as Location from 'expo-location';

import { colors } from '../shared/theme';

type LocationValue = {
  address: string;
  latitude: number | null;
  longitude: number | null;
};

type Props = {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  disabled?: boolean;
};

type SearchResult = {
  display_name: string;
  lat: string;
  lon: string;
};

const DEFAULT_CENTER = {
  latitude: 4.711,
  longitude: -74.0721,
};

export function LocationPicker({
  value,
  onChange,
  disabled = false,
}: Props) {
  const [query, setQuery] = useState(value.address);
  const [searching, setSearching] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    setQuery(value.address);
  }, [value.address]);

  const center = {
    latitude: value.latitude ?? DEFAULT_CENTER.latitude,
    longitude: value.longitude ?? DEFAULT_CENTER.longitude,
  };

  const mapHtml = useMemo(() => {
    const lat = center.latitude;
    const lng = center.longitude;

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>
html,body,#map{height:100%;width:100%;margin:0}
body{font-family:Arial,sans-serif}
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function(){
  const initial=[${lat},${lng}];
  const map=L.map('map').setView(initial,${value.latitude === null ? 12 : 16});

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19,
    attribution:'© OpenStreetMap contributors'
  }).addTo(map);

  let marker=null;

  function sendPosition(latlng){
    const data={
      type:'location',
      latitude:latlng.lat,
      longitude:latlng.lng
    };
    if(window.ReactNativeWebView){
      window.ReactNativeWebView.postMessage(JSON.stringify(data));
    }else{
      window.parent.postMessage(data,'*');
    }
  }

  function setMarker(latlng,notify){
    if(marker){
      marker.setLatLng(latlng);
    }else{
      marker=L.marker(latlng,{draggable:true}).addTo(map);
      marker.on('dragend',function(){
        sendPosition(marker.getLatLng());
      });
    }
    if(notify) sendPosition(latlng);
  }

  if(${value.latitude !== null && value.longitude !== null}){
    setMarker(L.latLng(initial[0],initial[1]),false);
  }

  map.on('click',function(event){
    setMarker(event.latlng,true);
  });

  window.addEventListener('message',function(event){
    const data=event.data;
    if(data && data.type==='center'){
      const point=L.latLng(data.latitude,data.longitude);
      map.setView(point,16);
      setMarker(point,true);
    }
  });

  document.addEventListener('message',function(event){
    try{
      const data=JSON.parse(event.data);
      if(data.type==='center'){
        const point=L.latLng(data.latitude,data.longitude);
        map.setView(point,16);
        setMarker(point,true);
      }
    }catch(e){}
  });
})();
</script>
</body>
</html>`;
  }, [center.latitude, center.longitude, value.latitude, value.longitude]);

  async function searchAddress() {
    const cleanQuery = query.trim();

    if (cleanQuery.length < 3) {
      setError('Escriba una dirección, barrio o lugar con al menos 3 caracteres.');
      return;
    }

    setSearching(true);
    setError('');
    setResults([]);

    try {
      const params = new URLSearchParams({
        q: cleanQuery,
        format: 'jsonv2',
        limit: '5',
        countrycodes: 'co',
      });

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        {
          headers: {
            Accept: 'application/json',
            'Accept-Language': 'es',
          },
        },
      );

      if (!response.ok) {
        throw new Error('El servicio de búsqueda no está disponible.');
      }

      const data = (await response.json()) as SearchResult[];

      if (!data.length) {
        setError('No encontramos esa dirección. Pruebe con un barrio o lugar cercano.');
        return;
      }

      setResults(data);
    } catch (e: any) {
      setError(e.message || 'No se pudo buscar la dirección.');
    } finally {
      setSearching(false);
    }
  }

  async function selectResult(result: SearchResult) {
    const latitude = Number(result.lat);
    const longitude = Number(result.lon);

    const selected = {
      address: result.display_name,
      latitude,
      longitude,
    };

    setQuery(result.display_name);
    setResults([]);
    onChange(selected);
  }

  async function useCurrentLocation() {
    setGettingLocation(true);
    setError('');

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        setError('Debe conceder permiso de ubicación para usar esta opción.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      let address = '';

      try {
        const addresses = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

        if (addresses.length) {
          const item = addresses[0];
          address = [
            item.street,
            item.streetNumber,
            item.district,
            item.city,
            item.region,
          ]
            .filter(Boolean)
            .join(', ');
        }
      } catch {
        // Se permite usar las coordenadas aunque no se obtenga una dirección.
      }

      setQuery(address);
      onChange({ address, latitude, longitude });
    } catch {
      setError('No fue posible obtener su ubicación actual.');
    } finally {
      setGettingLocation(false);
    }
  }

  function receiveMapMessage(event: any) {
    try {
      const data =
        typeof event.nativeEvent?.data === 'string'
          ? JSON.parse(event.nativeEvent.data)
          : event.nativeEvent?.data ?? event.data;

      if (
        data?.type === 'location' &&
        Number.isFinite(Number(data.latitude)) &&
        Number.isFinite(Number(data.longitude))
      ) {
        onChange({
          address: value.address,
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
        });
      }
    } catch {
      // Ignorar mensajes que no correspondan a una ubicación.
    }
  }

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'location') {
        onChange({
          address: value.address,
          latitude: Number(event.data.latitude),
          longitude: Number(event.data.longitude),
        });
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onChange, value.address]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Buscar dirección o lugar</Text>

      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          editable={!disabled && !searching}
          onSubmitEditing={() => void searchAddress()}
          placeholder="Ej. Parque de Engativá, Bogotá"
          accessibilityLabel="Buscar dirección o lugar"
          style={styles.searchInput}
          returnKeyType="search"
        />

        <Pressable
          accessibilityRole="button"
          disabled={disabled || searching}
          onPress={() => void searchAddress()}
          style={styles.searchButton}
        >
          <Text style={styles.buttonText}>
            {searching ? 'Buscando…' : 'Buscar'}
          </Text>
        </Pressable>
      </View>

      {searching ? <ActivityIndicator style={styles.loader} /> : null}

      {results.map((result, index) => (
        <Pressable
          key={`${result.lat}-${result.lon}-${index}`}
          disabled={disabled}
          onPress={() => void selectResult(result)}
          style={styles.result}
        >
          <Text style={styles.resultText}>{result.display_name}</Text>
        </Pressable>
      ))}

      <Pressable
        accessibilityRole="button"
        disabled={disabled || gettingLocation}
        onPress={() => void useCurrentLocation()}
        style={styles.gpsButton}
      >
        <Text style={styles.gpsText}>
          {gettingLocation
            ? 'Obteniendo ubicación…'
            : 'Usar mi ubicación actual'}
        </Text>
      </Pressable>

      <Text style={styles.instructions}>
        Seleccione un resultado o toque el mapa para colocar el marcador.
        También puede arrastrarlo para ajustar el punto.
      </Text>

      <View style={styles.map}>
        {Platform.OS === 'web' ? (
          <iframe
            title="Seleccionar ubicación"
            srcDoc={mapHtml}
            style={{ width: '100%', height: '100%', border: 0 }}
          />
        ) : (
          <WebView
            originWhitelist={['*']}
            source={{ html: mapHtml }}
            onMessage={receiveMapMessage}
            javaScriptEnabled
            domStorageEnabled
            style={{ flex: 1 }}
          />
        )}
      </View>

      {value.latitude !== null && value.longitude !== null ? (
        <Text style={styles.selected}>
          Punto seleccionado: {value.latitude.toFixed(5)},{' '}
          {value.longitude.toFixed(5)}
        </Text>
      ) : (
        <Text style={styles.help}>
          No ha seleccionado una ubicación. Puede continuar sin ella.
        </Text>
      )}

      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}

      {value.latitude !== null && value.longitude !== null ? (
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={() => {
            onChange({ address: '', latitude: null, longitude: null });
            setQuery('');
            setResults([]);
            setError('');
          }}
          style={styles.clearButton}
        >
          <Text style={styles.clearText}>Quitar ubicación</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    marginBottom: 16,
  },
  label: {
    color: colors.text,
    fontWeight: '800',
    marginBottom: 8,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'stretch',
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: colors.text,
    backgroundColor: '#FFFFFF',
  },
  searchButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  loader: {
    margin: 10,
  },
  result: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  resultText: {
    color: colors.text,
    lineHeight: 20,
  },
  gpsButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 9,
    backgroundColor: '#E0F2FE',
  },
  gpsText: {
    color: '#075985',
    fontWeight: '800',
  },
  instructions: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
    marginBottom: 8,
  },
  map: {
    height: 300,
    overflow: 'hidden',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  selected: {
    color: colors.text,
    fontSize: 12,
    marginTop: 8,
  },
  help: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 8,
  },
  error: {
    color: '#B91C1C',
    marginTop: 8,
    lineHeight: 18,
  },
  clearButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    marginTop: 4,
  },
  clearText: {
    color: '#B91C1C',
    fontWeight: '800',
  },
});
