create table if not exists public.recurring_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  name text not null,
  muscle_group text,
  exercises jsonb not null default '[]'::jsonb check (jsonb_typeof(exercises) = 'array'),
  template_workout_id uuid references public.workouts(id) on delete set null,
  start_date date not null default current_date,
  end_date date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

alter table public.workouts
  add column if not exists recurring_schedule_id uuid references public.recurring_schedules(id) on delete set null,
  add column if not exists scheduled_for date;

create index if not exists recurring_schedules_user_id_day_idx on public.recurring_schedules (user_id, day_of_week, active);
create index if not exists recurring_schedules_user_id_active_idx on public.recurring_schedules (user_id, active);
create index if not exists workouts_user_id_recurring_schedule_date_idx on public.workouts (user_id, recurring_schedule_id, date);

alter table public.recurring_schedules enable row level security;

drop policy if exists "Users manage own recurring schedules" on public.recurring_schedules;
create policy "Users manage own recurring schedules"
  on public.recurring_schedules for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop trigger if exists recurring_schedules_updated_at on public.recurring_schedules;
create trigger recurring_schedules_updated_at
  before update on public.recurring_schedules
  for each row execute function public.set_updated_at();

grant all on public.recurring_schedules to authenticated;
