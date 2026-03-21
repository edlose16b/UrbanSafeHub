-- Refactor ratings into category-based rows with optional time_segment.
-- Includes removal of zones.zone_type.

begin;

-- 1) Remove legacy zone_type (if still present in target DB).
alter table public.zones
  drop column if exists zone_type;

drop type if exists public.zone_type;

-- 2) Categories catalog.
create table if not exists public.rating_categories (
  slug text primary key,
  label text not null,
  requires_time_segment boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rating_categories_slug_check
    check (slug in ('crime', 'lighting', 'foot_traffic'))
);

insert into public.rating_categories (slug, label, requires_time_segment)
values
  ('crime', 'Crime level', true),
  ('lighting', 'Lighting', false),
  ('foot_traffic', 'Foot traffic', true)
on conflict (slug)
do update set
  label = excluded.label,
  requires_time_segment = excluded.requires_time_segment,
  updated_at = now();

-- 3) Drop old triggers/functions that depend on legacy rating columns.
drop trigger if exists enforce_single_current_rating_trigger on public.zone_ratings;
drop trigger if exists refresh_zone_rating_aggregate_trigger on public.zone_ratings;

-- Keep set_updated_at() function. We'll replace rating-specific functions.
drop function if exists public.enforce_single_current_rating();
drop function if exists public.trg_refresh_zone_rating_aggregate();
drop function if exists public.refresh_zone_rating_aggregate(uuid, public.time_segment);

-- 4) Rename legacy tables and recreate normalized versions.
alter table public.zone_ratings rename to zone_ratings_legacy;
alter table public.zone_rating_aggregates rename to zone_rating_aggregates_legacy;

create table public.zone_ratings (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references public.zones(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  category_slug text not null references public.rating_categories(slug) on delete restrict,
  time_segment public.time_segment,
  score smallint not null,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  constraint zone_ratings_score_range check (score between 1 and 5)
);

create index zone_ratings_zone_category_segment_current_idx
  on public.zone_ratings (zone_id, category_slug, time_segment, is_current);

create unique index zone_ratings_one_current_per_user_segment_idx
  on public.zone_ratings (zone_id, user_id, category_slug, time_segment)
  where is_current = true and time_segment is not null;

create unique index zone_ratings_one_current_per_user_without_segment_idx
  on public.zone_ratings (zone_id, user_id, category_slug)
  where is_current = true and time_segment is null;

create table public.zone_rating_aggregates (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references public.zones(id) on delete cascade,
  category_slug text not null references public.rating_categories(slug) on delete restrict,
  time_segment public.time_segment,
  ratings_count integer not null default 0,
  avg_score numeric(4, 2),
  updated_at timestamptz not null default now()
);

create index zone_rating_aggregates_zone_category_idx
  on public.zone_rating_aggregates (zone_id, category_slug);

create unique index zone_rating_aggregates_unique_with_segment_idx
  on public.zone_rating_aggregates (zone_id, category_slug, time_segment)
  where time_segment is not null;

create unique index zone_rating_aggregates_unique_without_segment_idx
  on public.zone_rating_aggregates (zone_id, category_slug)
  where time_segment is null;

-- 5) Data backfill from legacy wide rows.
insert into public.zone_ratings (
  zone_id,
  user_id,
  category_slug,
  time_segment,
  score,
  is_current,
  created_at
)
select
  zone_id,
  user_id,
  'crime',
  time_segment,
  crime_level,
  is_current,
  created_at
from public.zone_ratings_legacy;

insert into public.zone_ratings (
  zone_id,
  user_id,
  category_slug,
  time_segment,
  score,
  is_current,
  created_at
)
select
  zone_id,
  user_id,
  'foot_traffic',
  time_segment,
  foot_traffic,
  is_current,
  created_at
from public.zone_ratings_legacy;

-- Lighting becomes non-segmented.
-- Current rows collapse per (zone_id, user_id).
insert into public.zone_ratings (
  zone_id,
  user_id,
  category_slug,
  time_segment,
  score,
  is_current,
  created_at
)
select
  zone_id,
  user_id,
  'lighting',
  null,
  greatest(1, least(5, round(avg(lighting)::numeric)::int))::smallint,
  true,
  max(created_at)
from public.zone_ratings_legacy
where is_current = true
group by zone_id, user_id;

-- Historical lighting rows collapse per timestamp snapshot.
insert into public.zone_ratings (
  zone_id,
  user_id,
  category_slug,
  time_segment,
  score,
  is_current,
  created_at
)
select
  zone_id,
  user_id,
  'lighting',
  null,
  greatest(1, least(5, round(avg(lighting)::numeric)::int))::smallint,
  false,
  max(created_at)
from public.zone_ratings_legacy
where is_current = false
group by zone_id, user_id, created_at;

insert into public.zone_rating_aggregates (
  zone_id,
  category_slug,
  time_segment,
  ratings_count,
  avg_score,
  updated_at
)
select
  zone_id,
  category_slug,
  time_segment,
  count(*)::int,
  round(avg(score)::numeric, 2),
  now()
from public.zone_ratings
where is_current = true
group by zone_id, category_slug, time_segment;

-- 6) Recreate triggers/functions for normalized model.
create or replace function public.validate_zone_rating_segment()
returns trigger
language plpgsql
as $$
declare
  v_requires_time_segment boolean;
begin
  select rc.requires_time_segment
  into v_requires_time_segment
  from public.rating_categories rc
  where rc.slug = new.category_slug;

  if v_requires_time_segment is null then
    raise exception 'Unknown rating category: %', new.category_slug;
  end if;

  if v_requires_time_segment and new.time_segment is null then
    raise exception 'Category % requires time_segment', new.category_slug;
  end if;

  if not v_requires_time_segment and new.time_segment is not null then
    raise exception 'Category % does not allow time_segment', new.category_slug;
  end if;

  return new;
end;
$$;

create trigger validate_zone_rating_segment_trigger
  before insert or update of category_slug, time_segment on public.zone_ratings
  for each row
  execute function public.validate_zone_rating_segment();

create or replace function public.enforce_single_current_rating()
returns trigger
language plpgsql
as $$
begin
  if new.is_current then
    update public.zone_ratings
    set is_current = false
    where zone_id = new.zone_id
      and user_id = new.user_id
      and category_slug = new.category_slug
      and time_segment is not distinct from new.time_segment
      and is_current = true
      and id <> coalesce(new.id, gen_random_uuid());
  end if;

  return new;
end;
$$;

create trigger enforce_single_current_rating_trigger
  before insert or update of is_current on public.zone_ratings
  for each row
  execute function public.enforce_single_current_rating();

create or replace function public.refresh_zone_rating_aggregate(
  p_zone_id uuid,
  p_category_slug text,
  p_time_segment public.time_segment
)
returns void
language plpgsql
as $$
declare
  v_ratings_count integer;
  v_avg_score numeric(4, 2);
begin
  select
    count(*)::int,
    round(avg(zr.score)::numeric, 2)
  into v_ratings_count, v_avg_score
  from public.zone_ratings zr
  where zr.zone_id = p_zone_id
    and zr.category_slug = p_category_slug
    and zr.time_segment is not distinct from p_time_segment
    and zr.is_current = true;

  if v_ratings_count = 0 then
    delete from public.zone_rating_aggregates
    where zone_id = p_zone_id
      and category_slug = p_category_slug
      and time_segment is not distinct from p_time_segment;
    return;
  end if;

  update public.zone_rating_aggregates
  set
    ratings_count = v_ratings_count,
    avg_score = v_avg_score,
    updated_at = now()
  where zone_id = p_zone_id
    and category_slug = p_category_slug
    and time_segment is not distinct from p_time_segment;

  if not found then
    insert into public.zone_rating_aggregates (
      zone_id,
      category_slug,
      time_segment,
      ratings_count,
      avg_score,
      updated_at
    )
    values (
      p_zone_id,
      p_category_slug,
      p_time_segment,
      v_ratings_count,
      v_avg_score,
      now()
    );
  end if;
end;
$$;

create or replace function public.trg_refresh_zone_rating_aggregate()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_zone_rating_aggregate(old.zone_id, old.category_slug, old.time_segment);
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if old.zone_id <> new.zone_id
      or old.category_slug <> new.category_slug
      or old.time_segment is distinct from new.time_segment then
      perform public.refresh_zone_rating_aggregate(old.zone_id, old.category_slug, old.time_segment);
    end if;

    perform public.refresh_zone_rating_aggregate(new.zone_id, new.category_slug, new.time_segment);
    return new;
  end if;

  perform public.refresh_zone_rating_aggregate(new.zone_id, new.category_slug, new.time_segment);
  return new;
end;
$$;

create trigger refresh_zone_rating_aggregate_trigger
  after insert or update or delete on public.zone_ratings
  for each row
  execute function public.trg_refresh_zone_rating_aggregate();

-- Keep updated_at trigger behavior for new tables.
drop trigger if exists set_zone_rating_aggregates_updated_at on public.zone_rating_aggregates;
create trigger set_zone_rating_aggregates_updated_at
  before update on public.zone_rating_aggregates
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_rating_categories_updated_at on public.rating_categories;
create trigger set_rating_categories_updated_at
  before update on public.rating_categories
  for each row
  execute function public.set_updated_at();

-- 7) RLS for recreated/new rating tables.
alter table public.zone_ratings enable row level security;
alter table public.zone_rating_aggregates enable row level security;
alter table public.rating_categories enable row level security;

drop policy if exists "zone_ratings_authenticated_read" on public.zone_ratings;
create policy "zone_ratings_authenticated_read"
  on public.zone_ratings
  for select
  to authenticated
  using (true);

drop policy if exists "zone_ratings_insert_own" on public.zone_ratings;
create policy "zone_ratings_insert_own"
  on public.zone_ratings
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "zone_ratings_update_own" on public.zone_ratings;
create policy "zone_ratings_update_own"
  on public.zone_ratings
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "zone_rating_aggregates_public_read" on public.zone_rating_aggregates;
create policy "zone_rating_aggregates_public_read"
  on public.zone_rating_aggregates
  for select
  using (true);

drop policy if exists "rating_categories_public_read" on public.rating_categories;
create policy "rating_categories_public_read"
  on public.rating_categories
  for select
  using (true);

-- 8) Drop legacy tables after successful backfill.
drop table public.zone_rating_aggregates_legacy;
drop table public.zone_ratings_legacy;

commit;
