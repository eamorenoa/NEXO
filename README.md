# NEXO 2.0 — Plataforma comunitaria

NEXO es una aplicación móvil/web que conecta necesidades de la comunidad con personas, recursos, servicios y oportunidades. La ficha técnica del proyecto contempla React Native/Expo, Node.js + Express, PostgreSQL, JWT, geolocalización y servicios de IA; esta versión implementa ese núcleo en una arquitectura MVVM. fileciteturn3file0L26-L34

## Incluye

- MVVM real: Models + Views + ViewModels + Services.
- Registro e inicio de sesión con JWT y contraseñas con bcrypt.
- Publicación y consulta de necesidades.
- Clasificación automática de necesidades con NEXO AI.
- Asistente conversacional NEXO AI usando OpenAI Responses API cuando existe `OPENAI_API_KEY`; modo local de respaldo cuando no existe.
- Mapa comunitario funcional:
  - Android/iOS: `react-native-maps`.
  - Web: Leaflet + OpenStreetMap mediante iframe.
  - Marcadores de ayuda, servicios, empleo, donaciones y reportes.
- Comunidad: publicaciones.
- Perfil y cierre de sesión.
- Modo emergencia.
- Analítica visual simple en inicio.
- PostgreSQL + Docker Compose.
- Tests unitarios del clasificador local.
- CI preparada para GitHub Actions.

La ficha técnica exige que el prototipo incluya registro/login, perfil, “¿Qué necesitas?”, ayuda vecinal, mapa, accesibilidad, donaciones/objetos, empleo, reportes, chat, notificaciones y NEXO AI; el núcleo de esta versión deja listas las capas para ampliar esos módulos sin romper MVVM. fileciteturn3file1L88-L101

## 1. Requisitos

- Node.js 22 LTS recomendado.
- npm 10+.
- Docker Desktop si se desea levantar PostgreSQL y API automáticamente.
- Expo Go para probar en teléfono o emulador Android/iOS.
- Una API key de OpenAI para activar IA generativa real.

## 2. Instalar frontend

Desde la carpeta que contiene `package.json`:

```bash
npm install
npm run typecheck
npx expo start
```

Para navegador:

```bash
npm run web
```

Para Android:

```bash
npm run android
```

## 3. Levantar backend + PostgreSQL con Docker

En la raíz del proyecto:

```bash
docker compose up --build
```

La API queda en `http://localhost:3000` y PostgreSQL en `localhost:5432`.

## 4. Activar NEXO AI

Crea un archivo `.env` en la raíz o define la variable en el entorno de Docker:

```env
OPENAI_API_KEY=tu_clave
OPENAI_MODEL=gpt-5.6-luna
```

No subas `.env` a GitHub. El repositorio ignora archivos `.env`.

La integración usa la Responses API y el SDK oficial de OpenAI. Los modelos actuales de OpenAI están disponibles mediante Responses API y SDKs. citeturn0search0

## 5. Si usas teléfono físico

`localhost` desde el celular significa “el celular”, no tu PC. Para probar la API desde un teléfono, cambia `EXPO_PUBLIC_API_URL` por la IP LAN de tu PC, por ejemplo:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.20:3000/api
```

Luego reinicia Expo.

## 6. Arquitectura MVVM

```text
src/
├── models/        # Entidades y tipos
├── views/         # UI; no contiene reglas de negocio
├── viewmodels/    # Estado, acciones y flujo de presentación
├── services/      # API y acceso a datos
├── components/    # Componentes reutilizables de UI
├── config/        # Configuración de entorno
└── shared/        # Tema y utilidades visuales
```

Flujo:

```text
VIEW
  ↓ eventos
VIEWMODEL
  ↓ llamadas
SERVICE
  ↓ HTTP
NODE / EXPRESS
  ↓
POSTGRESQL / OPENAI
```

## 7. Endpoints

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/needs`
- `POST /api/needs`
- `GET /api/community`
- `POST /api/community`
- `GET /api/map/places`
- `POST /api/ai/assistant`
- `GET /api/stats`

## 8. GitHub

```bash
git init
git add .
git commit -m "feat: NEXO MVP con MVVM, mapas e IA"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/nexo.git
git push -u origin main
```

Antes de hacer push revisa que no exista `.env` ni ninguna API key dentro del código.

## 9. Nota académica

El proyecto integrador pide aproximadamente el 50 % de los entregables por asignatura para el segundo avance. La documentación y la selección de entregables se encuentran en `docs/`. fileciteturn4file3L208-L218
