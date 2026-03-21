-- Add radius support for point zones.
-- Business rule:
-- - POINT zones must define radius_m
-- - POLYGON zones must keep radius_m null

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
