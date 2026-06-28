alter table public.user_settings
  add column if not exists preferred_training_days text[] not null default '{}',
  add column if not exists equipment text[] not null default '{}',
  add column if not exists experience_level text not null default 'beginner',
  add column if not exists primary_goal_type text not null default 'get_stronger',
  add column if not exists workout_split_preference text not null default 'push_pull_legs';

alter table public.user_settings
  drop constraint if exists user_settings_experience_level_check,
  drop constraint if exists user_settings_primary_goal_type_check,
  drop constraint if exists user_settings_workout_split_preference_check;

update public.user_settings
set
  preferred_training_days = coalesce(preferred_training_days, '{}'),
  equipment = coalesce(equipment, '{}'),
  experience_level = coalesce(experience_level, 'beginner'),
  primary_goal_type = coalesce(primary_goal_type, 'get_stronger'),
  workout_split_preference = coalesce(workout_split_preference, 'push_pull_legs');

alter table public.user_settings
  add constraint user_settings_experience_level_check
    check (experience_level in ('beginner', 'intermediate', 'advanced')),
  add constraint user_settings_primary_goal_type_check
    check (primary_goal_type in ('build_muscle', 'get_stronger', 'lose_weight', 'improve_consistency', 'general_fitness')),
  add constraint user_settings_workout_split_preference_check
    check (workout_split_preference in ('push_pull_legs', 'upper_lower', 'full_body', 'custom'));
