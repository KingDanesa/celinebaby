-- Celine Baby — production database (PostgreSQL 14+).
-- Safe to run many times: `npm run db:migrate` applies it on every deploy.

create table if not exists products (
  id          bigint primary key,
  slug        text not null unique,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

create table if not exists orders (
  id          text primary key,
  status      text not null,
  user_id     text,
  email       text,
  version     integer not null default 0,
  data        jsonb not null,
  created_at  timestamptz not null default now()
);
create index if not exists orders_created_idx on orders (created_at desc);
create index if not exists orders_user_idx on orders (user_id);
create index if not exists orders_email_idx on orders (lower(email));

-- Every invoice id ever sent to Halyk, so the bank's callback finds the order for any attempt.
create table if not exists order_invoices (
  invoice_id  text primary key,
  order_id    text not null references orders(id) on delete cascade
);

create table if not exists users (
  id             uuid primary key default gen_random_uuid(),
  email          text not null unique,
  password_hash  text not null,
  name           text not null default '',
  phone          text not null default '',
  city           text,
  address        text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Only a SHA-256 of the session token is stored; the token itself lives in the customer's cookie.
create table if not exists sessions (
  token_hash  text primary key,
  user_id     uuid not null references users(id) on delete cascade,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);
create index if not exists sessions_user_idx on sessions (user_id);

create table if not exists password_resets (
  token_hash  text primary key,
  user_id     uuid not null references users(id) on delete cascade,
  expires_at  timestamptz not null,
  used_at     timestamptz
);

-- Admin panel: each person has their own login; sessions and reset/invite links store only a SHA-256.
create table if not exists admin_users (
  id             uuid primary key default gen_random_uuid(),
  email          text not null unique,
  name           text not null default '',
  password_hash  text not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  last_login_at  timestamptz
);

create table if not exists admin_sessions (
  token_hash  text primary key,
  admin_id    uuid not null references admin_users(id) on delete cascade,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);
create index if not exists admin_sessions_admin_idx on admin_sessions (admin_id);

create table if not exists admin_password_resets (
  token_hash  text primary key,
  admin_id    uuid not null references admin_users(id) on delete cascade,
  expires_at  timestamptz not null,
  used_at     timestamptz
);
