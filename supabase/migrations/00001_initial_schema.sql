-- PostGIS 拡張の有効化
create extension if not exists postgis;

-- 1. ユーザープロフィールテーブル
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  nickname text,
  avatar_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;
create policy "誰でもプロフィールを参照可能" on public.profiles for select using (true);
create policy "本人のみプロフィールを更新可能" on public.profiles for update using (auth.uid() = id);

-- 新規ユーザー登録時に profiles レコードを自動生成するトリガー
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nickname, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. 店舗テーブル
create type place_category as enum ('cafe', 'italian', 'yakiniku', 'japanese', 'asian_ethnic', 'other');
create type dog_policy_type as enum ('inside_ok', 'terrace_only', 'some_seats_ok');

create table public.dog_friendly_places (
  id bigint generated always as identity primary key,
  name text not null,
  category place_category not null default 'cafe',
  policy dog_policy_type not null,

  geom geography(Point, 4326) not null,
  latitude double precision not null,
  longitude double precision not null,

  address text not null,
  area_name text not null,
  station_name text not null,
  lines text[] not null default '{}',

  budget_lunch text,
  budget_dinner text,
  business_hours text,

  dog_features text[] not null default '{}',
  dog_rules text,

  website_url text,
  tabelog_url text,
  image_url text,
  interior_images text[] default '{}',
  comment text,

  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 店舗テーブルは全ユーザーが参照可能（管理者のみ書き込み）
alter table public.dog_friendly_places enable row level security;
create policy "誰でも店舗を参照可能" on public.dog_friendly_places for select using (true);

create index dog_friendly_places_geom_idx on public.dog_friendly_places using gist (geom);
create index dog_friendly_places_area_idx on public.dog_friendly_places (area_name);
create index dog_friendly_places_lines_idx on public.dog_friendly_places using gin (lines);

-- 3. お気に入りテーブル
create table public.user_favorites (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade not null,
  place_id bigint references public.dog_friendly_places on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, place_id)
);

alter table public.user_favorites enable row level security;
create policy "自分のお気に入りのみ参照可能" on public.user_favorites for select using (auth.uid() = user_id);
create policy "自分のお気に入りのみ追加可能" on public.user_favorites for insert with check (auth.uid() = user_id);
create policy "自分のお気に入りのみ削除可能" on public.user_favorites for delete using (auth.uid() = user_id);

-- 4. 訪問記録（あしあと）テーブル
create table public.user_visited (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade not null,
  place_id bigint references public.dog_friendly_places on delete cascade not null,
  visited_at timestamp with time zone default timezone('utc'::text, now()) not null,
  comment text,
  unique (user_id, place_id)
);

alter table public.user_visited enable row level security;
create policy "自分の訪問記録のみ参照可能" on public.user_visited for select using (auth.uid() = user_id);
create policy "自分の訪問記録のみ追加可能" on public.user_visited for insert with check (auth.uid() = user_id);
create policy "自分の訪問記録のみ更新可能" on public.user_visited for update using (auth.uid() = user_id);
create policy "自分の訪問記録のみ削除可能" on public.user_visited for delete using (auth.uid() = user_id);

-- 近傍検索用RPC関数（現在地から指定距離以内の店舗を返す）
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
