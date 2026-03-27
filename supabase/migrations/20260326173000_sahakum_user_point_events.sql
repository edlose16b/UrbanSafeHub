begin;

create table if not exists public.user_point_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  delta integer not null,
  reason text not null,
  source_key text not null,
  zone_id uuid references public.zones(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint user_point_events_reason_check
    check (reason in ('zone_created', 'zone_rating_added', 'zone_hidden_by_reports')),
  constraint user_point_events_source_key_key unique (source_key)
);

create index if not exists user_point_events_user_created_at_idx
  on public.user_point_events (user_id, created_at desc);

alter table public.user_point_events enable row level security;

drop policy if exists "user_point_events_read_own" on public.user_point_events;
create policy "user_point_events_read_own"
  on public.user_point_events
  for select
  to authenticated
  using (user_id = auth.uid());

create or replace function public.award_user_points(
  p_user_id uuid,
  p_delta integer,
  p_reason text,
  p_source_key text,
  p_zone_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    return;
  end if;

  insert into public.user_point_events (
    user_id,
    delta,
    reason,
    source_key,
    zone_id
  )
  values (
    p_user_id,
    p_delta,
    p_reason,
    p_source_key,
    p_zone_id
  )
  on conflict (source_key) do nothing;
end;
$$;

create or replace function public.trg_award_zone_creation_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.award_user_points(
    new.created_by,
    15,
    'zone_created',
    'zone_created:' || new.id::text,
    new.id
  );

  return new;
end;
$$;

create or replace function public.trg_award_zone_rating_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_segment_key text;
begin
  if new.user_id is null or not new.is_current then
    return new;
  end if;

  v_segment_key := coalesce(new.time_segment::text, 'general');

  perform public.award_user_points(
    new.user_id,
    2,
    'zone_rating_added',
    'zone_rating_added:' ||
      new.user_id::text || ':' ||
      new.zone_id::text || ':' ||
      new.category_slug || ':' ||
      v_segment_key,
    new.zone_id
  );

  return new;
end;
$$;

create or replace function public.trg_penalize_hidden_zone()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_open_reports_count integer;
begin
  if old.visibility = 'hidden'::public.zone_visibility
    or new.visibility <> 'hidden'::public.zone_visibility then
    return new;
  end if;

  select count(*)
  into v_open_reports_count
  from public.moderation_reports
  where target_type = 'zone'::public.report_target_type
    and target_id = new.id
    and status = 'open'::public.report_status;

  if v_open_reports_count < 3 then
    return new;
  end if;

  perform public.award_user_points(
    new.created_by,
    -10,
    'zone_hidden_by_reports',
    'zone_hidden_by_reports:' || new.id::text,
    new.id
  );

  return new;
end;
$$;

drop trigger if exists award_zone_creation_points_trigger on public.zones;
create trigger award_zone_creation_points_trigger
  after insert on public.zones
  for each row
  execute function public.trg_award_zone_creation_points();

drop trigger if exists award_zone_rating_points_trigger on public.zone_ratings;
create trigger award_zone_rating_points_trigger
  after insert on public.zone_ratings
  for each row
  execute function public.trg_award_zone_rating_points();

drop trigger if exists penalize_hidden_zone_trigger on public.zones;
create trigger penalize_hidden_zone_trigger
  after update of visibility on public.zones
  for each row
  execute function public.trg_penalize_hidden_zone();

commit;
