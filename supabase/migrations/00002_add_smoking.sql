-- Add is_smoking column to dog_friendly_places
alter table public.dog_friendly_places add column is_smoking boolean not null default false;

-- Create index on is_smoking
create index dog_friendly_places_is_smoking_idx on public.dog_friendly_places (is_smoking);

-- Re-create search_places_nearby RPC with is_smoking_filter
drop function if exists public.search_places_nearby(double precision, double precision, double precision, text);

create or replace function public.search_places_nearby(
  lat double precision,
  lng double precision,
  radius_meters double precision default 1200,
  policy_filter text default null,
  is_smoking_filter boolean default false
)
returns setof public.dog_friendly_places
language sql stable as $$
  select *
  from public.dog_friendly_places
  where
    st_dwithin(geom, st_makepoint(lng, lat)::geography, radius_meters)
    and (policy_filter is null or policy::text = policy_filter)
    and is_smoking = is_smoking_filter
  order by st_distance(geom, st_makepoint(lng, lat)::geography);
$$;
