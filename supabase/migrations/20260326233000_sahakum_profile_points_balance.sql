begin;

alter table public.profiles
  add column if not exists points integer not null default 0;

update public.profiles p
set points = coalesce(ledger.total_points, 0)
from (
  select user_id, sum(delta)::integer as total_points
  from public.user_point_events
  group by user_id
) as ledger
where p.id = ledger.user_id;

update public.profiles
set points = 0
where points is null;

create or replace function public.trg_increment_profile_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set points = coalesce(points, 0) + new.delta
  where id = new.user_id;

  return new;
end;
$$;

drop trigger if exists increment_profile_points_trigger on public.user_point_events;
create trigger increment_profile_points_trigger
  after insert on public.user_point_events
  for each row
  execute function public.trg_increment_profile_points();

commit;
