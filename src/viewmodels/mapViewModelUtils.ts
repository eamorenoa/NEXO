/**
 * Convierte errores de carga del mapa en mensajes seguros y comprensibles.
 * Evita mostrar detalles internos cuando la API responde con un error de servidor.
 */
export function getMapErrorMessage(error: unknown): string {
  if (typeof error !== 'object' || error === null) {
    return 'No fue posible cargar los lugares. Compruebe su conexión e inténtelo de nuevo.';
  }

  const candidate = error as {
    message?: unknown;
    status?: unknown;
    code?: unknown;
  };

  if (candidate.status === 401) {
    return 'Su sesión no está activa. Inicie sesión nuevamente.';
  }

  if (candidate.status === 403) {
    return 'No tiene permiso para consultar el mapa.';
  }

  if (
    typeof candidate.status === 'number' &&
    candidate.status >= 500
  ) {
    return 'El servicio del mapa no está disponible. Inténtelo más tarde.';
  }

  if (typeof candidate.message === 'string') {
    const message = candidate.message.trim();

    if (
      message &&
      !/network request failed|failed to fetch|fetch failed/i.test(message)
    ) {
      return message;
    }
  }

  return 'No fue posible cargar los lugares. Compruebe su conexión e inténtelo de nuevo.';
}
