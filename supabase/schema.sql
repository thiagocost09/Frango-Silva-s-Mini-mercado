create table if not exists public.menu_items (
  id text primary key,
  name text not null,
  price numeric(10, 2) not null check (price > 0),
  description text not null,
  image text not null,
  category text not null,
  tag text,
  available boolean not null default true,
  stock integer not null default 0 check (stock >= 0),
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.time_slots (
  time text primary key check (time ~ '^[0-9]{2}:[0-9]{2}$')
);

create table if not exists public.orders (
  id text primary key,
  order_number text not null unique,
  status text not null check (status in ('confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
  customer jsonb not null,
  pickup_date date not null,
  pickup_time text not null,
  items jsonb not null,
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  total numeric(10, 2) not null check (total >= 0),
  payment jsonb not null,
  store jsonb not null,
  notes text not null default '',
  whatsapp_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);

alter table public.menu_items enable row level security;
alter table public.time_slots enable row level security;
alter table public.orders enable row level security;

grant all on table public.menu_items to service_role;
grant all on table public.time_slots to service_role;
grant all on table public.orders to service_role;
