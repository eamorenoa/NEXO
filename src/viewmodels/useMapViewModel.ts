import { useCallback, useEffect, useState } from 'react';
import { MapPlace } from '../models/MapPlace';
import { MapService } from '../services/MapService';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return 'No fue posible cargar los puntos del mapa. Inténtalo de nuevo.';
}

export function useMapViewModel() {
  const [places, setPlaces] = useState<MapPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await MapService.places();
      setPlaces(Array.isArray(result) ? result : []);
    } catch (caughtError: unknown) {
      setError(getErrorMessage(caughtError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { places, loading, error, reload: load };
}
