-- Base schema for Sahakum (Community Urban Safety Map)

create extension if not exists postgis with schema public;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'profile_role') then
    create type public.profile_role as enum ('user', 'moderator', 'admin');
  end if;

  if not exists (select 1 from pg_type where typname = 'time_segment') then
    create type public.time_segment as enum ('morning', 'afternoon', 'night', 'early_morning');
  end if;

  if not exists (select 1 from pg_type where typname = 'zone_type') then
    create type public.zone_type as enum ('intersection', 'bus_stop');
  end if;

  if not exists (select 1 from pg_type where typname = 'zone_visibility') then
    create type public.zone_visibility as enum ('active', 'hidden');
  end if;

  if not exists (select 1 from pg_type where typname = 'comment_visibility') then
    create type public.comment_visibility as enum ('visible', 'hidden');
  end if;

  if not exists (select 1 from pg_type where typname = 'report_target_type') then
    create type public.report_target_type as enum ('zone', 'comment');
  end if;

  if not exists (select 1 from pg_type where typname = 'report_status') then
    create type public.report_status as enum ('open', 'resolved', 'dismissed');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  role public.profile_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  zone_type public.zone_type not null,
  geom geometry(Geometry, 4326) not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  visibility public.zone_visibility not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id) on delete set null,
  constraint zones_geom_type_check
    check (geometrytype(geom) in ('POINT', 'POLYGON')),
  constraint zones_geom_srid_check
    check (st_srid(geom) = 4326)
);

create table if not exists public.zone_ratings (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references public.zones(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  time_segment public.time_segment not null,
  crime_level smallint not null,
  lighting smallint not null,
  foot_traffic smallint not null,
  overall_safety smallint not null,
  open_businesses boolean not null,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  constraint zone_ratings_crime_level_range check (crime_level between 1 and 5),
  constraint zone_ratings_lighting_range check (lighting between 1 and 5),
  constraint zone_ratings_foot_traffic_range check (foot_traffic between 1 and 5),
  constraint zone_ratings_overall_safety_range check (overall_safety between 1 and 5)
);

create table if not exists public.zone_rating_aggregates (
  zone_id uuid not null references public.zones(id) on delete cascade,
  time_segment public.time_segment not null,
  ratings_count integer not null default 0,
  avg_crime_level numeric(4, 2),
  avg_lighting numeric(4, 2),
  avg_foot_traffic numeric(4, 2),
  avg_overall_safety numeric(4, 2),
  open_businesses_ratio numeric(5, 4),
  updated_at timestamptz not null default now(),
  primary key (zone_id, time_segment)
);

create table if not exists public.zone_comments (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references public.zones(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  body text not null,
  visibility public.comment_visibility not null default 'visible',
  report_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id) on delete set null,
  constraint zone_comments_body_length check (char_length(body) between 1 and 1000)
);

create table if not exists public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  target_type public.report_target_type not null,
  target_id uuid not null,
  reason text not null,
  details text,
  reporter_user_id uuid references public.profiles(id) on delete set null,
  reporter_fingerprint text,
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null
);

create index if not exists zones_visibility_deleted_at_idx
  on public.zones (visibility, deleted_at);
create index if not exists zones_geom_gist_idx
  on public.zones using gist (geom);

create index if not exists zone_ratings_zone_segment_current_idx
  on public.zone_ratings (zone_id, time_segment, is_current);
create unique index if not exists zone_ratings_one_current_per_user_idx
  on public.zone_ratings (zone_id, user_id, time_segment)
  where is_current = true;

create index if not exists zone_comments_zone_visibility_deleted_created_idx
  on public.zone_comments (zone_id, visibility, deleted_at, created_at desc);

create index if not exists moderation_reports_target_status_created_idx
  on public.moderation_reports (target_type, target_id, status, created_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
