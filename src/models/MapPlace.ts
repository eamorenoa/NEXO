export type MapItemSource = 'place' | 'need';

export type MapPlace = {
  id: string | number;
  source: MapItemSource;
  title: string;
  category: string;
  latitude: number;
  longitude: number;
  description?: string;
  address?: string | null;
  status?: string | null;
  author?: string | null;
  is_owner?: boolean;
};

type UnknownRecord = Record<string, unknown>;

export function hasValidCoordinates(
  latitude: unknown,
  longitude: unknown,
): latitude is number {
  return (
    typeof latitude === 'number' &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === 'number' &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/**
 * Convierte una coordenada recibida de la API en un número válido.
 * Admite números y cadenas numéricas no vacías.
 * Nunca sustituye una coordenada inválida por una ubicación ficticia.
 */
function parseCoordinate(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function isRecord(value: unknown): value is UnknownRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isValidId(value: unknown): value is string | number {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value);
  }

  return typeof value === 'string' && value.trim().length > 0;
}

function optionalString(
  value: unknown,
): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function optionalNullableString(
  value: unknown,
): string | null | undefined {
  if (value === null || typeof value === 'string') {
    return value;
  }

  return undefined;
}

function normalizeMapPlace(value: unknown): MapPlace | null {
  if (!isRecord(value)) {
    return null;
  }

  const {
    id,
    source,
    title,
    category,
    latitude: rawLatitude,
    longitude: rawLongitude,
  } = value;

  if (
    !isValidId(id) ||
    (source !== 'place' && source !== 'need') ||
    typeof title !== 'string' ||
    title.trim().length === 0 ||
    typeof category !== 'string' ||
    category.trim().length === 0
  ) {
    return null;
  }

  const latitude = parseCoordinate(rawLatitude);
  const longitude = parseCoordinate(rawLongitude);

  if (
    latitude === null ||
    longitude === null ||
    !hasValidCoordinates(latitude, longitude)
  ) {
    return null;
  }

  const description = optionalString(value.description);
  const address = optionalNullableString(value.address);
  const status = optionalNullableString(value.status);
  const author = optionalNullableString(value.author);

  const place: MapPlace = {
    id,
    source,
    title: title.trim(),
    category: category.trim(),
    latitude,
    longitude,
  };

  if (description !== undefined) {
    place.description = description;
  }

  if (address !== undefined) {
    place.address = address;
  }

  if (status !== undefined) {
    place.status = status;
  }

  if (author !== undefined) {
    place.author = author;
  }

  if (typeof value.is_owner === 'boolean') {
    place.is_owner = value.is_owner;
  }

  return place;
}

/**
 * Valida y normaliza la colección recibida del endpoint del mapa.
 *
 * - Rechaza respuestas que no sean listas.
 * - Descarta registros individuales malformados.
 * - Conserva únicamente fuentes place y need.
 * - No genera registros ni coordenadas ficticias.
 */
export function normalizeMapPlaces(response: unknown): MapPlace[] {
  if (!Array.isArray(response)) {
    throw new TypeError(
      'La respuesta del mapa debe ser una lista de lugares.',
    );
  }

  const places: MapPlace[] = [];

  for (const item of response) {
    const place = normalizeMapPlace(item);

    if (place !== null) {
      places.push(place);
    }
  }

  return places;
}