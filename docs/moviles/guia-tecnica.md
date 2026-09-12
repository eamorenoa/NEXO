# Guía técnica móvil

## Tecnologías
React Native + Expo, TypeScript, API REST con `fetch`, Node.js + Express y PostgreSQL.

## Ejecución
```bash
npm install
npx expo start
```

Web:
```bash
npx expo start --web
```

## API
Por defecto: `http://localhost:3000/api`. Para otro servidor: `EXPO_PUBLIC_API_URL=http://IP_DEL_SERVIDOR:3000/api`.

## Seguridad
Bcrypt para hashes y JWT para autenticación de API. Nunca se devuelve `password_hash`.
