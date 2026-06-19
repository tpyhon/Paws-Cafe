-- Rollback script for smoking mode schema changes
alter table public.dog_friendly_places drop column if exists is_smoking;

-- Re-create original search_places_nearby RPC without is_smoking_filter
drop function if exists public.search_places_nearby(double precision, double precision, double precision, text, boolean);

create or replace function public.search_places_nearby(
  lat double precision,
  lng double precision,
  radius_meters double precision default 1200,
  policy_filter text default null
)
returns setof public.dog_friendly_places
language sql stable as $$
  select *
  from public.dog_friendly_places
  where
    st_dwithin(geom, st_makepoint(lng, lat)::geography, radius_meters)
    and (policy_filter is null or policy::text = policy_filter)
  order by st_distance(geom, st_makepoint(lng, lat)::geography);
$$;
