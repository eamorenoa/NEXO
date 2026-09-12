# Evidencia DevOps — NEXO

## Entregables seleccionados

### 1. Entorno contenedorizado
`backend/Dockerfile` construye la API en Node 22 sobre Alpine y copia únicamente los archivos necesarios.

### 2. Pipeline CI
`.github/workflows/ci.yml` ejecuta:
- instalación del frontend;
- TypeScript check;
- instalación del backend;
- pruebas unitarias;
- validación sintáctica de Node.

### 3. Docker Compose
`docker-compose.yml` orquesta:
- `db`: PostgreSQL 17;
- `api`: Express + Node.

Comando:

```bash
docker compose up --build
```

## Flujo

```text
Git push / Pull Request
        ↓
GitHub Actions
        ↓
TypeScript + tests + Node check
        ↓
Docker Compose
   ┌────┴────┐
   ↓         ↓
 API      PostgreSQL
```
