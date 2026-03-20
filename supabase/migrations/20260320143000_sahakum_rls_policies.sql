-- RLS policies for Sahakum

alter table public.profiles enable row level security;
alter table public.zones enable row level security;
alter table public.zone_ratings enable row level security;
alter table public.zone_rating_aggregates enable row level security;
alter table public.zone_comments enable row level security;
alter table public.moderation_reports enable row level security;

drop policy if exists "profiles_public_read" on public.profiles;
create policy "profiles_public_read"
  on public.profiles
  for select
  using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "zones_public_read_visible" on public.zones;
create policy "zones_public_read_visible"
  on public.zones
  for select
  using (visibility = 'active'::public.zone_visibility and deleted_at is null);

drop policy if exists "zones_insert_authenticated" on public.zones;
create policy "zones_insert_authenticated"
  on public.zones
  for insert
  to authenticated
  with check (created_by = auth.uid());

drop policy if exists "zones_update_own" on public.zones;
create policy "zones_update_own"
  on public.zones
  for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

drop policy if exists "zones_delete_own" on public.zones;
create policy "zones_delete_own"
  on public.zones
  for delete
  to authenticated
  using (created_by = auth.uid());

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

drop policy if exists "zone_comments_public_read_visible" on public.zone_comments;
create policy "zone_comments_public_read_visible"
  on public.zone_comments
  for select
  using (visibility = 'visible'::public.comment_visibility and deleted_at is null);

drop policy if exists "zone_comments_insert_own" on public.zone_comments;
create policy "zone_comments_insert_own"
  on public.zone_comments
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "zone_comments_update_own" on public.zone_comments;
create policy "zone_comments_update_own"
  on public.zone_comments
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "zone_comments_delete_own" on public.zone_comments;
create policy "zone_comments_delete_own"
  on public.zone_comments
  for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "moderation_reports_insert_public" on public.moderation_reports;
create policy "moderation_reports_insert_public"
  on public.moderation_reports
  for insert
  with check (
    reporter_user_id is null
    or reporter_user_id = auth.uid()
  );

drop policy if exists "moderation_reports_moderator_read" on public.moderation_reports;
create policy "moderation_reports_moderator_read"
  on public.moderation_reports
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('moderator'::public.profile_role, 'admin'::public.profile_role)
    )
  );

drop policy if exists "moderation_reports_moderator_update" on public.moderation_reports;
create policy "moderation_reports_moderator_update"
  on public.moderation_reports
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('moderator'::public.profile_role, 'admin'::public.profile_role)
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('moderator'::public.profile_role, 'admin'::public.profile_role)
    )
  );
