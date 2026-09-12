# Diseño arquitectónico — NEXO

## Arquitectura

```text
Expo / React Native ──HTTP──> Express API ──SQL──> PostgreSQL
        │                          │
        │                          └──> Clasificador NEXO AI
        └──> mapa/geolocalización futura

Admin Web ───────────────HTTP──> Express API
```

## Capas
1. Presentación: `src/features`.
2. Aplicación: `src/app` y view models.
3. Infraestructura: `src/shared/api.ts`.
4. Backend: Express, JWT y servicios.
5. Persistencia: PostgreSQL.

## Decisiones para reducir código
- Una navegación inferior para las cinco áreas principales.
- Una entidad `needs` con categorías para ayuda, donación, empleo y reporte.
- Componentes reutilizables para tarjetas, botones e iconos.
- Clasificación aislada en `backend/src/services/classifyNeed.js`.
- Accesibilidad y adultos mayores se manejan como preferencias transversales.
