-- Trigger and derived-data logic for Sahakum

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_zones_updated_at on public.zones;
create trigger set_zones_updated_at
  before update on public.zones
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_zone_comments_updated_at on public.zone_comments;
create trigger set_zone_comments_updated_at
  before update on public.zone_comments
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_zone_rating_aggregates_updated_at on public.zone_rating_aggregates;
create trigger set_zone_rating_aggregates_updated_at
  before update on public.zone_rating_aggregates
  for each row
  execute function public.set_updated_at();

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
      and time_segment = new.time_segment
      and is_current = true
      and id <> coalesce(new.id, gen_random_uuid());
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_single_current_rating_trigger on public.zone_ratings;
create trigger enforce_single_current_rating_trigger
  before insert or update of is_current on public.zone_ratings
  for each row
  execute function public.enforce_single_current_rating();

create or replace function public.refresh_zone_rating_aggregate(
  p_zone_id uuid,
  p_time_segment public.time_segment
)
returns void
language plpgsql
as $$
declare
  v_ratings_count integer;
begin
  select count(*)
  into v_ratings_count
  from public.zone_ratings zr
  where zr.zone_id = p_zone_id
    and zr.time_segment = p_time_segment
    and zr.is_current = true;

  if v_ratings_count = 0 then
    delete from public.zone_rating_aggregates
    where zone_id = p_zone_id and time_segment = p_time_segment;
    return;
  end if;

  insert into public.zone_rating_aggregates (
    zone_id,
    time_segment,
    ratings_count,
    avg_crime_level,
    avg_lighting,
    avg_foot_traffic,
    avg_overall_safety,
    open_businesses_ratio,
    updated_at
  )
  select
    p_zone_id,
    p_time_segment,
    count(*)::integer,
    round(avg(zr.crime_level)::numeric, 2),
    round(avg(zr.lighting)::numeric, 2),
    round(avg(zr.foot_traffic)::numeric, 2),
    round(avg(zr.overall_safety)::numeric, 2),
    round(avg(case when zr.open_businesses then 1 else 0 end)::numeric, 4),
    now()
  from public.zone_ratings zr
  where zr.zone_id = p_zone_id
    and zr.time_segment = p_time_segment
    and zr.is_current = true
  on conflict (zone_id, time_segment)
  do update set
    ratings_count = excluded.ratings_count,
    avg_crime_level = excluded.avg_crime_level,
    avg_lighting = excluded.avg_lighting,
    avg_foot_traffic = excluded.avg_foot_traffic,
    avg_overall_safety = excluded.avg_overall_safety,
    open_businesses_ratio = excluded.open_businesses_ratio,
    updated_at = now();
end;
$$;

create or replace function public.trg_refresh_zone_rating_aggregate()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_zone_rating_aggregate(old.zone_id, old.time_segment);
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if old.zone_id <> new.zone_id or old.time_segment <> new.time_segment then
      perform public.refresh_zone_rating_aggregate(old.zone_id, old.time_segment);
    end if;
    perform public.refresh_zone_rating_aggregate(new.zone_id, new.time_segment);
    return new;
  end if;

  perform public.refresh_zone_rating_aggregate(new.zone_id, new.time_segment);
  return new;
end;
$$;

drop trigger if exists refresh_zone_rating_aggregate_trigger on public.zone_ratings;
create trigger refresh_zone_rating_aggregate_trigger
  after insert or update or delete on public.zone_ratings
  for each row
  execute function public.trg_refresh_zone_rating_aggregate();

create or replace function public.trg_increment_comment_report_count()
returns trigger
language plpgsql
as $$
begin
  if new.target_type = 'comment'::public.report_target_type then
    update public.zone_comments
    set report_count = report_count + 1
    where id = new.target_id;
  end if;
  return new;
end;
$$;

drop trigger if exists increment_comment_report_count_trigger on public.moderation_reports;
create trigger increment_comment_report_count_trigger
  after insert on public.moderation_reports
  for each row
  execute function public.trg_increment_comment_report_count();
