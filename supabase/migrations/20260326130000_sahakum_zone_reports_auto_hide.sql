create unique index if not exists moderation_reports_zone_open_per_user_idx
  on public.moderation_reports (reporter_user_id, target_id)
  where target_type = 'zone'::public.report_target_type
    and status = 'open'::public.report_status
    and reporter_user_id is not null;

create or replace function public.hide_zone_when_report_threshold_reached()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_open_reports_count integer;
begin
  if new.target_type <> 'zone'::public.report_target_type
    or new.status <> 'open'::public.report_status then
    return new;
  end if;

  select count(*)
  into v_open_reports_count
  from public.moderation_reports
  where target_type = 'zone'::public.report_target_type
    and target_id = new.target_id
    and status = 'open'::public.report_status;

  if v_open_reports_count >= 3 then
    update public.zones
    set visibility = 'hidden'::public.zone_visibility
    where id = new.target_id
      and deleted_at is null
      and visibility <> 'hidden'::public.zone_visibility;
  end if;

  return new;
end;
$$;

drop trigger if exists hide_zone_when_report_threshold_reached_trigger on public.moderation_reports;
create trigger hide_zone_when_report_threshold_reached_trigger
  after insert on public.moderation_reports
  for each row
  execute function public.hide_zone_when_report_threshold_reached();
