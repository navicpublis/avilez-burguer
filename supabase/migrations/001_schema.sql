-- ════════════════════════════════════════════════════════════════
-- AVILEZ BURGUER — 001_schema.sql
-- Estrutura base do banco (tabelas, tipos, relações, índices).
-- Rode este arquivo PRIMEIRO no SQL Editor do Supabase.
-- Idempotente: pode rodar de novo sem quebrar (usa IF NOT EXISTS).
-- ════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";      -- gen_random_uuid()

-- ── util: updated_at automático ────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ── ENUMS (espelham os tipos do frontend) ──────────────────────
do $$ begin
  create type product_status  as enum ('disponivel','indisponivel','oculto','em_falta');
exception when duplicate_object then null; end $$;

do $$ begin
  create type product_badge   as enum ('destaque','mais_vendido','novidade','promocao','limitado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method  as enum ('PIX','Dinheiro','Cartão na Entrega');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status    as enum ('recebido','confirmado','producao','entrega','entregue','cancelado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type coupon_type     as enum ('pct','fixed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ingredient_category as enum
    ('paes','carnes','queijos','molhos','verduras','bebidas','sobremesas','embalagens','descartaveis','outros');
exception when duplicate_object then null; end $$;

do $$ begin
  create type stock_unit      as enum ('kg','g','ml','l','un','pacote','caixa');
exception when duplicate_object then null; end $$;

-- movimentos de estoque (inclui os tipos do doc: entry/automatic_usage/manual_output/loss/adjustment)
do $$ begin
  create type movement_type   as enum ('entrada','saida_automatica','saida_manual','perda','ajuste');
exception when duplicate_object then null; end $$;

do $$ begin
  create type review_status   as enum ('pendente','aprovada','reprovada','oculta');
exception when duplicate_object then null; end $$;

do $$ begin
  create type note_priority   as enum ('baixa','media','alta');
exception when duplicate_object then null; end $$;

do $$ begin
  create type note_status     as enum ('pendente','concluida');
exception when duplicate_object then null; end $$;

-- ════════════════════════════════════════════════════════════════
-- CATÁLOGO — fonte oficial de categorias, produtos e adicionais
-- ════════════════════════════════════════════════════════════════

create table if not exists categories (
  id          text primary key,                  -- slug estável (ex.: "hamburgueres")
  name        text not null,
  slug        text unique,
  description text default '',
  icon        text,
  active      boolean not null default true,
  visible     boolean not null default true,   -- "hidden" do front = not visible
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists products (
  id                 text primary key,            -- slug estável (ex.: "classico")
  category_id        text references categories(id) on delete set null,
  name               text not null,
  slug               text unique,
  short_description  text default '',
  description        text default '',
  price              numeric(10,2) not null default 0,
  promotional_price  numeric(10,2),
  image_url          text,
  status             product_status not null default 'disponivel',
  active             boolean not null default true,
  available          boolean not null default true,
  featured           boolean not null default false,   -- badge destaque
  best_seller        boolean not null default false,   -- badge mais_vendido
  new_product        boolean not null default false,   -- badge novidade
  promo              boolean not null default false,    -- badge promocao
  limited            boolean not null default false,   -- badge limitado
  preparation_time   int default 0,
  weight             text default '',
  ingredients        text[] not null default '{}',      -- usados na busca
  sort_order         int not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_products_category on products(category_id);
create index if not exists idx_products_status   on products(status);

create table if not exists addon_groups (
  id          text primary key,                   -- ex.: "grp_extras"
  name        text not null,
  max_choices int not null default 1,     -- "max"
  required    boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists addons (
  id          text primary key,                   -- ex.: "add_bacon"
  group_id    text not null references addon_groups(id) on delete cascade,
  name        text not null,
  price       numeric(10,2) not null default 0,
  available   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_addons_group on addons(group_id);

-- relação N:N produto ↔ grupo de adicionais (product.addonGroupIds)
create table if not exists product_addon_groups (
  product_id text not null references products(id)      on delete cascade,
  group_id   text not null references addon_groups(id)  on delete cascade,
  primary key (product_id, group_id)
);

-- ════════════════════════════════════════════════════════════════
-- ENTREGA — bairros (fonte única: admin, checkout, landing, relatórios)
-- ════════════════════════════════════════════════════════════════

create table if not exists delivery_zones (
  id               text primary key,                  -- slug estável do frontend (ex.: "centro")
  name               text not null,
  delivery_fee       numeric(10,2) not null default 0,
  estimated_time     text default '',              -- "30 a 40 min" (texto livre atual)
  estimated_time_min int,                          -- opcionais (doc)
  estimated_time_max int,
  active             boolean not null default true,
  sort_order         int not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════════
-- CLIENTES
-- ════════════════════════════════════════════════════════════════

create table if not exists customers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  phone         text,
  phone_digits  text unique,                       -- telefone normalizado (só dígitos)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  last_order_at timestamptz
);

create table if not exists customer_addresses (
  id               uuid primary key default gen_random_uuid(),
  customer_id      uuid not null references customers(id) on delete cascade,
  street           text default '',
  number           text default '',
  complement       text default '',
  delivery_zone_id text references delivery_zones(id) on delete set null,
  reference        text default '',
  cep              text default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_addresses_customer on customer_addresses(customer_id);

-- ════════════════════════════════════════════════════════════════
-- CUPONS
-- ════════════════════════════════════════════════════════════════

create table if not exists coupons (
  id                       text primary key,          -- id estável do frontend (ex.: "cpn_ab12")
  code                     text unique not null,
  description              text default '',
  discount_type            coupon_type not null default 'pct',
  percentage               numeric(6,2),           -- quando type=pct
  fixed_amount             numeric(10,2),          -- quando type=fixed
  minimum_order            numeric(10,2) not null default 0,
  starts_at                date,
  expires_at               date,
  usage_limit              int,
  usage_limit_per_customer int,
  usage_count              int not null default 0,
  active                   boolean not null default true,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════════
-- PEDIDOS
-- ════════════════════════════════════════════════════════════════

create table if not exists orders (
  id                    uuid primary key default gen_random_uuid(),
  public_token          uuid not null default gen_random_uuid() unique,   -- link seguro do rastreio
  order_number          text unique,                                      -- ex.: AVLZ-XXXX (legível)
  customer_id           uuid references customers(id) on delete set null,
  address_id            uuid references customer_addresses(id) on delete set null,
  status                order_status not null default 'recebido',
  payment_method        payment_method not null default 'PIX',
  change_for            numeric(10,2),
  subtotal              numeric(10,2) not null default 0,
  delivery_fee          numeric(10,2) not null default 0,
  discount              numeric(10,2) not null default 0,
  total                 numeric(10,2) not null default 0,
  coupon_id             text references coupons(id) on delete set null,
  coupon_code           text,                          -- snapshot do código
  customer_notes        text default '',
  -- snapshots do cliente/endereço (para o card do admin não depender de joins)
  customer_name         text,
  customer_phone        text,
  delivery_zone_name    text,
  address_snapshot      text,
  created_at            timestamptz not null default now(),
  confirmed_at          timestamptz,
  production_started_at timestamptz,
  out_for_delivery_at   timestamptz,
  delivered_at          timestamptz,
  cancelled_at          timestamptz,
  cancellation_reason   text
);
create index if not exists idx_orders_status  on orders(status);
create index if not exists idx_orders_created  on orders(created_at desc);
create index if not exists idx_orders_customer on orders(customer_id);

create table if not exists order_items (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid not null references orders(id) on delete cascade,
  product_id            text references products(id) on delete set null,
  product_name_snapshot text not null,
  quantity              int not null default 1,
  unit_price            numeric(10,2) not null default 0,
  subtotal              numeric(10,2) not null default 0,
  notes                 text default ''
);
create index if not exists idx_order_items_order on order_items(order_id);

create table if not exists order_item_addons (
  id                  uuid primary key default gen_random_uuid(),
  order_item_id       uuid not null references order_items(id) on delete cascade,
  addon_id            uuid references addons(id) on delete set null,
  addon_name_snapshot text not null,
  price_snapshot      numeric(10,2) not null default 0
);
create index if not exists idx_item_addons_item on order_item_addons(order_item_id);

create table if not exists order_status_history (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references orders(id) on delete cascade,
  previous_status order_status,
  new_status      order_status not null,
  changed_by      uuid,                              -- auth.uid() do admin (null = sistema/cliente)
  created_at      timestamptz not null default now()
);
create index if not exists idx_status_history_order on order_status_history(order_id);

-- ════════════════════════════════════════════════════════════════
-- ESTOQUE
-- ════════════════════════════════════════════════════════════════

create table if not exists ingredients (
  id             text primary key,                   -- id estável do frontend (ex.: "ing_pao")
  name           text not null,
  category       ingredient_category not null default 'outros',
  unit           stock_unit not null default 'un',
  current_stock  numeric(12,3) not null default 0,   -- "qty"
  minimum_stock  numeric(12,3) not null default 0,   -- "minQty"
  purchase_price numeric(10,2) not null default 0,   -- "buyPrice"
  supplier       text default '',
  note           text default '',
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- receita técnica: produto usa X de um ingrediente
create table if not exists recipes (
  id            uuid primary key default gen_random_uuid(),
  product_id    text not null references products(id)    on delete cascade,
  ingredient_id text not null references ingredients(id) on delete cascade,
  quantity      numeric(12,3) not null default 0,
  unique (product_id, ingredient_id)
);
create index if not exists idx_recipes_product on recipes(product_id);

create table if not exists stock_movements (
  id             uuid primary key default gen_random_uuid(),
  ingredient_id  text not null references ingredients(id) on delete cascade,
  type           movement_type not null,
  quantity       numeric(12,3) not null,            -- magnitude
  previous_stock numeric(12,3),
  new_stock      numeric(12,3),
  order_id       uuid references orders(id) on delete set null,
  reason         text default '',
  created_by     uuid,
  created_at     timestamptz not null default now()
);
create index if not exists idx_movements_ingredient on stock_movements(ingredient_id);
create index if not exists idx_movements_order      on stock_movements(order_id);

-- ════════════════════════════════════════════════════════════════
-- AVALIAÇÕES
-- ════════════════════════════════════════════════════════════════

create table if not exists reviews (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid references orders(id) on delete set null,
  customer_id  uuid references customers(id) on delete set null,
  customer_name text not null default '',
  rating       int not null check (rating between 1 and 5),
  comment      text default '',
  status       review_status not null default 'pendente',
  created_at   timestamptz not null default now(),
  moderated_at timestamptz,
  moderated_by uuid,
  unique (order_id)    -- um pedido gera no máximo uma avaliação
);
create index if not exists idx_reviews_status on reviews(status);

-- ════════════════════════════════════════════════════════════════
-- ANOTAÇÕES
-- ════════════════════════════════════════════════════════════════

create table if not exists notes (
  id         text primary key,                   -- id estável do frontend (ex.: "note_ab12")
  title      text not null,
  content    text default '',
  priority   note_priority not null default 'media',
  status     note_status   not null default 'pendente',
  due_date   date,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════════
-- CONFIGURAÇÕES (linha única) + PERFIL ADMIN
-- ════════════════════════════════════════════════════════════════

-- settings como key/value JSON (business, hours, landing, storeOpen, admin)
create table if not exists app_settings (
  key        text primary key,
  value      jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists admin_profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Avilez Burguer',
  avatar_url   text,
  role         text not null default 'Administrador',
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── triggers updated_at ────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'categories','products','addon_groups','addons','delivery_zones',
    'customers','customer_addresses','coupons','ingredients','notes','admin_profiles'
  ] loop
    execute format(
      'drop trigger if exists trg_%1$s_updated on %1$s;
       create trigger trg_%1$s_updated before update on %1$s
       for each row execute function set_updated_at();', t);
  end loop;
end $$;
