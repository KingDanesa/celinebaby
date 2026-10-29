-- Run once in Supabase → SQL Editor.
create table if not exists products (
  id bigint primary key,
  slug text unique not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists orders (
  id text primary key,
  status text not null default 'new',
  data jsonb not null,
  created_at timestamptz not null default now()
);

-- Public bucket for product photos.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- The site talks to Supabase only from the server with the service-role key,
-- so row level security can stay enabled with no policies for anon users.
alter table products enable row level security;
alter table orders enable row level security;
