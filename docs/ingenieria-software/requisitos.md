# Documento de requisitos del sistema — NEXO

## Objetivo
NEXO conecta necesidades de habitantes con ayuda, recursos, oportunidades y comunicación comunitaria. El MVP evita convertir cada función en una pantalla independiente.

## Requisitos funcionales
- RF01: iniciar sesión.
- RF02: registrarse con nombre, correo y contraseña.
- RF03: crear una necesidad y elegir categoría.
- RF04: conservar la necesidad en PostgreSQL cuando la API esté disponible.
- RF05: publicar mensajes en la comunidad.
- RF06: consultar el mapa de recursos cercanos.
- RF07: consultar perfil y cerrar sesión.
- RF08: consultar notificaciones.
- RF09: abrir modo de emergencia.
- RF10: clasificar necesidades mediante reglas base y dejar preparada la capa para NEXO AI.
- RF11: mostrar indicadores y gráficos de actividad comunitaria.

## Requisitos no funcionales
- RNF01: interfaz adaptable a móvil y web mediante Expo/React Native.
- RNF02: contraseñas almacenadas con hash bcrypt en backend.
- RNF03: autenticación de API mediante JWT.
- RNF04: código TypeScript organizado por funcionalidades.
- RNF05: API REST con Express y PostgreSQL.
- RNF06: contenedores reproducibles mediante Docker.
- RNF07: validaciones de entrada para datos críticos.
- RNF08: no exponer password_hash al cliente.

## Alcance del MVP
Incluye autenticación, necesidades, comunidad, mapa visual, perfil, notificaciones, emergencia y visualización de indicadores. Geolocalización real, chat en tiempo real, correo de recuperación y un proveedor externo de IA quedan como extensiones controladas.
