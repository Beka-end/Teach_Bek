# TeachBek 🎓

AI-репетитор английского языка с регистрацией и входом. Общается на английском и мягко исправляет ошибки. Чаты сохраняются в облаке для каждого пользователя.

---

## 🚀 Как запустить (пошагово)

### Шаг 1. Настрой базу данных в Supabase

> ⚠️ ВАЖНО: мы перешли на нормальную авторизацию. Старые таблицы (где user_id был text) нужно пересоздать.

1. Открой свой проект на supabase.com → слева **SQL Editor** → **New query**.
2. Если у тебя уже есть старые таблицы `chats` и `messages` — сначала удали их этой командой и нажми Run:
   ```sql
   drop table if exists messages;
   drop table if exists chats;
   ```
3. Открой файл `supabase-setup.sql` из этого проекта, скопируй ВЕСЬ его текст, вставь в SQL Editor и нажми **Run**.
4. Должно написать Success. Теперь таблицы созданы и защищены.

### Шаг 2. Включи вход по Email в Supabase

1. В Supabase слева: **Authentication** → **Providers** (или Sign In / Providers).
2. Найди **Email** — он должен быть включён (Enabled).
3. Чтобы людям не приходилось подтверждать почту на старте: **Authentication → Providers → Email →** выключи **"Confirm email"** (Confirm email = OFF). Так регистрация будет мгновенной.
   > Позже, когда наберёшь пользователей, подтверждение почты лучше снова включить.

### Шаг 3. Загрузи проект на GitHub

Загрузи содержимое этой папки в **новый чистый** репозиторий: файлы `package.json`, `index.html`, `vite.config.js`, и папки `src`, `api`, `public`.

### Шаг 4. Подключи к Vercel и добавь переменные

1. Vercel → Add New Project → выбери репозиторий → Import.
2. Открой раздел **Environment Variables** (внутри проекта: Settings → Environment Variables) и добавь:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://feirhujiabazjqtldpnn.supabase.co` |
| `VITE_SUPABASE_KEY` | `sb_publishable_5bA6L51GrvsYkMwLzPrFZQ_DS17Wyh7` |
| `ANTHROPIC_API_KEY` | твой ключ с console.anthropic.com (`sk-ant-...`) |

3. Нажми **Deploy** (или Redeploy если проект уже был).

---

## 🔑 Что делает каждая переменная

- `VITE_SUPABASE_URL` и `VITE_SUPABASE_KEY` — подключение к базе (вход, регистрация, сохранение чатов).
- `ANTHROPIC_API_KEY` — мозг ИИ. Без него вход и сохранение работают, но TeachBek не отвечает на сообщения. Получи на console.anthropic.com ($5 бесплатно на старте).

## 🔒 Безопасность

- API-ключ Anthropic хранится только на сервере Vercel (`/api/chat.js`) — пользователи его не видят и не могут украсть.
- Row Level Security в Supabase гарантирует, что каждый пользователь видит ТОЛЬКО свои чаты. Чужие переписки недоступны.

## 💰 Расходы

- Supabase — бесплатно. Vercel — бесплатно. Anthropic API — ~$0.003 за сообщение.

---

## 📦 Локальный запуск (по желанию)

```bash
npm install
npm run dev
```

Создай `.env` в корне:
```
VITE_SUPABASE_URL=https://feirhujiabazjqtldpnn.supabase.co
VITE_SUPABASE_KEY=sb_publishable_5bA6L51GrvsYkMwLzPrFZQ_DS17Wyh7
ANTHROPIC_API_KEY=sk-ant-...
```

---

## 🆕 Update: Progress, Streaks, Mistake Tracking & Word Translation

New features added. To enable them you MUST re-run the database setup:

1. Open Supabase → SQL Editor → New query.
2. Paste the FULL contents of `supabase-setup.sql` and click **Run**.
   (It is safe to run again — it only adds the new `corrections` and `profiles` tables and a `meta` column.)
3. On GitHub, upload the updated `src` and `api` folders (new files: `src/App.jsx`, `api/chat.js`, `api/translate.js`).
4. Vercel redeploys automatically. No environment variable changes needed.

Features:
- 🎯 Level estimate (A1–C2) shown in the sidebar and a Progress panel.
- 🔥 Daily streak that grows when you practise on consecutive days.
- 📊 Mistake tracking — your most common error types, shown as bars.
- 🌍 Tap any word TeachBek writes to see its Russian translation.

---

## 💳 Payment (Kaspi — manual activation)

Users pay 2500₸ via the Kaspi link, then send the receipt to Telegram @sean_fan.

**How to activate Premium for a paying user:**

1. Open Supabase → **Authentication → Users**, find the user by their email, and copy their **User UID**.
2. Go to **Table Editor → profiles**.
3. Find the row with that `user_id` (or create one if missing) and set **premium = true**.
4. Done — the user gets unlimited messages (they may need to refresh the page).

To turn Premium off (e.g. subscription expired), set **premium = false** for that user.

> This is manual on purpose for the early stage. When you have many paying users, an automatic payment integration can replace this step.
