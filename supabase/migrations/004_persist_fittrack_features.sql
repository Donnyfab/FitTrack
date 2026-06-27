alter table public.user_settings
  add column if not exists default_rest_timer_seconds integer not null default 90
    check (default_rest_timer_seconds between 15 and 600),
  add column if not exists show_set_summary boolean not null default true,
  add column if not exists auto_save_workouts boolean not null default true,
  add column if not exists notification_workout_reminders boolean not null default true,
  add column if not exists notification_goal_progress boolean not null default true,
  add column if not exists notification_weekly_summary boolean not null default false;

alter table public.workouts
  add column if not exists status text not null default 'completed'
    check (status in ('planned', 'scheduled', 'completed', 'missed')),
  add column if not exists favorite boolean not null default false,
  add column if not exists template boolean not null default false,
  add column if not exists calories integer check (calories is null or calories >= 0);

alter table public.goals
  drop constraint if exists goals_type_check;

alter table public.goals
  add constraint goals_type_check
  check (type in (
    'build_muscle',
    'lose_weight',
    'get_stronger',
    'improve_consistency',
    'workout_consistency',
    'strength_goal',
    'weight_goal',
    'body_fat_goal'
  ));

create table if not exists public.user_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  muscle_group text not null,
  icon text,
  form_tips text,
  is_favorite boolean not null default false,
  is_custom boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.body_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recorded_at date not null default current_date,
  weight numeric(6,2),
  body_fat_percentage numeric(5,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (weight is null or weight > 0),
  check (body_fat_percentage is null or (body_fat_percentage >= 0 and body_fat_percentage <= 100)),
  unique (user_id, recorded_at)
);

create index if not exists user_exercises_user_id_name_idx on public.user_exercises (user_id, name);
create index if not exists user_exercises_user_id_favorite_idx on public.user_exercises (user_id, is_favorite);
create index if not exists body_stats_user_id_recorded_at_idx on public.body_stats (user_id, recorded_at desc);
create index if not exists workouts_user_id_status_date_idx on public.workouts (user_id, status, date desc);
create index if not exists workouts_user_id_favorite_idx on public.workouts (user_id, favorite);
create index if not exists workouts_user_id_template_idx on public.workouts (user_id, template);

alter table public.user_exercises enable row level security;
alter table public.body_stats enable row level security;

drop policy if exists "Users manage own exercises" on public.user_exercises;
create policy "Users manage own exercises"
  on public.user_exercises for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own body stats" on public.body_stats;
create policy "Users manage own body stats"
  on public.body_stats for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists user_exercises_updated_at on public.user_exercises;
create trigger user_exercises_updated_at
  before update on public.user_exercises
  for each row execute function public.set_updated_at();

drop trigger if exists body_stats_updated_at on public.body_stats;
create trigger body_stats_updated_at
  before update on public.body_stats
  for each row execute function public.set_updated_at();

grant all on public.user_exercises to authenticated;
grant all on public.body_stats to authenticated;
