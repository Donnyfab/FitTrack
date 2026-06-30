alter table public.user_settings
  add column if not exists rest_timer_sounds_enabled boolean not null default true;
