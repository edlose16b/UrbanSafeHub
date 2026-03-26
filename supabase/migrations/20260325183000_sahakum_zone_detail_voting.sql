begin;

alter table public.rating_categories
  drop constraint if exists rating_categories_slug_check;

alter table public.rating_categories
  add constraint rating_categories_slug_check
  check (slug in ('crime', 'lighting', 'foot_traffic', 'vigilance', 'cctv', 'overall_safety'));

insert into public.rating_categories (slug, label, requires_time_segment, ulid)
values ('overall_safety', 'Overall safety', true, '01JQ3M4N5P6Q7R8S9TF0GHJKLM')
on conflict (slug)
do update set
  label = excluded.label,
  requires_time_segment = excluded.requires_time_segment,
  updated_at = now();

alter table public.zone_ratings
  add column if not exists anonymous_fingerprint text;

alter table public.zone_ratings
  alter column user_id drop not null;

alter table public.zone_ratings
  drop constraint if exists zone_ratings_actor_check;

alter table public.zone_ratings
  add constraint zone_ratings_actor_check
  check (
    (user_id is not null and anonymous_fingerprint is null) or
    (user_id is null and anonymous_fingerprint is not null)
  );

drop index if exists zone_ratings_one_current_per_user_segment_idx;
create unique index if not exists zone_ratings_one_current_per_user_segment_idx
  on public.zone_ratings (zone_id, user_id, category_slug, time_segment)
  where is_current = true and time_segment is not null and user_id is not null;

drop index if exists zone_ratings_one_current_per_user_without_segment_idx;
create unique index if not exists zone_ratings_one_current_per_user_without_segment_idx
  on public.zone_ratings (zone_id, user_id, category_slug)
  where is_current = true and time_segment is null and user_id is not null;

drop policy if exists "zone_ratings_insert_anonymous" on public.zone_ratings;
create policy "zone_ratings_insert_anonymous"
  on public.zone_ratings
  for insert
  to anon, authenticated
  with check (user_id is null and anonymous_fingerprint is not null);

commit;
