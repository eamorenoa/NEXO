# Mapas e IA — NEXO

## Mapa
Los puntos comunitarios se almacenan en PostgreSQL y se exponen por `/api/map/places`. En Android/iOS se muestran con `react-native-maps`; en web se muestra Leaflet sobre OpenStreetMap.

## IA
NEXO usa dos niveles:
1. Clasificador local por reglas como respaldo y para tests.
2. OpenAI Responses API para orientación generativa y clasificación cuando existe `OPENAI_API_KEY`.

La ficha técnica establece explícitamente el uso de geolocalización, mapas e IA para clasificación, búsqueda y recomendaciones. fileciteturn3file0L27-L34
