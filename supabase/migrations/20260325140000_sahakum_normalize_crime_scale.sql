begin;

update public.rating_categories
set
  label = 'Crime safety',
  updated_at = now()
where slug = 'crime';

update public.zone_ratings
set score = 6 - score
where category_slug = 'crime';

update public.zone_rating_aggregates
set
  avg_score = round((6 - avg_score)::numeric, 2),
  updated_at = now()
where category_slug = 'crime'
  and avg_score is not null;

commit;
