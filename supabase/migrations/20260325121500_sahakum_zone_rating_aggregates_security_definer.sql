begin;

create or replace function public.refresh_zone_rating_aggregate(
  p_zone_id uuid,
  p_category_slug text,
  p_time_segment public.time_segment
)
returns void
language plpgsql
security definer
set search_path = public
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

commit;
