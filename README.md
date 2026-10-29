# Celine Baby — сайт и админка

Next.js 16 (App Router) + Tailwind CSS v4 + TypeScript. Языки сайта: русский (`/ru`) и казахский (`/kk`). Админка: `/admin`.

## Запуск локально

```bash
npm install
npm run dev
```

- Сайт: http://localhost:3000 (редирект на `/ru`).
- Админка: http://localhost:3000/admin — пароль берётся из `ADMIN_PASSWORD` в файле `.env.local`.

Сборка для продакшена: `npm run build && npm start`.

## Где лежат данные

Хранилище выбирается автоматически по переменным окружения (`src/lib/store`):

| Режим | Когда | Товары и заказы | Фото из админки |
| --- | --- | --- | --- |
| Локальные файлы | `SUPABASE_URL` не задан | `data/products.json`, `data/orders.json` | `public/uploads/` |
| Supabase | заданы `SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` | таблицы `products`, `orders` | bucket `product-images` |

При первом запуске `data/products.json` создаётся из `data/seed/products.json` (713 товаров, перенесённых со старого сайта; их фото пока подгружаются с celinebaby.kz).

## Админка

- **Товары**: список с поиском и фильтрами, карточка с названием (ru/kk), ценой и старой ценой, категорией, полом, возрастом, метками (новинка/хит/скидка), фото (загружаются и сжимаются автоматически), размерами, цветами, описанием, составом и уходом. Кнопки «Сохранить и показать на сайте» и «Сохранить как черновик».
- **Заказы**: заказы с сайта и смена статуса.
- **Категории**: справочник трёх осей каталога (категория × пол × возраст) с количеством товаров.

Структура каталога задаётся в `src/data/categories.ts`, названия категорий — в `src/i18n/ru.ts` и `src/i18n/kk.ts`.

## Деплой на бесплатный хостинг (Vercel + Supabase)

1. **Supabase** (https://supabase.com, бесплатный план): создать проект → SQL Editor → выполнить `supabase/schema.sql`. В Settings → API взять `Project URL` и `service_role` key.
2. Заполнить `.env.local` этими значениями и загрузить товары:
   ```bash
   node --env-file=.env.local scripts/seed-supabase.mjs
   ```
3. **Vercel** (https://vercel.com, бесплатный план): импортировать репозиторий, в Environment Variables добавить `ADMIN_PASSWORD`, `ADMIN_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET=product-images`. Deploy.

## Что ещё не подключено

- Реальная онлайн-оплата: чекаут создаёт заказ со статусом «Новый», оплата будет подключена отдельно (Kaspi / эквайринг банка).
- Фирменный шрифт Edition: пока используются бесплатные Comfortaa + Manrope.
- Перенос фотографий со старого сайта в собственное хранилище.
- Редактирование блога из админки.
