import { api } from './api';
import { MapPlace, normalizeMapPlaces } from '../models/MapPlace';

async function places(): Promise<MapPlace[]> {
  const response: unknown = await api.places();
  return normalizeMapPlaces(response);
}

export const MapService = {
  places,
};
