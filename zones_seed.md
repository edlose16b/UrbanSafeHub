# Zones Seed (Lima, Perú)

Este archivo documenta el seed de zonas de prueba y datos de delincuencia para visualizar un mapa de calor.

## Resumen

- Zonas seed: **100** alrededor de Lima.
- Geometría usada en seed: **POINT** (SRID 4326).
- Nuevo soporte: `radius_m` para zonas tipo `POINT`.
- Regla de negocio en DB:
  - `POINT` => `radius_m` obligatorio (10..2000 m)
  - `POLYGON` => `radius_m` debe ser `NULL`
- Ratings de prueba insertados: **400** (`4` segmentos por cada zona).

## Migración aplicada

Archivo local:
- `supabase/migrations/20260320235000_sahakum_zone_radius_support.sql`

SQL:

```sql
alter table public.zones
  add column if not exists radius_m integer;

update public.zones
set radius_m = 120
where geometrytype(geom) = 'POINT'
  and radius_m is null;

alter table public.zones
  drop constraint if exists zones_radius_point_polygon_check;

alter table public.zones
  add constraint zones_radius_point_polygon_check
  check (
    (
      geometrytype(geom) = 'POINT'
      and radius_m is not null
      and radius_m between 10 and 2000
    )
    or (
      geometrytype(geom) = 'POLYGON'
      and radius_m is null
    )
  );
```

## Seed de 100 zonas (POINT + radius)

```sql
select setseed(0.42026);

insert into public.zones (name, zone_type, geom, radius_m, created_by, visibility)
select
  format('Zona Prueba Lima %s', gs) as name,
  case when gs % 4 = 0 then 'bus_stop'::zone_type else 'intersection'::zone_type end as zone_type,
  st_setsrid(
    st_makepoint(
      -77.0428 + ((random() - 0.5) * 0.34),
      -12.0464 + ((random() - 0.5) * 0.24)
    ),
    4326
  ) as geom,
  60 + floor(random() * 340)::int as radius_m,
  '7e608dee-03d2-4598-870c-bb1b0b41381d'::uuid as created_by,
  'active'::zone_visibility as visibility
from generate_series(1, 100) as gs;
```

## Seed de delincuencia (heatmap)

```sql
insert into public.zone_ratings (
  zone_id,
  user_id,
  time_segment,
  crime_level,
  lighting,
  foot_traffic,
  overall_safety,
  open_businesses,
  is_current
)
select
  z.id,
  '7e608dee-03d2-4598-870c-bb1b0b41381d'::uuid,
  ts.time_segment,
  1 + floor(random() * 5)::smallint,
  1 + floor(random() * 5)::smallint,
  1 + floor(random() * 5)::smallint,
  1 + floor(random() * 5)::smallint,
  random() > 0.5,
  true
from public.zones z
cross join (
  values
    ('morning'::public.time_segment),
    ('afternoon'::public.time_segment),
    ('night'::public.time_segment),
    ('early_morning'::public.time_segment)
) as ts(time_segment)
where z.name like 'Zona Prueba Lima %';
```

## Verificación rápida

```sql
select
  count(*) filter (where name like 'Zona Prueba Lima %') as seeded_zones,
  count(*) filter (where name like 'Zona Prueba Lima %' and radius_m is not null) as seeded_with_radius
from public.zones;
```

```sql
select count(*) as seeded_ratings
from public.zone_ratings zr
join public.zones z on z.id = zr.zone_id
where z.name like 'Zona Prueba Lima %';
```

Valores esperados actuales:
- `seeded_zones = 100`
- `seeded_with_radius = 100`
- `seeded_ratings = 400`
