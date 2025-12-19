# Auto-G - GitHub Issue Manager

Web app en Next.js para gestionar issues de GitHub con un workflow interno personalizado.

## 🚀 Features

- **Sincronización con GitHub**: Obtiene issues usando `GH_TOKEN`
- **Persistencia en Postgres**: Almacena y mantiene sincronizados los issues
- **UI de Cards**: Vista de grid con cards para cada issue
- **Contexto/Servicio**: Permite elegir un contexto para cada issue
- **Workflow interno**: Estados `pending` → `in_process` → `end`

## 📋 Requisitos

- Node.js 20+
- Docker & Docker Compose
- Token de GitHub con permisos de lectura de issues

## 🏃 Quick Start

### 1. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/auto_g?schema=public"
GH_TOKEN="tu_github_token_aqui"
GH_REPOS="owner/repo1,owner/repo2"
```

### 2. Levantar con Docker

```bash
# Levantar Postgres
docker-compose up db -d

# Esperar a que Postgres esté listo, luego correr migraciones
npx prisma migrate deploy
npx prisma generate

# Opcional: seed con data de ejemplo
npm run db:seed

# Levantar la app
npm run dev
```

### 3. O todo con Docker Compose

```bash
docker-compose up --build
```

La app estará disponible en `http://localhost:3000`

## 🗄️ Base de Datos

### Modelo `Issue`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | STRING | PK auto-generado |
| `github_number` | INT | Número del issue en GitHub |
| `repository` | TEXT | owner/repo |
| `title` | TEXT | Título del issue |
| `description` | TEXT | Descripción/body |
| `status_github` | ENUM | `open` \| `closed` |
| `workflow_status` | ENUM | `pending` \| `in_process` \| `end` |
| `url` | TEXT | URL al issue en GitHub |
| `labels` | JSONB | Array de labels |
| `selected_context` | ENUM | Contexto seleccionado |
| `prompt` | TEXT | Prompt personalizado |
| `created_at_github` | TIMESTAMP | Fecha creación en GitHub |
| `updated_at_github` | TIMESTAMP | Fecha actualización en GitHub |

## 🔌 API Endpoints

### `GET /api/issues`

Lista issues con filtros y paginación.

Query params:
- `repository`: Filtrar por repo
- `workflowStatus`: `pending` | `in_process` | `end`
- `statusGithub`: `open` | `closed`
- `page`: Número de página (default: 1)
- `limit`: Items por página (default: 20)

### `POST /api/issues/:id/start`

Inicia el procesamiento de un issue.

Body:
```json
{
  "selectedContext": "checkout-api",
  "prompt": "Prompt opcional..."
}
```

Contextos disponibles:
- `checkout-api`
- `transparent-checkout`
- `buyer3`
- `service-payment-request`
- `QA_merchant`

### `POST /api/sync-issues`

Sincroniza issues desde GitHub.

## 🔄 Lógica de Sincronización

1. Para cada issue de GitHub:
   - **Si no existe en DB**:
     - `workflow_status = pending` si `status_github = open`
     - `workflow_status = end` si `status_github = closed`
   - **Si existe**:
     - Actualiza título, descripción, labels, timestamps
     - Si `status_github` cambió a `closed` → `workflow_status = end`
     - Si sigue `open`, respeta el workflow status actual

> **Regla**: Si GitHub dice `closed`, la app fuerza `workflow_status = end`. GitHub manda.

## 🛠️ Desarrollo

```bash
# Instalar dependencias
npm install

# Generar Prisma Client
npx prisma generate

# Correr migraciones
npx prisma migrate dev

# Levantar en modo desarrollo
npm run dev

# Ver la base de datos con Prisma Studio
npm run db:studio

# Sincronizar issues manualmente
npm run sync
```

## 📁 Estructura del Proyecto

```
auto-g/
├── prisma/
│   ├── schema.prisma       # Esquema de la DB
│   ├── migrations/         # Migraciones SQL
│   └── seed.ts             # Data de ejemplo
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── issues/     # CRUD de issues
│   │   │   └── sync-issues/# Sincronización
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── IssueList.tsx
│   │   └── IssueCard.tsx
│   ├── lib/
│   │   ├── prisma.ts       # Cliente Prisma
│   │   └── sync-issues.ts  # Lógica de sync
│   └── types/
│       └── issue.ts        # Tipos TypeScript
├── docker-compose.yml
├── Dockerfile
└── package.json
```

## 🐳 Docker

```bash
# Build & run todo
docker-compose up --build

# Solo la DB
docker-compose up db -d

# Ver logs
docker-compose logs -f web
```
