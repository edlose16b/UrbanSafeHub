-- Remove zone_type from zones.
-- Zones are now described by geometry type only (POINT or POLYGON).

alter table public.zones
  drop column if exists zone_type;

drop type if exists public.zone_type;
