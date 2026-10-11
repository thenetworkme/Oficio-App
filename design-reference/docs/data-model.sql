-- Oficio · modelo de datos para Supabase (Postgres)
-- Cada fila pertenece a un usuario; RLS restringe todo a auth.uid().

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text not null default 'America/Santo_Domingo',
  theme_id text not null default 'oficio',
  accent_idx smallint not null default 0,
  follow_system_theme boolean not null default false,
  pomodoro_focus_min smallint not null default 25 check (pomodoro_focus_min between 1 and 90),
  pomodoro_short_min smallint not null default 5 check (pomodoro_short_min between 1 and 30),
  pomodoro_long_min smallint not null default 15 check (pomodoro_long_min between 1 and 60),
  daily_min_for_streak smallint not null default 30,
  created_at timestamptz not null default now()
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  color text not null default '#F0A93B',
  goal_hours integer not null default 10000 check (goal_hours > 0),
  initial_hours numeric(8,1) not null default 0 check (initial_hours >= 0),
  daily_goal_min smallint not null default 120,
  days_per_week smallint not null default 6 check (days_per_week between 1 and 7),
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  started_at timestamptz not null,
  duration_min integer not null check (duration_min between 1 and 720),
  quality smallint check (quality between 1 and 5),
  note text,
  pomodoros smallint not null default 0,
  source text not null default 'timer' check (source in ('timer', 'manual')),
  created_at timestamptz not null default now()
);
create index sessions_user_started_idx on public.sessions (user_id, started_at desc);
create index sessions_skill_idx on public.sessions (skill_id, started_at desc);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  skill_id uuid references public.skills(id) on delete cascade,
  kind text not null default 'practice' check (kind in ('practice', 'streak_guard', 'weekly_review')),
  time_of_day time not null,
  days smallint[] not null default '{1,2,3,4,5,6,7}', -- 1 = lunes … 7 = domingo
  message text,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- Hitos logrados (1, 10, 100, 500, 1000, 5000, 10000 h)
create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  hours integer not null check (hours in (1, 10, 100, 500, 1000, 5000, 10000)),
  achieved_at timestamptz not null default now(),
  unique (skill_id, hours)
);

-- Total de horas por habilidad (incluye las horas iniciales)
create view public.skill_totals as
select
  s.id as skill_id,
  s.user_id,
  s.name,
  s.goal_hours,
  s.initial_hours + coalesce(sum(se.duration_min), 0) / 60.0 as total_hours,
  count(se.id) as session_count
from public.skills s
left join public.sessions se on se.skill_id = s.id
group by s.id;

-- RLS
alter table public.profiles enable row level security;
alter table public.skills enable row level security;
alter table public.sessions enable row level security;
alter table public.reminders enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.achievements enable row level security;

create policy "own profile" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "own skills" on public.skills for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own sessions" on public.sessions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own reminders" on public.reminders for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own push" on public.push_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own achievements" on public.achievements for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Perfil automático al registrarse
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, new.raw_user_meta_data->>'name');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
