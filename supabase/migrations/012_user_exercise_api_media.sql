alter table public.user_exercises
  alter column user_id drop not null,
  add column if not exists api_source text,
  add column if not exists api_exercise_id text,
  add column if not exists image_url text,
  add column if not exists video_url text,
  add column if not exists gif_url text,
  add column if not exists body_parts text[] not null default '{}'::text[],
  add column if not exists target_muscles text[] not null default '{}'::text[],
  add column if not exists secondary_muscles text[] not null default '{}'::text[],
  add column if not exists instructions jsonb not null default '[]'::jsonb,
  add column if not exists overview text;

alter table public.user_exercises
  drop constraint if exists user_exercises_instructions_array_check;

alter table public.user_exercises
  add constraint user_exercises_instructions_array_check
  check (jsonb_typeof(instructions) = 'array');

create index if not exists user_exercises_api_source_api_exercise_idx
  on public.user_exercises (api_source, api_exercise_id)
  where user_id is null and api_source is not null and api_exercise_id is not null;

create unique index if not exists user_exercises_imported_api_uidx
  on public.user_exercises (api_source, api_exercise_id)
  where user_id is null and api_source is not null and api_exercise_id is not null;

drop policy if exists "Users manage own exercises" on public.user_exercises;
drop policy if exists "Users view own and imported exercises" on public.user_exercises;
drop policy if exists "Users insert own exercises" on public.user_exercises;
drop policy if exists "Users update own exercises" on public.user_exercises;
drop policy if exists "Users delete own exercises" on public.user_exercises;

create policy "Users view own and imported exercises"
  on public.user_exercises for select
  to authenticated
  using ((select auth.uid()) = user_id or user_id is null);

create policy "Users insert own exercises"
  on public.user_exercises for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update own exercises"
  on public.user_exercises for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete own exercises"
  on public.user_exercises for delete
  to authenticated
  using ((select auth.uid()) = user_id);
