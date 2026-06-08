-- ============================================
-- TeachBek — настройка базы данных и безопасности
-- Запусти ВЕСЬ этот SQL в Supabase: SQL Editor → New query → вставь → Run
-- Безопасно запускать повторно.
-- ============================================

-- 1. Основные таблицы
create table if not exists chats (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  title text not null,
  mode text default 'chat',
  created_at timestamp default now()
);

-- If chats already exists, add the mode column
alter table chats add column if not exists mode text default 'chat';

create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  chat_id uuid references chats(id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamp default now()
);

-- Колонка для хранения исправлений рядом с сообщением ассистента
alter table messages add column if not exists meta jsonb;

-- 2. Таблица ошибок (для отслеживания прогресса)
create table if not exists corrections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  category text not null,
  wrong text,
  correct text,
  created_at timestamp default now()
);

-- 3. Профиль пользователя (уровень + серия дней)
create table if not exists profiles (
  user_id uuid primary key,
  level text default 'A1',
  streak int default 0,
  last_active date,
  premium boolean default false,
  updated_at timestamp default now()
);

-- If profiles already exists, add the premium column
alter table profiles add column if not exists premium boolean default false;
alter table profiles add column if not exists level_history jsonb default '[]';

-- 4. Включаем защиту (RLS)
alter table chats enable row level security;
alter table messages enable row level security;
alter table corrections enable row level security;
alter table profiles enable row level security;

-- 5. Правила доступа (пересоздаём, чтобы не было дублей)
drop policy if exists "users manage own chats" on chats;
create policy "users manage own chats" on chats for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users manage own messages" on messages;
create policy "users manage own messages" on messages for all
  using (exists (select 1 from chats where chats.id = messages.chat_id and chats.user_id = auth.uid()))
  with check (exists (select 1 from chats where chats.id = messages.chat_id and chats.user_id = auth.uid()));

drop policy if exists "own corrections" on corrections;
create policy "own corrections" on corrections for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
