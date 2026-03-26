begin;

create table if not exists public.anonymous_vote_actors (
  id uuid primary key default gen_random_uuid(),
  fingerprint_hash text not null unique,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_ip_hash text,
  last_user_agent_hash text,
  vote_count integer not null default 0,
  last_zone_id uuid references public.zones(id) on delete set null,
  notes text
);

create index if not exists anonymous_vote_actors_last_seen_idx
  on public.anonymous_vote_actors (last_seen_at desc);

create index if not exists anonymous_vote_actors_last_zone_idx
  on public.anonymous_vote_actors (last_zone_id);

alter table public.anonymous_vote_actors enable row level security;

drop policy if exists "anonymous_vote_actors_insert_public" on public.anonymous_vote_actors;
create policy "anonymous_vote_actors_insert_public"
  on public.anonymous_vote_actors
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "anonymous_vote_actors_update_public" on public.anonymous_vote_actors;
create policy "anonymous_vote_actors_update_public"
  on public.anonymous_vote_actors
  for update
  to anon, authenticated
  using (true)
  with check (true);

create or replace function public.trg_touch_anonymous_vote_actor()
returns trigger
language plpgsql
as $$
begin
  new.last_seen_at := now();
  new.vote_count := coalesce(new.vote_count, 0) + 1;
  return new;
end;
$$;

drop trigger if exists touch_anonymous_vote_actor_trigger on public.anonymous_vote_actors;
create trigger touch_anonymous_vote_actor_trigger
  before insert or update on public.anonymous_vote_actors
  for each row
  execute function public.trg_touch_anonymous_vote_actor();

commit;
