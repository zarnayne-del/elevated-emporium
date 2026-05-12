
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null,
  subtitle text not null default '',
  description text not null default '',
  price_cents integer not null,
  color text not null default 'sand',
  image_path text not null default '',
  in_stock boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('KC-' || lpad((floor(random()*90000)+10000)::text, 5, '0')),
  email text not null,
  shipping_name text not null,
  shipping_address text not null,
  shipping_city text not null,
  shipping_zip text not null,
  shipping_country text not null default 'US',
  subtotal_cents integer not null,
  shipping_cents integer not null default 0,
  total_cents integer not null,
  status text not null default 'pending',
  notified_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  product_slug text not null,
  product_name text not null,
  unit_price_cents integer not null,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now()
);

create index on public.order_items (order_id);

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Public can read products
create policy "products are public"
  on public.products for select
  using (true);

-- Orders / order_items: no anon access; only service role (server fn) writes/reads
