begin;

alter table public.zones
  add column if not exists description text;

alter table public.rating_categories
  add column if not exists ulid text;

update public.rating_categories
set ulid = case slug
  when 'crime' then '01JQ3M4N5P6Q7R8S9TAVBCDEFG'
  when 'foot_traffic' then '01JQ3M4N5P6Q7R8S9TBWCDEFGH'
  when 'lighting' then '01JQ3M4N5P6Q7R8S9TCXDEFGHJ'
  when 'vigilance' then '01JQ3M4N5P6Q7R8S9TDYEFGHJK'
  when 'cctv' then '01JQ3M4N5P6Q7R8S9TEZFGHJKM'
  else ulid
end
where ulid is null;

alter table public.rating_categories
  alter column ulid set not null;

alter table public.zone_ratings
  drop constraint if exists zone_ratings_category_slug_fkey;

alter table public.zone_rating_aggregates
  drop constraint if exists zone_rating_aggregates_category_slug_fkey;

alter table public.rating_categories
  drop constraint if exists rating_categories_pkey;

alter table public.rating_categories
  add constraint rating_categories_pkey primary key (ulid);

alter table public.rating_categories
  add constraint rating_categories_slug_key unique (slug);

alter table public.zone_ratings
  add constraint zone_ratings_category_slug_fkey
  foreign key (category_slug)
  references public.rating_categories(slug)
  on delete restrict;

alter table public.zone_rating_aggregates
  add constraint zone_rating_aggregates_category_slug_fkey
  foreign key (category_slug)
  references public.rating_categories(slug)
  on delete restrict;

commit;
