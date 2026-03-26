# UrbanSafeHub

🕵️ UrbanSafeHub es un mapa comunitario donde podrás ver y calificar zonas de las ciudades.

## Problema que resuelve

Latinoamerica es hermosa, pero tenemos gente mala. Cuando creé (otra versión) este proyecto era un joven que no conocía mucho de Lima y me dije a mi mismo "Si tan solo google maps pudiera decirme que lugares son peligrosos para no ir :("

## Solución propuesta

Usuarios que sepan como es tal lugar podrá crear/calificar zonas para así informar a locales y extranjeros sobre que zonas visitar o no.

### Flujo principal

1. El usuario entra al mapa desde `app/[lang]/page.tsx`.
2. La UI carga la experiencia del mapa desde `features/zones/presentation`.
3. Las acciones del frontend consumen rutas como `app/api/zones/*`.
4. Las rutas invocan casos de uso en `lib/zones/application`.
5. Los casos de uso dependen de puertos y repositorios implementados en `lib/zones/infrastructure`.
6. Supabase/Postgres persiste zonas, ratings, agregados y actores anónimos.
7. Redis se usa para cachear consultas de zonas visibles.

## Stack tecnológico

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Leaflet + React Leaflet
- next-themes
- Phosphor Icons

### Backend y datos

- Next.js Route Handlers
- Supabase
- PostgreSQL
- Prisma
- Upstash Redis

### Testing

- Vitest
- Testing Library
- jsdom

## Cómo correr el proyecto

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Completa el archivo `.env` con las credenciales de Supabase y las llaves necesarias.

### 3. Generar cliente de Prisma

```bash
npm run prisma:generate
```

### 4. Levantar el entorno de desarrollo

```bash
npm run dev
```

La aplicación queda disponible en `http://localhost:3000`.

## Base de datos

La base vive en Supabase y se modela con:

- migraciones SQL en `supabase/migrations/`;
- esquema Prisma en `prisma/schema.prisma`.

El modelo contempla perfiles, zonas, categorías de rating, agregados, comentarios, reportes de moderación y actores anónimos.
