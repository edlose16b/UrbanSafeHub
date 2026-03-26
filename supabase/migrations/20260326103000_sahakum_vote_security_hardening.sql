begin;

drop policy if exists "zone_ratings_authenticated_read" on public.zone_ratings;
create policy "zone_ratings_authenticated_read"
  on public.zone_ratings
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "anonymous_vote_actors_insert_public" on public.anonymous_vote_actors;
drop policy if exists "anonymous_vote_actors_update_public" on public.anonymous_vote_actors;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.validate_zone_rating_segment()
returns trigger
language plpgsql
set search_path = public
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

create or replace function public.enforce_single_current_rating()
returns trigger
language plpgsql
set search_path = public
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

create or replace function public.trg_refresh_zone_rating_aggregate()
returns trigger
language plpgsql
set search_path = public
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

create or replace function public.trg_increment_comment_report_count()
returns trigger
language plpgsql
set search_path = public
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

create or replace function public.trg_touch_anonymous_vote_actor()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.last_seen_at := now();
  new.vote_count := coalesce(new.vote_count, 0) + 1;
  return new;
end;
$$;

commit;
