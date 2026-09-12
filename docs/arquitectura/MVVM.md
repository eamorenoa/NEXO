# Arquitectura MVVM de NEXO

## Modelo
Representa entidades: User, Need, CommunityPost, MapPlace y AIResponse.

## ViewModel
Controla estado, loading, errores y acciones de usuario. Ejemplos: `useAuthViewModel`, `useNeedsViewModel`, `useMapViewModel`, `useAIViewModel`.

## View
Las pantallas renderizan estado y emiten eventos. No acceden directamente a PostgreSQL, JWT ni OpenAI.

## Services
Centralizan HTTP y permiten cambiar backend/proveedor sin reescribir las vistas.

## Ventaja para NEXO
La ficha técnica plantea integrar IA, geolocalización, autenticación y servicios comunitarios. MVVM permite mantener estos módulos separados y ampliar el sistema sin convertir las pantallas en archivos monolíticos. fileciteturn3file2L111-L142
