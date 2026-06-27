alter table public.user_settings
  add column if not exists theme_preference text not null default 'system'
  check (theme_preference in ('light', 'dark', 'system'));
