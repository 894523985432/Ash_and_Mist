-- «Попіл і Туман»: онлайн-частина (Supabase). Запускати в SQL Editor цілим файлом; повторний запуск безпечний.
-- Таблиці: profiles (нік і знімок героя), saves (хмарні збереження), friends, duels, messages (чат), reports (скарги).
-- Доступ — лише через Row Level Security: гравець бачить і змінює тільки своє.

-- ---------- профілі ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  nick text unique not null check (char_length(nick) between 3 and 20 and nick ~ '^[A-Za-zА-Яа-яІіЇїЄєҐґ0-9_ .-]+$'),
  hero jsonb,                 -- знімок героя для боїв: рівень, HP, захист, зброя, броня, тварина
  power int not null default 1,
  day int not null default 0,
  wins int not null default 0,
  losses int not null default 0,
  is_admin boolean not null default false,
  muted_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles: читають усі гравці" on public.profiles;
create policy "profiles: читають усі гравці" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles: свій створити" on public.profiles;
create policy "profiles: свій створити" on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists "profiles: свій змінити" on public.profiles;
create policy "profiles: свій змінити" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
-- Перемоги, адмінка й мут гравець собі сам не виставить
revoke insert, update on public.profiles from authenticated;
grant insert (id, nick) on public.profiles to authenticated;
grant update (nick, hero, power, day, updated_at) on public.profiles to authenticated;

-- ---------- хмарні збереження ----------
create table if not exists public.saves (
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  slot int not null check (slot between 1 and 3),
  data text not null check (char_length(data) < 2000000),  -- стиснуте збереження (base64)
  hash text not null,                                       -- контрольна сума розпакованого збереження
  day int,
  version int,
  updated_at timestamptz not null default now(),
  primary key (user_id, slot)
);
alter table public.saves enable row level security;
drop policy if exists "saves: лише свої" on public.saves;
create policy "saves: лише свої" on public.saves for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- друзі ----------
create table if not exists public.friends (
  user_id uuid not null references public.profiles on delete cascade default auth.uid(),  -- хто запросив
  friend_id uuid not null references public.profiles on delete cascade,                    -- кого запросили
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);
alter table public.friends enable row level security;
drop policy if exists "friends: бачать обидва" on public.friends;
create policy "friends: бачать обидва" on public.friends for select to authenticated using (auth.uid() in (user_id, friend_id));
drop policy if exists "friends: запросити" on public.friends;
create policy "friends: запросити" on public.friends for insert to authenticated with check (user_id = auth.uid() and status = 'pending');
drop policy if exists "friends: прийняти" on public.friends;
create policy "friends: прийняти" on public.friends for update to authenticated using (friend_id = auth.uid()) with check (friend_id = auth.uid() and status = 'accepted');
drop policy if exists "friends: видалити" on public.friends;
create policy "friends: видалити" on public.friends for delete to authenticated using (auth.uid() in (user_id, friend_id));

-- ---------- дуелі (бій зі знімком героя) ----------
create table if not exists public.duels (
  id bigint generated always as identity primary key,
  attacker uuid not null references public.profiles on delete cascade default auth.uid(),
  defender uuid not null references public.profiles on delete cascade,
  attacker_won boolean not null,
  turns int,
  created_at timestamptz not null default now()
);
alter table public.duels enable row level security;
drop policy if exists "duels: бачать учасники" on public.duels;
create policy "duels: бачать учасники" on public.duels for select to authenticated using (auth.uid() in (attacker, defender));
drop policy if exists "duels: записати свою" on public.duels;
create policy "duels: записати свою" on public.duels for insert to authenticated with check (attacker = auth.uid() and attacker <> defender);

-- Рахунок перемог і поразок веде сервер; не частіше однієї дуелі з тим самим суперником на 10 хвилин
create or replace function public.on_duel() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from duels where attacker = new.attacker and defender = new.defender and id <> new.id and created_at > now() - interval '10 minutes') then
    raise exception 'Зарано: з цим гравцем можна битися раз на 10 хвилин';
  end if;
  update profiles set wins = wins + 1 where id = case when new.attacker_won then new.attacker else new.defender end;
  update profiles set losses = losses + 1 where id = case when new.attacker_won then new.defender else new.attacker end;
  return new;
end $$;
drop trigger if exists duel_score on public.duels;
create trigger duel_score after insert on public.duels for each row execute function public.on_duel();

-- ---------- випадкові суперники приблизно твого рівня ----------
create or replace function public.random_heroes(lvl int, n int default 5)
returns table (id uuid, nick text, hero jsonb, power int) language sql stable as $$
  select p.id, p.nick, p.hero, p.power from public.profiles p
  where p.id <> auth.uid() and p.hero is not null and abs(p.power - lvl) <= 3
  order by random() limit least(n, 20);
$$;
grant execute on function public.random_heroes(int, int) to authenticated;

-- ---------- чат ----------
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  room text not null check (room = 'global' or room ~ '^dm:[0-9a-f-]{36}:[0-9a-f-]{36}$'),
  user_id uuid not null references public.profiles on delete cascade default auth.uid(),
  nick text not null default '',
  body text not null check (char_length(body) between 1 and 500),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists messages_room_time on public.messages (room, created_at desc);
alter table public.messages enable row level security;
drop policy if exists "messages: читати" on public.messages;
create policy "messages: читати" on public.messages for select to authenticated
  using (not hidden and (room = 'global' or position(auth.uid()::text in room) > 0));
drop policy if exists "messages: писати" on public.messages;
create policy "messages: писати" on public.messages for insert to authenticated
  with check (user_id = auth.uid() and (room = 'global' or position(auth.uid()::text in room) > 0));
drop policy if exists "messages: модерація" on public.messages;
create policy "messages: модерація" on public.messages for update to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin));
revoke update on public.messages from authenticated;
grant update (hidden) on public.messages to authenticated;

-- Нік з профілю (не підробиш), мут, не частіше одного повідомлення на 2 секунди
create or replace function public.on_message() returns trigger language plpgsql security definer set search_path = public as $$
declare p profiles;
begin
  select * into p from profiles where id = new.user_id;
  if p.id is null then raise exception 'Спершу створи профіль'; end if;
  if p.muted_until is not null and p.muted_until > now() then raise exception 'Чат тимчасово недоступний (мут)'; end if;
  if exists (select 1 from messages where user_id = new.user_id and created_at > now() - interval '2 seconds') then
    raise exception 'Не так швидко';
  end if;
  new.nick := p.nick; new.hidden := false; new.created_at := now();
  return new;
end $$;
drop trigger if exists message_check on public.messages;
create trigger message_check before insert on public.messages for each row execute function public.on_message();

-- ---------- скарги ----------
create table if not exists public.reports (
  id bigint generated always as identity primary key,
  message_id bigint not null references public.messages on delete cascade,
  reporter uuid not null references public.profiles on delete cascade default auth.uid(),
  reason text check (char_length(reason) <= 200),
  created_at timestamptz not null default now(),
  unique (message_id, reporter)
);
alter table public.reports enable row level security;
drop policy if exists "reports: поскаржитись" on public.reports;
create policy "reports: поскаржитись" on public.reports for insert to authenticated with check (reporter = auth.uid());
drop policy if exists "reports: бачать адміни" on public.reports;
create policy "reports: бачать адміни" on public.reports for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

-- Три скарги від різних гравців — повідомлення ховається автоматично
create or replace function public.on_report() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from reports where message_id = new.message_id) >= 3 then
    update messages set hidden = true where id = new.message_id;
  end if;
  return new;
end $$;
drop trigger if exists report_hide on public.reports;
create trigger report_hide after insert on public.reports for each row execute function public.on_report();

-- ---------- живі оновлення (чат, запити в друзі) ----------
do $$ begin
  begin alter publication supabase_realtime add table public.messages; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.friends; exception when duplicate_object then null; end;
end $$;

-- Зробити себе модератором (виконати окремо, підставивши свій нік):
-- update public.profiles set is_admin = true where nick = 'Darke';
