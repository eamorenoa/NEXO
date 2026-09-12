# Informe de pruebas de calidad y control de errores

## Estrategia
Validación estática, pruebas unitarias del clasificador y pruebas funcionales manuales del MVP.

## Pruebas automatizadas
`backend/test/classifyNeed.test.js` cubre ayuda, donación, empleo y reporte.

```bash
cd backend
npm install
npm test
```

## Validación estática
```bash
npx tsc --noEmit
```

## Casos funcionales
| Caso | Resultado esperado |
|---|---|
| Login vacío | Validación visible |
| Login demo sin API | Acceso local |
| Contraseña corta | Registro rechazado |
| Contraseñas distintas | Registro rechazado |
| Necesidad vacía | Botón deshabilitado |
| Necesidad con API | Registro en PostgreSQL |
| Publicación vacía | Botón deshabilitado |
| Cerrar sesión | Regresa a login |
| Emergencia | Abre modo de emergencia |

## Control de errores
La API usa respuestas 400, 401, 409, 500 y 503 según el caso; el frontend muestra mensajes comprensibles sin revelar detalles internos.
