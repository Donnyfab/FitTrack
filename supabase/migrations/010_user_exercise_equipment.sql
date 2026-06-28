alter table public.user_exercises
  add column if not exists equipment text;

update public.user_exercises
set equipment = 'Dumbbell'
where equipment is null;
