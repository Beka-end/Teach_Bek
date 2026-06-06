-- ============================================
-- TeachBek — настройка базы данных и безопасности
-- Запусти этот SQL в Supabase: SQL Editor → New query → вставь → Run
-- ============================================

-- 1. Таблицы (если ещё не созданы)
create table if not exists chats (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  title text not null,
  created_at timestamp default now()
);

create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  chat_id uuid references chats(id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamp default now()
);

-- 2. Включаем защиту (Row Level Security)
alter table chats enable row level security;
alter table messages enable row level security;

-- 3. Правила: пользователь видит и меняет ТОЛЬКО свои чаты
create policy "users manage own chats"
  on chats for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. Правила для сообщений: только из своих чатов
create policy "users manage own messages"
  on messages for all
  using (exists (select 1 from chats where chats.id = messages.chat_id and chats.user_id = auth.uid()))
  with check (exists (select 1 from chats where chats.id = messages.chat_id and chats.user_id = auth.uid()));
